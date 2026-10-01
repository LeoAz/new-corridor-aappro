<?php

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\Load;
use App\Models\User;

test('it filters delivery reports by client', function () {
    $user = User::factory()->create();
    $client1 = Client::factory()->create(['nom' => 'Client A']);
    $client2 = Client::factory()->create(['nom' => 'Client B']);

    // Créer une livraison pour client 1
    Load::factory()->create([
        'client_id' => $client1->id,
        'unload_date' => '2026-07-16',
        'status' => LoadStatus::LIVRER,
        'volume' => 1000,
    ]);

    // Créer une livraison pour client 2
    Load::factory()->create([
        'client_id' => $client2->id,
        'unload_date' => '2026-07-16',
        'status' => LoadStatus::LIVRER,
        'volume' => 2000,
    ]);

    // Sans filtre client : on devrait avoir 2 livraisons (ou au moins les 2 créées)
    $response = $this->actingAs($user)->get(route('rapports.livraisons', [
        'date_from' => '2026-07-16',
        'date_to' => '2026-07-16',
    ]));

    $response->assertStatus(200);
    $loads = $response->original->getData()['page']['props']['loads'];
    expect(count($loads))->toBe(2);

    // Avec filtre client 1
    $response = $this->actingAs($user)->get(route('rapports.livraisons', [
        'client_id' => $client1->id,
        'date_from' => '2026-07-16',
        'date_to' => '2026-07-16',
    ]));

    $response->assertStatus(200);
    $loads = $response->original->getData()['page']['props']['loads'];
    expect(count($loads))->toBe(1);
    expect($loads[0]['client_id'])->toBe($client1->id);
});

test('it summarizes truck counts by client and product', function () {
    $user = User::factory()->create();
    $client1 = Client::factory()->create(['nom' => 'Client A']);
    $client2 = Client::factory()->create(['nom' => 'Client B']);

    Load::factory()->count(2)->create([
        'client_id' => $client1->id,
        'product' => 'GASOIL',
        'unload_date' => '2026-07-16',
        'status' => LoadStatus::LIVRER,
    ]);

    Load::factory()->create([
        'client_id' => $client1->id,
        'product' => 'SUPER',
        'unload_date' => '2026-07-16',
        'status' => LoadStatus::LIVRER,
    ]);

    Load::factory()->create([
        'client_id' => $client2->id,
        'product' => 'GASOIL',
        'unload_date' => '2026-07-16',
        'status' => LoadStatus::LIVRER,
    ]);

    $response = $this->actingAs($user)->get(route('rapports.livraisons', [
        'date_from' => '2026-07-16',
        'date_to' => '2026-07-16',
    ]));

    $response->assertStatus(200);

    $byClientProduct = $response->original->getData()['page']['props']['stats']['by_client_product'];

    expect($byClientProduct['products'])->toEqualCanonicalizing(['GASOIL', 'SUPER']);

    $rows = collect($byClientProduct['rows'])->keyBy('client');

    expect($rows['Client A']['counts']['GASOIL'])->toBe(2)
        ->and($rows['Client A']['counts']['SUPER'])->toBe(1)
        ->and($rows['Client A']['total'])->toBe(3)
        ->and($rows['Client B']['counts']['GASOIL'])->toBe(1)
        ->and($rows['Client B']['counts']['SUPER'] ?? 0)->toBe(0)
        ->and($rows['Client B']['total'])->toBe(1);
});

test('it filters delivery PDF reports by client', function () {
    $user = User::factory()->create();
    $client1 = Client::factory()->create(['nom' => 'Client A']);

    Load::factory()->create([
        'client_id' => $client1->id,
        'unload_date' => '2026-07-16',
        'status' => LoadStatus::LIVRER,
        'volume' => 1000,
    ]);

    $response = $this->actingAs($user)->get(route('rapports.livraisons.download', [
        'client_id' => $client1->id,
    ]));

    $response->assertStatus(200)
        ->assertHeader('Content-Type', 'application/pdf');
});
