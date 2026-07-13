<?php

namespace App\Enums;

enum LoadStatus: string
{
    case EN_COURS = 'EN COURS';
    case LIVRE = 'LIVRÉ';
    case FACTURE = 'FACTURE';
    case PAYE = 'PAYÉ';
    case LIVRE_ET_PAYE = 'LIVRÉ ET PAYÉ';
}
