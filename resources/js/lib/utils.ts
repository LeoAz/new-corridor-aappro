import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatNumber(value: number | string | null | undefined, decimals: number = 0): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (num === null || num === undefined || isNaN(num)) {
        return '0';
    }

    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })
        .format(num)
        .replace(/\u00A0/g, ' ');
}

export function toUrl(href: string | { url: string }): string {
    if (typeof href === 'object' && href !== null && 'url' in href) {
        return href.url;
    }

    return href;
}
