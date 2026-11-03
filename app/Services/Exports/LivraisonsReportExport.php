<?php

namespace App\Services\Exports;

use App\Models\Client;
use App\Models\Load;
use App\Services\QrCodeGenerator;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Rapport des livraisons effectuées sur une période.
 */
class LivraisonsReportExport extends BasePdfExport
{
    protected bool $usesDefaultDateRange = true;

    public function label(): string
    {
        return 'Rapport des livraisons';
    }

    public function filterKeys(): array
    {
        return ['date_from', 'date_to', 'product', 'unload_location', 'client_id'];
    }

    public function document(array $filters): PdfDocument
    {
        $request = $this->request($filters);

        $client = $request->filled('client_id') ? Client::find($request->client_id) : null;

        $loads = $this->query($request)->orderBy('unload_date', 'desc')->get();
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

        $clientProductStats = $this->truckCountsByClientAndProduct($loads);

        $qrData = "Rapport Livraisons\n";
        $qrData .= 'Date: '.now()->format('d/m/Y')."\n";
        $qrData .= 'Camions: '.$loads->count()."\n";
        $qrData .= 'Volume: '.number_format($totalVolume, 0, '.', ' ').' L';

        $qrcode = QrCodeGenerator::base64($qrData);

        return new PdfDocument('reports.livraisons_pdf', [
            'loads' => $loads,
            'groupedLoads' => $groupedLoads,
            'stats' => $stats,
            'clientStats' => $clientStats,
            'clientProductStats' => $clientProductStats,
            'totalVolume' => $totalVolume,
            'filters' => $request->all(),
            'client' => $client,
            'qrcode' => $qrcode,
            'date' => now()->format('d/m/Y H:i'),
        ], 'rapport-livraisons-'.now()->format('Y-m-d').'.pdf', 'a4', 'landscape');
    }

    public function query(Request $request): Builder
    {
        $this->applyDefaultDateRange($request);

        $query = Load::query()->whereNotNull('unload_date')->with(['client', 'depot', 'invoiceItems']);
        $query = $this->applyDateRange($query, $request, 'unload_date');

        return $query
            ->when($request->filled('product'), fn ($q) => $q->where('product', $request->product))
            ->when($request->filled('unload_location'), fn ($q) => $q->where('unload_location', 'like', '%'.$request->unload_location.'%'))
            ->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->client_id));
    }

    /**
     * Nombre de camions par client et par produit, sous forme de tableau croisé.
     *
     * @return array{products: array<int, string>, rows: array<int, array{client: string, counts: array<string, int>, total: int}>}
     */
    public function truckCountsByClientAndProduct(Collection $loads): array
    {
        $products = $loads->pluck('product')->map(fn ($product) => $product ?: 'INCONNU')->unique()->sort()->values();

        $rows = $loads
            ->groupBy(fn ($load) => $load->client->nom ?? 'Sans Client')
            ->map(function ($clientLoads, $clientName) use ($products) {
                $byProduct = $clientLoads->groupBy(fn ($load) => $load->product ?: 'INCONNU');

                return [
                    'client' => $clientName,
                    'counts' => $products->mapWithKeys(fn ($product) => [$product => $byProduct->get($product, collect())->count()])->toArray(),
                    'total' => $clientLoads->count(),
                ];
            })
            ->sortByDesc('total')
            ->values()
            ->toArray();

        return [
            'products' => $products->toArray(),
            'rows' => $rows,
        ];
    }
}
