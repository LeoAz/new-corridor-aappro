<?php

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\Compartment;
use App\Models\Depot;
use App\Models\Invoice;
use App\Models\Load;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('partial delivery creates a duplicate load and updates original', function () {
    $user = User::factory()->create();
    $depot = Depot::factory()->create();
    $compartment = Compartment::factory()->create([
        'depot_id' => $depot->id,
        'quantity' => 10000,
    ]);
    $client = Client::factory()->create();

    // 1. Create a load of 1000L
    $load = Load::factory()->create([
        'depot_id' => $depot->id,
        'compartment_id' => $compartment->id,
        'volume' => 1000,
        'client_id' => $client->id,
        'status' => LoadStatus::EN_COURS,
    ]);

    // 2. Perform a partial delivery of 400L via DeliveryController
    $deliveryData = [
        'unload_date' => now()->format('Y-m-d'),
        'unload_location' => 'Client Site',
        'client_id' => $client->id,
        'volume' => 400,
    ];

    $response = $this->actingAs($user)
        ->post(route('operations.chargements.deliver', $load->id), $deliveryData);

    $response->assertRedirect();

    // 3. Verify original load state (reliquat)
    $load->refresh();
    expect($load->volume)->toBe(600.0); // 1000 - 400
    expect($load->status)->toBe(LoadStatus::LIVRE_PARTIELLEMENT);

    // 4. Verify duplicated load for the delivery
    $deliveredLoad = Load::where('status', LoadStatus::LIVRER)
        ->where('volume', 400.0)
        ->first();

    expect($deliveredLoad)->not->toBeNull();
    expect($deliveredLoad->volume)->toBe(400.0);
    expect($deliveredLoad->status)->toBe(LoadStatus::LIVRER);

    // 5. Verify stock
    $compartment->refresh();
    expect($compartment->quantity)->toBe(9600.0); // 10000 - 400

    // 6. Now bill the delivered load
    $invoiceData = [
        'client_id' => $client->id,
        'date' => now()->format('Y-m-d'),
        'items' => [
            [
                'load_id' => $deliveredLoad->id,
                'quantity_delivered' => 400,
                'unit_price' => 700,
                'total' => 400 * 700,
            ],
        ],
        'total_amount' => 400 * 700,
    ];

    $this->actingAs($user)
        ->post(route('finances.facture-chargement.store'), $invoiceData);

    $deliveredLoad->refresh();
    expect($deliveredLoad->status)->toBe(LoadStatus::FACTURER);
});

test('full delivery creates a duplicate load and marks original as totally delivered', function () {
    $user = User::factory()->create();
    $depot = Depot::factory()->create();
    $compartment = Compartment::factory()->create([
        'depot_id' => $depot->id,
        'quantity' => 10000,
    ]);
    $client = Client::factory()->create();

    // 1. Create a load of 1000L
    $load = Load::factory()->create([
        'depot_id' => $depot->id,
        'compartment_id' => $compartment->id,
        'volume' => 1000,
        'client_id' => $client->id,
        'status' => LoadStatus::EN_COURS,
    ]);

    // 2. Deliver the full 1000L
    $deliveryData = [
        'unload_date' => now()->format('Y-m-d'),
        'unload_location' => 'Client Site',
        'client_id' => $client->id,
        'volume' => 1000,
    ];

    $this->actingAs($user)
        ->post(route('operations.chargements.deliver', $load->id), $deliveryData);

    // 3. Verify original load state
    $load->refresh();
    expect($load->volume)->toBe(0.0);
    expect($load->status)->toBe(LoadStatus::TOTALEMENT_LIVRE);

    // 4. Verify duplicated load for the delivery
    $deliveredLoad = Load::where('status', LoadStatus::LIVRER)
        ->where('volume', 1000.0)
        ->first();

    expect($deliveredLoad)->not->toBeNull();

    // 5. Verify stock
    $compartment->refresh();
    expect($compartment->quantity)->toBe(9000.0);
});

test('visibility of loads according to their status', function () {
    $user = User::factory()->create();

    $loadEnCours = Load::factory()->create(['status' => LoadStatus::EN_COURS]);
    $loadPartiel = Load::factory()->create(['status' => LoadStatus::LIVRE_PARTIELLEMENT]);
    $loadLivre = Load::factory()->create(['status' => LoadStatus::LIVRER]);
    $loadTotal = Load::factory()->create(['status' => LoadStatus::TOTALEMENT_LIVRE]);

    // Chargements list should only show EN COURS and LIVRE PARTIELLEMENT
    $this->actingAs($user)
        ->get(route('chargements.index'))
        ->assertInertia(fn ($page) => $page
            ->has('loads', 2)
            ->where('loads.0.id', $loadPartiel->id) // Sorted by latest usually
            ->where('loads.1.id', $loadEnCours->id)
        );

    // Deliveries list should show LIVRER but not TOTALEMENT_LIVRE (it shows parents that are partially delivered too, wait...)
    // Actually DeliveryController filters for LIVRER, LIVRE_PARTIELLEMENT, FACTURER, PAYE
    $this->actingAs($user)
        ->get(route('livraisons.index'))
        ->assertInertia(fn ($page) => $page
            ->has('deliveries', 2) // $loadLivre and $loadPartiel (as per current controller logic)
        );
});
