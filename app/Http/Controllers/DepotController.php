<?php

namespace App\Http\Controllers;

use App\Models\Depot;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DepotController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('configuration/depots', [
            'depots' => Depot::with('compartments')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'compartments' => 'nullable|array',
            'compartments.*.product' => 'required|string|max:255',
            'compartments.*.quantity' => 'nullable|numeric|min:0',
        ]);

        DB::transaction(function () use ($validated) {
            $depot = Depot::create(['name' => $validated['name']]);

            if (! empty($validated['compartments'])) {
                foreach ($validated['compartments'] as $compartment) {
                    $depot->compartments()->create([
                        'product' => $compartment['product'],
                        'quantity' => $compartment['quantity'] ?? 0,
                    ]);
                }
            }
        });

        return redirect()->back();
    }

    public function update(Request $request, Depot $depot): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'compartments' => 'nullable|array',
            'compartments.*.id' => 'nullable|exists:compartments,id',
            'compartments.*.product' => 'required|string|max:255',
            'compartments.*.quantity' => 'nullable|numeric|min:0',
        ]);

        DB::transaction(function () use ($depot, $validated) {
            $depot->update(['name' => $validated['name']]);

            $existingIds = [];
            if (! empty($validated['compartments'])) {
                foreach ($validated['compartments'] as $compartmentData) {
                    if (isset($compartmentData['id'])) {
                        $comp = $depot->compartments()->find($compartmentData['id']);
                        if ($comp) {
                            $comp->update([
                                'product' => $compartmentData['product'],
                                'quantity' => $compartmentData['quantity'] ?? 0,
                            ]);
                            $existingIds[] = $comp->id;
                        }
                    } else {
                        $newComp = $depot->compartments()->create([
                            'product' => $compartmentData['product'],
                            'quantity' => $compartmentData['quantity'] ?? 0,
                        ]);
                        $existingIds[] = $newComp->id;
                    }
                }
            }

            // Supprimer les compartiments qui ne sont plus dans la liste
            $depot->compartments()->whereNotIn('id', $existingIds)->delete();
        });

        return redirect()->back();
    }

    public function destroy(Depot $depot): RedirectResponse
    {
        $depot->delete();

        return redirect()->back();
    }
}
