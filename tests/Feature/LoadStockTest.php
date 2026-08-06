<?php

use App\Models\Compartment;
use App\Models\Depot;
use App\Models\Load;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->be($this->user);
});

test('quantity is deducted from compartment when a load is created', function () {
    $depot = Depot::factory()->create();
    $compartment = Compartment::factory()->create([
        'depot_id' => $depot->id,
        'quantity' => 10000,
    ]);

    $loadData = [
        'load_date' => now()->format('Y-m-d'),
        'product' => $compartment->product,
        'volume' => 2000,
        'vehicle_registration' => 'AB-123-CD',
        'depot_id' => $depot->id,
        'compartment_id' => $compartment->id,
    ];

    $response = $this->post(route('operations.chargements.store'), $loadData);

    $response->assertRedirect();
    expect($compartment->fresh()->quantity)->toEqual(8000.0);
});

test('quantity is adjusted in compartment when a load is updated', function () {
    $depot = Depot::factory()->create();
    $compartment = Compartment::factory()->create([
        'depot_id' => $depot->id,
        'quantity' => 10000,
    ]);

    // On crée via l'API
    $this->post(route('operations.chargements.store'), [
        'load_date' => now()->format('Y-m-d'),
        'product' => $compartment->product,
        'volume' => 2000,
        'vehicle_registration' => 'AB-123-CD',
        'depot_id' => $depot->id,
        'compartment_id' => $compartment->id,
    ]);

    $load = Load::latest()->first();
    expect($compartment->fresh()->quantity)->toEqual(8000.0);

    $updateData = [
        'load_date' => now()->format('Y-m-d'),
        'product' => $compartment->product,
        'volume' => 3000,
        'vehicle_registration' => 'AB-123-CD',
        'depot_id' => $depot->id,
        'compartment_id' => $compartment->id,
    ];

    $response = $this->put(route('operations.chargements.update', $load->id), $updateData);

    $response->assertRedirect();
    // La quantité doit être ajustée à 7000.0 (10000 - 3000)
    expect($compartment->fresh()->quantity)->toEqual(7000.0);
});

test('quantity is adjusted correctly when compartment changes during update', function () {
    $depot = Depot::factory()->create();
    $comp1 = Compartment::factory()->create([
        'depot_id' => $depot->id,
        'quantity' => 10000,
    ]);
    $comp2 = Compartment::factory()->create([
        'depot_id' => $depot->id,
        'quantity' => 5000,
    ]);

    // On crée un chargement sur comp1
    $this->post(route('operations.chargements.store'), [
        'load_date' => now()->format('Y-m-d'),
        'product' => $comp1->product,
        'volume' => 2000,
        'vehicle_registration' => 'AB-123-CD',
        'depot_id' => $depot->id,
        'compartment_id' => $comp1->id,
    ]);

    $load = Load::latest()->first();
    expect($comp1->fresh()->quantity)->toEqual(8000.0);
    expect($comp2->fresh()->quantity)->toEqual(5000.0);

    // On change pour comp2 avec un volume de 1500
    $updateData = [
        'load_date' => now()->format('Y-m-d'),
        'product' => $comp2->product,
        'volume' => 1500,
        'vehicle_registration' => 'AB-123-CD',
        'depot_id' => $depot->id,
        'compartment_id' => $comp2->id,
    ];

    $this->put(route('operations.chargements.update', $load->id), $updateData);

    // comp1 doit être restauré (8000 + 2000 = 10000)
    expect($comp1->fresh()->quantity)->toEqual(10000.0);
    // comp2 doit être déduit (5000 - 1500 = 3500)
    expect($comp2->fresh()->quantity)->toEqual(3500.0);
});

test('quantity is restored to compartment when a load is deleted', function () {
    $depot = Depot::factory()->create();
    $compartment = Compartment::factory()->create([
        'depot_id' => $depot->id,
        'quantity' => 10000,
    ]);

    // On crée via l'API
    $this->post(route('operations.chargements.store'), [
        'load_date' => now()->format('Y-m-d'),
        'product' => $compartment->product,
        'volume' => 2000,
        'vehicle_registration' => 'AB-123-CD',
        'depot_id' => $depot->id,
        'compartment_id' => $compartment->id,
    ]);

    $load = Load::latest()->first();
    expect($compartment->fresh()->quantity)->toEqual(8000.0);

    $response = $this->delete(route('operations.chargements.destroy', $load->id));

    $response->assertRedirect();
    expect($compartment->fresh()->quantity)->toEqual(10000.0);
});
