import { Head, router, useForm, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    ArrowUpRight,
    Banknote,
    CalendarIcon,
    CreditCard,
    Download,
    Eye,
    FileText,
    Filter,
    Pencil,
    Plus,
    Receipt,
    Search,
    Trash2,
    Truck,
    Undo2,
    UserRound,
    Wallet,
} from 'lucide-react';
import * as React from 'react';

import * as clientPaymentActions from '@/actions/App/Http/Controllers/ClientPaymentController';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatNumber } from '@/lib/utils';
import tracking from '@/routes/clients/suivi-client';
import * as finances from '@/routes/finances';

interface Client {
    id: number;
    nom: string;
    contact: string;
    address: string;
    initial_balance: string | number;
}

interface Compartment {
    id: number;
    product: string;
    quantity: number;
}

interface Depot {
    id: number;
    name: string;
    compartments: Compartment[];
}

interface Payment {
    id: number;
    date: string;
    banque: string;
    payment_method: string;
    numero: string;
    amount: number;
    note: string;
}

interface Load {
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

interface ClientInvoiceItem {
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

interface ClientInvoice {
    id: number;
    number: string;
    client_id: number;
    depot_id?: number;
    date: string | null;
    total_amount: number;
    total_missing?: number;
    items: ClientInvoiceItem[];
}

interface InvoiceLine {
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

interface Stats {
    livrer: number;
    facturer: number;
    facture_partielle: number;
    facturer_payer: number;
}

interface Props {
    clients: Client[];
    selectedClient: Client | null;
    stats: Stats;
    payments: Payment[];
    loads: Load[];
    initial_balance: number;
    total_payments: number;
    current_balance: number;
    depots: Depot[];
    delivered_loads?: Load[];
}

interface PageProps extends Props {
    [key: string]: unknown;
    auth: any;
    flash: any;
    open_invoices?: boolean;
}

export default function SuiviClient({
    clients,
    selectedClient,
    stats,
    payments,
    loads,
    initial_balance,
    total_payments,
    current_balance,
    depots = [],
    delivered_loads = [],
}: Props) {
    const { props } = usePage<PageProps>();
    const openInvoicesParam = props.open_invoices;

    const [startDate, setStartDate] = React.useState<string>('');
    const [endDate, setEndDate] = React.useState<string>('');
    const [isSheetOpen, setIsSheetOpen] = React.useState(false);
    const [isDeliveredLoadsSheetOpen, setIsDeliveredLoadsSheetOpen] =
        React.useState(false);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
    const [isCreatePaymentModalOpen, setIsCreatePaymentModalOpen] =
        React.useState(false);
    const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] =
        React.useState(false);
    const [paymentToDelete, setPaymentToDelete] =
        React.useState<Payment | null>(null);
    const [selectedPayment, setSelectedPayment] =
        React.useState<Payment | null>(null);
    const [invoiceToDelete, setInvoiceToDelete] =
        React.useState<InvoiceLine | null>(null);
    const [editingClientInvoice, setEditingClientInvoice] =
        React.useState<ClientInvoice | null>(null);
    const [editingClientInvoiceType, setEditingClientInvoiceType] =
        React.useState<InvoiceLine['type'] | null>(null);
    const [isEditClientInvoiceOpen, setIsEditClientInvoiceOpen] =
        React.useState(false);
    const [isCreateDepotInvoiceOpen, setIsCreateDepotInvoiceOpen] =
        React.useState(false);
    const [selectedLoads, setSelectedLoads] = React.useState<Load[]>([]);
    const [search, setSearch] = React.useState('');
    const [productFilter, setProductFilter] = React.useState('all');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [clientInvoices, setClientInvoices] = React.useState<{
        load_invoices: ClientInvoice[];
        depot_invoices: ClientInvoice[];
    }>({
        load_invoices: [],
        depot_invoices: [],
    });

    const [loadToReset, setLoadToReset] = React.useState<Load | null>(null);

    const totalInvoiced = loads.reduce(
        (total, load) => total + load.total_amount,
        0,
    );
    const unpaidLoads = loads.filter(
        (load) =>
            load.status === 'FACTURER' || load.status === 'FACTURE PARTIELLE',
    ).length;

    const paymentForm = useForm({
        load_ids: [] as number[],
        missings: {} as Record<number, number>,
    });

    const createPaymentForm = useForm({
        client_id: selectedClient?.id || '',
        date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: 'VERSEMENT',
        banque: '',
        numero: '',
        amount: 0,
        note: '',
    });

    const editPaymentForm = useForm({
        date: '',
        payment_method: '',
        banque: '',
        numero: '',
        amount: 0,
        note: '',
    });

    const editLoadInvoiceForm = useForm({
        client_id: '',
        date: '',
        items: [] as {
            id: number;
            load_id: number;
            bl_number: string;
            quantity_delivered: number;
            unit_price: number;
            missing_quantity: number;
            is_partial: boolean;
            remaining_quantity?: number;
            total: number;
            vehicle_registration?: string | null;
            product: string;
        }[],
        total_amount: 0,
        total_missing: 0,
    });

    const editDepotInvoiceForm = useForm({
        client_id: '',
        depot_id: '',
        date: '',
        items: [] as {
            id: number;
            compartment_id: string;
            quantity: number;
            unit_price: number;
            total: number;
            product: string;
        }[],
        total_amount: 0,
    });

    const createDepotInvoiceForm = useForm({
        client_id: selectedClient?.id?.toString() || '',
        depot_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        items: [
            {
                compartment_id: '',
                quantity: 0,
                unit_price: 0,
                total: 0,
                product: '',
            },
        ],
        total_amount: 0,
    });

    const formatCurrency = (value: number) =>
        `${formatNumber(value || 0)} FCFA`;
    const formatVolume = (value: number) => `${formatNumber(value || 0)} L`;
    const formatDate = (value: string | null) =>
        value ? format(new Date(value), 'dd/MM/yyyy', { locale: fr }) : '-';
    const selectedEditDepot = React.useMemo(
        () =>
            depots.find(
                (depot) =>
                    depot.id.toString() === editDepotInvoiceForm.data.depot_id,
            ),
        [depots, editDepotInvoiceForm.data.depot_id],
    );
    const selectedCreateDepot = React.useMemo(
        () =>
            depots.find(
                (depot) =>
                    depot.id.toString() ===
                    createDepotInvoiceForm.data.depot_id,
            ),
        [depots, createDepotInvoiceForm.data.depot_id],
    );

    const buildInvoiceLines = (
        invoices: ClientInvoice[],
        type: InvoiceLine['type'],
    ): InvoiceLine[] => {
        return invoices.flatMap((invoice) => {
            if (invoice.items.length === 0) {
                return [
                    {
                        id: `${type}-${invoice.id}`,
                        invoice_id: invoice.id,
                        number: invoice.number,
                        date: invoice.date,
                        product: '-',
                        quantity: 0,
                        missing_quantity: 0,
                        unit_price: 0,
                        total: invoice.total_amount,
                        invoice_total: invoice.total_amount,
                        type,
                    },
                ];
            }

            return invoice.items.map((item) => ({
                id: `${type}-${invoice.id}-${item.id}`,
                invoice_id: invoice.id,
                number: invoice.number,
                date: invoice.date,
                product: item.product,
                quantity: item.quantity,
                missing_quantity: item.missing_quantity,
                is_partial: item.is_partial,
                unit_price: item.unit_price,
                total: item.total,
                invoice_total: invoice.total_amount,
                type,
                truck: item.vehicle_registration,
            }));
        });
    };

    const loadInvoiceLines = React.useMemo(
        () => buildInvoiceLines(clientInvoices.load_invoices, 'chargement'),
        [clientInvoices.load_invoices],
    );
    const depotInvoiceLines = React.useMemo(
        () => buildInvoiceLines(clientInvoices.depot_invoices, 'depot'),
        [clientInvoices.depot_invoices],
    );

    const findClientInvoice = (invoice: InvoiceLine): ClientInvoice | null => {
        const invoices =
            invoice.type === 'chargement'
                ? clientInvoices.load_invoices
                : clientInvoices.depot_invoices;

        return (
            invoices.find(
                (clientInvoice) => clientInvoice.id === invoice.invoice_id,
            ) || null
        );
    };

    const recalculateLoadInvoiceForm = (
        items: typeof editLoadInvoiceForm.data.items,
    ) => {
        editLoadInvoiceForm.setData((current) => ({
            ...current,
            items,
            total_missing: items.reduce(
                (total, item) =>
                    total + (parseFloat(String(item.missing_quantity)) || 0),
                0,
            ),
            total_amount: items.reduce(
                (total, item) => total + (parseFloat(String(item.total)) || 0),
                0,
            ),
        }));
    };

    const recalculateDepotInvoiceForm = (
        items: typeof editDepotInvoiceForm.data.items,
    ) => {
        editDepotInvoiceForm.setData((current) => ({
            ...current,
            items,
            total_amount: items.reduce(
                (total, item) => total + (parseFloat(String(item.total)) || 0),
                0,
            ),
        }));
    };

    const openEditClientInvoice = (invoiceLine: InvoiceLine) => {
        const invoice = findClientInvoice(invoiceLine);

        if (!invoice) {
            return;
        }

        setEditingClientInvoice(invoice);
        setEditingClientInvoiceType(invoiceLine.type);

        if (invoiceLine.type === 'chargement') {
            editLoadInvoiceForm.setData({
                client_id: invoice.client_id.toString(),
                date: invoice.date || format(new Date(), 'yyyy-MM-dd'),
                items: invoice.items.map((item) => ({
                    id: item.id,
                    load_id: item.load_id || 0,
                    bl_number: item.bl_number || '',
                    quantity_delivered: item.quantity,
                    unit_price: item.unit_price,
                    missing_quantity: item.missing_quantity,
                    is_partial: item.is_partial ?? false,
                    remaining_quantity: item.remaining_quantity,
                    total: item.total,
                    vehicle_registration: item.vehicle_registration,
                    product: item.product,
                })),
                total_amount: invoice.total_amount,
                total_missing: invoice.total_missing || 0,
            });
        } else {
            editDepotInvoiceForm.setData({
                client_id: invoice.client_id.toString(),
                depot_id: invoice.depot_id?.toString() || '',
                date: invoice.date || format(new Date(), 'yyyy-MM-dd'),
                items: invoice.items.map((item) => ({
                    id: item.id,
                    compartment_id: item.compartment_id?.toString() || '',
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total: item.total,
                    product: item.product,
                })),
                total_amount: invoice.total_amount,
            });
        }

        setIsEditClientInvoiceOpen(true);
    };

    const updateLoadInvoiceItem = (
        index: number,
        field:
            | 'quantity_delivered'
            | 'unit_price'
            | 'missing_quantity'
            | 'is_partial',
        value: string | boolean,
    ) => {
        const items = [...editLoadInvoiceForm.data.items];
        const parsedValue =
            field === 'is_partial'
                ? value === true
                : parseFloat(String(value)) || 0;

        items[index] = {
            ...items[index],
            [field]: parsedValue,
        };

        items[index].total =
            (items[index].quantity_delivered - items[index].missing_quantity) *
            items[index].unit_price;

        recalculateLoadInvoiceForm(items);
    };

    const updateDepotInvoiceItem = (
        index: number,
        field: 'compartment_id' | 'quantity' | 'unit_price',
        value: string,
    ) => {
        const items = [...editDepotInvoiceForm.data.items];
        const currentDepot = depots.find(
            (depot) =>
                depot.id.toString() === editDepotInvoiceForm.data.depot_id,
        );
        const compartment = currentDepot?.compartments.find(
            (item) => item.id.toString() === value,
        );

        items[index] = {
            ...items[index],
            [field]:
                field === 'compartment_id' ? value : parseFloat(value) || 0,
        };

        if (field === 'compartment_id') {
            items[index].product = compartment?.product || '';
        }

        items[index].total = items[index].quantity * items[index].unit_price;

        recalculateDepotInvoiceForm(items);
    };

    const recalculateCreateDepotInvoiceForm = (
        items: typeof createDepotInvoiceForm.data.items,
    ) => {
        createDepotInvoiceForm.setData((current) => ({
            ...current,
            items,
            total_amount: items.reduce(
                (total, item) => total + (parseFloat(String(item.total)) || 0),
                0,
            ),
        }));
    };

    const updateCreateDepotInvoiceItem = (
        index: number,
        field: 'compartment_id' | 'quantity' | 'unit_price',
        value: string,
    ) => {
        const items = [...createDepotInvoiceForm.data.items];
        const currentDepot = depots.find(
            (depot) =>
                depot.id.toString() === createDepotInvoiceForm.data.depot_id,
        );
        const compartment = currentDepot?.compartments.find(
            (item) => item.id.toString() === value,
        );

        items[index] = {
            ...items[index],
            [field]:
                field === 'compartment_id' ? value : parseFloat(value) || 0,
        };

        if (field === 'compartment_id') {
            items[index].product = compartment?.product || '';
        }

        items[index].total = items[index].quantity * items[index].unit_price;

        recalculateCreateDepotInvoiceForm(items);
    };

    const addCreateDepotInvoiceItem = () => {
        createDepotInvoiceForm.setData((current) => ({
            ...current,
            items: [
                ...current.items,
                {
                    compartment_id: '',
                    quantity: 0,
                    unit_price: 0,
                    total: 0,
                    product: '',
                },
            ],
        }));
    };

    const removeCreateDepotInvoiceItem = (index: number) => {
        const items = createDepotInvoiceForm.data.items.filter(
            (_, itemIndex) => itemIndex !== index,
        );

        recalculateCreateDepotInvoiceForm(items);
    };

    const closeCreateDepotInvoice = () => {
        setIsCreateDepotInvoiceOpen(false);
        createDepotInvoiceForm.reset();
    };

    const submitCreateDepotInvoice = (e: React.FormEvent) => {
        e.preventDefault();

        createDepotInvoiceForm.post(
            finances.default.factureDepots.store().url,
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    closeCreateDepotInvoice();
                    fetchInvoices();
                },
            },
        );
    };

    const closeEditClientInvoice = () => {
        setIsEditClientInvoiceOpen(false);
        setEditingClientInvoice(null);
        setEditingClientInvoiceType(null);
        editLoadInvoiceForm.reset();
        editDepotInvoiceForm.reset();
    };

    const submitEditClientInvoice = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingClientInvoice || !editingClientInvoiceType) {
            return;
        }

        if (editingClientInvoiceType === 'chargement') {
            editLoadInvoiceForm.put(
                finances.default.factureChargement.update(
                    editingClientInvoice.id,
                ).url,
                {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        closeEditClientInvoice();
                        fetchInvoices();
                    },
                },
            );

            return;
        }

        editDepotInvoiceForm.put(
            finances.default.factureDepots.update(editingClientInvoice.id).url,
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    closeEditClientInvoice();
                    fetchInvoices();
                },
            },
        );
    };

    const visitInvoice = (invoice: InvoiceLine, action: 'show' | 'edit') => {
        if (action === 'edit') {
            openEditClientInvoice(invoice);

            return;
        }

        const queryParams = selectedClient
            ? {
                  client_id: selectedClient.id,
                  redirect_back: 'suivi-client',
              }
            : {};

        if (invoice.type === 'chargement') {
            const url =
                action === 'show'
                    ? finances.default.factureChargement.show(
                          invoice.invoice_id,
                      ).url
                    : finances.default.factureChargement.edit(
                          invoice.invoice_id,
                          {
                              query: {
                                  ...queryParams,
                                  lock_client: 1,
                              },
                          },
                      ).url;

            router.visit(url);

            return;
        }

        const url =
            action === 'show'
                ? finances.default.factureDepots.show(invoice.invoice_id).url
                : finances.default.factureDepots.edit(invoice.invoice_id, {
                      query: queryParams,
                  }).url;

        router.visit(url);
    };

    const downloadInvoice = (invoice: InvoiceLine) => {
        const url =
            invoice.type === 'chargement'
                ? finances.default.factureChargement.download(
                      invoice.invoice_id,
                  ).url
                : finances.default.factureDepots.download(invoice.invoice_id)
                      .url;

        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const confirmInvoiceDeletion = () => {
        if (!invoiceToDelete) {
            return;
        }

        const url =
            invoiceToDelete.type === 'chargement'
                ? finances.default.factureChargement.destroy(
                      invoiceToDelete.invoice_id,
                      {
                          query: {
                              redirect_back: 'suivi-client',
                          },
                      },
                  ).url
                : finances.default.factureDepots.destroy(
                      invoiceToDelete.invoice_id,
                      {
                          query: {
                              redirect_back: 'suivi-client',
                          },
                      },
                  ).url;

        router.delete(url, {
            preserveScroll: true,
            onSuccess: () => {
                const invoiceType = invoiceToDelete.type;
                const invoiceId = invoiceToDelete.invoice_id;

                setClientInvoices((current) => {
                    if (invoiceType === 'chargement') {
                        return {
                            ...current,
                            load_invoices: current.load_invoices.filter(
                                (invoice) => invoice.id !== invoiceId,
                            ),
                        };
                    }

                    return {
                        ...current,
                        depot_invoices: current.depot_invoices.filter(
                            (invoice) => invoice.id !== invoiceId,
                        ),
                    };
                });
                setInvoiceToDelete(null);
            },
        });
    };

    const handleClientChange = (clientId: string) => {
        router.get(
            tracking.index({
                query: {
                    client_id: clientId,
                    start_date: startDate,
                    end_date: endDate,
                },
            }).url,
            {},
            { preserveState: true },
        );
    };

    const handleFilter = () => {
        router.get(
            tracking.index({
                query: {
                    client_id: selectedClient?.id,
                    start_date: startDate,
                    end_date: endDate,
                },
            }).url,
            {},
            { preserveState: true },
        );
    };

    const handleExportPdf = () => {
        if (!selectedClient) {
            return;
        }

        window.location.href = tracking.exportPdf({
            query: {
                client_id: selectedClient.id,
                start_date: startDate,
                end_date: endDate,
                search: search,
                product_filter: productFilter,
                status_filter: statusFilter,
            },
        }).url;
    };

    async function fetchInvoices() {
        if (!selectedClient) {
            return;
        }

        try {
            const response = await fetch(
                tracking.invoices(selectedClient.id).url,
            );
            const data = await response.json();
            setClientInvoices(data);
            setIsSheetOpen(true);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        }
    }

    React.useEffect(() => {
        if (openInvoicesParam && selectedClient) {
            fetchInvoices();
        }
    }, [openInvoicesParam, selectedClient]);

    const createLoadInvoice = () => {
        if (!selectedClient) {
            return;
        }

        router.visit(
            finances.default.factureChargement.index({
                query: {
                    client_id: selectedClient.id,
                    create: 1,
                    lock_client: 1,
                    redirect_back: 'suivi-client',
                },
            }).url,
        );
    };

    const createDepotInvoice = () => {
        if (!selectedClient) {
            return;
        }

        createDepotInvoiceForm.setData({
            client_id: selectedClient.id.toString(),
            depot_id: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            items: [
                {
                    compartment_id: '',
                    quantity: 0,
                    unit_price: 0,
                    total: 0,
                    product: '',
                },
            ],
            total_amount: 0,
        });
        setIsCreateDepotInvoiceOpen(true);
    };

    const openPaymentModal = () => {
        if (selectedLoads.length === 0) {
            return;
        }

        const initialMissings: Record<number, number> = {};
        selectedLoads.forEach((load) => {
            initialMissings[load.id] = load.missing_quantity;
        });

        paymentForm.setData({
            load_ids: selectedLoads.map((l) => l.id),
            missings: initialMissings,
        });
        setIsPaymentModalOpen(true);
    };

    const submitPayment = (e: React.FormEvent) => {
        e.preventDefault();
        paymentForm.post(tracking.payment().url, {
            onSuccess: () => {
                setIsPaymentModalOpen(false);
                setSelectedLoads([]);
                paymentForm.reset();
            },
        });
    };

    const openCreatePaymentModal = () => {
        createPaymentForm.setData({
            client_id: selectedClient?.id || '',
            date: format(new Date(), 'yyyy-MM-dd'),
            payment_method: 'VERSEMENT',
            banque: '',
            numero: '',
            amount: 0,
            note: '',
        });
        setIsCreatePaymentModalOpen(true);
    };

    const submitCreatePayment = (e: React.FormEvent) => {
        e.preventDefault();
        createPaymentForm.post(clientPaymentActions.store().url, {
            onSuccess: () => {
                setIsCreatePaymentModalOpen(false);
                createPaymentForm.reset();
            },
        });
    };

    const openEditPayment = (payment: Payment) => {
        setSelectedPayment(payment);
        editPaymentForm.setData({
            date: format(new Date(payment.date), 'yyyy-MM-dd'),
            payment_method: payment.payment_method,
            banque: payment.banque || '',
            numero: payment.numero,
            amount: payment.amount,
            note: payment.note || '',
        });
        setIsEditPaymentModalOpen(true);
    };

    const submitEditPayment = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPayment) {
            return;
        }

        editPaymentForm.patch(
            clientPaymentActions.update(selectedPayment.id).url,
            {
                onSuccess: () => {
                    setIsEditPaymentModalOpen(false);
                    setSelectedPayment(null);
                },
            },
        );
    };

    const confirmDeletePayment = () => {
        if (!paymentToDelete) {
            return;
        }

        router.delete(clientPaymentActions.destroy(paymentToDelete.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                setPaymentToDelete(null);
            },
        });
    };

    const paymentColumns: ColumnDef<Payment>[] = React.useMemo(
        () => [
            {
                accessorKey: 'date',
                header: 'Date',
                cell: ({ row }) => formatDate(row.original.date),
            },
            { accessorKey: 'banque', header: 'Banque' },
            { accessorKey: 'payment_method', header: 'Type' },
            { accessorKey: 'numero', header: 'N°' },
            {
                accessorKey: 'amount',
                header: () => <div className="text-right">Montant</div>,
                cell: ({ row }) => (
                    <div className="text-right font-medium">
                        {formatCurrency(row.original.amount)}
                    </div>
                ),
            },
            { accessorKey: 'note', header: 'Notes' },
            {
                id: 'actions',
                header: () => <div className="text-right">Actions</div>,
                cell: ({ row }) => {
                    const payment = row.original;

                    return (
                        <div className="flex justify-end gap-1">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openEditPayment(payment)}
                                title="Modifier"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setPaymentToDelete(payment)}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                title="Supprimer"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    );
                },
            },
        ],
        [clientInvoices, selectedClient],
    );

    const invoiceColumns: ColumnDef<InvoiceLine>[] = React.useMemo(
        () => [
            {
                accessorKey: 'number',
                header: 'N°',
                cell: ({ row }) => (
                    <div className="min-w-36">
                        <div className="font-semibold text-foreground">
                            {row.original.number}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {row.original.type === 'chargement'
                                ? 'Chargement'
                                : 'Dépôt'}
                        </div>
                        {row.original.is_partial && (
                            <Badge variant="outline" className="mt-1">
                                Partielle
                            </Badge>
                        )}
                    </div>
                ),
            },
            {
                accessorKey: 'truck',
                header: 'Camion',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{row.original.truck || '-'}</span>
                    </div>
                ),
            },
            {
                accessorKey: 'date',
                header: 'Date',
                cell: ({ row }) => formatDate(row.original.date),
            },
            {
                accessorKey: 'product',
                header: 'Produit',
                cell: ({ row }) => (
                    <span className="font-medium">{row.original.product}</span>
                ),
            },
            {
                accessorKey: 'quantity',
                header: () => <div className="text-right">Quantité</div>,
                cell: ({ row }) => (
                    <div className="text-right">
                        {formatVolume(row.original.quantity)}
                    </div>
                ),
            },
            {
                accessorKey: 'missing_quantity',
                header: () => <div className="text-right">Manquant</div>,
                cell: ({ row }) => (
                    <div className="text-right">
                        {formatVolume(row.original.missing_quantity)}
                    </div>
                ),
            },
            {
                accessorKey: 'unit_price',
                header: () => <div className="text-right">P.U</div>,
                cell: ({ row }) => (
                    <div className="text-right">
                        {formatCurrency(row.original.unit_price)}
                    </div>
                ),
            },
            {
                accessorKey: 'total',
                header: () => <div className="text-right">TOTAL</div>,
                cell: ({ row }) => (
                    <div className="text-right font-semibold text-primary">
                        {formatCurrency(row.original.total)}
                    </div>
                ),
            },
            {
                id: 'actions',
                header: () => <div className="text-right">Actions</div>,
                cell: ({ row }) => {
                    const invoice = row.original;

                    return (
                        <div className="flex justify-end gap-1">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => visitInvoice(invoice, 'show')}
                                title="Consulter"
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => visitInvoice(invoice, 'edit')}
                                title="Modifier"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => downloadInvoice(invoice)}
                                title="Télécharger le PDF"
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive"
                                onClick={() => setInvoiceToDelete(invoice)}
                                title="Supprimer"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    );
                },
            },
        ],
        [clientInvoices, selectedClient],
    );

    const products = React.useMemo(() => {
        const uniqueProducts = Array.from(new Set(loads.map((l) => l.product)));

        return uniqueProducts.sort();
    }, [loads]);

    const filteredLoads = React.useMemo(() => {
        return loads.filter((load) => {
            const matchesSearch =
                (load.bl_number || '')
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                (load.vehicle_registration || '')
                    .toLowerCase()
                    .includes(search.toLowerCase());

            const matchesProduct =
                productFilter === 'all' || load.product === productFilter;

            const matchesStatus =
                statusFilter === 'all' || load.status === statusFilter;

            return matchesSearch && matchesProduct && matchesStatus;
        });
    }, [loads, search, productFilter, statusFilter]);

    const handleRowSelectionChange = React.useCallback((rows: Load[]) => {
        setSelectedLoads(rows);
    }, []);

    const deliveredLoadColumns: ColumnDef<Load>[] = React.useMemo(
        () => [
            {
                accessorKey: 'load_date',
                header: 'Date Charg.',
                cell: ({ row }) => formatDate(row.original.load_date),
            },
            {
                accessorKey: 'unload_date',
                header: 'Date Livr.',
                cell: ({ row }) => formatDate(row.original.unload_date),
            },
            { accessorKey: 'bl_number', header: 'N° BL' },
            { accessorKey: 'vehicle_registration', header: 'Camion' },
            { accessorKey: 'product', header: 'Produit' },
            {
                accessorKey: 'volume',
                header: 'Qté',
                cell: ({ row }) => formatNumber(row.original.volume),
            },
            {
                accessorKey: 'unit_price',
                header: 'P.U',
                cell: ({ row }) => formatCurrency(row.original.unit_price),
            },
            {
                accessorKey: 'total_amount',
                header: 'Montant',
                cell: ({ row }) => formatCurrency(row.original.total_amount),
            },
        ],
        [],
    );

    const loadColumns: ColumnDef<Load>[] = React.useMemo(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() &&
                                'indeterminate')
                        }
                        onCheckedChange={(value) =>
                            table.toggleAllPageRowsSelected(!!value)
                        }
                        aria-label="Tout sélectionner"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Sélectionner la ligne"
                        disabled={row.original.status !== 'FACTURER' && row.original.status !== 'FACTURE PARTIELLE'}
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            },
            { accessorKey: 'numero', header: 'N°' },
            {
                accessorKey: 'load_date',
                header: 'Date Charg.',
                cell: ({ row }) => formatDate(row.original.load_date),
            },
            {
                accessorKey: 'unload_date',
                header: 'Date Livr.',
                cell: ({ row }) => formatDate(row.original.unload_date),
            },
            { accessorKey: 'bl_number', header: 'N° BL' },
            { accessorKey: 'vehicle_registration', header: 'Camion' },
            { accessorKey: 'product', header: 'Produit' },
            { accessorKey: 'volume', header: 'Qté' },
            {
                accessorKey: 'unit_price',
                header: 'P.U',
                cell: ({ row }) => (
                    <span>
                        {new Intl.NumberFormat('fr-FR').format(
                            row.original.unit_price,
                        )}
                    </span>
                ),
            },
            { accessorKey: 'missing_quantity', header: 'Manquant' },
            {
                accessorKey: 'total_amount',
                header: 'Montant',
                cell: ({ row }) => (
                    <span>
                        {new Intl.NumberFormat('fr-FR').format(
                            row.original.total_amount,
                        )}
                    </span>
                ),
            },
            {
                accessorKey: 'status',
                header: 'Statut',
                cell: ({ row }) => {
                    const status = row.original.status;
                    let variant:
                        'outline' | 'default' | 'secondary' | 'destructive' =
                        'outline';

                    if (status === 'FACTURER ET PAYER') {
                        variant = 'default';
                    }

                    if (status === 'FACTURER') {
                        variant = 'secondary';
                    }

                    if (status === 'FACTURE PARTIELLE') {
                        variant = 'outline';
                    }

                    return <Badge variant={variant}>{status}</Badge>;
                },
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => {
                    const load = row.original;

                    if (load.status !== 'FACTURER ET PAYER') {
                        return null;
                    }

                    return (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                title="Remettre à FACTURER"
                                onClick={() => setLoadToReset(load)}
                            >
                                <Undo2 className="h-4 w-4 text-orange-500" />
                            </Button>
                        </>
                    );
                },
            },
        ],
        [],
    );

    return (
        <>
            <Head title="Suivi client" />

            <div className="flex h-full flex-1 flex-col gap-5 p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-foreground">
                            SUIVI CLIENT
                            {selectedClient ? ` - ${selectedClient.nom}` : ''}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Vue consolidée des livraisons, règlements, factures
                            et solde client.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="w-full lg:w-72">
                            <Autocomplete
                                options={clients.map((c) => ({
                                    value: c.id.toString(),
                                    label: c.nom,
                                }))}
                                value={selectedClient?.id?.toString() || ''}
                                onValueChange={handleClientChange}
                                placeholder="Sélectionner un client..."
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'w-40 justify-start text-left font-normal',
                                            !startDate &&
                                                'text-muted-foreground',
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? (
                                            format(
                                                new Date(startDate),
                                                'dd MMM yyyy',
                                                { locale: fr },
                                            )
                                        ) : (
                                            <span>Date début</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                >
                                    <Calendar
                                        mode="single"
                                        selected={
                                            startDate
                                                ? new Date(startDate)
                                                : undefined
                                        }
                                        onSelect={(date) =>
                                            setStartDate(
                                                date
                                                    ? format(date, 'yyyy-MM-dd')
                                                    : '',
                                            )
                                        }
                                    />
                                </PopoverContent>
                            </Popover>
                            <span className="text-sm text-muted-foreground">
                                au
                            </span>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'w-40 justify-start text-left font-normal',
                                            !endDate && 'text-muted-foreground',
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? (
                                            format(
                                                new Date(endDate),
                                                'dd MMM yyyy',
                                                { locale: fr },
                                            )
                                        ) : (
                                            <span>Date fin</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                >
                                    <Calendar
                                        mode="single"
                                        selected={
                                            endDate
                                                ? new Date(endDate)
                                                : undefined
                                        }
                                        onSelect={(date) =>
                                            setEndDate(
                                                date
                                                    ? format(date, 'yyyy-MM-dd')
                                                    : '',
                                            )
                                        }
                                    />
                                </PopoverContent>
                            </Popover>
                            <Button variant="outline" onClick={handleFilter}>
                                <Filter className="mr-2 h-4 w-4" />
                                Filtrer
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleExportPdf}
                                disabled={!selectedClient}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Exporter PDF
                            </Button>
                        </div>
                    </div>
                </div>

                {!selectedClient ? (
                    <div className="flex min-h-[420px] flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/20">
                        <div className="flex max-w-md flex-col items-center gap-3 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background ring-1 ring-border">
                                <UserRound className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-semibold tracking-tight">
                                    Sélectionnez un client
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Les soldes, règlements, livraisons et
                                    factures seront chargés dans une vue unique.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="grid gap-4 lg:grid-cols-[0.7fr_2.3fr]">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <UserRound className="h-4 w-4 text-primary" />
                                        {selectedClient.nom}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-3 text-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">
                                            Contact
                                        </span>
                                        <span className="font-medium">
                                            {selectedClient.contact || '-'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">
                                            Adresse
                                        </span>
                                        <span className="max-w-64 truncate text-right font-medium">
                                            {selectedClient.address || '-'}
                                        </span>
                                    </div>
                                    <Button
                                        className="mt-2 w-full"
                                        variant="secondary"
                                        onClick={fetchInvoices}
                                    >
                                        <FileText className="mr-2 h-4 w-4" />
                                        Afficher les factures
                                        <ArrowUpRight className="ml-auto h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <Card className="border-primary/20 bg-primary/5">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Solde initial
                                        </CardTitle>
                                        <Wallet className="h-4 w-4 text-primary" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xl font-bold">
                                            {formatCurrency(initial_balance)}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card
                                    className={cn(
                                        current_balance > 0
                                            ? 'border-destructive/20 bg-destructive/5'
                                            : 'border-emerald-500/20 bg-emerald-500/5',
                                    )}
                                >
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Solde actuel
                                        </CardTitle>
                                        <CreditCard
                                            className={cn(
                                                'h-4 w-4',
                                                current_balance > 0
                                                    ? 'text-destructive'
                                                    : 'text-emerald-600',
                                            )}
                                        />
                                    </CardHeader>
                                    <CardContent>
                                        <div
                                            className={cn(
                                                'text-xl font-bold',
                                                current_balance > 0
                                                    ? 'text-destructive'
                                                    : 'text-emerald-600',
                                            )}
                                        >
                                            {formatCurrency(current_balance)}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Total facturé
                                        </CardTitle>
                                        <Receipt className="h-4 w-4 text-amber-600" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xl font-bold">
                                            {formatCurrency(totalInvoiced)}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Règlements
                                        </CardTitle>
                                        <Banknote className="h-4 w-4 text-emerald-600" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xl font-bold">
                                            {formatCurrency(total_payments)}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Livraisons livrées
                                    </CardTitle>
                                    <Truck className="h-4 w-4 text-sky-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div className="text-2xl font-bold">
                                            {stats.livrer}
                                        </div>
                                        {stats.livrer > 0 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() =>
                                                    setIsDeliveredLoadsSheetOpen(
                                                        true,
                                                    )
                                                }
                                            >
                                                Afficher les livraisons
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Factures partielles
                                    </CardTitle>
                                    <Receipt className="h-4 w-4 text-violet-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {stats.facture_partielle}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Facturées à payer
                                    </CardTitle>
                                    <Receipt className="h-4 w-4 text-amber-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {stats.facturer}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {unpaidLoads} sélectionnable(s) pour
                                        paiement
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Facturées et payées
                                    </CardTitle>
                                    <CreditCard className="h-4 w-4 text-emerald-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {stats.facturer_payer}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-semibold">
                                            Règlements
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            Paiements enregistrés sur la période
                                            sélectionnée.
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={openCreatePaymentModal}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Nouveau règlement
                                    </Button>
                                </div>
                                <DataTable
                                    columns={paymentColumns}
                                    data={payments}
                                    hidePagination
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold">
                                            Livraisons facturées
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            Sélectionnez uniquement les lignes
                                            non payées à marquer comme payées.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="relative w-full max-w-sm sm:w-64">
                                            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="BL, Camion..."
                                                value={search}
                                                onChange={(e) =>
                                                    setSearch(e.target.value)
                                                }
                                                className="pl-8"
                                            />
                                        </div>

                                        <Select
                                            value={productFilter}
                                            onValueChange={setProductFilter}
                                        >
                                            <SelectTrigger className="w-full sm:w-40">
                                                <SelectValue placeholder="Produit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Tous les produits
                                                </SelectItem>
                                                {products.map((p) => (
                                                    <SelectItem key={p} value={p}>
                                                        {p}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select
                                            value={statusFilter}
                                            onValueChange={setStatusFilter}
                                        >
                                            <SelectTrigger className="w-full sm:w-48">
                                                <SelectValue placeholder="Statut" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Tous les statuts
                                                </SelectItem>
                                                <SelectItem value="FACTURER">
                                                    FACTURER
                                                </SelectItem>
                                                <SelectItem value="FACTURE PARTIELLE">
                                                    FACTURE PARTIELLE
                                                </SelectItem>
                                                <SelectItem value="FACTURER ET PAYER">
                                                    FACTURER ET PAYER
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Button
                                            disabled={selectedLoads.length === 0}
                                            onClick={openPaymentModal}
                                        >
                                            <CreditCard className="mr-2 h-4 w-4" />
                                            Marquer payées ({selectedLoads.length})
                                        </Button>
                                    </div>
                                </div>
                                <DataTable
                                    columns={loadColumns}
                                    data={filteredLoads}
                                    hidePagination
                                    onRowSelectionChange={
                                        handleRowSelectionChange
                                    }
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sheet pour les factures */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="w-full overflow-y-auto min-[1800px]:max-w-[85rem] min-[2000px]:max-w-[95rem] sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-5xl 2xl:max-w-7xl">
                    <SheetHeader className="border-b">
                        <SheetTitle>
                            Factures de {selectedClient?.nom}
                        </SheetTitle>
                        <SheetDescription>
                            Consultez, modifiez, supprimez ou téléchargez
                            directement les factures du client.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="grid gap-3 px-4 sm:grid-cols-3">
                        <div className="rounded-lg border bg-card p-4">
                            <p className="text-sm text-muted-foreground">
                                Factures chargement
                            </p>
                            <p className="text-2xl font-bold">
                                {clientInvoices.load_invoices.length}
                            </p>
                        </div>
                        <div className="rounded-lg border bg-card p-4">
                            <p className="text-sm text-muted-foreground">
                                Factures dépôt
                            </p>
                            <p className="text-2xl font-bold">
                                {clientInvoices.depot_invoices.length}
                            </p>
                        </div>
                        <div className="rounded-lg border bg-card p-4">
                            <p className="text-sm text-muted-foreground">
                                Total factures
                            </p>
                            <p className="text-2xl font-bold">
                                {formatCurrency(
                                    [
                                        ...clientInvoices.load_invoices,
                                        ...clientInvoices.depot_invoices,
                                    ].reduce(
                                        (total, invoice) =>
                                            total + invoice.total_amount,
                                        0,
                                    ),
                                )}
                            </p>
                        </div>
                    </div>
                    <Tabs defaultValue="chargement" className="px-4 pb-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="chargement">
                                Factures Chargement
                            </TabsTrigger>
                            <TabsTrigger value="depot">
                                Factures Dépôt
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent
                            value="chargement"
                            className="mt-4 space-y-3"
                        >
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h3 className="font-semibold">
                                        Factures de chargement
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        La suppression remet les livraisons
                                        liées au statut LIVRER.
                                    </p>
                                </div>
                                <Button onClick={createLoadInvoice}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nouvelle facture
                                </Button>
                            </div>
                            <DataTable
                                columns={invoiceColumns}
                                data={loadInvoiceLines}
                                searchKey="truck"
                                searchPlaceholder="Filtrer par camion..."
                                hidePagination
                            />
                        </TabsContent>
                        <TabsContent value="depot" className="mt-4 space-y-3">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h3 className="font-semibold">
                                        Factures dépôt
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        La suppression restitue les quantités
                                        aux compartiments du dépôt.
                                    </p>
                                </div>
                                <Button onClick={createDepotInvoice}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nouvelle facture
                                </Button>
                            </div>
                            <DataTable
                                columns={invoiceColumns}
                                data={depotInvoiceLines}
                                searchKey="truck"
                                searchPlaceholder="Filtrer par camion..."
                                hidePagination
                            />
                        </TabsContent>
                    </Tabs>
                </SheetContent>
            </Sheet>

            <Sheet
                open={isDeliveredLoadsSheetOpen}
                onOpenChange={setIsDeliveredLoadsSheetOpen}
            >
                <SheetContent className="sm:max-w-4xl p-0 flex flex-col">
                    <SheetHeader className="p-6 pb-0">
                        <SheetTitle>Livraisons livrées</SheetTitle>
                        <SheetDescription>
                            Liste des livraisons au statut LIVRER pour ce
                            client.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 flex-1 overflow-y-auto px-6 pb-6">
                        <DataTable
                            columns={deliveredLoadColumns}
                            data={delivered_loads}
                            hidePagination
                        />
                    </div>
                </SheetContent>
            </Sheet>

            <Dialog
                open={!!loadToReset}
                onOpenChange={(open) => !open && setLoadToReset(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirmer l'action</DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir remettre cette livraison à
                            l'état <strong>FACTURER</strong> ? Cette action est
                            irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setLoadToReset(null)}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="default"
                            onClick={() => {
                                if (loadToReset) {
                                    router.post(
                                        tracking.resetLoad({
                                            load: loadToReset.id,
                                        }).url,
                                        {},
                                        {
                                            onSuccess: () =>
                                                setLoadToReset(null),
                                        },
                                    );
                                }
                            }}
                        >
                            Confirmer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isCreateDepotInvoiceOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeCreateDepotInvoice();
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto border border-border shadow-none sm:max-w-[90rem] xl:max-w-[96rem]">
                    <DialogHeader>
                        <DialogTitle>Nouvelle facture dépôt</DialogTitle>
                        <DialogDescription>
                            Créer une facture dépôt sans quitter le suivi
                            client.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={submitCreateDepotInvoice}
                        className="space-y-4 p-6 pt-0"
                    >
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Client</Label>
                                <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                                    {selectedClient?.nom || '-'}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Dépôt</Label>
                                <Select
                                    value={createDepotInvoiceForm.data.depot_id}
                                    onValueChange={(value) =>
                                        createDepotInvoiceForm.setData(
                                            (current) => ({
                                                ...current,
                                                depot_id: value,
                                                items: current.items.map(
                                                    (item) => ({
                                                        ...item,
                                                        compartment_id: '',
                                                        product: '',
                                                    }),
                                                ),
                                            }),
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un dépôt" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {depots.map((depot) => (
                                            <SelectItem
                                                key={depot.id}
                                                value={depot.id.toString()}
                                            >
                                                {depot.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {createDepotInvoiceForm.errors.depot_id && (
                                    <p className="text-sm text-destructive">
                                        {createDepotInvoiceForm.errors.depot_id}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-depot-invoice-date">
                                    Date
                                </Label>
                                <Input
                                    id="create-depot-invoice-date"
                                    type="date"
                                    value={createDepotInvoiceForm.data.date}
                                    onChange={(e) =>
                                        createDepotInvoiceForm.setData(
                                            'date',
                                            e.target.value,
                                        )
                                    }
                                />
                                {createDepotInvoiceForm.errors.date && (
                                    <p className="text-sm text-destructive">
                                        {createDepotInvoiceForm.errors.date}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="max-h-[420px] overflow-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-muted">
                                    <tr>
                                        <th className="px-4 py-2 text-left">
                                            Compartiment / Produit
                                        </th>
                                        <th className="w-36 px-4 py-2 text-right">
                                            Quantité
                                        </th>
                                        <th className="w-36 px-4 py-2 text-right">
                                            P.U
                                        </th>
                                        <th className="w-40 px-4 py-2 text-right">
                                            Total
                                        </th>
                                        <th className="w-10 px-4 py-2 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {createDepotInvoiceForm.data.items.map(
                                        (item, index) => (
                                            <tr
                                                key={index}
                                                className="border-t"
                                            >
                                                <td className="px-4 py-2">
                                                    <Select
                                                        value={
                                                            item.compartment_id
                                                        }
                                                        onValueChange={(
                                                            value,
                                                        ) =>
                                                            updateCreateDepotInvoiceItem(
                                                                index,
                                                                'compartment_id',
                                                                value,
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue placeholder="Produit" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {selectedCreateDepot?.compartments.map(
                                                                (
                                                                    compartment,
                                                                ) => (
                                                                    <SelectItem
                                                                        key={
                                                                            compartment.id
                                                                        }
                                                                        value={compartment.id.toString()}
                                                                    >
                                                                        {
                                                                            compartment.product
                                                                        }{' '}
                                                                        (
                                                                        {formatNumber(
                                                                            compartment.quantity,
                                                                        )}{' '}
                                                                        L)
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.quantity}
                                                        onChange={(e) =>
                                                            updateCreateDepotInvoiceItem(
                                                                index,
                                                                'quantity',
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="h-8 text-right"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.unit_price}
                                                        onChange={(e) =>
                                                            updateCreateDepotInvoiceItem(
                                                                index,
                                                                'unit_price',
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="h-8 text-right"
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-right font-semibold">
                                                    {formatCurrency(item.total)}
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive"
                                                        disabled={
                                                            createDepotInvoiceForm
                                                                .data.items
                                                                .length === 1
                                                        }
                                                        onClick={() =>
                                                            removeCreateDepotInvoiceItem(
                                                                index,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between border-t pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addCreateDepotInvoiceItem}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Ajouter un produit
                            </Button>
                            <div className="flex gap-4 text-xl font-black">
                                <span>Montant total:</span>
                                <span className="text-primary">
                                    {formatCurrency(
                                        createDepotInvoiceForm.data
                                            .total_amount,
                                    )}
                                </span>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeCreateDepotInvoice}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={createDepotInvoiceForm.processing}
                            >
                                Générer la facture
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isEditClientInvoiceOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeEditClientInvoice();
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto border border-border shadow-none sm:max-w-[90rem] xl:max-w-[96rem]">
                    <DialogHeader>
                        <DialogTitle>
                            Modifier la facture {editingClientInvoice?.number}
                        </DialogTitle>
                        <DialogDescription>
                            Les modifications restent dans le suivi client et le
                            sheet des factures sera rafraîchi après
                            enregistrement.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={submitEditClientInvoice}
                        className="space-y-4 p-6 pt-0"
                    >
                        {editingClientInvoiceType === 'chargement' ? (
                            <>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-load-invoice-date">
                                            Date
                                        </Label>
                                        <Input
                                            id="edit-load-invoice-date"
                                            type="date"
                                            value={
                                                editLoadInvoiceForm.data.date
                                            }
                                            onChange={(e) =>
                                                editLoadInvoiceForm.setData(
                                                    'date',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        {editLoadInvoiceForm.errors.date && (
                                            <p className="text-sm text-destructive">
                                                {
                                                    editLoadInvoiceForm.errors
                                                        .date
                                                }
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="max-h-[420px] overflow-auto rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-muted">
                                            <tr>
                                                <th className="px-4 py-2 text-left">
                                                    Véhicule
                                                </th>
                                                <th className="px-4 py-2 text-left">
                                                    Produit
                                                </th>
                                                <th className="w-24 px-4 py-2 text-center">
                                                    Partielle
                                                </th>
                                                <th className="w-36 px-4 py-2 text-right">
                                                    Quantité
                                                </th>
                                                <th className="w-36 px-4 py-2 text-right">
                                                    P.U
                                                </th>
                                                <th className="w-36 px-4 py-2 text-right">
                                                    Manquant
                                                </th>
                                                <th className="w-36 px-4 py-2 text-right">
                                                    Restant
                                                </th>
                                                <th className="w-40 px-4 py-2 text-right">
                                                    Total
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {editLoadInvoiceForm.data.items.map(
                                                (item, index) => (
                                                    <tr
                                                        key={item.id}
                                                        className="border-t"
                                                    >
                                                        <td className="px-4 py-2">
                                                            {item.vehicle_registration ||
                                                                '-'}
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            {item.product}
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            <Checkbox
                                                                checked={
                                                                    item.is_partial
                                                                }
                                                                onCheckedChange={(
                                                                    checked,
                                                                ) =>
                                                                    updateLoadInvoiceItem(
                                                                        index,
                                                                        'is_partial',
                                                                        checked ===
                                                                            true,
                                                                    )
                                                                }
                                                                aria-label="Facture partielle"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={
                                                                    item.quantity_delivered
                                                                }
                                                                onChange={(e) =>
                                                                    updateLoadInvoiceItem(
                                                                        index,
                                                                        'quantity_delivered',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="h-8 text-right"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={
                                                                    item.unit_price
                                                                }
                                                                onChange={(e) =>
                                                                    updateLoadInvoiceItem(
                                                                        index,
                                                                        'unit_price',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="h-8 text-right"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={
                                                                    item.missing_quantity
                                                                }
                                                                onChange={(e) =>
                                                                    updateLoadInvoiceItem(
                                                                        index,
                                                                        'missing_quantity',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="h-8 text-right"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-muted-foreground">
                                                            {formatVolume(
                                                                item.remaining_quantity ??
                                                                    0,
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-semibold">
                                                            {formatCurrency(
                                                                item.total,
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex flex-col items-end gap-1 border-t pt-4">
                                    <div className="flex gap-4 font-bold">
                                        <span>Total manquant:</span>
                                        <span className="text-primary">
                                            {formatVolume(
                                                editLoadInvoiceForm.data
                                                    .total_missing,
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 text-xl font-black">
                                        <span>Montant total:</span>
                                        <span className="text-primary">
                                            {formatCurrency(
                                                editLoadInvoiceForm.data
                                                    .total_amount,
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Dépôt</Label>
                                        <Select
                                            value={
                                                editDepotInvoiceForm.data
                                                    .depot_id
                                            }
                                            onValueChange={(value) =>
                                                editDepotInvoiceForm.setData(
                                                    (current) => ({
                                                        ...current,
                                                        depot_id: value,
                                                        items: current.items.map(
                                                            (item) => ({
                                                                ...item,
                                                                compartment_id:
                                                                    '',
                                                                product: '',
                                                            }),
                                                        ),
                                                    }),
                                                )
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un dépôt" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {depots.map((depot) => (
                                                    <SelectItem
                                                        key={depot.id}
                                                        value={depot.id.toString()}
                                                    >
                                                        {depot.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {editDepotInvoiceForm.errors
                                            .depot_id && (
                                            <p className="text-sm text-destructive">
                                                {
                                                    editDepotInvoiceForm.errors
                                                        .depot_id
                                                }
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-depot-invoice-date">
                                            Date
                                        </Label>
                                        <Input
                                            id="edit-depot-invoice-date"
                                            type="date"
                                            value={
                                                editDepotInvoiceForm.data.date
                                            }
                                            onChange={(e) =>
                                                editDepotInvoiceForm.setData(
                                                    'date',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        {editDepotInvoiceForm.errors.date && (
                                            <p className="text-sm text-destructive">
                                                {
                                                    editDepotInvoiceForm.errors
                                                        .date
                                                }
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="max-h-[420px] overflow-auto rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-muted">
                                            <tr>
                                                <th className="px-4 py-2 text-left">
                                                    Compartiment / Produit
                                                </th>
                                                <th className="w-36 px-4 py-2 text-right">
                                                    Quantité
                                                </th>
                                                <th className="w-36 px-4 py-2 text-right">
                                                    P.U
                                                </th>
                                                <th className="w-40 px-4 py-2 text-right">
                                                    Total
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {editDepotInvoiceForm.data.items.map(
                                                (item, index) => (
                                                    <tr
                                                        key={item.id}
                                                        className="border-t"
                                                    >
                                                        <td className="px-4 py-2">
                                                            <Select
                                                                value={
                                                                    item.compartment_id
                                                                }
                                                                onValueChange={(
                                                                    value,
                                                                ) =>
                                                                    updateDepotInvoiceItem(
                                                                        index,
                                                                        'compartment_id',
                                                                        value,
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="h-8">
                                                                    <SelectValue placeholder="Produit" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {selectedEditDepot?.compartments.map(
                                                                        (
                                                                            compartment,
                                                                        ) => (
                                                                            <SelectItem
                                                                                key={
                                                                                    compartment.id
                                                                                }
                                                                                value={compartment.id.toString()}
                                                                            >
                                                                                {
                                                                                    compartment.product
                                                                                }{' '}
                                                                                (
                                                                                {formatNumber(
                                                                                    compartment.quantity,
                                                                                )}{' '}
                                                                                L)
                                                                            </SelectItem>
                                                                        ),
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={
                                                                    item.quantity
                                                                }
                                                                onChange={(e) =>
                                                                    updateDepotInvoiceItem(
                                                                        index,
                                                                        'quantity',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="h-8 text-right"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={
                                                                    item.unit_price
                                                                }
                                                                onChange={(e) =>
                                                                    updateDepotInvoiceItem(
                                                                        index,
                                                                        'unit_price',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="h-8 text-right"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-semibold">
                                                            {formatCurrency(
                                                                item.total,
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-end border-t pt-4">
                                    <div className="flex gap-4 text-xl font-black">
                                        <span>Montant total:</span>
                                        <span className="text-primary">
                                            {formatCurrency(
                                                editDepotInvoiceForm.data
                                                    .total_amount,
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeEditClientInvoice}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    editLoadInvoiceForm.processing ||
                                    editDepotInvoiceForm.processing
                                }
                            >
                                Enregistrer les modifications
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(invoiceToDelete)}
                onOpenChange={(open) => !open && setInvoiceToDelete(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirmer la suppression</DialogTitle>
                        <DialogDescription>
                            {invoiceToDelete?.type === 'chargement'
                                ? 'Cette facture sera supprimée et les livraisons liées repasseront au statut LIVRER.'
                                : 'Cette facture dépôt sera supprimée et les quantités seront restituées au stock.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setInvoiceToDelete(null)}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmInvoiceDeletion}
                        >
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modale de Paiement */}
            <Dialog
                open={isPaymentModalOpen}
                onOpenChange={setIsPaymentModalOpen}
            >
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Enregistrer le paiement</DialogTitle>
                        <DialogDescription>
                            Saisissez les manquants éventuels pour chaque
                            livraison sélectionnée.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitPayment} className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                Détails des livraisons
                            </h4>
                            <div className="max-h-64 overflow-y-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="sticky top-0 border-b bg-muted/50">
                                            <th className="p-2 text-left">
                                                N° BL
                                            </th>
                                            <th className="p-2 text-left">
                                                Camion
                                            </th>
                                            <th className="p-2 text-left">
                                                Date
                                            </th>
                                            <th className="p-2 text-left">
                                                Produit
                                            </th>
                                            <th className="p-2 text-right">
                                                Qté Livrée
                                            </th>
                                            <th className="w-32 p-2 text-center">
                                                Manquant
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedLoads.map((load) => (
                                            <tr
                                                key={load.id}
                                                className="border-b"
                                            >
                                                <td className="p-2">
                                                    {load.bl_number}
                                                </td>
                                                <td className="p-2">
                                                    {load.vehicle_registration}
                                                </td>
                                                <td className="p-2">
                                                    {load.unload_date
                                                        ? format(
                                                              new Date(
                                                                  load.unload_date,
                                                              ),
                                                              'dd/MM/yyyy',
                                                          )
                                                        : '-'}
                                                </td>
                                                <td className="p-2">
                                                    {load.product}
                                                </td>
                                                <td className="p-2 text-right">
                                                    {load.volume}
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={
                                                            paymentForm.data
                                                                .missings[
                                                                load.id
                                                            ] || 0
                                                        }
                                                        onChange={(e) => {
                                                            const newMissings =
                                                                {
                                                                    ...paymentForm
                                                                        .data
                                                                        .missings,
                                                                };
                                                            newMissings[
                                                                load.id
                                                            ] =
                                                                parseFloat(
                                                                    e.target
                                                                        .value,
                                                                ) || 0;
                                                            paymentForm.setData(
                                                                'missings',
                                                                newMissings,
                                                            );
                                                        }}
                                                        className="h-8 text-center"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsPaymentModalOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={paymentForm.processing}
                            >
                                {paymentForm.processing
                                    ? 'Traitement...'
                                    : 'Valider le paiement'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            {/* Modale de création de règlement direct */}
            <Dialog
                open={isCreatePaymentModalOpen}
                onOpenChange={setIsCreatePaymentModalOpen}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Nouveau règlement</DialogTitle>
                        <DialogDescription>
                            Enregistrer un nouveau paiement pour{' '}
                            {selectedClient?.nom}.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCreatePayment} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date">Date</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={createPaymentForm.data.date}
                                    onChange={(e) =>
                                        createPaymentForm.setData(
                                            'date',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                                {createPaymentForm.errors.date && (
                                    <p className="text-xs text-destructive">
                                        {createPaymentForm.errors.date}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="payment_method">Type</Label>
                                <Select
                                    value={
                                        createPaymentForm.data.payment_method
                                    }
                                    onValueChange={(val) =>
                                        createPaymentForm.setData(
                                            'payment_method',
                                            val,
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Type..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="VERSEMENT">
                                            VERSEMENT
                                        </SelectItem>
                                        <SelectItem value="CHEQUE">
                                            CHEQUE
                                        </SelectItem>
                                        <SelectItem value="VIREMENT">
                                            VIREMENT
                                        </SelectItem>
                                        <SelectItem value="ESPECE">
                                            ESPECE
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="banque">Banque</Label>
                                <Input
                                    id="banque"
                                    value={createPaymentForm.data.banque}
                                    onChange={(e) =>
                                        createPaymentForm.setData(
                                            'banque',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Ex: SIB, BOA..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="numero">N° Pièce / Réf</Label>
                                <Input
                                    id="numero"
                                    value={createPaymentForm.data.numero}
                                    onChange={(e) =>
                                        createPaymentForm.setData(
                                            'numero',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="N° chèque, virement..."
                                    required
                                />
                                {createPaymentForm.errors.numero && (
                                    <p className="text-xs text-destructive">
                                        {createPaymentForm.errors.numero}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount">Montant (FCFA)</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={createPaymentForm.data.amount}
                                onChange={(e) =>
                                    createPaymentForm.setData(
                                        'amount',
                                        Number(e.target.value),
                                    )
                                }
                                required
                            />
                            {createPaymentForm.errors.amount && (
                                <p className="text-xs text-destructive">
                                    {createPaymentForm.errors.amount}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="note">Notes</Label>
                            <Input
                                id="note"
                                value={createPaymentForm.data.note}
                                onChange={(e) =>
                                    createPaymentForm.setData(
                                        'note',
                                        e.target.value,
                                    )
                                }
                                placeholder="Informations complémentaires..."
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    setIsCreatePaymentModalOpen(false)
                                }
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={createPaymentForm.processing}
                            >
                                Enregistrer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modale de modification de règlement */}
            <Dialog
                open={isEditPaymentModalOpen}
                onOpenChange={setIsEditPaymentModalOpen}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Modifier le règlement</DialogTitle>
                        <DialogDescription>
                            Modifiez les informations du règlement.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitEditPayment} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-date">Date</Label>
                                <Input
                                    id="edit-date"
                                    type="date"
                                    value={editPaymentForm.data.date}
                                    onChange={(e) =>
                                        editPaymentForm.setData(
                                            'date',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                                {editPaymentForm.errors.date && (
                                    <p className="text-xs text-destructive">
                                        {editPaymentForm.errors.date}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-payment_method">
                                    Type
                                </Label>
                                <Select
                                    value={editPaymentForm.data.payment_method}
                                    onValueChange={(val) =>
                                        editPaymentForm.setData(
                                            'payment_method',
                                            val,
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Type..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="VERSEMENT">
                                            VERSEMENT
                                        </SelectItem>
                                        <SelectItem value="CHEQUE">
                                            CHEQUE
                                        </SelectItem>
                                        <SelectItem value="VIREMENT">
                                            VIREMENT
                                        </SelectItem>
                                        <SelectItem value="ESPECE">
                                            ESPECE
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-banque">Banque</Label>
                                <Input
                                    id="edit-banque"
                                    value={editPaymentForm.data.banque}
                                    onChange={(e) =>
                                        editPaymentForm.setData(
                                            'banque',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Ex: SIB, BOA..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-numero">
                                    N° Pièce / Réf
                                </Label>
                                <Input
                                    id="edit-numero"
                                    value={editPaymentForm.data.numero}
                                    onChange={(e) =>
                                        editPaymentForm.setData(
                                            'numero',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="N° chèque, virement..."
                                    required
                                />
                                {editPaymentForm.errors.numero && (
                                    <p className="text-xs text-destructive">
                                        {editPaymentForm.errors.numero}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-amount">Montant (FCFA)</Label>
                            <Input
                                id="edit-amount"
                                type="number"
                                value={editPaymentForm.data.amount}
                                onChange={(e) =>
                                    editPaymentForm.setData(
                                        'amount',
                                        Number(e.target.value),
                                    )
                                }
                                required
                            />
                            {editPaymentForm.errors.amount && (
                                <p className="text-xs text-destructive">
                                    {editPaymentForm.errors.amount}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-note">Notes</Label>
                            <Input
                                id="edit-note"
                                value={editPaymentForm.data.note}
                                onChange={(e) =>
                                    editPaymentForm.setData(
                                        'note',
                                        e.target.value,
                                    )
                                }
                                placeholder="Informations complémentaires..."
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditPaymentModalOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={editPaymentForm.processing}
                            >
                                Mettre à jour
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirmation de suppression du règlement */}
            <Dialog
                open={!!paymentToDelete}
                onOpenChange={(open) => !open && setPaymentToDelete(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirmer la suppression</DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer ce règlement ?
                            <br />
                            <strong>Cette action est irréversible.</strong> Les
                            livraisons liées repasseront au statut 'À FACTURER'.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setPaymentToDelete(null)}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDeletePayment}
                        >
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

SuiviClient.layout = {
    breadcrumbs: [
        { title: 'Clients', href: '#' },
        {
            title: 'Suivi client',
            href: '/clients/suivi-client',
        },
    ],
};
