<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;

class InvoiceNumberGenerator
{
    /**
     * Génère le prochain numéro séquentiel d'une facture pour l'année de `$date`,
     * au format `{prefix}-{année}-{numéro sur 5 chiffres}`.
     *
     * @param  class-string<Model>  $model
     */
    public static function next(string $model, string $prefix, string $date, string $dateColumn = 'date'): string
    {
        $year = date('Y', strtotime($date));

        $last = $model::whereYear($dateColumn, $year)->orderBy('id', 'desc')->first();

        $nextNumber = 1;
        if ($last) {
            preg_match('/(\d+)$/', $last->number, $matches);
            $nextNumber = isset($matches[1]) ? (int) $matches[1] + 1 : 1;
        }

        return sprintf('%s-%s-%05d', $prefix, $year, $nextNumber);
    }
}
