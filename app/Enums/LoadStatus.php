<?php

namespace App\Enums;

enum LoadStatus: string
{
    case EN_COURS = 'EN COURS';
    case LIVRER = 'LIVRER';
    case FACTURE_PARTIELLE = 'FACTURE PARTIELLE';
    case FACTURER = 'FACTURER';
    case PAYE = 'FACTURER ET PAYER';
}
