<?php

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\Compartment;
use App\Models\Depot;
use App\Models\DepotInvoice;
use App\Models\DepotInvoiceItem;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Load;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;

test('client tracking blank page is accessible', function () {
    $user = User::factory()->create();
    $depot = Depot::factory()->create(['name' => 'Depot Central']);
    Compartment::factory()->create([
        'depot_id' => $depot->id,
        'product' => 'GASOIL',
        'quantity' => 15000,
    ]);

    $this->actingAs($user)
        ->get(route('clients.suivi-client.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('clients/suivi-client')
            ->where('selectedClient', null)
            ->has('clients')
            ->has('loads', 0)
            ->has('payments', 0)
            ->where('depots.0.name', 'Depot Central')
            ->where('depots.0.compartments.0.product', 'GASOIL')
        );
});

test('client tracking selects the first client by default', function () {
    $user = User::factory()->create();
    Client::factory()->create(['nom' => 'Zed Client']);
    $firstClient = Client::factory()->create(['nom' => 'Alpha Client']);

    $this->actingAs($user)
        ->get(route('clients.suivi-client.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('clients/suivi-client')
            ->where('selectedClient.id', $firstClient->id)
        );
});

test('client tracking invoices endpoint returns invoice line details', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();

    $load = Load::factory()->create([
        'client_id' => $client->id,
        'product' => 'GASOIL',
        'volume' => 1200,
    ]);
    $invoice = Invoice::factory()->create([
        'client_id' => $client->id,
        'number' => 'FAC-2026-00010',
        'date' => '2026-07-15',
        'total_amount' => 590000,
    ]);
    InvoiceItem::factory()->create([
        'invoice_id' => $invoice->id,
        'load_id' => $load->id,
        'bl_number' => 'BL-LOCAL-001',
        'quantity_delivered' => 1200,
        'missing_quantity' => 20,
        'unit_price' => 500,
        'total' => 590000,
    ]);

    $compartment = Compartment::factory()->create(['product' => 'SUPER']);
    $depotInvoice = DepotInvoice::factory()->create([
        'client_id' => $client->id,
        'number' => 'FAC-DEP-2026-00003',
        'date' => '2026-07-14',
        'total_amount' => 300000,
    ]);
    DepotInvoiceItem::factory()->create([
        'depot_invoice_id' => $depotInvoice->id,
        'compartment_id' => $compartment->id,
        'quantity' => 600,
        'unit_price' => 500,
        'total' => 300000,
    ]);

    $response = $this->actingAs($user)->getJson(route('clients.suivi-client.invoices', $client));

    $response->assertOk()
        ->assertJsonPath('load_invoices.0.number', 'FAC-2026-00010')
        ->assertJsonPath('load_invoices.0.client_id', $client->id)
        ->assertJsonPath('load_invoices.0.items.0.load_id', $load->id)
        ->assertJsonPath('load_invoices.0.items.0.bl_number', 'BL-LOCAL-001')
        ->assertJsonPath('load_invoices.0.items.0.product', 'GASOIL')
        ->assertJsonPath('load_invoices.0.items.0.quantity', 1200)
        ->assertJsonPath('load_invoices.0.items.0.missing_quantity', 20)
        ->assertJsonPath('load_invoices.0.items.0.unit_price', 500)
        ->assertJsonPath('load_invoices.0.items.0.total', 590000)
        ->assertJsonPath('depot_invoices.0.number', 'FAC-DEP-2026-00003')
        ->assertJsonPath('depot_invoices.0.client_id', $client->id)
        ->assertJsonPath('depot_invoices.0.depot_id', $depotInvoice->depot_id)
        ->assertJsonPath('depot_invoices.0.items.0.compartment_id', $compartment->id)
        ->assertJsonPath('depot_invoices.0.items.0.product', 'SUPER')
        ->assertJsonPath('depot_invoices.0.items.0.quantity', 600)
        ->assertJsonPath('depot_invoices.0.items.0.missing_quantity', 0)
        ->assertJsonPath('depot_invoices.0.items.0.unit_price', 500)
        ->assertJsonPath('depot_invoices.0.items.0.total', 300000);
});

test('processing a payment applies missing quantity to invoice and exposes it in tracking tables', function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $user = User::factory()->create();
    $client = Client::factory()->create();
    $payment = ClientPayment::factory()->create([
        'client_id' => $client->id,
        'date' => '2026-07-16',
        'amount' => 590000,
    ]);

    $load = Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::FACTURER,
        'is_unload' => true,
        'unload_date' => '2026-07-15',
        'volume' => 1200,
    ]);

    $invoice = Invoice::factory()->create([
        'client_id' => $client->id,
        'total_missing' => 0,
        'total_amount' => 600000,
    ]);

    $invoiceItem = InvoiceItem::factory()->create([
        'invoice_id' => $invoice->id,
        'load_id' => $load->id,
        'quantity_delivered' => 1200,
        'missing_quantity' => 0,
        'unit_price' => 500,
        'total' => 600000,
        'is_paid' => false,
        'client_payment_id' => null,
    ]);

    $this->actingAs($user)
        ->post(route('clients.suivi-client.payment'), [
            'payment_id' => $payment->id,
            'load_ids' => [$load->id],
            'missings' => [
                $load->id => 20,
            ],
        ])
        ->assertRedirect();

    $invoiceItem->refresh();
    expect($invoiceItem->quantity_delivered)->toBe(1180.0);
    expect($invoiceItem->missing_quantity)->toBe(20.0);
    expect($invoiceItem->total)->toBe(590000.0);
    expect($invoiceItem->is_paid)->toBeTrue();
    expect($invoiceItem->client_payment_id)->toBe($payment->id);

    $invoice->refresh();
    expect((float) $invoice->total_missing)->toBe(20.0);
    expect((float) $invoice->total_amount)->toBe(590000.0);

    $load->refresh();
    expect($load->status)->toBe(LoadStatus::PAYE);
    expect($load->client_payment_id)->toBe($payment->id);

    $this->actingAs($user)
        ->get(route('clients.suivi-client.index', ['client_id' => $client->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('clients/suivi-client')
            ->where('loads.0.missing_quantity', fn ($value) => (float) $value === 20.0)
            ->where('loads.0.total_amount', fn ($value) => (float) $value === 590000.0)
            ->where('payments.0.loads.0.invoice_items.0.missing_quantity', fn ($value) => (float) $value === 20.0)
            ->where('payments.0.loads.0.invoice_items.0.total', fn ($value) => (float) $value === 590000.0)
        );

    $this->actingAs($user)
        ->post(route('clients.suivi-client.unlink-load'), [
            'load_id' => $load->id,
        ])
        ->assertRedirect();

    $invoiceItem->refresh();
    expect($invoiceItem->quantity_delivered)->toBe(1200.0);
    expect($invoiceItem->missing_quantity)->toBe(0.0);
    expect($invoiceItem->total)->toBe(600000.0);

    $invoice->refresh();
    expect((float) $invoice->total_missing)->toBe(0.0);
    expect((float) $invoice->total_amount)->toBe(600000.0);
});

test('updating a paid load missing quantity recalculates invoice amounts', function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $user = User::factory()->create();
    $client = Client::factory()->create();
    $payment = ClientPayment::factory()->create([
        'client_id' => $client->id,
        'amount' => 590000,
    ]);

    $load = Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::PAYE,
        'client_payment_id' => $payment->id,
        'volume' => 1200,
    ]);

    $invoice = Invoice::factory()->create([
        'client_id' => $client->id,
        'total_missing' => 20,
        'total_amount' => 590000,
    ]);

    $invoiceItem = InvoiceItem::factory()->create([
        'invoice_id' => $invoice->id,
        'load_id' => $load->id,
        'quantity_delivered' => 1180,
        'missing_quantity' => 20,
        'unit_price' => 500,
        'total' => 590000,
        'is_paid' => true,
        'client_payment_id' => $payment->id,
    ]);

    $this->actingAs($user)
        ->post(route('clients.suivi-client.update-payment-load'), [
            'payment_id' => $payment->id,
            'load_id' => $load->id,
            'missing_quantity' => 50,
        ])
        ->assertRedirect();

    $invoiceItem->refresh();
    expect($invoiceItem->quantity_delivered)->toBe(1150.0);
    expect($invoiceItem->missing_quantity)->toBe(50.0);
    expect($invoiceItem->total)->toBe(575000.0);
    expect($invoiceItem->is_paid)->toBeTrue();
    expect($invoiceItem->client_payment_id)->toBe($payment->id);

    $invoice->refresh();
    expect((float) $invoice->total_missing)->toBe(50.0);
    expect((float) $invoice->total_amount)->toBe(575000.0);

    $load->refresh();
    expect($load->status)->toBe(LoadStatus::PAYE);
    expect($load->client_payment_id)->toBe($payment->id);
});
