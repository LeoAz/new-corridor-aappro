<?php

namespace App\Services\Exports;

use App\Enums\LoadStatus;
use App\Models\Depot;
use App\Models\DepotInvoiceItem;
use App\Models\FuelPurchase;
use App\Models\Load;
use App\Services\QrCodeGenerator;

/**
 * Suivi de stock d'un dépôt sur une période.
 */
class SuiviStockExport extends BasePdfExport
{
    public function label(): string
    {
        return 'Suivi de stock';
    }

    public function filterKeys(): array
    {
        return ['depot_id', 'date_from', 'date_to', 'compartment_id'];
    }

    public function rules(): array
    {
        return [
            'depot_id' => ['required', 'integer', 'exists:depots,id'],
            'compartment_id' => ['nullable', 'integer'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
        ];
    }

    public function document(array $filters): PdfDocument
    {
        $request = $this->request($filters);

        $depotId = $request->get('depot_id');
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');
        $compartmentId = $request->get('compartment_id');

        $depot = Depot::with('compartments')->findOrFail($depotId);

        $purchases = FuelPurchase::where('depot_id', $depotId)
            ->whereBetween('purchase_date', [$dateFrom.' 00:00:00', $dateTo.' 23:59:59'])
            ->when($compartmentId, function ($query, $compartmentId) {
                return $query->where('compartment_id', $compartmentId);
            })
            ->with(['compartment'])
            ->orderBy('purchase_date', 'desc')
            ->get();

        // Historique des chargements (Sorties en cours)
        $chargements = Load::where('depot_id', $depotId)
            ->whereBetween('load_date', [$dateFrom.' 00:00:00', $dateTo.' 23:59:59'])
            ->where('status', LoadStatus::EN_COURS)
            ->when($compartmentId, function ($query, $compartmentId) {
                return $query->where('compartment_id', $compartmentId);
            })
            ->with(['client', 'compartment'])
            ->orderBy('load_date', 'desc')
            ->get();

        // Historique des livraisons (Sorties confirmées)
        $livraisons = Load::where('depot_id', $depotId)
            ->whereBetween('load_date', [$dateFrom.' 00:00:00', $dateTo.' 23:59:59'])
            ->where('status', '!=', LoadStatus::EN_COURS)
            ->when($compartmentId, function ($query, $compartmentId) {
                return $query->where('compartment_id', $compartmentId);
            })
            ->with(['client', 'compartment'])
            ->orderBy('load_date', 'desc')
            ->get();

        $depotSales = DepotInvoiceItem::whereHas('depotInvoice', function ($query) use ($depotId, $dateFrom, $dateTo) {
            $query->where('depot_id', $depotId)
                ->whereBetween('date', [$dateFrom.' 00:00:00', $dateTo.' 23:59:59']);
        })
            ->when($compartmentId, function ($query, $compartmentId) {
                return $query->where('compartment_id', $compartmentId);
            })
            ->with(['depotInvoice.client', 'compartment'])
            ->get()
            ->sortByDesc(function ($item) {
                return $item->depotInvoice->date;
            });

        $filteredProduct = $compartmentId ? $depot->compartments->firstWhere('id', $compartmentId)?->product : null;

        $qrData = "Suivi Stock - Depot: {$depot->name} ".($filteredProduct ? "($filteredProduct) " : '')." - Période: {$dateFrom} au {$dateTo}";
        $qrCode = QrCodeGenerator::base64($qrData);

        return new PdfDocument('stocks.suivi_stock_pdf', [
            'depot' => $depot,
            'purchases' => $purchases,
            'chargements' => $chargements,
            'livraisons' => $livraisons,
            'depotSales' => $depotSales,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'qrCode' => $qrCode,
            'compartment_id' => $compartmentId,
            'filteredProduct' => $filteredProduct,
        ], "Suivi_Stock_{$depot->name}_{$dateFrom}_{$dateTo}.pdf");
    }
}
