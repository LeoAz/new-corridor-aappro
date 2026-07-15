<?php

use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\Invoice;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->client = Client::factory()->create();
});

test('client statement page is accessible', function () {
    $response = $this->actingAs($this->user)
        ->get(route('clients.releve.index'));

    $response->assertStatus(200);
});

test('client statement show page calculates balance correctly', function () {
    // 1. Créer une facture (Débit: 100 000)
    Invoice::factory()->create([
        'client_id' => $this->client->id,
        'date' => '2026-01-01',
        'total_amount' => 100000,
    ]);

    // 2. Créer un paiement (Crédit: 40 000)
    ClientPayment::factory()->create([
        'client_id' => $this->client->id,
        'date' => '2026-01-05',
        'amount' => 40000,
        'is_advance' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('clients.releve.show', $this->client->id));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->where('statement.initialBalance', 0)
        ->where('statement.finalBalance', -60000)
        ->has('statement.operations', 2)
    );
});

test('it can download client statement pdf', function () {
    $this->actingAs($this->user)
        ->get(route('clients.releve.download', $this->client->id))
        ->assertStatus(200)
        ->assertHeader('Content-Type', 'application/pdf');
});
