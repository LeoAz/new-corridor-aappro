<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Depot;
use App\Models\DepotInvoice;
use App\Models\Invoice;
use App\Models\Load;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function chargements(Request $request)
    {
        $query = Load::query()->with(['client', 'depot']);

        if ($request->filled('date_from')) {
            $query->whereDate('load_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('load_date', '<=', $request->date_to);
        }
        if ($request->filled('product')) {
            $query->where('product', $request->product);
        }
        if ($request->filled('load_location')) {
            $query->where('load_location', 'like', '%'.$request->load_location.'%');
        }

        $loads = $query->orderBy('load_date', 'desc')->get();

        $stats = [
            'total_trucks' => $loads->count(),
            'total_volume' => $loads->sum('volume'),
            'by_product' => $loads->groupBy('product')->map(fn ($group, $product) => [
                'product' => $product ?: 'INCONNU',
                'count' => $group->count(),
                'volume' => $group->sum('volume'),
            ])->values()->toArray(),
        ];

        $groupedLoads = $loads->groupBy(function ($item) {
            return Carbon::parse($item->load_date)->format('Y-m-d');
        })->map(function ($dateGroup) {
            return $dateGroup->groupBy('client_id');
        });

        return Inertia::render('reports/chargements', [
            'loads' => $loads,
            'groupedLoads' => $groupedLoads,
            'stats' => $stats,
            'filters' => $request->only(['date_from', 'date_to', 'product', 'load_location']),
            'clients' => Client::all(['id', 'nom']),
            'depots' => Depot::all(['id', 'name']),
        ]);
    }

    public function downloadChargements(Request $request)
    {
        $query = Load::query()->with(['client', 'depot']);

        if ($request->filled('date_from')) {
            $query->whereDate('load_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('load_date', '<=', $request->date_to);
        }
        if ($request->filled('product')) {
            $query->where('product', $request->product);
        }
        if ($request->filled('load_location')) {
            $query->where('load_location', 'like', '%'.$request->load_location.'%');
        }

        $loads = $query->orderBy('load_date', 'asc')->get();
        $totalVolume = $loads->sum('volume');

        $stats = $loads->groupBy('product')->map(fn ($group, $product) => [
            'product' => $product ?: 'INCONNU',
            'count' => $group->count(),
            'volume' => $group->sum('volume'),
        ])->values()->toArray();

        $groupedLoads = $loads->groupBy(function ($item) {
            return Carbon::parse($item->load_date)->format('Y-m-d');
        })->map(function ($dateGroup) {
            return $dateGroup->groupBy(function ($item) {
                return $item->client->nom ?? 'Sans Client';
            });
        });

        $qrData = "Rapport Chargements\n";
        $qrData .= 'Date: '.now()->format('d/m/Y')."\n";
        $qrData .= 'Camions: '.$loads->count()."\n";
        $qrData .= 'Volume: '.number_format($totalVolume, 0, '.', ' ').' L';

        $renderer = new ImageRenderer(
            new RendererStyle(100),
            new SvgImageBackEnd
        );
        $writer = new Writer($renderer);
        $qrcode = base64_encode($writer->writeString($qrData));

        $pdf = Pdf::loadView('reports.chargements_pdf', [
            'loads' => $loads,
            'groupedLoads' => $groupedLoads,
            'stats' => $stats,
            'totalVolume' => $totalVolume,
            'filters' => $request->all(),
            'qrcode' => $qrcode,
            'date' => now()->format('d/m/Y H:i'),
        ]);

        return $pdf->download('rapport-chargements-'.now()->format('Y-m-d').'.pdf');
    }

    public function livraisons(Request $request)
    {
        $query = Load::query()->whereNotNull('unload_date')->with(['client', 'depot']);

        if ($request->filled('date_from')) {
            $query->whereDate('unload_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('unload_date', '<=', $request->date_to);
        }
        if ($request->filled('product')) {
            $query->where('product', $request->product);
        }
        if ($request->filled('unload_location')) {
            $query->where('unload_location', 'like', '%'.$request->unload_location.'%');
        }

        $loads = $query->orderBy('unload_date', 'desc')->get();

        $stats = [
            'total_trucks' => $loads->count(),
            'total_volume' => $loads->sum('volume'),
            'by_product' => $loads->groupBy('product')->map(fn ($group, $product) => [
                'product' => $product ?: 'INCONNU',
                'count' => $group->count(),
                'volume' => $group->sum('volume'),
            ])->values()->toArray(),
        ];

        $groupedLoads = $loads->groupBy(function ($item) {
            return Carbon::parse($item->unload_date)->format('Y-m-d');
        })->map(function ($dateGroup) {
            return $dateGroup->groupBy('client_id');
        });

        return Inertia::render('reports/livraisons', [
            'loads' => $loads,
            'groupedLoads' => $groupedLoads,
            'stats' => $stats,
            'filters' => $request->only(['date_from', 'date_to', 'product', 'unload_location', 'client_id']),
            'clients' => Client::all(['id', 'nom']),
        ]);
    }

    public function downloadLivraisons(Request $request)
    {
        $query = Load::query()->whereNotNull('unload_date')->with(['client', 'depot']);

        if ($request->filled('date_from')) {
            $query->whereDate('unload_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('unload_date', '<=', $request->date_to);
        }
        if ($request->filled('product')) {
            $query->where('product', $request->product);
        }
        if ($request->filled('unload_location')) {
            $query->where('unload_location', 'like', '%'.$request->unload_location.'%');
        }

        $loads = $query->orderBy('unload_date', 'asc')->get();
        $totalVolume = $loads->sum('volume');

        $stats = $loads->groupBy('product')->map(fn ($group, $product) => [
            'product' => $product ?: 'INCONNU',
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

        $renderer = new ImageRenderer(
            new RendererStyle(100),
            new SvgImageBackEnd
        );
        $writer = new Writer($renderer);
        $qrcode = base64_encode($writer->writeString($qrData));

        $pdf = Pdf::loadView('reports.livraisons_pdf', [
            'loads' => $loads,
            'groupedLoads' => $groupedLoads,
            'stats' => $stats,
            'totalVolume' => $totalVolume,
            'filters' => $request->all(),
            'qrcode' => $qrcode,
            'date' => now()->format('d/m/Y H:i'),
        ]);

        return $pdf->download('rapport-livraisons-'.now()->format('Y-m-d').'.pdf');
    }

    public function ventesChargement(Request $request)
    {
        $query = Invoice::query()->with(['client', 'items.loadDetails']);

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }
        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        $invoices = $query->orderBy('date', 'desc')->get();

        $stats = [
            'total_amount' => $invoices->sum('total_amount'),
            'total_invoices' => $invoices->count(),
        ];

        $groupedInvoices = $invoices->groupBy(function ($item) {
            return Carbon::parse($item->date)->format('Y-m-d');
        })->map(function ($dateGroup) {
            return $dateGroup->groupBy('client_id');
        });

        return Inertia::render('reports/ventes-chargement', [
            'invoices' => $invoices,
            'groupedInvoices' => $groupedInvoices,
            'stats' => $stats,
            'filters' => $request->only(['date_from', 'date_to', 'client_id']),
            'clients' => Client::all(['id', 'nom']),
        ]);
    }

    public function downloadVentesChargement(Request $request)
    {
        $query = Invoice::query()->with(['client', 'items.loadDetails']);

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }
        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        $invoices = $query->orderBy('date', 'asc')->get();
        $totalAmount = $invoices->sum('total_amount');

        $qrData = "Rapport Ventes Chargement\n";
        $qrData .= 'Date: '.now()->format('d/m/Y')."\n";
        $qrData .= 'Factures: '.$invoices->count()."\n";
        $qrData .= 'Montant: '.number_format($totalAmount, 0, '.', ' ').' CFA';

        $renderer = new ImageRenderer(
            new RendererStyle(100),
            new SvgImageBackEnd
        );
        $writer = new Writer($renderer);
        $qrcode = base64_encode($writer->writeString($qrData));

        $pdf = Pdf::loadView('reports.ventes_chargement_pdf', [
            'invoices' => $invoices,
            'totalAmount' => $totalAmount,
            'filters' => $request->all(),
            'qrcode' => $qrcode,
            'date' => now()->format('d/m/Y H:i'),
        ]);

        return $pdf->download('rapport-ventes-chargement-'.now()->format('Y-m-d').'.pdf');
    }

    public function ventesDepot(Request $request)
    {
        $query = DepotInvoice::query()->with(['client', 'depot', 'items.compartment']);

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }
        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }
        if ($request->filled('depot_id')) {
            $query->where('depot_id', $request->depot_id);
        }

        $invoices = $query->orderBy('date', 'desc')->get();

        $stats = [
            'total_amount' => $invoices->sum('total_amount'),
            'total_invoices' => $invoices->count(),
        ];

        $groupedInvoices = $invoices->groupBy(function ($item) {
            return Carbon::parse($item->date)->format('Y-m-d');
        })->map(function ($dateGroup) {
            return $dateGroup->groupBy('client_id');
        });

        return Inertia::render('reports/ventes-depot', [
            'invoices' => $invoices,
            'groupedInvoices' => $groupedInvoices,
            'stats' => $stats,
            'filters' => $request->only(['date_from', 'date_to', 'client_id', 'depot_id']),
            'clients' => Client::all(['id', 'nom']),
            'depots' => Depot::all(['id', 'name']),
        ]);
    }

    public function downloadVentesDepot(Request $request)
    {
        $query = DepotInvoice::query()->with(['client', 'depot', 'items.compartment']);

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }
        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }
        if ($request->filled('depot_id')) {
            $query->where('depot_id', $request->depot_id);
        }

        $invoices = $query->orderBy('date', 'asc')->get();
        $totalAmount = $invoices->sum('total_amount');

        $qrData = "Rapport Ventes Dépôt\n";
        $qrData .= 'Date: '.now()->format('d/m/Y')."\n";
        $qrData .= 'Factures: '.$invoices->count()."\n";
        $qrData .= 'Montant: '.number_format($totalAmount, 0, '.', ' ').' CFA';

        $renderer = new ImageRenderer(
            new RendererStyle(100),
            new SvgImageBackEnd
        );
        $writer = new Writer($renderer);
        $qrcode = base64_encode($writer->writeString($qrData));

        $pdf = Pdf::loadView('reports.ventes_depot_pdf', [
            'invoices' => $invoices,
            'totalAmount' => $totalAmount,
            'filters' => $request->all(),
            'qrcode' => $qrcode,
            'date' => now()->format('d/m/Y H:i'),
        ]);

        return $pdf->download('rapport-ventes-depot-'.now()->format('Y-m-d').'.pdf');
    }
}
