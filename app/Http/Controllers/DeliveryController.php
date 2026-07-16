<?php

namespace App\Http\Controllers;

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\Load;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DeliveryController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->input('status');

        if ($status) {
            if (str_contains($status, ',')) {
                $query = Load::whereIn('status', explode(',', $status));
            } else {
                $query = Load::where('status', $status);
            }
        } else {
            $query = Load::whereIn('status', [LoadStatus::LIVRER, LoadStatus::FACTURER, LoadStatus::PAYE]);
        }

        $query->with(['depot', 'city', 'client', 'compartment', 'invoiceItems']);

        // Filters
        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }
        if ($request->filled('product')) {
            $query->where('product', $request->product);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('unload_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('unload_date', '<=', $request->date_to);
        }

        if ($request->filled('load_locations')) {
            $locations = is_array($request->load_locations) ? $request->load_locations : explode(',', $request->load_locations);
            $query->whereIn('load_location', $locations);
        }

        $deliveries = $query->latest('unload_date')->get();

        if ($request->wantsJson()) {
            return response()->json($deliveries);
        }

        // Statistics
        $statsByProduct = $deliveries->groupBy('product')->map(fn ($group) => [
            'product' => $group->first()->product,
            'count' => $group->count(),
            'volume' => $group->sum('volume'),
        ])->values();

        $totalLoads = $deliveries->count();
        $totalVolume = $deliveries->sum('volume');

        return Inertia::render('operations/livraisons', [
            'deliveries' => $deliveries,
            'clients' => Client::all(),
            'stats' => [
                'by_product' => $statsByProduct,
                'total_loads' => $totalLoads,
                'total_volume' => $totalVolume,
            ],
            'filters' => $request->only(['product', 'date_from', 'date_to', 'load_locations']),
            'distinct_locations' => Load::whereIn('status', [LoadStatus::LIVRER, LoadStatus::FACTURER, LoadStatus::PAYE])
                ->whereNotNull('load_location')
                ->distinct()
                ->pluck('load_location'),
        ]);
    }

    public function deliver(Request $request, Load $chargement)
    {
        $validated = $request->validate([
            'unload_date' => 'required|date',
            'unload_location' => 'required|string|max:255',
            'client_id' => 'nullable|exists:clients,id',
            'client_name' => 'nullable|string|max:255',
        ]);

        if (empty($validated['client_id']) && ! empty($validated['client_name'])) {
            $client = Client::firstOrCreate(['nom' => $validated['client_name']]);
            $validated['client_id'] = $client->id;
        }

        $chargement->update([
            'unload_date' => $validated['unload_date'],
            'unload_location' => $validated['unload_location'],
            'client_id' => $validated['client_id'],
            'status' => LoadStatus::LIVRER,
        ]);

        return back()->with('message', 'Livraison effectuée avec succès');
    }

    public function update(Request $request, Load $livraison)
    {
        $validated = $request->validate([
            'unload_date' => 'required|date',
            'unload_location' => 'required|string|max:255',
            'client_id' => 'nullable|exists:clients,id',
            'client_name' => 'nullable|string|max:255',
        ]);

        if (empty($validated['client_id']) && ! empty($validated['client_name'])) {
            $client = Client::firstOrCreate(['nom' => $validated['client_name']]);
            $validated['client_id'] = $client->id;
        }

        $livraison->update([
            'unload_date' => $validated['unload_date'],
            'unload_location' => $validated['unload_location'],
            'client_id' => $validated['client_id'],
        ]);

        return back()->with('message', 'Livraison mise à jour avec succès');
    }

    public function destroy(Load $livraison)
    {
        // Lorsqu'on supprime une livraison, on remet le chargement en statut EN COURS
        $livraison->update([
            'unload_date' => null,
            'unload_location' => null,
            'status' => LoadStatus::EN_COURS,
        ]);

        return back()->with('message', 'Livraison annulée avec succès, le chargement est repassé en cours');
    }

    public function downloadPdf(Request $request)
    {
        $status = $request->input('status');

        if ($status) {
            if (str_contains($status, ',')) {
                $query = Load::whereIn('status', explode(',', $status));
            } else {
                $query = Load::where('status', $status);
            }
        } else {
            $query = Load::whereIn('status', [LoadStatus::LIVRER, LoadStatus::FACTURER, LoadStatus::PAYE]);
        }

        $query->with(['depot', 'city', 'client', 'compartment', 'invoiceItems']);

        // Filters
        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }
        if ($request->filled('product')) {
            $query->where('product', $request->product);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('unload_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('unload_date', '<=', $request->date_to);
        }

        if ($request->filled('load_locations')) {
            $locations = is_array($request->load_locations) ? $request->load_locations : explode(',', $request->load_locations);
            $query->whereIn('load_location', $locations);
        }

        $deliveries = $query->latest('unload_date')->get();

        $pdf = Pdf::loadView('operations.deliveries_pdf', [
            'deliveries' => $deliveries,
            'filters' => $request->only(['product', 'date_from', 'date_to', 'load_locations', 'client_id']),
        ]);

        return $pdf->download('livraisons_'.date('Ymd_His').'.pdf');
    }
}
