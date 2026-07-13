<?php

use App\Models\Depot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

test('can view depots index', function () {
    $response = $this->get(route('configuration.depots.index'));

    $response->assertStatus(200);
});

test('can create a depot with compartments', function () {
    $data = [
        'name' => 'Depot Test',
        'compartments' => [
            ['product' => 'Essence', 'quantity' => 1000],
            ['product' => 'Gasoil', 'quantity' => 2000],
        ],
    ];

    $response = $this->post(route('configuration.depots.store'), $data);

    $response->assertRedirect();
    $this->assertDatabaseHas('depots', ['name' => 'Depot Test']);
    $this->assertDatabaseHas('compartments', ['product' => 'Essence', 'quantity' => 1000]);
    $this->assertDatabaseHas('compartments', ['product' => 'Gasoil', 'quantity' => 2000]);
});

test('can update a depot and its compartments', function () {
    $depot = Depot::create(['name' => 'Old Name']);
    $comp = $depot->compartments()->create(['product' => 'Old Product', 'quantity' => 500]);

    $data = [
        'name' => 'New Name',
        'compartments' => [
            ['id' => $comp->id, 'product' => 'New Product', 'quantity' => 600],
            ['product' => 'Added Product', 'quantity' => 100],
        ],
    ];

    $response = $this->put(route('configuration.depots.update', $depot), $data);

    $response->assertRedirect();
    $this->assertDatabaseHas('depots', ['id' => $depot->id, 'name' => 'New Name']);
    $this->assertDatabaseHas('compartments', ['id' => $comp->id, 'product' => 'New Product', 'quantity' => 600]);
    $this->assertDatabaseHas('compartments', ['product' => 'Added Product', 'quantity' => 100]);
});

test('can delete a depot', function () {
    $depot = Depot::create(['name' => 'To Delete']);
    $depot->compartments()->create(['product' => 'P1', 'quantity' => 100]);

    $response = $this->delete(route('configuration.depots.destroy', $depot));

    $response->assertRedirect();
    $this->assertDatabaseMissing('depots', ['id' => $depot->id]);
    $this->assertDatabaseMissing('compartments', ['depot_id' => $depot->id]);
});
