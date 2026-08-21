<?php

namespace App\Services;

use App\Models\Compartment;

class StockAdjustmentService
{
    /**
     * Augmente la quantité en stock d'un compartiment. Un montant négatif la diminue.
     * Aucune action si le compartiment n'est pas renseigné.
     */
    public function increment(?int $compartmentId, float $quantity): void
    {
        $this->apply($compartmentId, $quantity);
    }

    /**
     * Diminue la quantité en stock d'un compartiment. Un montant négatif l'augmente.
     * Aucune action si le compartiment n'est pas renseigné.
     */
    public function decrement(?int $compartmentId, float $quantity): void
    {
        $this->apply($compartmentId, -$quantity);
    }

    private function apply(?int $compartmentId, float $delta): void
    {
        if (empty($compartmentId) || $delta === 0.0) {
            return;
        }

        Compartment::lockForUpdate()->find($compartmentId)?->increment('quantity', $delta);
    }
}
