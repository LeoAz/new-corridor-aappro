<?php

use App\Models\Client;
use App\Models\Load;
use App\Models\User;
use App\Enums\LoadStatus;

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
