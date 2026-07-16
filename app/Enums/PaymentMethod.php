<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case VERSEMENT = 'VERSEMENT';
    case CHEQUE = 'CHEQUE';
    case VIREMENT = 'VIREMENT';
    case ESPECE = 'ESPECE';
    case AUTRES = 'AUTRES';

    public static function fromValue(string $value): self
    {
        return match (mb_strtoupper(str_replace(['é', 'è', 'ê', 'ë'], 'E', $value))) {
            'CHEQUE' => self::CHEQUE,
            'VIREMENT' => self::VIREMENT,
            'ESPECE' => self::ESPECE,
            'VERSEMENT' => self::VERSEMENT,
            'AUTRES' => self::AUTRES,
            default => self::from($value),
        };
    }
}
