import { http, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import * as releveRoutes from '@/routes/clients/releve';
import * as suiviClientRoutes from '@/routes/clients/suivi-client';
import * as exportsRoutes from '@/routes/exports';
import * as achatCarburantRoutes from '@/routes/finances/achat-carburant';
import * as operationsChargementsRoutes from '@/routes/operations/chargements';
import * as operationsLivraisonsRoutes from '@/routes/operations/livraisons';
import * as rapportChargementsRoutes from '@/routes/rapports/chargements';
import * as rapportLivraisonsRoutes from '@/routes/rapports/livraisons';
import * as venteChargementRoutes from '@/routes/rapports/vente-chargement';
import * as venteDepotRoutes from '@/routes/rapports/vente-depot';
import * as suiviStockRoutes from '@/routes/stocks/suivi-stock';
import type { ExportItem, ExportType } from '@/types';

type ExportFilters = Record<string, string | null | undefined>;

type QueryFilters = Record<string, string | null | undefined>;

/**
 * URL de téléchargement direct (génération synchrone) de chaque export.
 */
function directDownloadUrl(type: ExportType, filters: ExportFilters): string {
    const query: QueryFilters = { ...filters };

    switch (type) {
        case 'rapport-chargements':
            return rapportChargementsRoutes.download({ query }).url;
        case 'rapport-livraisons':
            return rapportLivraisonsRoutes.download({ query }).url;
        case 'rapport-ventes-chargement':
            return venteChargementRoutes.download({ query }).url;
        case 'rapport-ventes-depot':
            return venteDepotRoutes.download({ query }).url;
        case 'chargements-en-cours':
            return operationsChargementsRoutes.download({ query }).url;
        case 'livraisons':
            return operationsLivraisonsRoutes.download({ query }).url;
        case 'achats-carburant':
            return achatCarburantRoutes.download({ query }).url;
        case 'suivi-stock':
            return suiviStockRoutes.download({ query }).url;
        case 'suivi-client':
            return suiviClientRoutes.exportPdf({ query }).url;
        case 'releve-client': {
            const { client_id: clientId, ...rest } = query;

            return releveRoutes.download(String(clientId), { query: rest }).url;
        }
    }
}

/**
 * Lance l'export PDF d'un rapport. Selon la configuration (`queue.pdf_exports`), le PDF
 * est téléchargé directement, ou généré par le queue worker : la fin de la génération
 * est alors signalée par le menu des notifications, quelle que soit la page affichée.
 */
export function usePdfExport() {
    const { queuedPdfExports } = usePage().props;
    const [isRequesting, setIsRequesting] = useState(false);

    const requestQueuedExport = async (
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

    const requestExport = async (
        type: ExportType,
        filters: ExportFilters,
    ): Promise<void> => {
        if (!queuedPdfExports) {
            window.location.href = directDownloadUrl(type, filters);

            return;
        }

        await requestQueuedExport(type, filters);
    };

    return { requestExport, isRequesting };
}
