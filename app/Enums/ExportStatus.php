<?php

namespace App\Enums;

enum ExportStatus: string
{
    case PENDING = 'pending';
    case PROCESSING = 'processing';
    case COMPLETED = 'completed';
    case FAILED = 'failed';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'En attente',
            self::PROCESSING => 'En cours',
            self::COMPLETED => 'Terminé',
            self::FAILED => 'Échoué',
        };
    }

    public function isFinished(): bool
    {
        return $this === self::COMPLETED || $this === self::FAILED;
    }
}
