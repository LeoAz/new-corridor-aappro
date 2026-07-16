<?php

namespace App\Http\Controllers;

use App\Enums\LoadStatus;
use App\Enums\PaymentMethod;
use App\Models\ClientPayment;
use App\Models\DepotInvoiceItem;
use App\Models\InvoiceItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientPaymentController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'date' => 'required|date',
            'payment_method' => 'required|string',
            'banque' => 'nullable|string',
            'numero' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'note' => 'nullable|string',
        ]);

        $validated['payment_method'] = PaymentMethod::fromValue($validated['payment_method']);

        ClientPayment::create($validated);

        return redirect()->back()->with('success', 'Règlement enregistré avec succès.');
    }

    public function update(Request $request, ClientPayment $clientPayment): RedirectResponse
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'payment_method' => 'required|string',
            'banque' => 'nullable|string',
            'numero' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'note' => 'nullable|string',
        ]);

        $validated['payment_method'] = PaymentMethod::fromValue($validated['payment_method']);

        $clientPayment->update($validated);

        return redirect()->back()->with('success', 'Règlement mis à jour avec succès.');
    }

    public function destroy(ClientPayment $reglement): RedirectResponse
    {
        try {
            DB::transaction(function () use ($reglement) {
                // 1. Détacher le règlement des items de facture (chargements) et remettre les montants
                $invoiceItems = InvoiceItem::where('client_payment_id', $reglement->id)->get();
                foreach ($invoiceItems as $invoiceItem) {
                    $invoiceItem->restorePaymentMissingQuantity();
                }

                // 2. Détacher le règlement des items de facture dépôt
                DepotInvoiceItem::where('client_payment_id', $reglement->id)->update([
                    'client_payment_id' => null,
                    'is_paid' => false,
                ]);

                // 3. Remettre les livraisons en statut FACTURER
                foreach ($reglement->loads()->get() as $load) {
                    $load->status = LoadStatus::FACTURER;
                    $load->client_payment_id = null;
                    $load->save();
                }

                // 4. Supprimer le règlement
                $reglement->delete();
            });
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Erreur lors de la suppression : '.$e->getMessage());
        }

        return redirect()->back()->with('success', 'Règlement supprimé avec succès. Les livraisons liées sont repassées au statut FACTURER.');
    }
}
