<?php

namespace App\Services\Exports;

use App\Enums\LoadStatus;
use App\Models\Load;

/**
 * Liste des chargements en cours (opérations).
 */
class ChargementsEnCoursExport extends BasePdfExport
{
    public function label(): string
    {
        return 'Liste des chargements en cours';
    }

    public function filterKeys(): array
    {
        return ['product', 'date_from', 'date_to', 'load_locations'];
    }

    public function document(array $filters): PdfDocument
    {
        $request = $this->request($filters);

        $query = Load::whereIn('status', LoadStatus::activeLoads())
            ->with(['depot', 'client', 'compartment']);

        if ($request->filled('product')) {
            $query->where('product', $request->product);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('load_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('load_date', '<=', $request->date_to);
        }

        if ($request->filled('load_locations')) {
            $locations = is_array($request->load_locations) ? $request->load_locations : explode(',', $request->load_locations);
            $query->whereIn('load_location', $locations);
        }

        $loads = $query->latest()->get();

        return new PdfDocument('operations.loads_pdf', [
            'loads' => $loads,
            'filters' => $request->only(['product', 'date_from', 'date_to', 'load_locations']),
        ], 'chargements_en_cours_'.date('Ymd_His').'.pdf');
    }
}
