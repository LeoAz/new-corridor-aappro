<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoadRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, string>
     */
    public function rules(): array
    {
        return [
            'load_date' => 'required|date',
            'load_location' => 'nullable|string|max:255',
            'product' => 'required|string|max:255',
            'volume' => 'required|numeric|min:0',
            'vehicle_registration' => 'required|string|max:255',
            'depot_id' => 'nullable|exists:depots,id',
            'city_id' => 'nullable|exists:cities,id',
            'client_id' => 'nullable|exists:clients,id',
            'compartment_id' => 'nullable|exists:compartments,id',
            'client_name' => 'nullable|string|max:255',
        ];
    }
}
