<?php

namespace App\Http\Controllers;

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\Depot;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Load;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ClientTrackingController extends Controller
{
    public function index(Request $request): Response
    {
        $clients = Client::orderBy('nom')->get();
        $clientId = $request->input('client_id') ?? $clients->first()?->id;
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $data = [
            'clients' => $clients,
            'selectedClient' => null,
            'stats' => [
                'livrer' => 0,
                'facture_partielle' => 0,
                'facturer' => 0,
                'facturer_payer' => 0,
            ],
            'payments' => [],
            'loads' => [],
            'initial_balance' => 0,
            'total_payments' => 0,
            'current_balance' => 0,
            'depots' => Depot::with('compartments')->orderBy('name')->get(),
        ];

        if ($clientId) {
            $client = Client::find($clientId);
            if ($client) {
                $data['selectedClient'] = $client;
                $data['initial_balance'] = (float) $client->initial_balance;

                // Stats
                $data['stats']['livrer'] = Load::where('client_id', $clientId)->where('status', LoadStatus::LIVRER)->count();
                $data['stats']['facture_partielle'] = Load::where('status', LoadStatus::FACTURE_PARTIELLE)
                    ->whereHas('invoiceItems.invoice', fn ($q) => $q->where('client_id', $clientId))
                    ->count();
                $data['stats']['facturer'] = Load::where('status', LoadStatus::FACTURER)
                    ->whereHas('invoiceItems.invoice', fn ($q) => $q->where('client_id', $clientId))
                    ->count();
                $data['stats']['facturer_payer'] = Load::where('status', LoadStatus::PAYE)
                    ->where('client_id', $clientId)
                    ->count();

                // Règlements
                $paymentsQuery = ClientPayment::where('client_id', $clientId);
                if ($startDate) {
                    $paymentsQuery->where('date', '>=', $startDate);
                }
                if ($endDate) {
                    $paymentsQuery->where('date', '<=', $endDate);
                }
                $data['payments'] = $paymentsQuery->orderBy('date', 'desc')->get();
                $data['total_payments'] = (float) $data['payments']->sum('amount');

                // Livraisons (uniquement FACTURER et FACTURER ET PAYER selon l'énoncé pour le listing principal)
                // Note: L'énoncé dit "on aura aussi la liste des livraisons avec le statut (FACTURER ET FACTURER ET PAYER)"
                // Mais il dit aussi "Seul les livraisons "FACTURER" seront selectionnable pour etre payé"
                $loadsQuery = Load::where(function ($query) use ($clientId) {
                    $query->where('client_id', $clientId)
                        ->whereIn('status', [LoadStatus::FACTURE_PARTIELLE, LoadStatus::FACTURER, LoadStatus::PAYE]);
                })
                    ->with(['invoiceItems.invoice']);

                if ($startDate) {
                    $loadsQuery->whereDate('unload_date', '>=', $startDate);
                }
                if ($endDate) {
                    $loadsQuery->whereDate('unload_date', '<=', $endDate);
                }

                $loads = $loadsQuery->orderBy('unload_date', 'desc')->get();

                $data['loads'] = $loads->map(function ($load) use ($clientId) {
                    $invoiceItem = $load->invoiceItems
                        ->first(fn (InvoiceItem $item) => $item->invoice?->client_id === (int) $clientId)
                        ?? $load->invoiceItems->first();

                    return [
                        'id' => $load->id,
                        'numero' => $load->id,
                        'load_date' => $load->load_date?->format('Y-m-d'),
                        'unload_date' => $load->unload_date?->format('Y-m-d'),
                        'bl_number' => $invoiceItem?->bl_number ?? '',
                        'vehicle_registration' => $load->vehicle_registration,
                        'product' => $load->product,
                        'volume' => $load->volume,
                        'unit_price' => $invoiceItem?->unit_price ?? 0,
                        'missing_quantity' => $invoiceItem?->missing_quantity ?? 0,
                        'total_amount' => $invoiceItem?->total ?? 0,
                        'status' => $load->status->value,
                        'remaining_quantity' => $load->remainingQuantity(),
                        'is_paid' => $load->status === LoadStatus::PAYE,
                    ];
                });

                // Calcul du solde client (basé sur le relevé de compte)
                // Solde = Solde Initial + Total Facturé - Total Payé
                $totalInvoiced = Invoice::where('client_id', $clientId)->sum('total_amount');

                $data['current_balance'] = $data['initial_balance'] + (float) $totalInvoiced - (float) ClientPayment::where('client_id', $clientId)->sum('amount');
            }
        }

        return Inertia::render('clients/suivi-client', $data);
    }

    public function exportPdf(Request $request)
    {
        $clientId = $request->input('client_id');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        if (! $clientId) {
            return back()->with('error', 'Veuillez sélectionner un client.');
        }

        $client = Client::findOrFail($clientId);

        // Indicateurs financiers
        $initialBalance = (float) $client->initial_balance;

        $totalInvoiced = InvoiceItem::whereHas('loadDetails', function ($q) use ($clientId) {
            $q->where('client_id', $clientId);
        })->sum('total');

        $totalPaid = ClientPayment::where('client_id', $clientId)->sum('amount');

        $currentBalance = $initialBalance + (float) $totalInvoiced - (float) $totalPaid;

        // Total non facturé (Livraisons au statut LIVRER)
        // Note: Le montant n'est pas encore défini par une facture, mais on peut l'estimer ou juste compter.
        // On va aussi calculer le montant théorique si possible
        $notInvoicedLoads = Load::where('client_id', $clientId)
            ->where('status', LoadStatus::LIVRER)
            ->get();

        $totalNotInvoiced = $notInvoicedLoads->sum(function ($load) {
            return $load->volume * ($load->unit_price ?? 0); // Si unit_price existe sur Load
        });

        // Listes des livraisons
        $loadsQuery = Load::where(function ($query) use ($clientId) {
            $query->where('client_id', $clientId)
                ->orWhereHas('invoiceItems.invoice', fn ($query) => $query->where('client_id', $clientId));
        })->with('invoiceItems');

        if ($startDate) {
            $loadsQuery->whereDate('unload_date', '>=', $startDate);
        }
        if ($endDate) {
            $loadsQuery->whereDate('unload_date', '<=', $endDate);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $loadsQuery->where(function ($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                    ->orWhere('vehicle_registration', 'like', "%{$search}%")
                    ->orWhere('client_name', 'like', "%{$search}%")
                    ->orWhere('unload_location', 'like', "%{$search}%");
            });
        }

        if ($request->filled('product_filter') && $request->product_filter !== 'all') {
            $loadsQuery->where('product', $request->product_filter);
        }

        if ($request->filled('status_filter') && $request->status_filter !== 'all') {
            if ($request->status_filter === 'FACTURER ET PAYER') {
                $loadsQuery->where('status', LoadStatus::PAYE);
            } elseif ($request->status_filter === 'FACTURE PARTIELLE') {
                $loadsQuery->where('status', LoadStatus::FACTURE_PARTIELLE);
            } elseif ($request->status_filter === 'FACTURER') {
                $loadsQuery->where('status', LoadStatus::FACTURER);
            }
        }

        $allLoads = $loadsQuery->orderBy('unload_date', 'desc')->get();

        $loadsFacturer = $allLoads->filter(fn($l) => $l->status === LoadStatus::FACTURER || $l->status === LoadStatus::FACTURE_PARTIELLE);
        $loadsFacturerPayer = $allLoads->where('status', LoadStatus::PAYE);
        $loadsLivrer = $allLoads->where('status', LoadStatus::LIVRER);

        // Liste des règlements
        $paymentsQuery = ClientPayment::where('client_id', $clientId);

        if ($startDate) {
            $paymentsQuery->whereDate('date', '>=', $startDate);
        }
        if ($endDate) {
            $paymentsQuery->whereDate('date', '<=', $endDate);
        }

        $payments = $paymentsQuery->orderBy('date', 'desc')->get();

        $pdf = Pdf::loadView('reports.suivi-client-pdf', [
            'client' => $client,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'stats' => [
                'initial_balance' => $initialBalance,
                'total_invoiced' => $totalInvoiced,
                'total_paid' => $totalPaid,
                'current_balance' => $currentBalance,
                'total_not_invoiced' => $totalNotInvoiced,
            ],
            'loadsFacturer' => $loadsFacturer,
            'loadsFacturerPayer' => $loadsFacturerPayer,
            'loadsLivrer' => $loadsLivrer,
            'payments' => $payments,
        ]);

        return $pdf->download("suivi-client-{$client->nom}.pdf");
    }

    public function processPayment(Request $request)
    {
        $request->validate([
            'load_ids' => 'required|array',
            'load_ids.*' => 'exists:loads,id',
            'missings' => 'required|array',
            'missings.*' => 'nullable|numeric|min:0',
        ]);

        $loadIds = $request->load_ids;
        $missings = $request->missings; // [load_id => missing_quantity]

        DB::transaction(function () use ($loadIds, $missings) {
            foreach ($loadIds as $loadId) {
                $load = Load::where('status', LoadStatus::FACTURER)->findOrFail($loadId);
                $invoiceItem = InvoiceItem::where('load_id', $loadId)->first();

                if ($invoiceItem) {
                    $invoiceItem->markPaidWithMissingQuantity((float) ($missings[$loadId] ?? 0));
                }

                $load->status = LoadStatus::PAYE;
                $load->client_payment_id = null;
                $load->save();
            }
        });

        return back()->with('success', 'Livraisons marquées comme payées avec succès.');
    }

    public function resetLoadToInvoiced(Load $load)
    {
        if ($load->status !== LoadStatus::PAYE) {
            return back()->with('error', 'Seules les livraisons payées peuvent être remises à l\'état facturé.');
        }

        DB::transaction(function () use ($load) {
            $invoiceItem = InvoiceItem::where('load_id', $load->id)->first();

            if ($invoiceItem) {
                $invoiceItem->restorePaymentMissingQuantity();
            }

            $load->status = LoadStatus::FACTURER;
            $load->is_paid = false;
            $load->client_payment_id = null;
            $load->save();
        });

        return back()->with('success', 'La livraison a été remise à l\'état facturé.');
    }

    public function getInvoices(Client $client)
    {
        return response()->json([
            'load_invoices' => $client->invoices()
                ->with(['items.loadDetails'])
                ->orderBy('date', 'desc')
                ->get()
                ->map(fn ($invoice) => [
                    'id' => $invoice->id,
                    'number' => $invoice->number,
                    'client_id' => $invoice->client_id,
                    'date' => $invoice->date ? Carbon::parse($invoice->date)->format('Y-m-d') : null,
                    'total_amount' => (float) $invoice->total_amount,
                    'total_missing' => (float) $invoice->total_missing,
                    'items' => $invoice->items->map(fn ($item) => [
                        'id' => $item->id,
                        'load_id' => $item->load_id,
                        'bl_number' => $item->bl_number,
                        'product' => $item->loadDetails?->product ?? 'N/A',
                        'quantity' => (float) $item->quantity_delivered,
                        'missing_quantity' => (float) $item->missing_quantity,
                        'is_partial' => (bool) $item->is_partial,
                        'remaining_quantity' => $item->is_partial ? ($item->loadDetails?->remainingQuantity($invoice->id) ?? 0) : 0,
                        'unit_price' => (float) $item->unit_price,
                        'total' => (float) $item->total,
                        'vehicle_registration' => $item->loadDetails?->vehicle_registration,
                    ]),
                ]),
            'depot_invoices' => $client->depotInvoices()
                ->with(['items.compartment'])
                ->orderBy('date', 'desc')
                ->get()
                ->map(fn ($invoice) => [
                    'id' => $invoice->id,
                    'number' => $invoice->number,
                    'client_id' => $invoice->client_id,
                    'depot_id' => $invoice->depot_id,
                    'date' => $invoice->date?->format('Y-m-d'),
                    'total_amount' => (float) $invoice->total_amount,
                    'items' => $invoice->items->map(fn ($item) => [
                        'id' => $item->id,
                        'compartment_id' => $item->compartment_id,
                        'product' => $item->compartment?->product ?? $invoice->product ?? 'N/A',
                        'quantity' => (float) $item->quantity,
                        'missing_quantity' => 0,
                        'unit_price' => (float) $item->unit_price,
                        'total' => (float) $item->total,
                    ]),
                ]),
        ]);
    }
}
