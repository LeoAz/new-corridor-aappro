<?php

namespace App\Http\Controllers;

use App\Concerns\GeneratesPdf;
use App\Enums\LoadStatus;
use App\Models\Depot;
use App\Models\DepotInvoiceItem;
use App\Models\FuelPurchase;
use App\Models\Load;
use App\Services\Exports\SuiviStockExport;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StockTrackingController extends Controller
{
    use GeneratesPdf;

    public function index(Request $request)
    {
        $depots = Depot::with('compartments')->get();

        $filters = [
            'depot_id' => $request->get('depot_id', $depots->first()?->id),
            'date_from' => $request->get('date_from', now()->startOfMonth()->toDateString()),
            'date_to' => $request->get('date_to', now()->toDateString()),
            'compartment_id' => $request->get('compartment_id'),
        ];

        $selectedDepot = Depot::with('compartments')->find($filters['depot_id']);

        // Historique des achats
        $purchases = FuelPurchase::where('depot_id', $filters['depot_id'])
            ->whereBetween('purchase_date', [$filters['date_from'].' 00:00:00', $filters['date_to'].' 23:59:59'])
            ->when($filters['compartment_id'], function ($query, $compartmentId) {
                return $query->where('compartment_id', $compartmentId);
            })
            ->with(['compartment'])
            ->orderBy('purchase_date', 'desc')
            ->get();

        // Historique des chargements (Sorties en cours)
        $chargements = Load::where('depot_id', $filters['depot_id'])
            ->whereBetween('load_date', [$filters['date_from'].' 00:00:00', $filters['date_to'].' 23:59:59'])
            ->where('status', LoadStatus::EN_COURS)
            ->when($filters['compartment_id'], function ($query, $compartmentId) {
                return $query->where('compartment_id', $compartmentId);
            })
            ->with(['client', 'compartment'])
            ->orderBy('load_date', 'desc')
            ->get();

        // Historique des livraisons (Sorties confirmées)
        $livraisons = Load::where('depot_id', $filters['depot_id'])
            ->whereBetween('load_date', [$filters['date_from'].' 00:00:00', $filters['date_to'].' 23:59:59'])
            ->where('status', '!=', LoadStatus::EN_COURS)
            ->when($filters['compartment_id'], function ($query, $compartmentId) {
                return $query->where('compartment_id', $compartmentId);
            })
            ->with(['client', 'compartment'])
            ->orderBy('load_date', 'desc')
            ->get();

        // Historique des ventes directes (Factures dépôt)
        $depotSales = DepotInvoiceItem::whereHas('depotInvoice', function ($query) use ($filters) {
            $query->where('depot_id', $filters['depot_id'])
                ->whereBetween('date', [$filters['date_from'].' 00:00:00', $filters['date_to'].' 23:59:59']);
        })
            ->when($filters['compartment_id'], function ($query, $compartmentId) {
                return $query->where('compartment_id', $compartmentId);
            })
            ->with(['depotInvoice.client', 'compartment'])
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->depotInvoice->date->toDateString(),
                    'client' => $item->depotInvoice->client->nom,
                    'compartment' => $item->compartment->product,
                    'quantity' => $item->quantity,
                    'number' => $item->depotInvoice->number,
                ];
            })
            ->sortByDesc('date')
            ->values();

        return Inertia::render('stocks/suivi-stock', [
            'depots' => $depots,
            'selectedDepot' => $selectedDepot,
            'purchases' => $purchases,
            'chargements' => $chargements,
            'livraisons' => $livraisons,
            'depotSales' => $depotSales,
            'filters' => $filters,
        ]);
    }

    public function downloadPdf(Request $request)
    {
        return $this->downloadPdfExport(app(SuiviStockExport::class), $request->all());
    }
}
