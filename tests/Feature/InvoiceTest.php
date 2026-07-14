<?php

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Load;
use App\Models\User;

test('a user can create an invoice from deliveries', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create(['nom' => 'Test Client']);

    $loads = Load::factory()->count(2)->create([
        'client_id' => $client->id,
        'status' => LoadStatus::LIVRER,
        'volume' => 1000,
    ]);

    $items = $loads->map(fn ($load) => [
        'load_id' => $load->id,
        'bl_number' => 'BL-'.$load->id,
        'quantity_delivered' => 1000,
        'unit_price' => 500,
        'missing_quantity' => 0,
        'total' => 500000,
    ])->toArray();

    $response = $this->actingAs($user)->post(route('finances.facture-chargement.store'), [
        'client_id' => $client->id,
        'date' => now()->format('Y-m-d'),
        'items' => $items,
        'total_amount' => 1000000,
        'total_missing' => 0,
    ]);

    $response->assertRedirect();

    $invoice = Invoice::first();
    expect($invoice)->not->toBeNull();
    expect($invoice->number)->toStartWith('FAC-'.now()->year.'-');
    expect($invoice->total_amount)->toEqual(1000000);

    foreach ($loads as $load) {
        $load->refresh();
        expect($load->status)->toBe(LoadStatus::FACTURER);
    }
});

test('a user can view invoice details page', function () {
    $client = Client::factory()->create(['nom' => 'Test Client']);
    $invoice = Invoice::factory()->create([
        'client_id' => $client->id,
        'client_name' => $client->nom,
        'number' => 'FAC-2026-00001',
        'date' => now()->format('Y-m-d'),
    ]);

    $user = User::factory()->create();
    $response = $this->actingAs($user)->get(route('finances.facture-chargement.show', $invoice->id));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('finances/factures-chargement/show')
        ->has('invoice')
        ->has('vehicleCounts')
    );
});

test('a user can download invoice pdf', function () {
    $user = User::factory()->create();
    $invoice = Invoice::factory()->create();

    $response = $this->actingAs($user)->get(route('finances.facture-chargement.download', $invoice->id));

    $response->assertStatus(200)
        ->assertHeader('Content-Type', 'application/pdf');
});

test('a user can update an invoice and see available loads', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();

    $load1 = Load::factory()->create(['client_id' => $client->id, 'status' => LoadStatus::FACTURER]);
    $load2 = Load::factory()->create(['client_id' => $client->id, 'status' => LoadStatus::LIVRER]);
    $load3 = Load::factory()->create(['client_id' => $client->id, 'status' => LoadStatus::LIVRER]);

    $invoice = Invoice::factory()->create([
        'client_id' => $client->id,
        'date' => '2026-01-01',
    ]);

    $item1 = InvoiceItem::create([
        'invoice_id' => $invoice->id,
        'load_id' => $load1->id,
        'quantity_delivered' => 1000,
        'unit_price' => 500,
        'total' => 500000,
    ]);

    $response = $this->actingAs($user)->put(route('finances.facture-chargement.update', $invoice), [
        'client_id' => $client->id,
        'date' => '2026-01-02',
        'items' => [
            // Update existing item
            [
                'id' => $item1->id,
                'load_id' => $load1->id,
                'quantity_delivered' => 1200,
                'unit_price' => 500,
                'total' => 600000,
            ],
            // Add new item from load2
            [
                'load_id' => $load2->id,
                'quantity_delivered' => 800,
                'unit_price' => 500,
                'total' => 400000,
            ],
        ],
        'total_amount' => 1000000,
        'total_missing' => 0,
    ]);

    $response->assertRedirect();
    $invoice->refresh();

    expect(date('Y-m-d', strtotime($invoice->date)))->toBe('2026-01-02');
    expect($invoice->items)->toHaveCount(2);
    expect($load2->refresh()->status)->toBe(LoadStatus::FACTURER);

    // Verify available loads endpoint (simulating frontend fetch)
    $responseAvailable = $this->actingAs($user)->get(route('operations.livraisons.index', [
        'client_id' => $client->id,
        'status' => 'LIVRER',
    ]), ['Accept' => 'application/json', 'X-Requested-With' => 'XMLHttpRequest']);

    $responseAvailable->assertStatus(200);
    $availableData = $responseAvailable->json();

    $availableIds = array_column($availableData, 'id');
    expect($availableIds)->toContain($load3->id);
    expect($availableIds)->not->toContain($load2->id);
    expect($availableIds)->not->toContain($load1->id);
});

test('a user can remove an item from an invoice', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();

    $load = Load::factory()->create(['client_id' => $client->id, 'status' => LoadStatus::FACTURER]);

    $invoice = Invoice::factory()->create([
        'client_id' => $client->id,
    ]);

    $item = InvoiceItem::create([
        'invoice_id' => $invoice->id,
        'load_id' => $load->id,
        'quantity_delivered' => 1000,
        'unit_price' => 500,
        'total' => 500000,
    ]);

    $response = $this->actingAs($user)->put(route('finances.facture-chargement.update', $invoice), [
        'client_id' => $client->id,
        'date' => now()->format('Y-m-d'),
        'items' => [
            // Empty items should fail due to min:1 validation, let's keep another item or just test the removal logic
        ],
        'total_amount' => 0,
        'total_missing' => 0,
    ]);

    // Validation should fail (min:1 items)
    $response->assertSessionHasErrors('items');

    // Test with removing one and adding another
    $load2 = Load::factory()->create(['client_id' => $client->id, 'status' => LoadStatus::LIVRER]);

    $response = $this->actingAs($user)->put(route('finances.facture-chargement.update', $invoice), [
        'client_id' => $client->id,
        'date' => now()->format('Y-m-d'),
        'items' => [
            [
                'load_id' => $load2->id,
                'quantity_delivered' => 800,
                'unit_price' => 500,
                'total' => 400000,
            ],
        ],
        'total_amount' => 400000,
        'total_missing' => 0,
    ]);

    $response->assertRedirect();
    $invoice->refresh();

    expect($invoice->items)->toHaveCount(1);
    expect($invoice->items->first()->load_id)->toBe($load2->id);

    // Old load should be back to LIVRER
    expect($load->refresh()->status)->toBe(LoadStatus::LIVRER);
    // New load should be FACTURER
    expect($load2->refresh()->status)->toBe(LoadStatus::FACTURER);
});

test('a user can delete an invoice and reset load statuses', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();
    $load = Load::factory()->create(['client_id' => $client->id, 'status' => LoadStatus::FACTURER]);

    $invoice = Invoice::factory()->create(['client_id' => $client->id]);
    InvoiceItem::create([
        'invoice_id' => $invoice->id,
        'load_id' => $load->id,
        'quantity_delivered' => 1000,
        'unit_price' => 500,
        'total' => 500000,
    ]);

    $response = $this->actingAs($user)->delete(route('finances.facture-chargement.destroy', $invoice));

    $response->assertRedirect();
    $this->assertDatabaseMissing('invoices', ['id' => $invoice->id]);

    $load->refresh();
    expect($load->status)->toBe(LoadStatus::LIVRER);
});
