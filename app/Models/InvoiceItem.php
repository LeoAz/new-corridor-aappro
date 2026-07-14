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
}
