<?php

namespace App\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait FiltersByDateRange
{
    /**
     * Applique un filtre de plage de dates optionnel (`date_from`/`date_to` par défaut)
     * sur une colonne donnée, uniquement si les paramètres sont renseignés.
     */
    protected function applyDateRange(Builder $query, Request $request, string $column, string $fromKey = 'date_from', string $toKey = 'date_to'): Builder
    {
        return $query
            ->when($request->filled($fromKey), fn ($q) => $q->whereDate($column, '>=', $request->input($fromKey)))
            ->when($request->filled($toKey), fn ($q) => $q->whereDate($column, '<=', $request->input($toKey)));
    }
}
