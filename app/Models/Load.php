<?php

namespace App\Models;

use App\Enums\LoadStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Load extends Model
{
    use HasFactory;

    protected $fillable = [
        'load_date',
        'load_location',
        'product',
        'volume',
        'vehicle_registration',
        'depot_id',
        'is_unload',
        'unload_date',
        'unload_location',
        'status',
        'is_paid',
        'city_id',
        'client_id',
        'client_name',
        'compartment_id',
    ];

    protected $casts = [
        'load_date' => 'datetime',
        'unload_date' => 'datetime',
        'is_unload' => 'boolean',
        'is_paid' => 'boolean',
        'status' => LoadStatus::class,
        'volume' => 'float',
    ];

    protected $appends = [
        'remaining_quantity',
    ];

    public function getRemainingQuantityAttribute(): float
    {
        return $this->remainingQuantity();
    }

    public function depot(): BelongsTo
    {
        return $this->belongsTo(Depot::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function compartment(): BelongsTo
    {
        return $this->belongsTo(Compartment::class);
    }

    public function invoiceItems(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function clientPayment(): BelongsTo
    {
        return $this->belongsTo(ClientPayment::class, 'client_payment_id');
    }

    public function invoicedQuantity(?int $exceptInvoiceId = null): float
    {
        if ($this->hasFullInvoiceItem($exceptInvoiceId)) {
            return (float) $this->volume;
        }

        return $this->partialInvoicedQuantity($exceptInvoiceId);
    }

    public function partialInvoicedQuantity(?int $exceptInvoiceId = null): float
    {
        return (float) $this->invoiceItems()
            ->when($exceptInvoiceId, fn ($query) => $query->where('invoice_id', '!=', $exceptInvoiceId))
            ->where('is_partial', true)
            ->sum('quantity_delivered');
    }

    public function remainingQuantity(?int $exceptInvoiceId = null): float
    {
        if ($this->status === LoadStatus::TOTALEMENT_LIVRE) {
            return 0;
        }

        return (float) $this->volume;
    }

    public function refreshInvoiceStatus(): void
    {
        if ($this->hasFullInvoiceItem()) {
            $this->update(['status' => LoadStatus::FACTURER]);

            return;
        }

        // With duplication logic, we don't use partial invoice items on the same load anymore
        // But we keep this for safety/compatibility
        if ($this->status !== LoadStatus::LIVRER && $this->status !== LoadStatus::TOTALEMENT_LIVRE && $this->status !== LoadStatus::EN_COURS && $this->status !== LoadStatus::LIVRE_PARTIELLEMENT) {
             $this->update(['status' => LoadStatus::LIVRER]);
        }
    }

    public function hasFullInvoiceItem(?int $exceptInvoiceId = null): bool
    {
        return $this->invoiceItems()
            ->when($exceptInvoiceId, fn ($query) => $query->where('invoice_id', '!=', $exceptInvoiceId))
            ->where('is_partial', false)
            ->exists();
    }
}
