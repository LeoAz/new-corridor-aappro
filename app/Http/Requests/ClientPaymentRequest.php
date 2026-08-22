<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ClientPaymentRequest extends FormRequest
{
    /**
     * @return array<string, string>
     */
    public function rules(): array
    {
        $rules = [
            'date' => 'required|date',
            'payment_method' => 'required|string',
            'banque' => 'nullable|string',
            'numero' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'note' => 'nullable|string',
        ];

        // Le client n'est renseigné qu'à la création : sur update(), il ne fait pas
        // partie des champs modifiables (comportement historique du contrôleur).
        if ($this->isMethod('post')) {
            $rules['client_id'] = 'required|exists:clients,id';
        }

        return $rules;
    }
}
