<?php

namespace App\Http\Controllers;

use App\Models\City;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CityController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        return Inertia::render('settings/cities', [
            'cities' => City::orderBy('name')->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:cities,name',
        ]);

        City::create($validated);

        return redirect()->back()->with('success', 'Ville ajoutée avec succès.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, City $city): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:cities,name,'.$city->id,
        ]);

        $city->update($validated);

        return redirect()->back()->with('success', 'Ville mise à jour avec succès.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(City $city): RedirectResponse
    {
        if ($city->loads()->exists()) {
            return redirect()->back()->with('error', 'Impossible de supprimer cette ville car elle est liée à des chargements.');
        }

        $city->delete();

        return redirect()->back()->with('success', 'Ville supprimée avec succès.');
    }
}
