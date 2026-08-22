<?php

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

test('getInvoices computes the remaining quantity of a partially invoiced load per invoice', function () {
    $client = Client::factory()->create();
    $load = Load::factory()->create(['client_id' => $client->id, 'volume' => 1000]);

    $invoiceA = Invoice::factory()->create(['client_id' => $client->id]);
    $itemA = InvoiceItem::factory()->create([
        'invoice_id' => $invoiceA->id,
        'load_id' => $load->id,
        'quantity_delivered' => 400,
        'is_partial' => true,
    ]);

    $invoiceB = Invoice::factory()->create(['client_id' => $client->id]);
    $itemB = InvoiceItem::factory()->create([
        'invoice_id' => $invoiceB->id,
        'load_id' => $load->id,
        'quantity_delivered' => 300,
        'is_partial' => true,
    ]);

    $response = $this->getJson(route('clients.suivi-client.invoices', $client));

    $response->assertOk();

    $invoices = collect($response->json('load_invoices'));

    $returnedItemA = $invoices->firstWhere('id', $invoiceA->id)['items'][0];
    $returnedItemB = $invoices->firstWhere('id', $invoiceB->id)['items'][0];

    // Reste sur le chargement (1000) en excluant la facture courante :
    // pour A, on exclut A -> il ne reste que les 300 de B ; pour B, on exclut B -> il ne reste que les 400 de A.
    expect($returnedItemA['remaining_quantity'])->toEqual(1000 - 300);
    expect($returnedItemB['remaining_quantity'])->toEqual(1000 - 400);
});
