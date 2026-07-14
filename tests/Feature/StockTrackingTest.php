<?php

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\Compartment;
use App\Models\Depot;
use App\Models\DepotInvoice;
use App\Models\DepotInvoiceItem;
use App\Models\FuelPurchase;
use App\Models\Load;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

test('stock tracking index page is accessible', function () {
    $depot = Depot::factory()->has(Compartment::factory()->count(3))->create();

    $response = $this->get(route('stocks.suivi-stock'));

    $response->assertStatus(200);
});

test('stock tracking index page displays stock data', function () {
    $depot = Depot::factory()->has(Compartment::factory()->count(3))->create();
    $compartment = $depot->compartments->first();
    $client = Client::factory()->create();

    $dateFrom = now()->startOfMonth()->toDateString();
    $dateTo = now()->toDateString();

    // Create a purchase
    FuelPurchase::factory()->create([
        'depot_id' => $depot->id,
        'compartment_id' => $compartment->id,
        'quantity' => 5000,
        'purchase_date' => now()->toDateString(),
    ]);

    // Create a load
    Load::factory()->create([
        'depot_id' => $depot->id,
        'compartment_id' => $compartment->id,
        'volume' => 1000,
        'load_date' => now()->toDateTimeString(),
        'client_id' => $client->id,
    ]);

    // Create a depot sale
    $invoice = DepotInvoice::factory()->create([
        'depot_id' => $depot->id,
        'client_id' => $client->id,
        'date' => now()->toDateString(),
    ]);
    DepotInvoiceItem::factory()->create([
        'depot_invoice_id' => $invoice->id,
        'compartment_id' => $compartment->id,
        'quantity' => 500,
    ]);

    $response = $this->get(route('stocks.suivi-stock', [
        'depot_id' => $depot->id,
        'date_from' => $dateFrom,
        'date_to' => $dateTo,
    ]));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('stocks/suivi-stock')
        ->has('depots')
        ->has('purchases', 1)
        ->has('chargements', 1)
        ->has('livraisons', 0)
        ->has('depotSales', 1)
    );
});

test('stock tracking sums volumes correctly', function () {
    $depot = Depot::factory()->has(Compartment::factory()->count(1))->create();
    $compartment = $depot->compartments->first();
    $client = Client::factory()->create();

    // 1 Load EN_COURS
    Load::factory()->create([
        'depot_id' => $depot->id,
        'compartment_id' => $compartment->id,
        'volume' => 8104500,
        'status' => LoadStatus::EN_COURS,
        'load_date' => now(),
    ]);

    // 1 Load LIVRER
    Load::factory()->create([
        'depot_id' => $depot->id,
        'compartment_id' => $compartment->id,
        'volume' => 687151,
        'status' => LoadStatus::LIVRER,
        'load_date' => now(),
    ]);

    // 1 Depot Sale
    $invoice = DepotInvoice::factory()->create([
        'depot_id' => $depot->id,
        'client_id' => $client->id,
        'date' => now(),
    ]);
    DepotInvoiceItem::factory()->create([
        'depot_invoice_id' => $invoice->id,
        'compartment_id' => $compartment->id,
        'quantity' => 1000000,
    ]);

    $response = $this->get(route('stocks.suivi-stock', [
        'depot_id' => $depot->id,
        'date_from' => now()->startOfMonth()->toDateString(),
        'date_to' => now()->toDateString(),
    ]));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->where('chargements.0.volume', 8104500)
        ->where('livraisons.0.volume', 687151)
        ->where('depotSales.0.quantity', 1000000)
    );
});

test('stock tracking pdf download is accessible', function () {
    $depot = Depot::factory()->has(Compartment::factory()->count(3))->create();

    $response = $this->get(route('stocks.suivi-stock.download', [
        'depot_id' => $depot->id,
        'date_from' => now()->startOfMonth()->toDateString(),
        'date_to' => now()->toDateString(),
    ]));

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'application/pdf');
});

test('stock tracking pdf download works even if load client is missing', function () {
    $depot = Depot::factory()->has(Compartment::factory()->count(1))->create();
    $compartment = $depot->compartments->first();

    // Create a load without a client_id (if the database allows it)
    // or just a load where the client relation might fail
    $load = Load::factory()->create([
        'depot_id' => $depot->id,
        'compartment_id' => $compartment->id,
        'client_id' => null,
        'load_date' => now()->toDateTimeString(),
    ]);

    $response = $this->get(route('stocks.suivi-stock.download', [
        'depot_id' => $depot->id,
        'date_from' => now()->startOfMonth()->toDateString(),
        'date_to' => now()->toDateString(),
    ]));

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'application/pdf');
});
