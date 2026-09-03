<?php

use App\Enums\LoadStatus;
use App\Models\Client;
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
