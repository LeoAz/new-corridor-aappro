<?php

namespace App\Http\Controllers;

use App\Concerns\FiltersByDateRange;
use App\Concerns\GeneratesPdf;
use App\Http\Requests\FuelPurchaseRequest;
use App\Models\Depot;
use App\Models\FuelPurchase;
use App\Services\StockAdjustmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class FuelPurchaseController extends Controller
{
    use FiltersByDateRange;
    use GeneratesPdf;

    public function __construct(private readonly StockAdjustmentService $stock) {}

    public function index(Request $request): Response
    {
        $query = FuelPurchase::with(['depot', 'compartment'])
            ->when($request->filled('product'), fn ($q) => $q->where('product', $request->product));
        $query = $this->applyDateRange($query, $request, 'purchase_date');

        $purchases = $query->latest()->get();

        return Inertia::render('finances/achat-carburant', [
            'purchases' => $purchases,
            'depots' => Depot::with('compartments')->get(),
            'filters' => $request->only(['product', 'date_from', 'date_to']),
        ]);
    }

    public function store(FuelPurchaseRequest $request)
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated) {
            $purchase = FuelPurchase::create($validated);

            $this->stock->increment($purchase->compartment_id, (float) $purchase->quantity);
        });

        return back()->with('message', 'Achat de carburant enregistré avec succès');
    }

    public function update(FuelPurchaseRequest $request, FuelPurchase $achat_carburant)
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $achat_carburant) {
            $oldQuantity = (float) $achat_carburant->quantity;
            $oldCompartmentId = $achat_carburant->compartment_id;

            $achat_carburant->update($validated);

            $newQuantity = (float) $achat_carburant->quantity;
            $newCompartmentId = $achat_carburant->compartment_id;

            if ($oldCompartmentId == $newCompartmentId) {
                $this->stock->increment($newCompartmentId, $newQuantity - $oldQuantity);
            } else {
                // 1. Déduire de l'ancien, 2. Ajouter au nouveau
                $this->stock->decrement($oldCompartmentId, $oldQuantity);
                $this->stock->increment($newCompartmentId, $newQuantity);
            }
        });

        return back()->with('message', 'Achat de carburant mis à jour avec succès');
    }

    public function destroy(FuelPurchase $achat_carburant)
    {
        DB::transaction(function () use ($achat_carburant) {
            $quantity = (float) $achat_carburant->quantity;
            $compartmentId = $achat_carburant->compartment_id;

            $achat_carburant->delete();

            $this->stock->decrement($compartmentId, $quantity);
        });

        return back()->with('message', 'Achat de carburant supprimé avec succès');
    }

    public function downloadPdf(Request $request)
    {
        $query = FuelPurchase::with(['depot', 'compartment'])
            ->when($request->filled('product'), fn ($q) => $q->where('product', $request->product));
        $query = $this->applyDateRange($query, $request, 'purchase_date');

        $purchases = $query->latest()->get();

        return $this->downloadPdfView('finances.fuel_purchases_pdf', [
            'purchases' => $purchases,
            'filters' => $request->only(['product', 'date_from', 'date_to']),
        ], 'achats_carburant_'.date('Ymd_His').'.pdf');
    }
}
