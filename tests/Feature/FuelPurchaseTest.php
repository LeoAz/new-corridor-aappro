<?php

use App\Models\Compartment;
use App\Models\Depot;
use App\Models\FuelPurchase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->depot = Depot::factory()->create();
    $this->compartment = Compartment::factory()->create([
        'depot_id' => $this->depot->id,
        'product' => 'Gasoil',
        'quantity' => 1000,
    ]);
});

test('un utilisateur peut créer un achat de carburant et cela incrémente le stock', function () {
    $this->actingAs($this->user);

    $purchaseData = [
        'purchase_date' => now()->format('Y-m-d'),
        'product' => 'Gasoil',
        'quantity' => 500,
        'unit_price' => 600,
        'total_price' => 300000,
        'depot_id' => $this->depot->id,
        'compartment_id' => $this->compartment->id,
    ];

    $response = $this->post(route('finances.achat-carburant.store'), $purchaseData);

    $response->assertRedirect();
    $this->assertDatabaseHas('fuel_purchases', ['quantity' => 500]);
    $this->assertEquals(1500, $this->compartment->refresh()->quantity);
});

test('un utilisateur peut modifier un achat de carburant et cela ajuste le stock', function () {
    $this->actingAs($this->user);

    $purchaseData = [
        'purchase_date' => now()->format('Y-m-d'),
        'product' => 'Gasoil',
        'quantity' => 500,
        'unit_price' => 600,
        'total_price' => 300000,
        'depot_id' => $this->depot->id,
        'compartment_id' => $this->compartment->id,
    ];

    $this->post(route('finances.achat-carburant.store'), $purchaseData);
    $purchase = FuelPurchase::first();

    // Stock initial 1000 + 500 = 1500
    $this->assertEquals(1500, $this->compartment->refresh()->quantity);

    $updatedData = array_merge($purchase->toArray(), ['quantity' => 800, 'total_price' => 480000]);

    $response = $this->put(route('finances.achat-carburant.update', $purchase->id), $updatedData);

    $response->assertRedirect();
    // Nouveau stock : 1500 - 500 + 800 = 1800
    $this->assertEquals(1800, $this->compartment->refresh()->quantity);
});

test('un utilisateur peut supprimer un achat de carburant et cela décrémente le stock', function () {
    $this->actingAs($this->user);

    $purchaseData = [
        'purchase_date' => now()->format('Y-m-d'),
        'product' => 'Gasoil',
        'quantity' => 500,
        'unit_price' => 600,
        'total_price' => 300000,
        'depot_id' => $this->depot->id,
        'compartment_id' => $this->compartment->id,
    ];

    $this->post(route('finances.achat-carburant.store'), $purchaseData);
    $purchase = FuelPurchase::first();

    // Stock initial 1000 + 500 = 1500
    $this->assertEquals(1500, $this->compartment->refresh()->quantity);

    $response = $this->delete(route('finances.achat-carburant.destroy', $purchase->id));

    $response->assertRedirect();
    $this->assertDatabaseMissing('fuel_purchases', ['id' => $purchase->id]);
    // Nouveau stock : 1500 - 500 = 1000
    $this->assertEquals(1000, $this->compartment->refresh()->quantity);
});
