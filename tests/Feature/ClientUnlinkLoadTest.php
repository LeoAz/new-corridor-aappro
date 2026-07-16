<?php

use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);
});

test('client tracking unlink load route is removed', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/clients/suivi-client/unlink-load')
        ->assertNotFound();
});

test('deleting a payment does not require delivery unlinking', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();
    $payment = ClientPayment::factory()->create(['client_id' => $client->id]);

    $response = $this->actingAs($user)
        ->from(route('clients.suivi-client.index'))
        ->delete(route('clients.reglements.destroy', $payment));

    $response->assertRedirect();
    if (session('error')) {
        $this->fail('Delete failed with error: '.session('error'));
    }

    $this->assertDatabaseMissing('client_payments', ['id' => $payment->id]);
});
