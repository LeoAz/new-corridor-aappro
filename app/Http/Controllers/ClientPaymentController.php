<?php

namespace App\Http\Controllers;

use App\Enums\PaymentMethod;
use App\Models\ClientPayment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

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
        $reglement->delete();

        return redirect()->back()->with('success', 'Règlement supprimé avec succès.');
    }
}
