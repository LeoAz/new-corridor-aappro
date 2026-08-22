<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DepotRequest extends FormRequest
{
    /**
     * @return array<string, string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'compartments' => 'nullable|array',
            'compartments.*.id' => 'nullable|exists:compartments,id',
            'compartments.*.product' => 'required|string|max:255',
            'compartments.*.quantity' => 'nullable|numeric|min:0',
        ];
    }
}
