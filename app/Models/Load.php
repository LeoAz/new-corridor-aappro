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

    public function payments(): HasMany
    {
        return $this->hasMany(ClientPayment::class);
    }
}
