<?php

namespace App\Http\Controllers;

use App\Enums\LoadStatus;
use App\Models\City;
use App\Models\Client;
use App\Models\Compartment;
use App\Models\Depot;
use App\Models\Load;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class LoadController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Load::where('status', LoadStatus::EN_COURS)
            ->with(['depot', 'city', 'client', 'compartment']);

        // Filters
        if ($request->filled('product')) {
            $query->where('product', $request->product);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('load_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('load_date', '<=', $request->date_to);
        }

        if ($request->filled('load_locations')) {
            $locations = is_array($request->load_locations) ? $request->load_locations : explode(',', $request->load_locations);
            $query->whereIn('load_location', $locations);
        }

        $loads = $query->latest()->get();

        // Statistics
        $statsByProduct = $loads->groupBy('product')->map(fn ($group) => [
            'product' => $group->first()->product,
            'count' => $group->count(),
            'volume' => $group->sum('volume'),
        ])->values();

        $totalLoads = $loads->count();
        $totalVolume = $loads->sum('volume');

        return Inertia::render('operations/chargements', [
            'loads' => $loads,
            'depots' => Depot::with('compartments')->get(),
            'cities' => City::all(),
            'clients' => Client::all(),
            'compartments' => Compartment::all(),
            'stats' => [
                'by_product' => $statsByProduct,
                'total_loads' => $totalLoads,
                'total_volume' => $totalVolume,
            ],
            'filters' => $request->only(['product', 'date_from', 'date_to', 'load_locations']),
            'distinct_locations' => Load::where('status', LoadStatus::EN_COURS)->whereNotNull('load_location')->distinct()->pluck('load_location'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'load_date' => 'required|date',
            'load_location' => 'nullable|string|max:255',
            'product' => 'required|string|max:255',
            'volume' => 'required|numeric|min:0',
            'vehicle_registration' => 'required|string|max:255',
            'depot_id' => 'required|exists:depots,id',
            'city_id' => 'nullable|exists:cities,id',
            'client_id' => 'nullable|exists:clients,id',
            'compartment_id' => 'nullable|exists:compartments,id',
            'client_name' => 'nullable|string|max:255',
        ]);

        $validated['status'] = LoadStatus::EN_COURS;

        $load = DB::transaction(function () use ($validated) {
            $load = Load::create($validated);

            if (! empty($load->compartment_id)) {
                $compartment = Compartment::find($load->compartment_id);
                if ($compartment) {
                    $compartment->decrement('quantity', (float) $load->volume);
                }
            }

            return $load;
        });

        return back()->with('message', 'Chargement créé avec succès');
    }

    public function update(Request $request, Load $chargement)
    {
        $validated = $request->validate([
            'load_date' => 'required|date',
            'load_location' => 'nullable|string|max:255',
            'product' => 'required|string|max:255',
            'volume' => 'required|numeric|min:0',
            'vehicle_registration' => 'required|string|max:255',
            'depot_id' => 'required|exists:depots,id',
            'city_id' => 'nullable|exists:cities,id',
            'client_id' => 'nullable|exists:clients,id',
            'compartment_id' => 'nullable|exists:compartments,id',
            'client_name' => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($validated, $chargement) {
            $oldVolume = (float) $chargement->volume;
            $oldCompartmentId = $chargement->compartment_id;

            $chargement->update($validated);

            $newVolume = (float) $chargement->volume;
            $newCompartmentId = $chargement->compartment_id;

            // Si le compartiment n'a pas changé, on ajuste la différence
            if ($oldCompartmentId == $newCompartmentId) {
                if ($newCompartmentId) {
                    $compartment = Compartment::find($newCompartmentId);
                    if ($compartment) {
                        $compartment->decrement('quantity', $newVolume - $oldVolume);
                    }
                }
            } else {
                // Si le compartiment a changé
                // 1. Restaurer dans l'ancien
                if ($oldCompartmentId) {
                    $oldCompartment = Compartment::find($oldCompartmentId);
                    if ($oldCompartment) {
                        $oldCompartment->increment('quantity', $oldVolume);
                    }
                }
                // 2. Déduire du nouveau
                if ($newCompartmentId) {
                    $newCompartment = Compartment::find($newCompartmentId);
                    if ($newCompartment) {
                        $newCompartment->decrement('quantity', $newVolume);
                    }
                }
            }
        });

        return back()->with('message', 'Chargement mis à jour avec succès');
    }

    public function destroy(Load $chargement)
    {
        DB::transaction(function () use ($chargement) {
            $volume = (float) $chargement->volume;
            $compartmentId = $chargement->compartment_id;

            $chargement->delete();

            if ($compartmentId) {
                $compartment = Compartment::find($compartmentId);
                if ($compartment) {
                    $compartment->increment('quantity', $volume);
                }
            }
        });

        return back()->with('message', 'Chargement supprimé avec succès');
    }

    public function downloadPdf(Request $request)
    {
        $query = Load::where('status', LoadStatus::EN_COURS)
            ->with(['depot', 'city', 'client', 'compartment']);

        if ($request->filled('product')) {
            $query->where('product', $request->product);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('load_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('load_date', '<=', $request->date_to);
        }

        if ($request->filled('load_locations')) {
            $locations = is_array($request->load_locations) ? $request->load_locations : explode(',', $request->load_locations);
            $query->whereIn('load_location', $locations);
        }

        $loads = $query->latest()->get();

        $pdf = Pdf::loadView('operations.loads_pdf', [
            'loads' => $loads,
            'filters' => $request->only(['product', 'date_from', 'date_to', 'load_locations']),
        ]);

        return $pdf->download('chargements_en_cours_'.date('Ymd_His').'.pdf');
    }
}
