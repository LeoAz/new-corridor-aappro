<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClientRequest;
use App\Models\Client;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        return Inertia::render('clients/gestion', [
            'clients' => Client::orderBy('nom')->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(ClientRequest $request): RedirectResponse
    {
        Client::create($request->validated());

        return redirect()->back()->with('success', 'Client créé avec succès.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(ClientRequest $request, Client $client): RedirectResponse
    {
        $client->update($request->validated());

        return redirect()->back()->with('success', 'Client mis à jour avec succès.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Client $client): RedirectResponse
    {
        $hasHistory = $client->loads()->exists()
            || $client->invoices()->exists()
            || $client->depotInvoices()->exists()
            || $client->payments()->exists();

        if ($hasHistory) {
            return redirect()->back()->with(
                'error',
                'Ce client a des chargements, factures ou règlements associés et ne peut pas être supprimé.',
            );
        }

        $client->delete();

        return redirect()->back()->with('success', 'Client supprimé avec succès.');
    }
}
