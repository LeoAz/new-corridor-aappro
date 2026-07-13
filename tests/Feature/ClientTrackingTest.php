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
        'status' => LoadStatus::LIVRE,
        'unload_date' => now(),
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
            ->has('debts')
            ->has('paymentHistory')
        );
});

it('can download client statement pdf', function () {
    $this->actingAs($this->user)
        ->get(route('clients.suivi-client.download', $this->client->id))
        ->assertStatus(200)
        ->assertHeader('Content-Type', 'application/pdf');
});
