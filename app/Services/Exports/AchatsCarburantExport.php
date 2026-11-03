<?php

namespace App\Services\Exports;

use App\Models\FuelPurchase;

/**
 * Liste des achats de carburant.
 */
class AchatsCarburantExport extends BasePdfExport
{
    public function label(): string
    {
        return 'Liste des achats de carburant';
    }

    public function filterKeys(): array
    {
        return ['product', 'date_from', 'date_to'];
    }

    public function document(array $filters): PdfDocument
    {
        $request = $this->request($filters);

        $query = FuelPurchase::with(['depot', 'compartment'])
            ->when($request->filled('product'), fn ($q) => $q->where('product', $request->product));
        $query = $this->applyDateRange($query, $request, 'purchase_date');

        $purchases = $query->latest()->get();

        return new PdfDocument('finances.fuel_purchases_pdf', [
            'purchases' => $purchases,
            'filters' => $request->only(['product', 'date_from', 'date_to']),
        ], 'achats_carburant_'.date('Ymd_His').'.pdf');
    }
}
