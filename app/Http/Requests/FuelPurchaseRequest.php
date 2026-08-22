<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FuelPurchaseRequest extends FormRequest
{
    /**
     * @return array<string, string>
     */
    public function rules(): array
    {
        return [
            'purchase_date' => 'required|date',
            'product' => 'required|string|max:255',
            'quantity' => 'required|numeric|min:0',
            'unit_price' => 'required|numeric|min:0',
            'total_price' => 'required|numeric|min:0',
            'depot_id' => 'required|exists:depots,id',
            'compartment_id' => 'required|exists:compartments,id',
        ];
    }
}
