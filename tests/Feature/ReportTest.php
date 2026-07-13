<?php

use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Load;
use App\Models\User;

test('a user can download sales report pdf', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create(['nom' => 'Test Client']);
    $load = Load::factory()->create(['client_id' => $client->id]);

    $invoice = Invoice::factory()->create([
        'client_id' => $client->id,
        'date' => now()->format('Y-m-d'),
        'total_amount' => 1000000,
    ]);

    InvoiceItem::create([
        'invoice_id' => $invoice->id,
        'load_id' => $load->id,
        'bl_number' => 'BL-12345',
        'quantity_delivered' => 2000,
        'unit_price' => 500,
        'total' => 1000000,
    ]);

    $response = $this->actingAs($user)->get(route('rapports.vente-chargement.download', [
        'client_id' => $client->id,
        'date_from' => now()->subDays(7)->format('Y-m-d'),
        'date_to' => now()->format('Y-m-d'),
    ]));

    $response->assertStatus(200)
        ->assertHeader('Content-Type', 'application/pdf');
});
