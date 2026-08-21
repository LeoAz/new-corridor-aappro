<?php

namespace App\Enums;

enum LoadStatus: string
{
    case EN_COURS = 'EN COURS';
    case LIVRER = 'LIVRER';
    case LIVRE_PARTIELLEMENT = 'LIVRE PARTIELLEMENT';
    case FACTURER = 'FACTURER';
    case PAYE = 'FACTURER ET PAYER';
    case TOTALEMENT_LIVRE = 'TOTALEMENT LIVRER';

    /**
     * Chargements toujours en cours de chargement au dépôt (pas encore livrés).
     *
     * @return array<self>
     */
    public static function activeLoads(): array
    {
        return [self::EN_COURS, self::LIVRE_PARTIELLEMENT];
    }

    /**
     * Statuts suivis sur la page des livraisons (livrées, en cours de facturation ou payées).
     *
     * @return array<self>
     */
    public static function deliveryTracking(): array
    {
        return [self::LIVRER, self::LIVRE_PARTIELLEMENT, self::FACTURER, self::PAYE];
    }

    /**
     * Livraisons pouvant faire l'objet d'une facturation.
     *
     * @return array<self>
     */
    public static function deliveredForInvoicing(): array
    {
        return [self::LIVRER, self::FACTURER, self::PAYE];
    }
}
