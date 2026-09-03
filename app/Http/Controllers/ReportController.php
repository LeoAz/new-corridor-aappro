<?php

namespace App\Http\Controllers;

use App\Concerns\FiltersByDateRange;
use App\Concerns\GeneratesPdf;
use App\Models\Client;
use App\Models\Depot;
use App\Models\DepotInvoice;
use App\Models\Invoice;
use App\Models\Load;
use App\Services\QrCodeGenerator;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    use FiltersByDateRange;
    use GeneratesPdf;

    /**
     * `invoiceItems` est eager-chargée pour que l'accesseur `remaining_quantity`
     * du modèle Load (appelé à la sérialisation et dans les agrégats ci-dessous)
     * utilise la relation déjà chargée au lieu de relancer une requête par ligne.
     */
    private function chargementsQuery(Request $request): Builder
    {
        $query = Load::query()->with(['client', 'depot', 'invoiceItems']);
        $query = $this->applyDateRange($query, $request, 'load_date');

        return $query
            ->when($request->filled('product'), fn ($q) => $q->where('product', $request->product))
            ->when($request->filled('load_location'), fn ($q) => $q->where('load_location', 'like', '%'.$request->load_location.'%'))
            ->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->client_id));
    }

    private function livraisonsQuery(Request $request): Builder
    {
        $query = Load::query()->whereNotNull('unload_date')->with(['client', 'depot', 'invoiceItems']);
        $query = $this->applyDateRange($query, $request, 'unload_date');

        return $query
            ->when($request->filled('product'), fn ($q) => $q->where('product', $request->product))
            ->when($request->filled('unload_location'), fn ($q) => $q->where('unload_location', 'like', '%'.$request->unload_location.'%'))
            ->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->client_id));
    }

    private function ventesChargementQuery(Request $request): Builder
    {
        $query = Invoice::query()->with(['client', 'items.loadDetails.invoiceItems']);
        $query = $this->applyDateRange($query, $request, 'date');

        return $query->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->client_id));
    }

    private function ventesDepotQuery(Request $request): Builder
    {
        $query = DepotInvoice::query()->with(['client', 'depot', 'items.compartment']);
        $query = $this->applyDateRange($query, $request, 'date');

        return $query
            ->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->client_id))
            ->when($request->filled('depot_id'), fn ($q) => $q->where('depot_id', $request->depot_id));
    }

    public function chargements(Request $request)
    {
        $loads = $this->chargementsQuery($request)->orderBy('load_date', 'desc')->get();

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
        $client = $request->filled('client_id') ? Client::find($request->client_id) : null;

        $loads = $this->chargementsQuery($request)->orderBy('load_date', 'desc')->get();
        $totalVolume = $loads->sum('volume');
        $totalRemaining = (float) $loads->sum(fn ($l) => $l->remaining_quantity);

        $stats = $loads->groupBy('product')->map(fn ($group, $product) => [
            'product' => $product ?: 'INCONNU',
            'count' => $group->count(),
            'volume' => $group->sum('volume'),
            'remaining' => (float) $group->sum(fn ($l) => $l->remaining_quantity),
        ])->values()->toArray();

        $depotStats = $loads->groupBy(fn ($load) => $load->depot->name ?? 'N/A')
            ->map(fn ($depotGroup) => $depotGroup->groupBy('product')
                ->map(fn ($productGroup, $product) => [
                    'product' => $product ?: 'INCONNU',
                    'count' => $productGroup->count(),
                    'volume' => $productGroup->sum('volume'),
                    'remaining' => (float) $productGroup->sum(fn ($l) => $l->remaining_quantity),
                ])
            )->toArray();

        $qrData = "Rapport Chargements\n";
        $qrData .= 'Date: '.now()->format('d/m/Y')."\n";
        $qrData .= 'Camions: '.$loads->count()."\n";
        $qrData .= 'Volume Init: '.number_format($totalVolume, 0, '.', ' ').' L'."\n";
        $qrData .= 'Reste: '.number_format($totalRemaining, 0, '.', ' ').' L';

        $qrcode = QrCodeGenerator::base64($qrData);

        return $this->downloadPdfView('reports.chargements_pdf', [
            'loads' => $loads,
            'stats' => $stats,
            'depotStats' => $depotStats,
            'totalVolume' => $totalVolume,
            'totalRemaining' => $totalRemaining,
            'filters' => $request->all(),
            'client' => $client,
            'qrcode' => $qrcode,
            'date' => now()->format('d/m/Y H:i'),
        ], 'rapport-chargements-'.now()->format('Y-m-d').'.pdf', 'a4', 'landscape');
    }

    public function livraisons(Request $request)
    {
        $loads = $this->livraisonsQuery($request)->orderBy('unload_date', 'desc')->get();

        $stats = [
            'total_trucks' => $loads->count(),
            'total_volume' => $loads->sum('volume'),
            'by_product' => $loads->groupBy('product')->map(fn ($group, $product) => [
                'product' => $product ?: 'INCONNU',
                'count' => $group->count(),
                'volume' => $group->sum('volume'),
            ])->values()->toArray(),
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
        $client = $request->filled('client_id') ? Client::find($request->client_id) : null;

        $loads = $this->livraisonsQuery($request)->orderBy('unload_date', 'desc')->get();
        $totalVolume = $loads->sum('volume');

        $stats = $loads->groupBy('product')->map(fn ($group, $product) => [
            'product' => $product ?: 'INCONNU',
            'count' => $group->count(),
            'volume' => $group->sum('volume'),
        ])->values()->toArray();

        $clientStats = $loads->groupBy(function ($item) {
            return $item->client->nom ?? 'Sans Client';
        })->map(fn ($group, $clientName) => [
            'client' => $clientName,
            'count' => $group->count(),
            'volume' => $group->sum('volume'),
        ])->values()->toArray();

        $groupedLoads = $loads->groupBy(function ($item) {
            return Carbon::parse($item->unload_date)->format('Y-m-d');
        })->map(function ($dateGroup) {
            return $dateGroup->groupBy(function ($item) {
                return $item->client->nom ?? 'Sans Client';
            });
        });

        $qrData = "Rapport Livraisons\n";
        $qrData .= 'Date: '.now()->format('d/m/Y')."\n";
        $qrData .= 'Camions: '.$loads->count()."\n";
        $qrData .= 'Volume: '.number_format($totalVolume, 0, '.', ' ').' L';

        $qrcode = QrCodeGenerator::base64($qrData);

        return $this->downloadPdfView('reports.livraisons_pdf', [
            'loads' => $loads,
            'groupedLoads' => $groupedLoads,
            'stats' => $stats,
            'clientStats' => $clientStats,
            'totalVolume' => $totalVolume,
            'filters' => $request->all(),
            'client' => $client,
            'qrcode' => $qrcode,
            'date' => now()->format('d/m/Y H:i'),
        ], 'rapport-livraisons-'.now()->format('Y-m-d').'.pdf', 'a4', 'landscape');
    }

    public function ventesChargement(Request $request)
    {
        $invoices = $this->ventesChargementQuery($request)->orderBy('date', 'desc')->get();

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
        $invoices = $this->ventesChargementQuery($request)->orderBy('date', 'asc')->get();
        $totalAmount = $invoices->sum('total_amount');

        $qrData = "Rapport Ventes Chargement\n";
        $qrData .= 'Date: '.now()->format('d/m/Y')."\n";
        $qrData .= 'Factures: '.$invoices->count()."\n";
        $qrData .= 'Montant: '.number_format($totalAmount, 0, '.', ' ').' CFA';

        $qrcode = QrCodeGenerator::base64($qrData);

        return $this->downloadPdfView('reports.ventes_chargement_pdf', [
            'invoices' => $invoices,
            'totalAmount' => $totalAmount,
            'filters' => $request->all(),
            'qrcode' => $qrcode,
            'date' => now()->format('d/m/Y H:i'),
        ], 'rapport-ventes-chargement-'.now()->format('Y-m-d').'.pdf');
    }

    public function ventesDepot(Request $request)
    {
        $invoices = $this->ventesDepotQuery($request)->orderBy('date', 'desc')->get();

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
        $invoices = $this->ventesDepotQuery($request)->orderBy('date', 'asc')->get();
        $totalAmount = $invoices->sum('total_amount');

        $qrData = "Rapport Ventes Dépôt\n";
        $qrData .= 'Date: '.now()->format('d/m/Y')."\n";
        $qrData .= 'Factures: '.$invoices->count()."\n";
        $qrData .= 'Montant: '.number_format($totalAmount, 0, '.', ' ').' CFA';

        $qrcode = QrCodeGenerator::base64($qrData);

        return $this->downloadPdfView('reports.ventes_depot_pdf', [
            'invoices' => $invoices,
            'totalAmount' => $totalAmount,
            'filters' => $request->all(),
            'qrcode' => $qrcode,
            'date' => now()->format('d/m/Y H:i'),
        ], 'rapport-ventes-depot-'.now()->format('Y-m-d').'.pdf');
    }
}
