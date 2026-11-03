<?php

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\Depot;
use App\Models\InvoiceItem;
use App\Models\Load;
use App\Models\User;

test('a user can access chargements report', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();

    Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::EN_COURS,
        'load_date' => now(),
    ]);

    $response = $this->actingAs($user)->get(route('rapports.chargements'));

    $response->assertStatus(200);
});

test('chargements report includes loads of every status with a remaining volume', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();

    $statusesWithRemainingVolume = array_filter(LoadStatus::cases(), fn (LoadStatus $status) => $status !== LoadStatus::TOTALEMENT_LIVRE);

    $loads = collect($statusesWithRemainingVolume)->map(fn (LoadStatus $status) => Load::factory()->create([
        'client_id' => $client->id,
        'status' => $status,
        'load_date' => now(),
    ]));

    $response = $this->actingAs($user)->get(route('rapports.chargements'));

    $response->assertStatus(200);

    $loadIds = collect($response->viewData('page')['props']['loads'])->pluck('id')->sort()->values();

    expect($loadIds->all())->toBe($loads->pluck('id')->sort()->values()->all());
});

test('chargements report excludes loads with no remaining volume', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();

    $withRemaining = Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::EN_COURS,
        'load_date' => now(),
    ]);

    Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::TOTALEMENT_LIVRE,
        'load_date' => now(),
    ]);

    $response = $this->actingAs($user)->get(route('rapports.chargements'));

    $response->assertStatus(200);

    $loadIds = collect($response->viewData('page')['props']['loads'])->pluck('id');

    expect($loadIds->all())->toBe([$withRemaining->id]);
});

test('a user can download chargements report pdf', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();

    Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::EN_COURS,
        'load_date' => now(),
    ]);

    $response = $this->actingAs($user)->get(route('rapports.chargements.download'));

    $response->assertStatus(200)
        ->assertHeader('Content-Type', 'application/pdf');
});

test('chargements report pdf splits the detail into several tables to limit memory usage', function () {
    $client = Client::factory()->create();
    $depot = Depot::factory()->create();

    $loads = Load::factory()->count(120)->create([
        'client_id' => $client->id,
        'depot_id' => $depot->id,
        'status' => LoadStatus::EN_COURS,
        'load_date' => now(),
    ])->load(['client', 'depot', 'invoiceItems']);

    $html = view('reports.chargements_pdf', [
        'loads' => $loads->values(),
        'stats' => [],
        'depotStats' => [],
        'totalVolume' => $loads->sum('volume'),
        'totalRemaining' => 0,
        'filters' => [],
        'client' => null,
        'qrcode' => '',
        'date' => now()->format('d/m/Y H:i'),
    ])->render();

    expect(substr_count($html, 'class="table detail"'))->toBe(3)
        ->and($html)->toContain('<td class="text-center">120</td>');
});

test('a user can download a large chargements report pdf', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();
    $depot = Depot::factory()->create();

    Load::factory()->count(300)->create([
        'client_id' => $client->id,
        'depot_id' => $depot->id,
        'status' => LoadStatus::EN_COURS,
        'load_date' => now(),
    ]);

    $response = $this->actingAs($user)->get(route('rapports.chargements.download'));

    $response->assertStatus(200)
        ->assertHeader('Content-Type', 'application/pdf');
});

test('chargements report filters remaining volume in sql like the remaining quantity accessor', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();

    $fullyInvoiced = Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::FACTURER,
        'volume' => 30000,
        'load_date' => now(),
    ]);
    InvoiceItem::factory()->create(['load_id' => $fullyInvoiced->id, 'quantity_delivered' => 30000]);

    $partiallyInvoiced = Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::LIVRE_PARTIELLEMENT,
        'volume' => 30000,
        'load_date' => now(),
    ]);
    InvoiceItem::factory()->create(['load_id' => $partiallyInvoiced->id, 'quantity_delivered' => 10000]);

    expect(Load::query()->withRemainingQuantity()->pluck('id')->all())->toBe([$partiallyInvoiced->id]);

    $response = $this->actingAs($user)->get(route('rapports.chargements'));

    $loads = collect($response->viewData('page')['props']['loads']);

    expect($loads->pluck('id')->all())->toBe([$partiallyInvoiced->id])
        ->and((float) $loads->first()['remaining_quantity'])->toBe(20000.0);
});
