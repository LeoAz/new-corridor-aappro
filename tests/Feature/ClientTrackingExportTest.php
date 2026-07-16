<?php

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Load;
use App\Models\User;

test('it can export client tracking to pdf', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create(['nom' => 'Client Test', 'initial_balance' => 100000]);

    // Create some loads with different statuses
    Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::LIVRER,
        'unload_date' => now()->subDays(5),
        'volume' => 1000,
        'product' => 'GASOIL',
    ]);

    $loadFacturer = Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::FACTURER,
        'unload_date' => now()->subDays(3),
        'volume' => 2000,
        'product' => 'SUPER',
    ]);

    $invoice = Invoice::factory()->create(['client_id' => $client->id]);
    InvoiceItem::factory()->create([
        'invoice_id' => $invoice->id,
        'load_id' => $loadFacturer->id,
        'bl_number' => 'BL-123',
        'total' => 1500000,
    ]);

    $loadPaye = Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::PAYE,
        'unload_date' => now()->subDay(),
        'volume' => 3000,
        'product' => 'GASOIL',
    ]);
    InvoiceItem::factory()->create([
        'load_id' => $loadPaye->id,
        'bl_number' => 'BL-456',
        'total' => 2200000,
    ]);

    $response = $this->actingAs($user)
        ->get(route('clients.suivi-client.export-pdf', ['client_id' => $client->id]));

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/pdf')
        ->assertHeader('Content-Disposition', 'attachment; filename="suivi-client-Client Test.pdf"');
});

test('it requires a client_id to export pdf', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->get(route('clients.suivi-client.export-pdf'));

    $response->assertRedirect()
        ->assertSessionHas('error', 'Veuillez sélectionner un client.');
});

test('it filters export by product', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create(['nom' => 'Client Test']);

    Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::FACTURER,
        'product' => 'GASOIL',
    ]);

    Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::FACTURER,
        'product' => 'SUPER',
    ]);

    $response = $this->actingAs($user)
        ->get(route('clients.suivi-client.export-pdf', [
            'client_id' => $client->id,
            'product_filter' => 'GASOIL',
        ]));

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');
});

test('it filters export by search term', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create(['nom' => 'Client Test']);

    Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::FACTURER,
        'vehicle_registration' => 'CAMION-123',
    ]);

    Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::FACTURER,
        'vehicle_registration' => 'OTHER-456',
    ]);

    $response = $this->actingAs($user)
        ->get(route('clients.suivi-client.export-pdf', [
            'client_id' => $client->id,
            'search' => 'CAMION-123',
        ]));

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');
});

test('it filters export by status', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create(['nom' => 'Client Test']);

    Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::FACTURER,
    ]);

    Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::PAYE,
    ]);

    // Test filter FACTURER
    $response = $this->actingAs($user)
        ->get(route('clients.suivi-client.export-pdf', [
            'client_id' => $client->id,
            'status_filter' => 'FACTURER',
        ]));

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');

    // Test filter FACTURER ET PAYER
    $response = $this->actingAs($user)
        ->get(route('clients.suivi-client.export-pdf', [
            'client_id' => $client->id,
            'status_filter' => 'FACTURER ET PAYER',
        ]));

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');
});
