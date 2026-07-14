<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'contact' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'initial_balance' => 'required|numeric',
        ]);

        Client::create($validated);

        return redirect()->back()->with('success', 'Client créé avec succès.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Client $client): RedirectResponse
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'contact' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'initial_balance' => 'required|numeric',
        ]);

        $client->update($validated);

        return redirect()->back()->with('success', 'Client mis à jour avec succès.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Client $client): RedirectResponse
    {
        // On pourrait ajouter des vérifications ici (si le client a des factures, etc.)
        $client->delete();

        return redirect()->back()->with('success', 'Client supprimé avec succès.');
    }
}
