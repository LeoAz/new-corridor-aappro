<?php

namespace Tests\Feature;

use App\Enums\LoadStatus;
use App\Enums\PaymentMethod;
use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\Load;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->client = Client::factory()->create(['nom' => 'Test Client']);
});

test('client tracking index page is accessible', function () {
    $this->actingAs($this->user)
        ->get(route('clients.suivi-client.index'))
        ->assertStatus(200);
});

test('client tracking show page is accessible and displays data', function () {
    // Create some data
    Load::factory()->create([
        'client_id' => $this->client->id,
        'status' => LoadStatus::LIVRER,
        'load_date' => now(),
    ]);

    ClientPayment::factory()->create([
        'client_id' => $this->client->id,
        'amount' => 50000,
        'date' => now(),
        'payment_method' => PaymentMethod::ESPECE,
    ]);

    $this->actingAs($this->user)
        ->get(route('clients.suivi-client.show', $this->client->id))
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page
            ->component('clients/suivi-client')
            ->has('client')
            ->has('statement')
            ->has('loads')
            ->has('paymentHistory')
        );
});

test('it includes initial balance in tracking', function () {
    $client = Client::factory()->create([
        'initial_balance' => 100000,
    ]);

    $this->actingAs($this->user)
        ->get(route('clients.suivi-client.show', $client->id))
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page
            ->where('statement.initialBalance', 100000)
            ->where('statement.finalBalance', 100000)
        );
});

it('can download client statement pdf', function () {
    $this->actingAs($this->user)
        ->get(route('clients.suivi-client.download', $this->client->id))
        ->assertStatus(200)
        ->assertHeader('Content-Type', 'application/pdf');
});

test('paid loads include payment details in tracking', function () {
    $payment = ClientPayment::factory()->create([
        'client_id' => $this->client->id,
        'amount' => 50000,
        'reference' => 'TEST-REF-123',
        'date' => '2026-07-14',
    ]);

    Load::factory()->create([
        'client_id' => $this->client->id,
        'status' => LoadStatus::PAYE,
        'client_payment_id' => $payment->id,
        'unload_date' => '2026-07-14',
    ]);

    $this->actingAs($this->user)
        ->get(route('clients.suivi-client.show', $this->client->id))
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page
            ->has('loads.paye', 1)
            ->where('loads.paye.0.payment_reference', 'TEST-REF-123')
            ->where('loads.paye.0.payment_date', '2026-07-14')
        );
});
