<?php

namespace App\Policies;

use App\Models\Export;
use App\Models\User;

class ExportPolicy
{
    /**
     * Un utilisateur ne voit et ne télécharge que ses propres exports.
     */
    public function view(User $user, Export $export): bool
    {
        return $export->user_id === $user->id;
    }
}
