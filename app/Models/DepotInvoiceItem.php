<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DepotInvoiceItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'depot_invoice_id',
        'compartment_id',
        'quantity',
        'unit_price',
        'total',
        'is_paid',
        'client_payment_id',
    ];

    public function depotInvoice(): BelongsTo
    {
        return $this->belongsTo(DepotInvoice::class);
    }

    public function compartment(): BelongsTo
    {
        return $this->belongsTo(Compartment::class);
    }
}
