<?php

namespace App\Http\Controllers;

use App\Models\Compartment;
use App\Models\Depot;
use App\Models\FuelPurchase;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class FuelPurchaseController extends Controller
{
    public function index(Request $request): Response
    {
        $query = FuelPurchase::with(['depot', 'compartment']);

        if ($request->filled('product')) {
            $query->where('product', $request->product);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('purchase_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('purchase_date', '<=', $request->date_to);
        }

        $purchases = $query->latest()->get();

        return Inertia::render('finances/achat-carburant', [
            'purchases' => $purchases,
            'depots' => Depot::with('compartments')->get(),
            'filters' => $request->only(['product', 'date_from', 'date_to']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'purchase_date' => 'required|date',
            'product' => 'required|string|max:255',
            'quantity' => 'required|numeric|min:0',
            'unit_price' => 'required|numeric|min:0',
            'total_price' => 'required|numeric|min:0',
            'depot_id' => 'required|exists:depots,id',
            'compartment_id' => 'required|exists:compartments,id',
        ]);

        DB::transaction(function () use ($validated) {
            $purchase = FuelPurchase::create($validated);

            $compartment = Compartment::find($purchase->compartment_id);
            if ($compartment) {
                $compartment->increment('quantity', (float) $purchase->quantity);
            }
        });

        return back()->with('message', 'Achat de carburant enregistré avec succès');
    }

    public function update(Request $request, FuelPurchase $achat_carburant)
    {
        $validated = $request->validate([
            'purchase_date' => 'required|date',
            'product' => 'required|string|max:255',
            'quantity' => 'required|numeric|min:0',
            'unit_price' => 'required|numeric|min:0',
            'total_price' => 'required|numeric|min:0',
            'depot_id' => 'required|exists:depots,id',
            'compartment_id' => 'required|exists:compartments,id',
        ]);

        DB::transaction(function () use ($validated, $achat_carburant) {
            $oldQuantity = (float) $achat_carburant->quantity;
            $oldCompartmentId = $achat_carburant->compartment_id;

            $achat_carburant->update($validated);

            $newQuantity = (float) $achat_carburant->quantity;
            $newCompartmentId = $achat_carburant->compartment_id;

            if ($oldCompartmentId == $newCompartmentId) {
                $compartment = Compartment::find($newCompartmentId);
                if ($compartment) {
                    $compartment->increment('quantity', $newQuantity - $oldQuantity);
                }
            } else {
                // 1. Déduire de l'ancien
                $oldCompartment = Compartment::find($oldCompartmentId);
                if ($oldCompartment) {
                    $oldCompartment->decrement('quantity', $oldQuantity);
                }
                // 2. Ajouter au nouveau
                $newCompartment = Compartment::find($newCompartmentId);
                if ($newCompartment) {
                    $newCompartment->increment('quantity', $newQuantity);
                }
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

            $compartment = Compartment::find($compartmentId);
            if ($compartment) {
                $compartment->decrement('quantity', $quantity);
            }
        });

        return back()->with('message', 'Achat de carburant supprimé avec succès');
    }

    public function downloadPdf(Request $request)
    {
        $query = FuelPurchase::with(['depot', 'compartment']);

        if ($request->filled('product')) {
            $query->where('product', $request->product);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('purchase_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('purchase_date', '<=', $request->date_to);
        }

        $purchases = $query->latest()->get();

        $pdf = Pdf::loadView('finances.fuel_purchases_pdf', [
            'purchases' => $purchases,
            'filters' => $request->only(['product', 'date_from', 'date_to']),
        ]);

        return $pdf->download('achats_carburant_'.date('Ymd_His').'.pdf');
    }
}
