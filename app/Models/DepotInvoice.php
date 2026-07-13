<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DepotInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'number',
        'date',
        'client_id',
        'depot_id',
        'product',
        'issuer_name',
        'total_amount',
    ];

    protected $casts = [
        'date' => 'date',
        'total_amount' => 'float',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function depot(): BelongsTo
    {
        return $this->belongsTo(Depot::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(DepotInvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ClientPayment::class);
    }
}
