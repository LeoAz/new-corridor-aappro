<?php

namespace App\Http\Controllers;

use App\Enums\PaymentMethod;
use App\Http\Requests\ClientPaymentRequest;
use App\Models\ClientPayment;
use Illuminate\Http\RedirectResponse;

class ClientPaymentController extends Controller
{
    public function store(ClientPaymentRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $validated['payment_method'] = PaymentMethod::fromValue($validated['payment_method']);

        ClientPayment::create($validated);

        return redirect()->back()->with('success', 'Règlement enregistré avec succès.');
    }

    public function update(ClientPaymentRequest $request, ClientPayment $clientPayment): RedirectResponse
    {
        $validated = $request->validated();
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
