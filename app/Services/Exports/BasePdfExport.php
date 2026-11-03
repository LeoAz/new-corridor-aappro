<?php

namespace App\Services\Exports;

use App\Concerns\FiltersByDateRange;
use Illuminate\Http\Request;

abstract class BasePdfExport implements PdfExport
{
    use FiltersByDateRange;

    /**
     * Applique le mois en cours quand aucune période n'est fournie.
     */
    protected bool $usesDefaultDateRange = false;

    public function rules(): array
    {
        return [];
    }

    public function resolveFilters(array $filters): array
    {
        $request = $this->request($filters);

        if ($this->usesDefaultDateRange) {
            $this->applyDefaultDateRange($request);
        }

        return collect($request->all())->only($this->filterKeys())->all();
    }

    /**
     * Les exports réutilisent la logique des contrôleurs, écrite autour d'une requête.
     *
     * @param  array<string, mixed>  $filters
     */
    protected function request(array $filters): Request
    {
        return new Request($filters);
    }
}
