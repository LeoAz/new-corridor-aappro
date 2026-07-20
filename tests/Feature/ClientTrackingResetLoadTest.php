<?php

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\Load;
use App\Models\User;

test('it can reset a paid load to invoiced status', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();
    $load = Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::PAYE,
        'is_paid' => true,
    ]);

    $response = $this->actingAs($user)
        ->from(route('clients.suivi-client.index', ['client_id' => $client->id]))
        ->post(route('clients.suivi-client.reset-load', $load));

    $response->assertRedirect(route('clients.suivi-client.index', ['client_id' => $client->id]));

    $load->refresh();
    expect($load->status)->toBe(LoadStatus::FACTURER);
    expect($load->is_paid)->toBeFalse();
});
