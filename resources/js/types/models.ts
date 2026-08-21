export interface City {
    id: number;
    name: string;
}

export interface Client {
    id: number;
    nom: string;
}

export interface Compartment {
    id: number;
    product: string;
    depot_id: number | null;
    quantity: number;
}

export interface Depot {
    id: number;
    name: string;
    compartments?: Compartment[];
}

export interface PartialDelivery {
    id: number;
    invoice_number: string;
    invoice_date: string;
    client_name: string;
    quantity: number;
}

/**
 * Représentation canonique d'un chargement/livraison (modèle `Load` côté backend).
 * Certains champs ne sont présents que sur certaines pages (livraison, rapports) :
 * étendre localement via `interface XWithExtra extends Load { ... }` plutôt que dupliquer.
 */
export interface Load {
    id: number;
    load_date: string;
    load_location: string | null;
    product: string;
    volume: number;
    vehicle_registration: string;
    depot_id: number | null;
    city_id: number | null;
    client_id: number | null;
    compartment_id: number | null;
    client_name: string | null;
    status: string;
    remaining_quantity?: number;
    unload_date?: string | null;
    unload_location?: string | null;
    unit_price?: number | null;
    is_paid?: boolean;
    invoiced_quantity?: number;
    partial_deliveries?: PartialDelivery[];
    depot?: Depot | null;
    city?: City | null;
    client?: Client | null;
    compartment?: Compartment | null;
}
