<?php

use App\Models\Client;
use App\Models\User;

test('it can store a client payment with accented method', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();

    $response = $this->actingAs($user)
        ->post(route('clients.reglements.store'), [
            'client_id' => $client->id,
            'date' => now()->format('Y-m-d'),
            'payment_method' => 'Chèque',
            'numero' => 'CHQ-123',
            'amount' => 1000,
        ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('client_payments', [
        'client_id' => $client->id,
        'payment_method' => 'CHEQUE',
        'numero' => 'CHQ-123',
    ]);
});

test('it can store a client payment with VERSEMENT method', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();

    $payload = [
        'client_id' => $client->id,
        'date' => now()->format('Y-m-d'),
        'payment_method' => 'VERSEMENT',
        'banque' => 'Test Bank',
        'numero' => 'TEST123456',
        'amount' => 100000,
        'note' => 'Test note',
    ];

    $response = $this->actingAs($user)
        ->post(route('clients.reglements.store'), $payload);

    $response->assertRedirect();
    $this->assertDatabaseHas('client_payments', [
        'client_id' => $client->id,
        'payment_method' => 'VERSEMENT',
        'numero' => 'TEST123456',
        'amount' => 100000,
    ]);
});

test('it can store a client payment with other enum values', function (string $method) {
    $user = User::factory()->create();
    $client = Client::factory()->create();

    $payload = [
        'client_id' => $client->id,
        'date' => now()->format('Y-m-d'),
        'payment_method' => $method,
        'banque' => 'Test Bank',
        'numero' => 'TEST-'.$method,
        'amount' => 50000,
        'note' => 'Test '.$method,
    ];

    $response = $this->actingAs($user)
        ->post(route('clients.reglements.store'), $payload);

    $response->assertRedirect();
    $this->assertDatabaseHas('client_payments', [
        'payment_method' => $method,
    ]);
})->with(['CHEQUE', 'VIREMENT', 'ESPECE', 'AUTRES']);
