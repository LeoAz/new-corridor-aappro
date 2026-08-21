/**
 * Miroir des valeurs de `App\Enums\LoadStatus` (backend). Source unique de vérité
 * pour éviter les chaînes de statut recopiées à la main dans chaque page.
 */
export const LOAD_STATUS = {
    EN_COURS: 'EN COURS',
    LIVRER: 'LIVRER',
    LIVRE_PARTIELLEMENT: 'LIVRE PARTIELLEMENT',
    FACTURER: 'FACTURER',
    PAYE: 'FACTURER ET PAYER',
    TOTALEMENT_LIVRE: 'TOTALEMENT LIVRER',
} as const;

export type LoadStatus = (typeof LOAD_STATUS)[keyof typeof LOAD_STATUS];
