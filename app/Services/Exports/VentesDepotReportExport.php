<?php

namespace App\Services\Exports;

use App\Models\DepotInvoice;
use App\Services\QrCodeGenerator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Rapport des factures dépôt sur une période.
 */
class VentesDepotReportExport extends BasePdfExport
{
    protected bool $usesDefaultDateRange = true;

    public function label(): string
    {
        return 'Rapport des ventes dépôt';
    }

    public function filterKeys(): array
    {
        return ['date_from', 'date_to', 'client_id', 'depot_id'];
    }

    public function document(array $filters): PdfDocument
    {
        $request = $this->request($filters);

        $invoices = $this->query($request)->orderBy('date', 'asc')->get();
        $totalAmount = $invoices->sum('total_amount');

        $qrData = "Rapport Ventes Dépôt\n";
        $qrData .= 'Date: '.now()->format('d/m/Y')."\n";
        $qrData .= 'Factures: '.$invoices->count()."\n";
        $qrData .= 'Montant: '.number_format($totalAmount, 0, '.', ' ').' CFA';

        $qrcode = QrCodeGenerator::base64($qrData);

        return new PdfDocument('reports.ventes_depot_pdf', [
            'invoices' => $invoices,
            'totalAmount' => $totalAmount,
            'filters' => $request->all(),
            'qrcode' => $qrcode,
            'date' => now()->format('d/m/Y H:i'),
        ], 'rapport-ventes-depot-'.now()->format('Y-m-d').'.pdf');
    }

    public function query(Request $request): Builder
    {
        $this->applyDefaultDateRange($request);

        $query = DepotInvoice::query()->with(['client', 'depot', 'items.compartment']);
        $query = $this->applyDateRange($query, $request, 'date');

        return $query
            ->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->client_id))
            ->when($request->filled('depot_id'), fn ($q) => $q->where('depot_id', $request->depot_id));
    }
}
