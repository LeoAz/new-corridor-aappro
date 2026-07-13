<?php

namespace App\Http\Controllers;

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\DepotInvoice;
use App\Models\DepotInvoiceItem;
use App\Models\InvoiceItem;
use App\Models\Load;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ClientPaymentController extends Controller
{
    public function index()
    {
        $payments = ClientPayment::with([
            'client',
            'depotInvoice',
            'depotInvoiceItems.depotInvoice',
            'loadDetails',
            'loads.invoiceItems',
            'invoiceItems',
        ])
            ->latest()
            ->get();

        return Inertia::render('finances/reglements', [
            'payments' => $payments,
            'clients' => Client::all(['id', 'nom']),
            'paymentMethods' => ['Chèque', 'Virement bancaire', 'Espèce', 'Autres'],
        ]);
    }

    public function getAdvances($clientId)
    {
        $advances = ClientPayment::where('client_id', $clientId)
            ->where('is_advance', true)
            ->get()
            ->map(function ($advance) {
                $used = ClientPayment::where('parent_id', $advance->id)->sum('amount');
                $remaining = $advance->amount - $used;

                return [
                    'id' => $advance->id,
                    'reference' => ($advance->reference ?: 'Avance #'.$advance->id).' ('.number_format($remaining, 0, ',', ' ').' CFA restants)',
                    'remaining' => $remaining,
                    'date' => $advance->date->format('d/m/Y'),
                ];
            })
            ->filter(fn ($a) => $a['remaining'] > 0)
            ->values();

        $depotInvoices = DepotInvoice::where('client_id', $clientId)
            ->whereHas('items', function ($query) {
                $query->where('is_paid', false);
            })
            ->with(['items' => function ($q) {
                $q->where('is_paid', false);
            }])
            ->get();

        return response()->json([
            'advances' => $advances,
            'depot_invoices' => $depotInvoices,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'delivery_ids' => 'nullable|array',
            'delivery_ids.*' => 'exists:loads,id',
            'depot_invoice_ids' => 'nullable|array',
            'depot_invoice_ids.*' => 'exists:depot_invoices,id',
            'missing_quantities' => 'nullable|array',
            'missing_quantities.*' => 'nullable|numeric|min:0',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'required|string',
            'date' => 'required|date',
            'reference' => 'nullable|string',
            'note' => 'nullable|string',
            'use_advance' => 'required|boolean',
            'advance_id' => 'required_if:use_advance,true|nullable|exists:client_payments,id',
            'is_new_advance' => 'required|boolean',
        ]);

        return DB::transaction(function () use ($validated) {
            $clientId = $validated['client_id'];
            $deliveryIds = $validated['delivery_ids'] ?? [];
            $depotInvoiceIds = $validated['depot_invoice_ids'] ?? [];
            $missingQuantities = $validated['missing_quantities'] ?? [];
            $totalAmount = $this->resolvePaymentAmount(
                amount: (float) $validated['amount'],
                deliveryIds: $deliveryIds,
                depotInvoiceIds: $depotInvoiceIds,
                missingQuantities: $missingQuantities,
                isNewAdvance: (bool) $validated['is_new_advance'],
            );

            // 1. Créer le paiement (ou consommer l'avance)
            $payment = ClientPayment::create([
                'client_id' => $clientId,
                'payment_type' => $validated['is_new_advance'] ? 'AVANCE' : 'REGLEMENT',
                'is_advance' => $validated['is_new_advance'],
                'amount' => $totalAmount,
                'payment_method' => $validated['payment_method'],
                'date' => $validated['date'],
                'reference' => $validated['reference'] ?? null,
                'note' => $validated['note'] ?? null,
                'parent_id' => ($validated['use_advance'] ?? false) ? ($validated['advance_id'] ?? null) : null,
            ]);

            // 2. Mettre à jour les livraisons si ce n'est pas une simple avance
            if (! $validated['is_new_advance']) {
                if (! empty($deliveryIds)) {
                    foreach ($deliveryIds as $deliveryId) {
                        $missingQuantity = $missingQuantities[$deliveryId] ?? 0;

                        Load::where('id', $deliveryId)->update([
                            'status' => LoadStatus::PAYE,
                            'is_paid' => true,
                            'client_payment_id' => $payment->id,
                            'unload_location' => DB::raw("IFNULL(unload_location, '')"),
                        ]);

                        $invoiceItem = InvoiceItem::where('load_id', $deliveryId)->first();
                        if ($invoiceItem) {
                            $invoiceItem->update([
                                'is_paid' => true,
                                'client_payment_id' => $payment->id,
                                'missing_quantity' => $missingQuantity,
                            ]);

                            $invoice = $invoiceItem->invoice;
                            if ($invoice) {
                                $invoice->total_amount = $invoice->items()->sum(DB::raw('(quantity_delivered - missing_quantity) * unit_price'));
                                $invoice->save();
                            }
                        }
                    }
                }

                if (! empty($depotInvoiceIds)) {
                    foreach ($depotInvoiceIds as $depotInvoiceId) {
                        DepotInvoice::where('id', $depotInvoiceId)->update([
                            // On pourrait ajouter un statut à DepotInvoice si nécessaire,
                            // mais ici on se base sur les items
                        ]);

                        DepotInvoiceItem::where('depot_invoice_id', $depotInvoiceId)->update([
                            'is_paid' => true,
                            'client_payment_id' => $payment->id,
                        ]);
                    }
                }
            }

            return redirect()->back()->with('success', 'Règlement enregistré avec succès.');
        });
    }

    public function update(Request $request, ClientPayment $reglement)
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'delivery_ids' => 'nullable|array',
            'delivery_ids.*' => 'exists:loads,id',
            'depot_invoice_ids' => 'nullable|array',
            'depot_invoice_ids.*' => 'exists:depot_invoices,id',
            'missing_quantities' => 'nullable|array',
            'missing_quantities.*' => 'nullable|numeric|min:0',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'required|string',
            'date' => 'required|date',
            'reference' => 'nullable|string',
            'note' => 'nullable|string',
            'use_advance' => 'required|boolean',
            'advance_id' => 'required_if:use_advance,true|nullable|exists:client_payments,id',
            'is_new_advance' => 'required|boolean',
        ]);

        return DB::transaction(function () use ($validated, $reglement) {
            // 1. Restaurer le statut des anciens éléments liés
            // Livraisons
            Load::where('client_payment_id', $reglement->id)->update([
                'status' => LoadStatus::FACTURE,
                'is_paid' => false,
                'client_payment_id' => null,
            ]);

            // Récupérer les items de facture liés pour réinitialiser les manquants et recalculer les factures
            $oldInvoiceItems = InvoiceItem::where('client_payment_id', $reglement->id)->get();
            foreach ($oldInvoiceItems as $item) {
                $item->update([
                    'is_paid' => false,
                    'client_payment_id' => null,
                    'missing_quantity' => 0,
                ]);

                $invoice = $item->invoice;
                if ($invoice) {
                    $invoice->total_amount = $invoice->items()->sum(DB::raw('(quantity_delivered - missing_quantity) * unit_price'));
                    $invoice->save();
                }
            }

            // Factures Dépôt
            DepotInvoiceItem::where('client_payment_id', $reglement->id)->update([
                'is_paid' => false,
                'client_payment_id' => null,
            ]);

            // 2. Mettre à jour le paiement
            $deliveryIds = $validated['delivery_ids'] ?? [];
            $depotInvoiceIds = $validated['depot_invoice_ids'] ?? [];
            $missingQuantities = $validated['missing_quantities'] ?? [];
            $totalAmount = $this->resolvePaymentAmount(
                amount: (float) $validated['amount'],
                deliveryIds: $deliveryIds,
                depotInvoiceIds: $depotInvoiceIds,
                missingQuantities: $missingQuantities,
                isNewAdvance: (bool) $validated['is_new_advance'],
            );

            $reglement->update([
                'client_id' => $validated['client_id'],
                'payment_type' => $validated['is_new_advance'] ? 'AVANCE' : 'REGLEMENT',
                'is_advance' => $validated['is_new_advance'],
                'amount' => $totalAmount,
                'payment_method' => $validated['payment_method'],
                'date' => $validated['date'],
                'reference' => $validated['reference'] ?? null,
                'note' => $validated['note'] ?? null,
                'parent_id' => ($validated['use_advance'] ?? false) ? ($validated['advance_id'] ?? null) : null,
            ]);

            // 3. Appliquer les nouveaux liens si ce n'est pas une simple avance
            if (! $validated['is_new_advance']) {
                if (! empty($deliveryIds)) {
                    foreach ($deliveryIds as $deliveryId) {
                        $missingQuantity = $missingQuantities[$deliveryId] ?? 0;

                        Load::where('id', $deliveryId)->update([
                            'status' => LoadStatus::PAYE,
                            'is_paid' => true,
                            'client_payment_id' => $reglement->id,
                            'unload_location' => DB::raw("IFNULL(unload_location, '')"),
                        ]);

                        $invoiceItem = InvoiceItem::where('load_id', $deliveryId)->first();
                        if ($invoiceItem) {
                            $invoiceItem->update([
                                'is_paid' => true,
                                'client_payment_id' => $reglement->id,
                                'missing_quantity' => $missingQuantity,
                            ]);

                            $invoice = $invoiceItem->invoice;
                            if ($invoice) {
                                $invoice->total_amount = $invoice->items()->sum(DB::raw('(quantity_delivered - missing_quantity) * unit_price'));
                                $invoice->save();
                            }
                        }
                    }
                }

                if (! empty($depotInvoiceIds)) {
                    foreach ($depotInvoiceIds as $depotInvoiceId) {
                        DepotInvoiceItem::where('depot_invoice_id', $depotInvoiceId)->update([
                            'is_paid' => true,
                            'client_payment_id' => $reglement->id,
                        ]);
                    }
                }
            }

            return redirect()->back()->with('success', 'Règlement mis à jour avec succès.');
        });
    }

    public function show(ClientPayment $reglement)
    {
        $reglement->load(['client', 'loads.city', 'loads.depot', 'invoiceItems.invoice']);

        return response()->json($reglement);
    }

    public function downloadPdf(ClientPayment $reglement)
    {
        $reglement->load([
            'client',
            'loads.invoiceItems',
            'invoiceItems',
            'depotInvoiceItems.depotInvoice',
        ]);

        $pdf = Pdf::loadView('payments.pdf', [
            'payment' => $reglement,
        ]);

        $reference = $reglement->reference ?: 'REG-'.$reglement->id;

        return $pdf->download("Reglement_{$reference}.pdf");
    }

    public function destroy(ClientPayment $reglement)
    {
        DB::transaction(function () use ($reglement) {
            // Restaurer le statut des livraisons associées
            Load::where('client_payment_id', $reglement->id)->update([
                'status' => LoadStatus::FACTURE,
                'is_paid' => false,
                'client_payment_id' => null,
            ]);

            // Restaurer aussi les items de facture
            InvoiceItem::where('client_payment_id', $reglement->id)->update([
                'is_paid' => false,
                'client_payment_id' => null,
            ]);

            // Restaurer les items de facture dépôt
            DepotInvoiceItem::where('client_payment_id', $reglement->id)->update([
                'is_paid' => false,
                'client_payment_id' => null,
            ]);

            $reglement->delete();
        });

        return redirect()->back()->with('success', 'Règlement supprimé.');
    }

    /**
     * @param  array<int, int|string>  $deliveryIds
     * @param  array<int, int|string>  $depotInvoiceIds
     * @param  array<int|string, int|float|string|null>  $missingQuantities
     */
    private function resolvePaymentAmount(float $amount, array $deliveryIds, array $depotInvoiceIds, array $missingQuantities, bool $isNewAdvance): float
    {
        if ($amount > 0 || $isNewAdvance) {
            return $amount;
        }

        if ($deliveryIds !== []) {
            return (float) InvoiceItem::whereIn('load_id', $deliveryIds)
                ->get()
                ->sum(function (InvoiceItem $item) use ($missingQuantities): float {
                    $missingQuantity = (float) ($missingQuantities[$item->load_id] ?? $item->missing_quantity ?? 0);

                    return ((float) $item->quantity_delivered - $missingQuantity) * (float) $item->unit_price;
                });
        }

        if ($depotInvoiceIds !== []) {
            return (float) DepotInvoice::whereIn('id', $depotInvoiceIds)->sum('total_amount');
        }

        return $amount;
    }
}
