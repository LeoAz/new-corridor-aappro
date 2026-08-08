<?php

namespace App\Enums;

enum LoadStatus: string
{
    case EN_COURS = 'EN COURS';
    case LIVRER = 'LIVRER';
    case LIVRE_PARTIELLEMENT = 'LIVRE PARTIELLEMENT';
    case FACTURER = 'FACTURER';
    case PAYE = 'FACTURER ET PAYER';
}
