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
    expect($compartment->fresh()->quantity)->toEqual(7000.0);
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
