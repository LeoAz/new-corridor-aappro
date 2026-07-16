<?php

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Load;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);
});

test('it can unlink a load and reverse missing quantity onto quantity and recalculate amount', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();
    $payment = ClientPayment::factory()->create(['client_id' => $client->id]);

    $load = Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::PAYE,
        'client_payment_id' => $payment->id,
    ]);

    $invoice = Invoice::factory()->create([
        'client_id' => $client->id,
    ]);

    $invoiceItem = InvoiceItem::factory()->create([
        'invoice_id' => $invoice->id,
        'load_id' => $load->id,
        'quantity_delivered' => 1000,
        'missing_quantity' => 20,
        'unit_price' => 500,
        'total' => 490000, // (1000 - 20) * 500
        'is_paid' => true,
        'client_payment_id' => $payment->id,
    ]);

    // Initial check of invoice total
    $invoice->total_missing = 20;
    $invoice->total_amount = 490000;
    $invoice->save();

    $response = $this->actingAs($user)
        ->post(route('clients.suivi-client.unlink-load'), [
            'load_id' => $load->id,
        ]);

    $response->assertRedirect();

    // Check Load status and detachment
    $load->refresh();
    expect($load->status->value)->toBe(LoadStatus::FACTURER->value);
    expect($load->client_payment_id)->toBeNull();

    // Check InvoiceItem updates
    $invoiceItem->refresh();
    expect($invoiceItem->missing_quantity)->toBe(0.0);
    expect($invoiceItem->total)->toBe(500000.0); // 1000 * 500
    expect($invoiceItem->is_paid)->toBeFalse();
    expect($invoiceItem->client_payment_id)->toBeNull();

    // Check Invoice updates
    $invoice->refresh();
    expect((float) $invoice->total_missing)->toBe(0.0);
    expect((float) $invoice->total_amount)->toBe(500000.0);
});

test('deleting a payment also unlinks loads and reverses missing quantities', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();
    $payment = ClientPayment::factory()->create(['client_id' => $client->id]);

    $load = Load::factory()->create([
        'client_id' => $client->id,
        'status' => LoadStatus::PAYE,
        'client_payment_id' => $payment->id,
    ]);

    $invoice = Invoice::factory()->create([
        'client_id' => $client->id,
    ]);

    $invoiceItem = InvoiceItem::factory()->create([
        'invoice_id' => $invoice->id,
        'load_id' => $load->id,
        'quantity_delivered' => 1000,
        'missing_quantity' => 50,
        'unit_price' => 400,
        'total' => 380000, // (1000 - 50) * 400
        'is_paid' => true,
        'client_payment_id' => $payment->id,
    ]);

    $invoice->total_missing = 50;
    $invoice->total_amount = 380000;
    $invoice->save();

    $response = $this->actingAs($user)
        ->from(route('clients.suivi-client.index'))
        ->delete(route('clients.reglements.destroy', $payment));

    $response->assertRedirect();
    if (session('error')) {
        $this->fail('Delete failed with error: '.session('error'));
    }

    $this->assertDatabaseMissing('client_payments', ['id' => $payment->id]);

    $load->refresh();
    expect($load->status->value)->toBe(LoadStatus::FACTURER->value);
    expect($load->client_payment_id)->toBeNull();

    $invoiceItem->refresh();
    expect($invoiceItem->missing_quantity)->toBe(0.0);
    expect($invoiceItem->total)->toBe(400000.0); // 1000 * 400
    expect($invoiceItem->is_paid)->toBeFalse();
    expect($invoiceItem->client_payment_id)->toBeNull();

    $invoice->refresh();
    expect((float) $invoice->total_missing)->toBe(0.0);
    expect((float) $invoice->total_amount)->toBe(400000.0);
});
