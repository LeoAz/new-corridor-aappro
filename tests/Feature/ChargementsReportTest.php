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

test('chargements report only shows loads still in progress', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();

    $enCours = Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::EN_COURS,
        'load_date' => now(),
    ]);

    $partiellementLivre = Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::LIVRE_PARTIELLEMENT,
        'load_date' => now(),
    ]);

    Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::TOTALEMENT_LIVRE,
        'load_date' => now(),
    ]);

    Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::PAYE,
        'load_date' => now(),
    ]);

    $response = $this->actingAs($user)->get(route('rapports.chargements'));

    $response->assertStatus(200);

    $loadIds = collect($response->viewData('page')['props']['loads'])->pluck('id')->sort()->values();

    expect($loadIds->all())->toBe(collect([$enCours->id, $partiellementLivre->id])->sort()->values()->all());
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
