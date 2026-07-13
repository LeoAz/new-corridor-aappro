<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Compartment extends Model
{
    use HasFactory;

    protected $fillable = [
        'depot_id',
        'product',
        'quantity',
    ];

    public function depot(): BelongsTo
    {
        return $this->belongsTo(Depot::class);
    }

    public function loads(): HasMany
    {
        return $this->hasMany(Load::class);
    }

    public function depotInvoiceItems(): HasMany
    {
        return $this->hasMany(DepotInvoiceItem::class);
    }

    public function fuelPurchases(): HasMany
    {
        return $this->hasMany(FuelPurchase::class);
    }
}
