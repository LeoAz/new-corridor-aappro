<?php

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\Compartment;
use App\Models\Depot;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Load;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('partial loads appear in both loads and deliveries lists', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();

    // 1. Create a load that is partially invoiced
    $load = Load::factory()->create([
        'client_id' => $client->id,
        'volume' => 1000,
        'status' => LoadStatus::LIVRER,
        'unload_date' => now(),
        'unload_location' => 'Location A',
    ]);

    $invoice = Invoice::factory()->create(['client_id' => $client->id]);

    InvoiceItem::create([
        'invoice_id' => $invoice->id,
        'load_id' => $load->id,
        'quantity_delivered' => 400,
        'unit_price' => 750,
        'is_partial' => true,
        'total' => 400 * 750,
    ]);

    // Refresh status
    $load->refreshInvoiceStatus();

    expect($load->status)->toBe(LoadStatus::LIVRE_PARTIELLEMENT);
    expect($load->remainingQuantity())->toBe(600.0);

    // 2. Check LoadController index (Chargements en cours)
    $this->actingAs($user)
        ->get(route('operations.chargements.index'))
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page
            ->has('loads', fn ($json) => $json->where('0.id', $load->id))
        );

    // 3. Check DeliveryController index (Livraisons)
    $this->actingAs($user)
        ->get(route('operations.livraisons.index'))
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page
            ->has('deliveries', fn ($json) => $json->where('0.id', $load->id))
        );
});

test('only delivered quantity leaves stock for partial deliveries', function () {
    $user = User::factory()->create();
    $depot = Depot::factory()->create();
    $compartment = Compartment::factory()->create([
        'depot_id' => $depot->id,
        'quantity' => 5000,
    ]);
    $client = Client::factory()->create();

    // 1. Create a load (Should NOT decrement stock anymore upon creation)
    $this->actingAs($user)
        ->post(route('operations.chargements.store'), [
            'load_date' => now()->format('Y-m-d'),
            'product' => $compartment->product,
            'volume' => 1000,
            'vehicle_registration' => 'AB-123-CD',
            'depot_id' => $depot->id,
            'compartment_id' => $compartment->id,
            'client_id' => $client->id,
        ]);

    $load = Load::latest()->first();

    $compartment->refresh();
    // Now it SHOULD decrement stock upon creation
    expect((float) $compartment->quantity)->toEqual(4000.0);

    // 2. Deliver partially (Create Invoice) - Should NOT decrement stock anymore
    $invoiceData = [
        'client_id' => $client->id,
        'date' => now()->format('Y-m-d'),
        'items' => [
            [
                'load_id' => $load->id,
                'quantity_delivered' => 400,
                'unit_price' => 700,
                'is_partial' => true,
                'total' => 400 * 700,
            ],
        ],
        'total_amount' => 400 * 700,
    ];

    $this->actingAs($user)
        ->post(route('finances.facture-chargement.store'), $invoiceData);

    $compartment->refresh();
    // Still 4000.0
    expect((float) $compartment->quantity)->toEqual(4000.0);

    // 3. Deliver another partial quantity
    $invoice2Data = [
        'client_id' => $client->id,
        'date' => now()->format('Y-m-d'),
        'items' => [
            [
                'load_id' => $load->id,
                'quantity_delivered' => 300,
                'unit_price' => 700,
                'is_partial' => true,
                'total' => 300 * 700,
            ],
        ],
        'total_amount' => 300 * 700,
    ];

    $this->actingAs($user)
        ->post(route('finances.facture-chargement.store'), $invoice2Data);

    $compartment->refresh();
    // Still 4000.0
    expect((float) $compartment->quantity)->toEqual(4000.0);

    $load = $load->fresh();
    expect($load->status)->toBe(LoadStatus::LIVRE_PARTIELLEMENT);
    expect((float) $load->remainingQuantity())->toEqual(300.0);

    // 4. Update an invoice (change quantity)
    $invoice = Invoice::latest()->first();
    $invoiceItem = $invoice->items->first();

    $updateData = $invoice2Data;
    $updateData['items'][0]['id'] = $invoiceItem->id;
    $updateData['items'][0]['quantity_delivered'] = 500; // +200 compared to before
    $updateData['total_amount'] = 500 * 700;

    $this->actingAs($user)
        ->put(route('finances.facture-chargement.update', $invoice->id), $updateData);

    $compartment->refresh();
    // Still 4000.0
    expect((float) $compartment->quantity)->toEqual(4000.0);

    // 5. Delete an invoice
    $this->actingAs($user)
        ->delete(route('finances.facture-chargement.destroy', $invoice->id));

    $compartment->refresh();
    // Still 4000.0
    expect((float) $compartment->quantity)->toEqual(4000.0);
});
