<?php

namespace App\Services\Exports;

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\InvoiceItem;
use App\Models\Load;

/**
 * Suivi des livraisons, factures et règlements d'un client.
 */
class SuiviClientExport extends BasePdfExport
{
    public function label(): string
    {
        return 'Suivi client';
    }

    public function filterKeys(): array
    {
        return ['client_id', 'start_date', 'end_date', 'search', 'product_filter', 'status_filter'];
    }

    public function rules(): array
    {
        return [
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
        ];
    }

    public function document(array $filters): PdfDocument
    {
        $request = $this->request($filters);

        $clientId = $request->input('client_id');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $client = Client::findOrFail($clientId);

        // Indicateurs financiers
        $initialBalance = (float) $client->initial_balance;

        $totalInvoiced = InvoiceItem::whereHas('loadDetails', function ($q) use ($clientId) {
            $q->where('client_id', $clientId);
        })->sum('total');

        $totalPaid = ClientPayment::where('client_id', $clientId)->sum('amount');

        $currentBalance = $initialBalance + (float) $totalInvoiced - (float) $totalPaid;

        // Total non facturé (Livraisons au statut LIVRER)
        // Note: Le montant n'est pas encore défini par une facture, mais on peut l'estimer ou juste compter.
        // On va aussi calculer le montant théorique si possible
        $notInvoicedLoads = Load::where('client_id', $clientId)
            ->where('status', LoadStatus::LIVRER)
            ->get();

        $totalNotInvoiced = $notInvoicedLoads->sum(function ($load) {
            return $load->volume * ($load->unit_price ?? 0); // Si unit_price existe sur Load
        });

        // Listes des livraisons
        $loadsQuery = Load::where(function ($query) use ($clientId) {
            $query->where('client_id', $clientId)
                ->orWhereHas('invoiceItems.invoice', fn ($query) => $query->where('client_id', $clientId));
        })->with('invoiceItems');
        $loadsQuery = $this->applyDateRange($loadsQuery, $request, 'unload_date', 'start_date', 'end_date');

        if ($request->filled('search')) {
            $search = $request->search;
            $loadsQuery->where(function ($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                    ->orWhere('vehicle_registration', 'like', "%{$search}%")
                    ->orWhere('client_name', 'like', "%{$search}%")
                    ->orWhere('unload_location', 'like', "%{$search}%");
            });
        }

        if ($request->filled('product_filter') && $request->product_filter !== 'all') {
            $loadsQuery->where('product', $request->product_filter);
        }

        if ($request->filled('status_filter') && $request->status_filter !== 'all') {
            if ($request->status_filter === LoadStatus::PAYE->value) {
                $loadsQuery->where('status', LoadStatus::PAYE);
            } elseif ($request->status_filter === LoadStatus::LIVRE_PARTIELLEMENT->value) {
                $loadsQuery->where('status', LoadStatus::LIVRE_PARTIELLEMENT);
            } elseif ($request->status_filter === LoadStatus::FACTURER->value) {
                $loadsQuery->where('status', LoadStatus::FACTURER);
            }
        }

        $allLoads = $loadsQuery->orderBy('unload_date', 'desc')->get();

        $loadsFacturer = $allLoads->filter(fn ($l) => $l->status === LoadStatus::FACTURER || $l->status === LoadStatus::LIVRE_PARTIELLEMENT);
        $loadsFacturerPayer = $allLoads->where('status', LoadStatus::PAYE);
        $loadsLivrer = $allLoads->where('status', LoadStatus::LIVRER);

        // Liste des règlements
        $paymentsQuery = $this->applyDateRange(ClientPayment::where('client_id', $clientId), $request, 'date', 'start_date', 'end_date');
        $payments = $paymentsQuery->orderBy('date', 'desc')->get();

        return new PdfDocument('reports.suivi-client-pdf', [
            'client' => $client,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'stats' => [
                'initial_balance' => $initialBalance,
                'total_invoiced' => $totalInvoiced,
                'total_paid' => $totalPaid,
                'current_balance' => $currentBalance,
                'total_not_invoiced' => $totalNotInvoiced,
            ],
            'loadsFacturer' => $loadsFacturer,
            'loadsFacturerPayer' => $loadsFacturerPayer,
            'loadsLivrer' => $loadsLivrer,
            'payments' => $payments,
        ], "suivi-client-{$client->nom}.pdf");
    }
}
