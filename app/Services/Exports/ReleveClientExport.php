<?php

namespace App\Services\Exports;

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\DepotInvoice;
use App\Models\Invoice;
use App\Models\Load;
use App\Services\QrCodeGenerator;
use Illuminate\Support\Collection;

/**
 * Relevé de compte d'un client : opérations, soldes et historique des chargements.
 */
class ReleveClientExport extends BasePdfExport
{
    public function label(): string
    {
        return 'Relevé de compte client';
    }

    public function filterKeys(): array
    {
        return ['client_id', 'date_from', 'date_to'];
    }

    public function rules(): array
    {
        return [
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
        ];
    }

    public function document(array $filters): PdfDocument
    {
        $request = $this->request($filters);
        $client = Client::findOrFail($request->input('client_id'));

        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $statement = $this->statement($client, $dateFrom, $dateTo);
        $operations = $statement['operations'];
        $initialBalance = $statement['initialBalance'];
        $finalBalance = $statement['finalBalance'];

        // Récupérer les historiques demandés
        $loadsEnCours = Load::where('client_id', $client->id)
            ->where('status', LoadStatus::EN_COURS)
            ->with(['depot', 'compartment'])
            ->get()
            ->map(fn ($l) => [
                'id' => $l->id,
                'date' => $l->load_date?->format('Y-m-d'),
                'truck_number' => $l->vehicle_registration,
                'compartment' => $l->compartment?->product ?? ($l->product ?? 'N/A'),
                'quantity' => $l->volume,
                'depot' => $l->depot?->name ?? ($l->load_location ?? 'N/A'),
                'destination' => $l->unload_location,
            ]);

        $loadsLivrer = Load::where('client_id', $client->id)
            ->where('status', LoadStatus::LIVRER)
            ->with(['depot', 'compartment'])
            ->get()
            ->map(fn ($l) => [
                'id' => $l->id,
                'date' => $l->unload_date?->format('Y-m-d'),
                'truck_number' => $l->vehicle_registration,
                'compartment' => $l->compartment?->product ?? ($l->product ?? 'N/A'),
                'quantity' => $l->volume,
                'depot' => $l->depot?->name ?? ($l->load_location ?? 'N/A'),
                'bl_number' => $l->bl_number ?? "BL-{$l->id}",
            ]);

        $loadsFacturer = Load::where('client_id', $client->id)
            ->whereIn('status', [LoadStatus::LIVRE_PARTIELLEMENT, LoadStatus::FACTURER])
            ->with(['depot', 'compartment'])
            ->get()
            ->map(fn ($l) => [
                'id' => $l->id,
                'date' => $l->unload_date?->format('Y-m-d'),
                'truck_number' => $l->vehicle_registration,
                'compartment' => $l->compartment?->product ?? ($l->product ?? 'N/A'),
                'quantity' => $l->volume,
                'depot' => $l->depot?->name ?? ($l->load_location ?? 'N/A'),
                'bl_number' => $l->bl_number ?? "BL-{$l->id}",
            ]);

        $loadsPaye = Load::where('client_id', $client->id)
            ->where('status', LoadStatus::PAYE)
            ->with(['depot', 'compartment', 'clientPayment'])
            ->get()
            ->map(fn ($l) => [
                'id' => $l->id,
                'date' => $l->unload_date?->format('Y-m-d'),
                'truck_number' => $l->vehicle_registration,
                'compartment' => $l->compartment?->product ?? ($l->product ?? 'N/A'),
                'quantity' => $l->volume,
                'depot' => $l->depot?->name ?? ($l->load_location ?? 'N/A'),
                'bl_number' => $l->bl_number ?? "BL-{$l->id}",
                'payment_reference' => $l->clientPayment?->reference ?: ($l->clientPayment ? "REG-{$l->clientPayment->id}" : null),
                'payment_date' => $l->clientPayment?->date?->format('Y-m-d'),
            ]);

        // Générer le QR Code
        $qrData = "RELEVE CLIENT: {$client->nom}\nID: #{$client->id}\nSOLDE: ".number_format(abs($finalBalance), 0, ',', ' ').' CFA';
        $qrCode = QrCodeGenerator::svg($qrData);

        return new PdfDocument('clients.releve_pdf', [
            'client' => $client,
            'operations' => $operations,
            'initialBalance' => $initialBalance,
            'finalBalance' => $finalBalance,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'qrCode' => $qrCode,
            'loadsEnCours' => $loadsEnCours,
            'loadsLivrer' => $loadsLivrer,
            'loadsFacturer' => $loadsFacturer,
            'loadsPaye' => $loadsPaye,
        ], "Releve_{$client->nom}_{$dateFrom}_au_{$dateTo}.pdf", 'a4', 'landscape');
    }

    /**
     * Construit le relevé de compte d'un client : opérations (factures, factures dépôt,
     * paiements) triées par date avec solde progressif, solde initial et solde final.
     * Utilisé par l'écran du relevé (ClientStatementController::show) et par le PDF — seule source de vérité
     * pour ce calcul.
     *
     * @return array{operations: Collection, initialBalance: float, finalBalance: float}
     */
    public function statement(Client $client, ?string $dateFrom, ?string $dateTo): array
    {
        // 1. Débit : Factures (Chargement et Dépôt)
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

        // 2. Crédit : Paiements
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

        // Combiner et trier
        $operations = collect()
            ->concat($invoices)
            ->concat($depotInvoices)
            ->concat($payments)
            ->sortBy('date')
            ->values();

        // Calculer le solde initial (avant la date début si spécifiée)
        $initialBalance = $client->initial_balance;
        if ($dateFrom) {
            $prevDebitInvoices = Invoice::where('client_id', $client->id)->where('date', '<', $dateFrom)->sum('total_amount');
            $prevDebitDepotInvoices = DepotInvoice::where('client_id', $client->id)->where('date', '<', $dateFrom)->sum('total_amount');
            $prevCreditPayments = ClientPayment::where('client_id', $client->id)->where('date', '<', $dateFrom)->sum('amount');
            // Solde = Crédit - Débit (Positif = L'entreprise doit au client, Négatif = Le client doit)
            // initial_balance suit la même logique (positif = crédit, négatif = débit)
            $initialBalance += ($prevCreditPayments - ($prevDebitInvoices + $prevDebitDepotInvoices));
        }

        // Ajouter le solde progressif
        $runningBalance = $initialBalance;
        $operations = $operations->map(function ($op) use (&$runningBalance) {
            $runningBalance += ($op['credit'] - $op['debit']);
            $op['balance'] = $runningBalance;

            return $op;
        });

        return [
            'operations' => $operations,
            'initialBalance' => $initialBalance,
            'finalBalance' => $runningBalance,
        ];
    }
}
