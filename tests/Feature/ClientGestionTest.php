<?php

use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

test('on peut lister les clients', function () {
    Client::factory()->count(3)->create();

    $response = $this->get(route('clients.gestion.index'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('clients/gestion')
        ->has('clients', 3)
    );
});

test('on peut créer un client avec un solde initial', function () {
    $clientData = [
        'nom' => 'Nouveau Client',
        'contact' => '01020304',
        'address' => 'Abidjan',
        'initial_balance' => -500000,
    ];

    $response = $this->post(route('clients.gestion.store'), $clientData);

    $response->assertStatus(302);
    $this->assertDatabaseHas('clients', [
        'nom' => 'Nouveau Client',
        'initial_balance' => -500000,
    ]);
});

test('on peut modifier un client', function () {
    $client = Client::factory()->create(['nom' => 'Ancien Nom']);

    $response = $this->put(route('clients.gestion.update', $client), [
        'nom' => 'Nouveau Nom',
        'contact' => $client->contact,
        'address' => $client->address,
        'initial_balance' => 1000000,
    ]);

    $response->assertStatus(302);
    $this->assertDatabaseHas('clients', [
        'id' => $client->id,
        'nom' => 'Nouveau Nom',
        'initial_balance' => 1000000,
    ]);
});

test('on peut supprimer un client', function () {
    $client = Client::factory()->create();

    $response = $this->delete(route('clients.gestion.destroy', $client));

    $response->assertStatus(302);
    $this->assertDatabaseMissing('clients', ['id' => $client->id]);
});

test('le relevé de compte affiche correctement le solde initial négatif au débit', function () {
    $client = Client::factory()->create(['initial_balance' => -500000]);

    $response = $this->get(route('clients.releve.show', $client));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('clients/releve')
        ->where('statement.initialBalance', -500000)
    );
});

test('le relevé de compte affiche correctement le solde initial positif au crédit', function () {
    $client = Client::factory()->create(['initial_balance' => 1000000]);

    $response = $this->get(route('clients.releve.show', $client));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('clients/releve')
        ->where('statement.initialBalance', 1000000)
    );
});
