<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClientPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'load_id',
        'depot_invoice_id',
        'payment_type',
        'is_advance',
        'amount',
        'payment_method',
        'date',
        'reference',
        'note',
        'parent_id',
    ];

    protected $casts = [
        'date' => 'date',
        'is_advance' => 'boolean',
        'payment_method' => PaymentMethod::class,
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function loadDetails(): BelongsTo
    {
        return $this->belongsTo(Load::class, 'load_id');
    }

    public function depotInvoice(): BelongsTo
    {
        return $this->belongsTo(DepotInvoice::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ClientPayment::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(ClientPayment::class, 'parent_id');
    }

    public function loads(): HasMany
    {
        return $this->hasMany(Load::class, 'client_payment_id');
    }

    public function invoiceItems(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function depotInvoiceItems(): HasMany
    {
        return $this->hasMany(DepotInvoiceItem::class);
    }
}
