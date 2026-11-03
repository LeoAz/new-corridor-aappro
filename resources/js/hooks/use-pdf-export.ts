import { http, router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import * as exportsRoutes from '@/routes/exports';
import type { ExportItem, ExportType } from '@/types';

type ExportFilters = Record<string, string | null | undefined>;

/**
 * Demande la génération d'un PDF par le queue worker. La fin de la génération est
 * signalée par le menu des notifications, quelle que soit la page affichée.
 */
export function usePdfExport() {
    const [isRequesting, setIsRequesting] = useState(false);

    const requestExport = async (
        type: ExportType,
        filters: ExportFilters,
    ): Promise<void> => {
        setIsRequesting(true);

        try {
            const response = await http.getClient().request({
                method: 'post',
                url: exportsRoutes.store().url,
                data: { type, filters },
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            const { export: exportItem } = JSON.parse(response.data) as {
                export: ExportItem;
            };

            toast.info(`${exportItem.label} en cours de génération`, {
                description:
                    'Vous serez notifié dès que le rapport sera prêt à être téléchargé.',
            });

            router.reload({ only: ['notifications'] });
        } catch {
            toast.error("Impossible de lancer l'export. Veuillez réessayer.");
        } finally {
            setIsRequesting(false);
        }
    };

    return { requestExport, isRequesting };
}
