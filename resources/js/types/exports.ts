export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ExportType =
    | 'rapport-chargements'
    | 'rapport-livraisons'
    | 'rapport-ventes-chargement'
    | 'rapport-ventes-depot'
    | 'chargements-en-cours'
    | 'livraisons'
    | 'achats-carburant'
    | 'suivi-stock'
    | 'suivi-client'
    | 'releve-client';

export interface ExportItem {
    id: string;
    type: ExportType;
    label: string;
    status: ExportStatus;
    status_label: string;
    filename: string | null;
    error: string | null;
    created_at: string | null;
    completed_at: string | null;
    download_url: string | null;
}

export interface AppNotification {
    id: string;
    read: boolean;
    created_at: string | null;
    export_id?: string;
    status?: ExportStatus;
    title: string;
    message: string;
    download_url?: string | null;
}

export interface SharedNotifications {
    unread_count: number;
    pending_exports: number;
    items: AppNotification[];
}
