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
        'amount',
        'payment_method',
        'date',
        'banque',
        'numero',
        'note',
    ];

    protected $casts = [
        'date' => 'date',
        'payment_method' => PaymentMethod::class,
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
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
