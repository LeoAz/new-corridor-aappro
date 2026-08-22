import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { formatNumber } from '@/lib/utils';

export const formatCurrency = (value: number) =>
    `${formatNumber(value || 0)} FCFA`;

export const formatVolume = (value: number) => `${formatNumber(value || 0)} L`;

export const formatDateFr = (value: string | null) =>
    value ? format(new Date(value), 'dd/MM/yyyy', { locale: fr }) : '-';
