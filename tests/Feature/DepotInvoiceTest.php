<?php

use App\Models\Client;
use App\Models\Compartment;
use App\Models\Depot;
use App\Models\DepotInvoice;
use App\Models\DepotInvoiceItem;
use App\Models\User;

test('peut afficher la liste des factures dépôt', function () {
    $user = User::factory()->create();
    DepotInvoice::factory()->count(3)->create();

    $response = $this->actingAs($user)->get(route('finances.facture-depots.index'));

    $response->assertStatus(200);
});

test('peut créer une facture dépôt et décrémenter le stock', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();
    $depot = Depot::factory()->create();
    $compartment = Compartment::factory()->create([
        'depot_id' => $depot->id,
        'product' => 'Gasoil',
        'quantity' => 10000,
    ]);

    $payload = [
        'client_id' => $client->id,
        'depot_id' => $depot->id,
        'date' => now()->format('Y-m-d'),
        'items' => [
            [
                'compartment_id' => $compartment->id,
                'quantity' => 1000,
                'unit_price' => 700,
                'total' => 700000,
            ],
        ],
        'total_amount' => 700000,
    ];

    $response = $this->actingAs($user)->post(route('finances.facture-depots.store'), $payload);

    $response->assertStatus(302);
    $this->assertDatabaseHas('depot_invoices', [
        'client_id' => $client->id,
        'total_amount' => 700000,
    ]);

    $this->assertEquals(9000, $compartment->refresh()->quantity);
});

test('peut consulter une facture dépôt', function () {
    $user = User::factory()->create();
    $invoice = DepotInvoice::factory()->create();

    $response = $this->actingAs($user)->get(route('finances.facture-depots.show', $invoice->id));

    $response->assertStatus(200);
});

test('peut télécharger le PDF de la facture dépôt', function () {
    $user = User::factory()->create();
    $invoice = DepotInvoice::factory()->create();

    $response = $this->actingAs($user)->get(route('finances.facture-depots.download', $invoice->id));

    $response->assertStatus(200);
    $response->assertHeader('content-type', 'application/pdf');
});

test('la suppression de facture restaure le stock', function () {
    $user = User::factory()->create();
    $depot = Depot::factory()->create();
    $compartment = Compartment::factory()->create([
        'depot_id' => $depot->id,
        'quantity' => 5000,
    ]);

    $invoice = DepotInvoice::factory()->create(['depot_id' => $depot->id]);
    DepotInvoiceItem::factory()->create([
        'depot_invoice_id' => $invoice->id,
        'compartment_id' => $compartment->id,
        'quantity' => 2000,
    ]);

    $response = $this->actingAs($user)->delete(route('finances.facture-depots.destroy', $invoice->id));

    $response->assertStatus(302);
    $this->assertEquals(7000, $compartment->refresh()->quantity);
    $this->assertDatabaseMissing('depot_invoices', ['id' => $invoice->id]);
});

test('la modification d\'une facture dépôt met à jour le stock correctement', function () {
    $user = User::factory()->create();
    $depot = Depot::factory()->create();
    $compartment = Compartment::factory()->create([
        'depot_id' => $depot->id,
        'quantity' => 10000,
    ]);

    $invoice = DepotInvoice::factory()->create([
        'depot_id' => $depot->id,
        'date' => '2026-01-01',
    ]);
    $item = DepotInvoiceItem::factory()->create([
        'depot_invoice_id' => $invoice->id,
        'compartment_id' => $compartment->id,
        'quantity' => 2000,
        'unit_price' => 700,
        'total' => 1400000,
    ]);

    // État initial du stock après création manuelle (l'item factory ne décrémente pas auto ici si on n'appelle pas le controller)
    // Mais le controller update restaure d'abord. On va simuler un stock cohérent.
    $compartment->update(['quantity' => 8000]);

    $payload = [
        'client_id' => $invoice->client_id,
        'depot_id' => $depot->id,
        'date' => '2026-01-01',
        'items' => [
            [
                'id' => $item->id,
                'compartment_id' => $compartment->id,
                'quantity' => 3000, // On augmente la quantité de 1000
                'unit_price' => 700,
                'total' => 2100000,
            ],
        ],
        'total_amount' => 2100000,
    ];

    $response = $this->actingAs($user)->put(route('finances.facture-depots.update', $invoice->id), $payload);

    $response->assertStatus(302);
    // Stock initial 8000 + restauration 2000 - nouvelle 3000 = 7000
    $this->assertEquals(7000, $compartment->refresh()->quantity);
    $this->assertDatabaseHas('depot_invoice_items', [
        'id' => $item->id,
        'quantity' => 3000,
    ]);
});

test('la modification peut supprimer un item et restaurer son stock', function () {
    $user = User::factory()->create();
    $depot = Depot::factory()->create();
    $compartment = Compartment::factory()->create([
        'depot_id' => $depot->id,
        'quantity' => 10000,
    ]);

    $invoice = DepotInvoice::factory()->create(['depot_id' => $depot->id]);
    $item1 = DepotInvoiceItem::factory()->create([
        'depot_invoice_id' => $invoice->id,
        'compartment_id' => $compartment->id,
        'quantity' => 2000,
    ]);
    $item2 = DepotInvoiceItem::factory()->create([
        'depot_invoice_id' => $invoice->id,
        'compartment_id' => $compartment->id,
        'quantity' => 1000,
    ]);

    // Stock cohérent après 2 créations
    $compartment->update(['quantity' => 7000]);

    $payload = [
        'client_id' => $invoice->client_id,
        'depot_id' => $depot->id,
        'date' => $invoice->date,
        'items' => [
            [
                'id' => $item1->id,
                'compartment_id' => $compartment->id,
                'quantity' => 2000,
                'unit_price' => $item1->unit_price,
                'total' => $item1->total,
            ],
            // item2 est omis volontairement
        ],
        'total_amount' => $item1->total,
    ];

    $response = $this->actingAs($user)->put(route('finances.facture-depots.update', $invoice->id), $payload);

    $response->assertStatus(302);
    // Stock final: 7000 + (2000+1000 restaurés) - 2000 (item1 maintenu) = 8000
    $this->assertEquals(8000, $compartment->refresh()->quantity);
    $this->assertDatabaseMissing('depot_invoice_items', ['id' => $item2->id]);
});
