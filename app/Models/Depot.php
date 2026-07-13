<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Depot extends Model
{
    use HasFactory;

    protected $fillable = ['name'];

    public function compartments(): HasMany
    {
        return $this->hasMany(Compartment::class);
    }

    public function loads(): HasMany
    {
        return $this->hasMany(Load::class);
    }

    public function depotInvoices(): HasMany
    {
        return $this->hasMany(DepotInvoice::class);
    }

    public function fuelPurchases(): HasMany
    {
        return $this->hasMany(FuelPurchase::class);
    }
}
