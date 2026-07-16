<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case VERSEMENT = 'VERSEMENT';
    case CHEQUE = 'CHEQUE';
    case VIREMENT = 'VIREMENT';
    case ESPECE = 'ESPECE';
    case AUTRES = 'AUTRES';
}
