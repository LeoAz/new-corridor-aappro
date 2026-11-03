<?php

namespace App\Services\Exports;

use App\Enums\LoadStatus;
use App\Models\Load;

/**
 * Liste des livraisons (opérations).
 */
class LivraisonsOperationsExport extends BasePdfExport
{
    public function label(): string
    {
        return 'Liste des livraisons';
    }

    public function filterKeys(): array
    {
        return ['status', 'client_id', 'product', 'date_from', 'date_to', 'load_locations'];
    }

    public function document(array $filters): PdfDocument
    {
        $request = $this->request($filters);

        $status = $request->input('status');

        if ($status) {
            if (str_contains($status, ',')) {
                $query = Load::whereIn('status', explode(',', $status));
            } else {
                $query = Load::where('status', $status);
            }
        } else {
            $query = Load::whereIn('status', LoadStatus::deliveryTracking());
        }

        $query->with(['depot', 'client', 'compartment']);

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

        return new PdfDocument('operations.deliveries_pdf', [
            'deliveries' => $deliveries,
            'filters' => $request->only(['product', 'date_from', 'date_to', 'load_locations', 'client_id']),
        ], 'livraisons_'.date('Ymd_His').'.pdf');
    }
}
