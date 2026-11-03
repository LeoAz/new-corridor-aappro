<?php

namespace App\Services\Exports;

use App\Models\Client;
use App\Models\Load;
use App\Services\QrCodeGenerator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Rapport des chargements ayant encore un volume à livrer.
 */
class ChargementsReportExport extends BasePdfExport
{
    public function label(): string
    {
        return 'Rapport des chargements';
    }

    public function filterKeys(): array
    {
        return ['date_from', 'date_to', 'product', 'load_location', 'client_id'];
    }

    /**
     * `invoiceItems` est eager-chargée pour que l'accesseur `remaining_quantity`
     * du modèle Load utilise la relation déjà chargée au lieu d'une requête par ligne.
     *
     * @param  array<string, mixed>  $filters
     */
    public function query(array $filters): Builder
    {
        $request = $this->request($filters);

        $query = Load::query()->withRemainingQuantity()->with(['client', 'depot', 'invoiceItems']);
        $query = $this->applyDateRange($query, $request, 'load_date');

        return $query
            ->when($request->filled('product'), fn ($q) => $q->where('product', $request->product))
            ->when($request->filled('load_location'), fn ($q) => $q->where('load_location', 'like', '%'.$request->load_location.'%'))
            ->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->client_id));
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Collection<int, Load>
     */
    public function loads(array $filters): Collection
    {
        return $this->query($filters)->orderBy('load_date', 'desc')->get()
            ->filter(fn ($load) => $load->remaining_quantity > 0)
            ->values();
    }

    public function document(array $filters): PdfDocument
    {
        $client = filled($filters['client_id'] ?? null) ? Client::find($filters['client_id']) : null;

        $loads = $this->loads($filters);
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

        return new PdfDocument('reports.chargements_pdf', [
            'loads' => $loads,
            'stats' => $stats,
            'depotStats' => $depotStats,
            'totalVolume' => $totalVolume,
            'totalRemaining' => $totalRemaining,
            'filters' => $filters,
            'client' => $client,
            'qrcode' => QrCodeGenerator::base64($qrData),
            'date' => now()->format('d/m/Y H:i'),
        ], 'rapport-chargements-'.now()->format('Y-m-d').'.pdf', 'a4', 'landscape');
    }
}
