<?php

namespace App\Http\Controllers;

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\DepotInvoice;
use App\Models\Invoice;
use App\Models\Load;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClientTrackingController extends Controller
{
    public function index()
    {
        return Inertia::render('clients/suivi-client', [
            'clients' => Client::all(['id', 'nom']),
            'filters' => [
                'date_from' => null,
                'date_to' => null,
            ],
        ]);
    }

    public function downloadPdf(Request $request, Client $client)
    {
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        // Récupérer les données (Logique identique à show())
        $invoices = Invoice::where('client_id', $client->id)
            ->when($dateFrom, fn ($q) => $q->where('date', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->where('date', '<=', $dateTo))
            ->get()
            ->map(fn ($i) => [
                'date' => $i->date,
                'label' => "Facture Chargement #{$i->number}",
                'reference' => $i->number,
                'debit' => $i->total_amount,
                'credit' => 0,
            ]);

        $depotInvoices = DepotInvoice::where('client_id', $client->id)
            ->when($dateFrom, fn ($q) => $q->where('date', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->where('date', '<=', $dateTo))
            ->get()
            ->map(fn ($i) => [
                'date' => $i->date,
                'label' => "Facture Dépôt #{$i->number}",
                'reference' => $i->number,
                'debit' => $i->total_amount,
                'credit' => 0,
            ]);

        $payments = ClientPayment::where('client_id', $client->id)
            ->when($dateFrom, fn ($q) => $q->where('date', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->where('date', '<=', $dateTo))
            ->get()
            ->map(fn ($p) => [
                'date' => $p->date->format('Y-m-d'),
                'label' => $p->is_advance ? 'Avance reçue' : 'Règlement reçu',
                'reference' => $p->reference ?: "REG-{$p->id}",
                'debit' => 0,
                'credit' => $p->amount,
            ]);

        $operations = collect()
            ->concat($invoices)
            ->concat($depotInvoices)
            ->concat($payments)
            ->sortBy('date')
            ->values();

        $initialBalance = 0;
        if ($dateFrom) {
            $prevDebitInvoices = Invoice::where('client_id', $client->id)->where('date', '<', $dateFrom)->sum('total_amount');
            $prevDebitDepotInvoices = DepotInvoice::where('client_id', $client->id)->where('date', '<', $dateFrom)->sum('total_amount');
            $prevCreditPayments = ClientPayment::where('client_id', $client->id)->where('date', '<', $dateFrom)->sum('amount');
            $initialBalance = ($prevDebitInvoices + $prevDebitDepotInvoices) - $prevCreditPayments;
        }

        $finalBalance = $initialBalance + ($operations->sum('debit') - $operations->sum('credit'));

        // Générer le QR Code
        $qrData = "RELEVE CLIENT: {$client->nom}\nID: #{$client->id}\nSOLDE: ".number_format(abs($finalBalance), 0, ',', ' ').' CFA';
        $renderer = new ImageRenderer(
            new RendererStyle(200),
            new SvgImageBackEnd
        );
        $writer = new Writer($renderer);
        $qrCode = $writer->writeString($qrData);

        $pdf = Pdf::loadView('clients.releve_pdf', [
            'client' => $client,
            'operations' => $operations,
            'initialBalance' => $initialBalance,
            'finalBalance' => $finalBalance,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'qrCode' => $qrCode,
        ]);

        return $pdf->download("Releve_{$client->nom}_{$dateFrom}_au_{$dateTo}.pdf");
    }

    public function show(Request $request, Client $client)
    {
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        // 1. Relevé de compte (Récupéré de ClientStatementController)
        $invoices = Invoice::where('client_id', $client->id)
            ->when($dateFrom, fn ($q) => $q->where('date', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->where('date', '<=', $dateTo))
            ->get()
            ->map(fn ($i) => [
                'date' => $i->date,
                'label' => "Facture Chargement #{$i->number}",
                'reference' => $i->number,
                'debit' => $i->total_amount,
                'credit' => 0,
                'type' => 'facture_chargement',
            ]);

        $depotInvoices = DepotInvoice::where('client_id', $client->id)
            ->when($dateFrom, fn ($q) => $q->where('date', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->where('date', '<=', $dateTo))
            ->get()
            ->map(fn ($i) => [
                'date' => $i->date,
                'label' => "Facture Dépôt #{$i->number}",
                'reference' => $i->number,
                'debit' => $i->total_amount,
                'credit' => 0,
                'type' => 'facture_depot',
            ]);

        $payments = ClientPayment::where('client_id', $client->id)
            ->when($dateFrom, fn ($q) => $q->where('date', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->where('date', '<=', $dateTo))
            ->get()
            ->map(fn ($p) => [
                'date' => $p->date->format('Y-m-d'),
                'label' => $p->is_advance ? 'Avance reçue' : 'Règlement reçu',
                'reference' => $p->reference ?: "REG-{$p->id}",
                'debit' => 0,
                'credit' => $p->amount,
                'type' => 'paiement',
            ]);

        $operations = collect()
            ->concat($invoices)
            ->concat($depotInvoices)
            ->concat($payments)
            ->sortBy('date')
            ->values();

        $initialBalance = 0;
        if ($dateFrom) {
            $prevDebitInvoices = Invoice::where('client_id', $client->id)->where('date', '<', $dateFrom)->sum('total_amount');
            $prevDebitDepotInvoices = DepotInvoice::where('client_id', $client->id)->where('date', '<', $dateFrom)->sum('total_amount');
            $prevCreditPayments = ClientPayment::where('client_id', $client->id)->where('date', '<', $dateFrom)->sum('amount');
            $initialBalance = ($prevDebitInvoices + $prevDebitDepotInvoices) - $prevCreditPayments;
        }

        $runningBalance = $initialBalance;
        $operations = $operations->map(function ($op) use (&$runningBalance) {
            $runningBalance += ($op['debit'] - $op['credit']);
            $op['balance'] = $runningBalance;

            return $op;
        });

        // 2. État des créances (Livraisons LIVRÉ)
        $debts = Load::where('client_id', $client->id)
            ->where('status', LoadStatus::LIVRE)
            ->with(['client', 'depot', 'compartment'])
            ->get();

        // 3. Historique des paiements avec livraisons liées
        $paymentHistory = ClientPayment::where('client_id', $client->id)
            ->with(['loads', 'invoiceItems.loadDetails', 'depotInvoiceItems'])
            ->orderBy('date', 'desc')
            ->get();

        return Inertia::render('clients/suivi-client', [
            'client' => $client,
            'clients' => Client::all(['id', 'nom']),
            'statement' => [
                'operations' => $operations,
                'initialBalance' => $initialBalance,
                'finalBalance' => $runningBalance,
            ],
            'debts' => $debts,
            'paymentHistory' => $paymentHistory,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }
}
