<?php

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Load;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->be($this->user);
});

test('the two "total facturé" formulas used by ClientTrackingController agree for an invoice created through the real flow', function () {
    $client = Client::factory()->create();
    $load = Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::LIVRER,
        'volume' => 1000,
    ]);

    $this->post(route('finances.facture-chargement.store'), [
        'client_id' => $client->id,
        'date' => now()->format('Y-m-d'),
        'items' => [
            [
                'load_id' => $load->id,
                'quantity_delivered' => 1000,
                'unit_price' => 700,
                'total' => 700000,
            ],
        ],
        'total_amount' => 700000,
    ]);

    // Formule utilisée par ClientTrackingController::index() (L127) :
    // somme des Invoice.total_amount du client.
    $totalFromIndex = Invoice::where('client_id', $client->id)->sum('total_amount');

    // Formule utilisée par ClientTrackingController::exportPdf() (L151-153) :
    // somme des InvoiceItem dont le chargement appartient au client.
    $totalFromExportPdf = InvoiceItem::whereHas('loadDetails', function ($q) use ($client) {
        $q->where('client_id', $client->id);
    })->sum('total');

    expect((float) $totalFromIndex)->toEqual(700000.0);
    expect((float) $totalFromExportPdf)->toEqual((float) $totalFromIndex);
});
