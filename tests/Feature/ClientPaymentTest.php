<?php

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Load;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->user = User::factory()->create();
    $this->client = Client::factory()->create();
});

test('on peut lister les règlements', function () {
    ClientPayment::create([
        'client_id' => $this->client->id,
        'payment_type' => 'REGLEMENT',
        'is_advance' => false,
        'amount' => 1000,
        'payment_method' => 'Espèce',
        'date' => now(),
    ]);

    $this->actingAs($this->user)
        ->get(route('finances.reglements.index'))
        ->assertStatus(200);
});

test('on peut créer un règlement simple', function () {
    $load = Load::factory()->create([
        'client_id' => $this->client->id,
        'status' => LoadStatus::FACTURER,
    ]);

    $data = [
        'client_id' => $this->client->id,
        'delivery_ids' => [$load->id],
        'amount' => 50000,
        'payment_method' => 'Espèce',
        'date' => now()->format('Y-m-d'),
        'reference' => 'CHQ-001',
        'use_advance' => false,
        'is_new_advance' => false,
    ];

    $this->actingAs($this->user)
        ->post(route('finances.reglements.store'), $data)
        ->assertStatus(302);

    expect(ClientPayment::where('payment_type', 'REGLEMENT')->count())->toBe(1);
    expect($load->refresh()->status)->toBe(LoadStatus::PAYE);
    expect($load->is_paid)->toBeTrue();
});

test('la création d\'un règlement échoue pour une livraison non facturée', function () {
    $load = Load::factory()->create([
        'client_id' => $this->client->id,
        'status' => LoadStatus::LIVRER,
        'volume' => 30000,
    ]);

    $this->actingAs($this->user)
        ->post(route('finances.reglements.store'), [
            'client_id' => $this->client->id,
            'delivery_ids' => [$load->id],
            'missing_quantities' => [$load->id => 100],
            'amount' => 14950000,
            'payment_method' => 'Espèce',
            'date' => now()->format('Y-m-d'),
            'use_advance' => false,
            'is_new_advance' => false,
        ])
        ->assertSessionHasErrors(['delivery_ids.0']);

    expect(ClientPayment::where('payment_type', 'REGLEMENT')->count())->toBe(0);
});

test('on peut créer une avance', function () {
    $data = [
        'client_id' => $this->client->id,
        'amount' => 100000,
        'payment_method' => 'Espèce',
        'date' => now()->format('Y-m-d'),
        'reference' => 'VIR-001',
        'use_advance' => false,
        'is_new_advance' => true,
    ];

    $this->actingAs($this->user)
        ->post(route('finances.reglements.store'), $data)
        ->assertStatus(302);

    $payment = ClientPayment::where('payment_type', 'AVANCE')->first();
    expect($payment->is_advance)->toBeTrue();
    expect($payment->payment_type)->toBe('AVANCE');
});

test('on peut utiliser une avance pour un règlement', function () {
    $advance = ClientPayment::create([
        'client_id' => $this->client->id,
        'payment_type' => 'AVANCE',
        'is_advance' => true,
        'amount' => 100000,
        'payment_method' => 'Espèce',
        'date' => now(),
        'reference' => 'ADV-001',
    ]);

    $load = Load::factory()->create([
        'client_id' => $this->client->id,
        'status' => LoadStatus::FACTURER,
    ]);

    $data = [
        'client_id' => $this->client->id,
        'delivery_ids' => [$load->id],
        'amount' => 50000,
        'payment_method' => 'Espèce',
        'date' => now()->format('Y-m-d'),
        'use_advance' => true,
        'advance_id' => $advance->id,
        'is_new_advance' => false,
    ];

    $this->actingAs($this->user)
        ->post(route('finances.reglements.store'), $data)
        ->assertRedirect();

    expect(ClientPayment::count())->toBe(2);
    $payment = ClientPayment::where('parent_id', $advance->id)->first();
    expect($payment)->not->toBeNull();
    expect($payment->amount)->toEqual(50000.0);
    expect($load->refresh()->status)->toBe(LoadStatus::PAYE);
});

test('la suppression d\'un règlement restaure le statut de la livraison', function () {
    $payment = ClientPayment::create([
        'client_id' => $this->client->id,
        'payment_type' => 'REGLEMENT',
        'is_advance' => false,
        'amount' => 1000,
        'payment_method' => 'Espèce',
        'date' => now(),
    ]);

    $load = Load::factory()->create([
        'client_id' => $this->client->id,
        'status' => LoadStatus::PAYE,
        'is_paid' => true,
        'client_payment_id' => $payment->id,
    ]);

    $this->actingAs($this->user)
        ->delete(route('finances.reglements.destroy', $payment->id))
        ->assertRedirect();

    expect(ClientPayment::count())->toBe(0);
    expect($load->refresh()->status)->toBe(LoadStatus::FACTURER);
    expect($load->is_paid)->toBeFalse();
});

test('on peut modifier un règlement', function () {
    $payment = ClientPayment::factory()->create([
        'client_id' => $this->client->id,
        'amount' => 1000,
    ]);

    $data = [
        'client_id' => $this->client->id,
        'delivery_ids' => [],
        'depot_invoice_ids' => [],
        'amount' => 2000,
        'payment_method' => 'Virement bancaire',
        'date' => now()->format('Y-m-d'),
        'reference' => 'NEW-REF',
        'use_advance' => false,
        'is_new_advance' => false,
    ];

    $this->actingAs($this->user)
        ->put(route('finances.reglements.update', $payment->id), $data)
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($payment->refresh()->amount)->toEqual(2000.0);
    expect($payment->reference)->toBe('NEW-REF');
});

test('la modification d\'un règlement conserve le montant saisi et le manquant', function () {
    $payment = ClientPayment::factory()->create([
        'client_id' => $this->client->id,
        'payment_type' => 'REGLEMENT',
        'is_advance' => false,
        'amount' => 1000,
    ]);

    $load = Load::factory()->create([
        'client_id' => $this->client->id,
        'status' => LoadStatus::PAYE,
        'is_paid' => true,
        'client_payment_id' => $payment->id,
        'volume' => 30000,
    ]);

    $invoice = Invoice::factory()->create([
        'client_id' => $this->client->id,
        'total_amount' => 15000000,
    ]);

    $invoiceItem = InvoiceItem::create([
        'invoice_id' => $invoice->id,
        'load_id' => $load->id,
        'quantity_delivered' => 30000,
        'unit_price' => 500,
        'total' => 15000000,
        'missing_quantity' => 0,
        'is_paid' => true,
        'client_payment_id' => $payment->id,
    ]);

    $this->actingAs($this->user)
        ->put(route('finances.reglements.update', $payment->id), [
            'client_id' => $this->client->id,
            'delivery_ids' => [$load->id],
            'missing_quantities' => [$load->id => 125],
            'amount' => 123456,
            'payment_method' => 'Virement bancaire',
            'date' => now()->format('Y-m-d'),
            'reference' => 'MOD-001',
            'use_advance' => false,
            'is_new_advance' => false,
        ])
        ->assertRedirect();

    expect($payment->refresh()->amount)->toEqual(123456.0);
    expect($invoiceItem->refresh()->missing_quantity)->toEqual(125.0);
    expect($invoice->refresh()->total_amount)->toEqual(14937500.0);
});

test('la modification d\'un règlement recalcule le montant quand il arrive à zéro', function () {
    $payment = ClientPayment::factory()->create([
        'client_id' => $this->client->id,
        'payment_type' => 'REGLEMENT',
        'is_advance' => false,
        'amount' => 1000,
    ]);

    $load = Load::factory()->create([
        'client_id' => $this->client->id,
        'status' => LoadStatus::PAYE,
        'is_paid' => true,
        'client_payment_id' => $payment->id,
        'volume' => 30000,
    ]);

    $invoice = Invoice::factory()->create([
        'client_id' => $this->client->id,
        'total_amount' => 15000000,
    ]);

    InvoiceItem::create([
        'invoice_id' => $invoice->id,
        'load_id' => $load->id,
        'quantity_delivered' => 30000,
        'unit_price' => 500,
        'total' => 15000000,
        'missing_quantity' => 0,
        'is_paid' => true,
        'client_payment_id' => $payment->id,
    ]);

    $this->actingAs($this->user)
        ->put(route('finances.reglements.update', $payment->id), [
            'client_id' => $this->client->id,
            'delivery_ids' => [$load->id],
            'missing_quantities' => [$load->id => 100],
            'amount' => 0,
            'payment_method' => 'Espèce',
            'date' => now()->format('Y-m-d'),
            'use_advance' => false,
            'is_new_advance' => false,
        ])
        ->assertRedirect();

    expect($payment->refresh()->amount)->toEqual(14950000.0);
});

test('un règlement ne peut être créé que pour des livraisons FACTURER', function () {
    $loadEnCours = Load::factory()->create([
        'client_id' => $this->client->id,
        'status' => LoadStatus::EN_COURS,
    ]);

    $data = [
        'client_id' => $this->client->id,
        'delivery_ids' => [$loadEnCours->id],
        'amount' => 50000,
        'payment_method' => 'Espèce',
        'date' => now()->format('Y-m-d'),
        'use_advance' => false,
        'is_new_advance' => false,
    ];

    $this->actingAs($this->user)
        ->post(route('finances.reglements.store'), $data)
        ->assertSessionHasErrors(['delivery_ids.0']);

    $loadLivrer = Load::factory()->create([
        'client_id' => $this->client->id,
        'status' => LoadStatus::LIVRER,
    ]);

    $data['delivery_ids'] = [$loadLivrer->id];

    $this->actingAs($this->user)
        ->post(route('finances.reglements.store'), $data)
        ->assertSessionHasErrors(['delivery_ids.0']);

    $loadFacturer = Load::factory()->create([
        'client_id' => $this->client->id,
        'status' => LoadStatus::FACTURER,
    ]);

    $data['delivery_ids'] = [$loadFacturer->id];

    $this->actingAs($this->user)
        ->post(route('finances.reglements.store'), $data)
        ->assertSessionHasNoErrors()
        ->assertRedirect();
});

test('les livraisons disponibles exposent leurs lignes de facture pour le calcul du règlement', function () {
    $load = Load::factory()->create([
        'client_id' => $this->client->id,
        'status' => LoadStatus::FACTURER,
        'volume' => 30000,
    ]);

    $invoice = Invoice::factory()->create([
        'client_id' => $this->client->id,
    ]);

    InvoiceItem::create([
        'invoice_id' => $invoice->id,
        'load_id' => $load->id,
        'quantity_delivered' => 30000,
        'unit_price' => 500,
        'total' => 15000000,
        'missing_quantity' => 75,
    ]);

    $this->actingAs($this->user)
        ->getJson(route('operations.livraisons.index', [
            'client_id' => $this->client->id,
            'status' => LoadStatus::FACTURER->value,
        ]))
        ->assertOk()
        ->assertJsonPath('0.invoice_items.0.unit_price', 500)
        ->assertJsonPath('0.invoice_items.0.missing_quantity', 75);
});

test('la création d\'un règlement avec manquants met à jour la facture', function () {
    $load = Load::factory()->create([
        'client_id' => $this->client->id,
        'status' => LoadStatus::FACTURER,
        'volume' => 30000,
    ]);

    $invoice = Invoice::factory()->create([
        'client_id' => $this->client->id,
    ]);

    $invoiceItem = InvoiceItem::create([
        'invoice_id' => $invoice->id,
        'load_id' => $load->id,
        'quantity_delivered' => 30000,
        'unit_price' => 500,
        'total' => 15000000,
        'missing_quantity' => 0,
    ]);

    $invoice->update(['total_amount' => 15000000]);

    $data = [
        'client_id' => $this->client->id,
        'delivery_ids' => [$load->id],
        'missing_quantities' => [$load->id => 100],
        'amount' => 14950000, // (30000 - 100) * 500
        'payment_method' => 'Espèce',
        'date' => now()->format('Y-m-d'),
        'use_advance' => false,
        'is_new_advance' => false,
    ];

    $this->actingAs($this->user)
        ->post(route('finances.reglements.store'), $data)
        ->assertStatus(302);

    expect($invoiceItem->refresh()->missing_quantity)->toEqual(100.0);
    expect($invoiceItem->is_paid)->toBeTruthy();
    expect($invoiceItem->client_payment_id)->not->toBeNull();
    expect($invoice->refresh()->total_amount)->toEqual(14950000.0);
});

test('le manquant créé dans un règlement est exposé pour la modification', function () {
    $load = Load::factory()->create([
        'client_id' => $this->client->id,
        'status' => LoadStatus::FACTURER,
        'volume' => 30000,
    ]);

    $invoice = Invoice::factory()->create([
        'client_id' => $this->client->id,
        'total_amount' => 15000000,
    ]);

    InvoiceItem::create([
        'invoice_id' => $invoice->id,
        'load_id' => $load->id,
        'quantity_delivered' => 30000,
        'unit_price' => 500,
        'total' => 15000000,
        'missing_quantity' => 0,
    ]);

    $this->actingAs($this->user)
        ->post(route('finances.reglements.store'), [
            'client_id' => $this->client->id,
            'delivery_ids' => [$load->id],
            'missing_quantities' => [$load->id => 120],
            'amount' => 14940000,
            'payment_method' => 'Espèce',
            'date' => now()->format('Y-m-d'),
            'use_advance' => false,
            'is_new_advance' => false,
        ])
        ->assertRedirect();

    $this->actingAs($this->user)
        ->get(route('finances.reglements.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('finances/reglements')
            ->where('payments.0.invoice_items.0.missing_quantity', 120)
            ->where('payments.0.loads.0.invoice_items.0.missing_quantity', 120)
            ->where('payments.0.loads.0.status', LoadStatus::PAYE->value)
        );
});
