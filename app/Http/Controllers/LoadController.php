<?php

namespace App\Http\Controllers;

use App\Concerns\GeneratesPdf;
use App\Enums\LoadStatus;
use App\Http\Requests\LoadRequest;
use App\Models\City;
use App\Models\Client;
use App\Models\Compartment;
use App\Models\Depot;
use App\Models\InvoiceItem;
use App\Models\Load;
use App\Services\StockAdjustmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class LoadController extends Controller
{
    use GeneratesPdf;

    public function __construct(private readonly StockAdjustmentService $stock) {}

    public function index(Request $request): Response
    {
        $query = Load::whereIn('status', LoadStatus::activeLoads())
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
        $totalLoads = $loads->count();
        $totalVolume = $loads->sum('volume');
        $totalRemaining = (float) $loads->sum(fn ($l) => $l->remaining_quantity);

        $statsByProduct = $loads->groupBy('product')->map(fn ($group) => [
            'product' => $group->first()->product,
            'count' => $group->count(),
            'volume' => $group->sum('volume'),
            'remaining' => (float) $group->sum(fn ($l) => $l->remaining_quantity),
        ])->values();

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
                'total_remaining' => $totalRemaining,
            ],
            'filters' => $request->only(['product', 'date_from', 'date_to', 'load_locations']),
            'distinct_locations' => Load::whereIn('status', LoadStatus::activeLoads())->whereNotNull('load_location')->distinct()->pluck('load_location'),
        ]);
    }

    public function store(LoadRequest $request)
    {
        $validated = $request->validated();

        if (empty($validated['depot_id'])) {
            $validated['depot_id'] = null;
        }

        if (empty($validated['compartment_id'])) {
            $validated['compartment_id'] = null;
        }

        $validated['status'] = LoadStatus::EN_COURS;

        $load = DB::transaction(function () use ($validated) {
            $load = Load::create($validated);

            $compartment = $this->resolveCompartment($load);

            if ($compartment) {
                if (empty($load->compartment_id)) {
                    $load->update(['compartment_id' => $compartment->id]);
                }

                $this->stock->decrement($compartment->id, (float) $load->volume);
            }

            return $load;
        });

        return back()->with('message', 'Chargement créé avec succès');
    }

    public function update(LoadRequest $request, Load $chargement)
    {
        $validated = $request->validated();

        if (empty($validated['depot_id'])) {
            $validated['depot_id'] = null;
        }

        if (empty($validated['compartment_id'])) {
            $validated['compartment_id'] = null;
        }

        DB::transaction(function () use ($validated, $chargement) {
            $oldVolume = (float) $chargement->volume;
            $oldCompartmentId = $chargement->compartment_id;

            $chargement->update($validated);

            if (empty($chargement->compartment_id)) {
                $resolvedCompartment = $this->resolveCompartment($chargement);
                if ($resolvedCompartment) {
                    $chargement->update(['compartment_id' => $resolvedCompartment->id]);
                }
            }

            $newVolume = (float) $chargement->volume;
            $newCompartmentId = $chargement->compartment_id;

            // Si le compartiment n'a pas changé, on ajuste la différence
            if ($oldCompartmentId == $newCompartmentId) {
                $this->stock->decrement($newCompartmentId, $newVolume - $oldVolume);
            } else {
                // Si le compartiment a changé : restaurer l'ancien, déduire du nouveau
                $this->stock->increment($oldCompartmentId, $oldVolume);
                $this->stock->decrement($newCompartmentId, $newVolume);
            }

            // Sync with invoice item if it exists
            $invoiceItem = InvoiceItem::where('load_id', $chargement->id)->first();
            if ($invoiceItem && in_array($chargement->status, [LoadStatus::FACTURER, LoadStatus::PAYE], true)) {
                $invoiceItem->syncDeliveredQuantity($newVolume);
            }
        });

        return back()->with('message', 'Chargement mis à jour avec succès');
    }

    /**
     * Résout le compartiment de stock associé à un chargement. Si aucun compartiment
     * n'est explicitement renseigné, on le retrouve via le dépôt et le produit
     * (ex: sélection manuelle du produit côté formulaire sans passer par le select du compartiment).
     */
    private function resolveCompartment(Load $load): ?Compartment
    {
        if (! empty($load->compartment_id)) {
            return Compartment::find($load->compartment_id);
        }

        if (empty($load->depot_id)) {
            return null;
        }

        return Compartment::where('depot_id', $load->depot_id)
            ->where('product', $load->product)
            ->first();
    }

    public function destroy(Load $chargement)
    {
        DB::transaction(function () use ($chargement) {
            $volume = (float) $chargement->volume;
            $compartmentId = $chargement->compartment_id;

            $chargement->delete();

            $this->stock->increment($compartmentId, $volume);
        });

        return back()->with('message', 'Chargement supprimé avec succès');
    }

    public function downloadPdf(Request $request)
    {
        $query = Load::whereIn('status', LoadStatus::activeLoads())
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

        return $this->downloadPdfView('operations.loads_pdf', [
            'loads' => $loads,
            'filters' => $request->only(['product', 'date_from', 'date_to', 'load_locations']),
        ], 'chargements_en_cours_'.date('Ymd_His').'.pdf');
    }
}
