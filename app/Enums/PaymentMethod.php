<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case CHEQUE = 'Chèque';
    case VIREMENT = 'Virement bancaire';
    case ESPECE = 'Espèce';
    case AUTRES = 'Autres';
}
