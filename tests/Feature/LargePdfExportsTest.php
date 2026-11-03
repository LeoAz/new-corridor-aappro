<?php

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\Compartment;
use App\Models\Depot;
use App\Models\FuelPurchase;
use App\Models\Load;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->depot = Depot::factory()->create();
    $this->client = Client::factory()->create();
    $this->compartment = Compartment::factory()->create(['depot_id' => $this->depot->id]);
});

test('large list pdf exports are split into several tables with continuous numbering', function (string $view, string $variable, Closure $makeRecords) {
    $records = $makeRecords($this);

    $html = view($view, [$variable => $records, 'filters' => []])->render();

    expect(substr_count($html, '<table class="detail">'))->toBe(3)
        ->and($html)->toContain('<td>120</td>');
})->with([
    'chargements en cours' => ['operations.loads_pdf', 'loads', fn ($test) => Load::factory()->count(120)->create([
        'depot_id' => $test->depot->id, 'client_id' => $test->client->id, 'compartment_id' => $test->compartment->id,
    ])->load(['depot', 'client', 'compartment'])],
    'livraisons' => ['operations.deliveries_pdf', 'deliveries', fn ($test) => Load::factory()->count(120)->create([
        'depot_id' => $test->depot->id, 'client_id' => $test->client->id, 'compartment_id' => $test->compartment->id,
        'status' => LoadStatus::LIVRER, 'unload_date' => now(),
    ])->load(['depot', 'client', 'compartment'])],
    'achats carburant' => ['finances.fuel_purchases_pdf', 'purchases', fn ($test) => FuelPurchase::factory()->count(120)->create([
        'depot_id' => $test->depot->id, 'compartment_id' => $test->compartment->id,
    ])->load(['depot', 'compartment'])],
]);

test('large list pdf exports can be downloaded', function (string $routeName) {
    Load::factory()->count(120)->create([
        'depot_id' => $this->depot->id,
        'client_id' => $this->client->id,
        'compartment_id' => $this->compartment->id,
        'status' => LoadStatus::EN_COURS,
        'load_date' => now(),
    ]);
    Load::factory()->count(120)->create([
        'depot_id' => $this->depot->id,
        'client_id' => $this->client->id,
        'compartment_id' => $this->compartment->id,
        'status' => LoadStatus::LIVRER,
        'unload_date' => now(),
    ]);
    FuelPurchase::factory()->count(120)->create([
        'depot_id' => $this->depot->id,
        'compartment_id' => $this->compartment->id,
    ]);

    $this->actingAs($this->user)->get(route($routeName))
        ->assertStatus(200)
        ->assertHeader('Content-Type', 'application/pdf');
})->with([
    'operations.chargements.download',
    'operations.livraisons.download',
    'finances.achat-carburant.download',
]);
