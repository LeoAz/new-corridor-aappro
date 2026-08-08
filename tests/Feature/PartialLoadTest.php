<?php

use App\Enums\LoadStatus;
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
        ->get(route('chargements.index'))
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page
            ->has('loads', fn ($json) => $json->where('0.id', $load->id))
        );

    // 3. Check DeliveryController index (Livraisons)
    $this->actingAs($user)
        ->get(route('livraisons.index'))
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
    $load = Load::factory()->create([
        'depot_id' => $depot->id,
        'compartment_id' => $compartment->id,
        'volume' => 1000,
        'client_id' => $client->id,
        'status' => LoadStatus::EN_COURS,
    ]);

    $compartment->refresh();
    expect($compartment->quantity)->toBe(5000.0);

    // 2. Deliver partially (Create Invoice)
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
    // 5000 - 400 = 4600
    expect($compartment->quantity)->toBe(4600.0);

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
    // 4600 - 300 = 4300
    expect($compartment->quantity)->toBe(4300.0);

    $load->refresh();
    expect($load->status)->toBe(LoadStatus::LIVRE_PARTIELLEMENT);
    expect($load->remainingQuantity())->toBe(300.0);

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
    // 4300 - 200 = 4100
    expect($compartment->quantity)->toBe(4100.0);

    // 5. Delete an invoice
    $this->actingAs($user)
        ->delete(route('finances.facture-chargement.destroy', $invoice->id));

    $compartment->refresh();
    // 4100 + 500 = 4600
    expect($compartment->quantity)->toBe(4600.0);
});
