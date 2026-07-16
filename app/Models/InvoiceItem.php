<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'bl_number',
        'load_id',
        'quantity_delivered',
        'unit_price',
        'missing_quantity',
        'total',
        'is_paid',
        'client_payment_id',
    ];

    protected $casts = [
        'quantity_delivered' => 'float',
        'unit_price' => 'float',
        'missing_quantity' => 'float',
        'total' => 'float',
        'is_paid' => 'boolean',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function loadDetails(): BelongsTo
    {
        return $this->belongsTo(Load::class, 'load_id');
    }

    public function applyPaymentMissingQuantity(float $missingQuantity, ClientPayment $payment): void
    {
        $quantityBeforeMissing = $this->quantityBeforeMissing();
        $quantityAfterMissing = max($quantityBeforeMissing - $missingQuantity, 0);

        $this->update([
            'quantity_delivered' => $quantityAfterMissing,
            'missing_quantity' => $missingQuantity,
            'total' => $quantityAfterMissing * $this->unit_price,
            'is_paid' => true,
            'client_payment_id' => $payment->id,
        ]);

        $this->refreshInvoiceTotals();
    }

    public function restorePaymentMissingQuantity(): void
    {
        $quantityBeforeMissing = $this->quantityBeforeMissing();

        $this->update([
            'quantity_delivered' => $quantityBeforeMissing,
            'missing_quantity' => 0,
            'total' => $quantityBeforeMissing * $this->unit_price,
            'is_paid' => false,
            'client_payment_id' => null,
        ]);

        $this->refreshInvoiceTotals();
    }

    public function refreshInvoiceTotals(): void
    {
        $invoice = $this->invoice;

        if (! $invoice) {
            return;
        }

        $invoice->update([
            'total_missing' => $invoice->items()->sum('missing_quantity'),
            'total_amount' => $invoice->items()->sum('total'),
        ]);
    }

    private function quantityBeforeMissing(): float
    {
        if ($this->missing_quantity <= 0) {
            return $this->quantity_delivered;
        }

        if ($this->totalMatches($this->quantity_delivered * $this->unit_price)) {
            return $this->quantity_delivered + $this->missing_quantity;
        }

        return $this->quantity_delivered;
    }

    private function totalMatches(float $expectedTotal): bool
    {
        return abs($this->total - $expectedTotal) < 0.01;
    }
}
