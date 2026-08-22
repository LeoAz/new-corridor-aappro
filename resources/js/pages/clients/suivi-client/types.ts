export interface Client {
    id: number;
    nom: string;
    contact: string;
    address: string;
    initial_balance: string | number;
}

export interface Compartment {
    id: number;
    product: string;
    quantity: number;
}

export interface Depot {
    id: number;
    name: string;
    compartments: Compartment[];
}

export interface Payment {
    id: number;
    date: string;
    banque: string;
    payment_method: string;
    numero: string;
    amount: number;
    note: string;
}

export interface Load {
    id: number;
    numero: number;
    load_date: string;
    unload_date: string;
    bl_number: string;
    vehicle_registration: string;
    product: string;
    volume: number;
    unit_price: number;
    missing_quantity: number;
    total_amount: number;
    status: string;
    is_paid: boolean;
    invoice_items?: {
        id: number;
        quantity_delivered: number;
        unit_price: number;
        missing_quantity: number;
        total: number;
    }[];
}

export interface ClientInvoiceItem {
    id: number;
    load_id?: number;
    compartment_id?: number;
    bl_number?: string | null;
    product: string;
    quantity: number;
    missing_quantity: number;
    is_partial?: boolean;
    remaining_quantity?: number;
    unit_price: number;
    total: number;
    vehicle_registration?: string | null;
}

export interface ClientInvoice {
    id: number;
    number: string;
    client_id: number;
    depot_id?: number;
    date: string | null;
    total_amount: number;
    total_missing?: number;
    items: ClientInvoiceItem[];
}

export interface InvoiceLine {
    id: string;
    invoice_id: number;
    number: string;
    date: string | null;
    product: string;
    quantity: number;
    missing_quantity: number;
    is_partial?: boolean;
    unit_price: number;
    total: number;
    invoice_total: number;
    type: 'chargement' | 'depot';
    truck?: string | null;
}

export interface Stats {
    livrer: number;
    facturer: number;
    livre_partiellement: number;
    facturer_payer: number;
}
