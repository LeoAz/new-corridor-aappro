<?php

namespace App\Http\Controllers;

use App\Concerns\FiltersByDateRange;
use App\Concerns\GeneratesPdf;
use App\Models\Client;
use App\Models\Depot;
use App\Services\Exports\ChargementsReportExport;
use App\Services\Exports\LivraisonsReportExport;
use App\Services\Exports\VentesChargementReportExport;
use App\Services\Exports\VentesDepotReportExport;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    use FiltersByDateRange;
    use GeneratesPdf;

    public function __construct(
        private readonly ChargementsReportExport $chargementsReport,
        private readonly LivraisonsReportExport $livraisonsReport,
        private readonly VentesChargementReportExport $ventesChargementReport,
        private readonly VentesDepotReportExport $ventesDepotReport,
    ) {}

    public function chargements(Request $request)
    {
        $loads = $this->chargementsReport->loads($request->all());

        $stats = [
            'total_trucks' => $loads->count(),
            'total_volume' => $loads->sum('volume'),
            'total_remaining' => (float) $loads->sum(fn ($l) => $l->remaining_quantity),
            'by_product' => $loads->groupBy('product')->map(fn ($group, $product) => [
                'product' => $product ?: 'INCONNU',
                'count' => $group->count(),
                'volume' => $group->sum('volume'),
                'remaining' => (float) $group->sum(fn ($l) => $l->remaining_quantity),
            ])->values()->toArray(),
        ];

        return Inertia::render('reports/chargements', [
            'loads' => $loads,
            'stats' => $stats,
            'filters' => $request->only(['date_from', 'date_to', 'product', 'load_location', 'client_id']),
            'clients' => Client::all(['id', 'nom']),
            'depots' => Depot::all(['id', 'name']),
        ]);
    }

    public function downloadChargements(Request $request)
    {
        return $this->downloadPdfExport($this->chargementsReport, $request->all());
    }

    public function livraisons(Request $request)
    {
        $loads = $this->livraisonsReport->query($request)->orderBy('unload_date', 'desc')->get();

        $stats = [
            'total_trucks' => $loads->count(),
            'total_volume' => $loads->sum('volume'),
            'by_product' => $loads->groupBy('product')->map(fn ($group, $product) => [
                'product' => $product ?: 'INCONNU',
                'count' => $group->count(),
                'volume' => $group->sum('volume'),
            ])->values()->toArray(),
            'by_client_product' => $this->livraisonsReport->truckCountsByClientAndProduct($loads),
        ];

        return Inertia::render('reports/livraisons', [
            'loads' => $loads,
            'stats' => $stats,
            'filters' => $request->only(['date_from', 'date_to', 'product', 'unload_location', 'client_id']),
            'clients' => Client::all(['id', 'nom']),
        ]);
    }

    public function downloadLivraisons(Request $request)
    {
        return $this->downloadPdfExport($this->livraisonsReport, $request->all());
    }

    public function ventesChargement(Request $request)
    {
        $invoices = $this->ventesChargementReport->query($request)->orderBy('date', 'desc')->get();

        $stats = [
            'total_amount' => $invoices->sum('total_amount'),
            'total_invoices' => $invoices->count(),
        ];

        return Inertia::render('reports/ventes-chargement', [
            'invoices' => $invoices,
            'stats' => $stats,
            'filters' => $request->only(['date_from', 'date_to', 'client_id']),
            'clients' => Client::all(['id', 'nom']),
        ]);
    }

    public function downloadVentesChargement(Request $request)
    {
        return $this->downloadPdfExport($this->ventesChargementReport, $request->all());
    }

    public function ventesDepot(Request $request)
    {
        $invoices = $this->ventesDepotReport->query($request)->orderBy('date', 'desc')->get();

        $stats = [
            'total_amount' => $invoices->sum('total_amount'),
            'total_invoices' => $invoices->count(),
        ];

        return Inertia::render('reports/ventes-depot', [
            'invoices' => $invoices,
            'stats' => $stats,
            'filters' => $request->only(['date_from', 'date_to', 'client_id', 'depot_id']),
            'clients' => Client::all(['id', 'nom']),
            'depots' => Depot::all(['id', 'name']),
        ]);
    }

    public function downloadVentesDepot(Request $request)
    {
        return $this->downloadPdfExport($this->ventesDepotReport, $request->all());
    }
}
