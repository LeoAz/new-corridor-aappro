import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
    ArrowUpDown,
    Eye,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatNumber } from '@/lib/utils';
import * as finances from '@/routes/finances';
import * as operations from '@/routes/operations';
import InvoiceForm from './factures-chargement/InvoiceForm';

interface InvoiceItem {
    id: number;
    bl_number: string;
    load_id: number;
    quantity_delivered: number;
    unit_price: number;
    total: number;
    missing_quantity: number;
    is_partial?: boolean;
    remaining_quantity?: number;
    load_details?: {
        vehicle_registration: string;
        product: string;
    };
}

interface Invoice {
    id: number;
    number: string;
    date: string;
    client_id: number;
    client_name: string;
    total_amount: number;
    total_missing: number;
    items: InvoiceItem[];
}

interface Client {
    id: number;
    nom: string;
}

interface Props {
    invoices: Invoice[];
    clients: Client[];
    editingInvoiceId?: number | null;
    prefillClientId?: number | null;
    lockClient?: boolean;
    creatingInvoice?: boolean;
}

export default function FacturesChargement({
    invoices,
    clients,
    editingInvoiceId = null,
    prefillClientId = null,
    lockClient = false,
    creatingInvoice = false,
}: Props) {
    const initialEditingInvoice = editingInvoiceId
        ? (invoices.find((item) => item.id === editingInvoiceId) ?? null)
        : null;
    const prefilledClient = prefillClientId
        ? (clients.find((client) => client.id === prefillClientId) ?? null)
        : null;
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(
        initialEditingInvoice,
    );
    const [isCreateOpen, setIsCreateOpen] = useState(
        Boolean(creatingInvoice && prefilledClient),
    );
    const [isEditOpen, setIsEditOpen] = useState(
        Boolean(initialEditingInvoice),
    );
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null);

    const { data, setData, post, put, processing, reset, errors, clearErrors } =
        useForm({
            client_id: prefilledClient?.id.toString() ?? '',
            date: format(new Date(), 'yyyy-MM-dd'),
            items: [] as any[],
            total_amount: 0,
            total_missing: 0,
        });

    const [availableLoads, setAvailableLoads] = useState<any[]>([]);

    // Filter available loads: must belong to client, NOT be already in items AND be in status 'LIVRER'
    const filteredAvailableLoads = useMemo(() => {
        const selectedLoadIds = new Set(
            data.items.map((item) => item.load_id).filter((id) => id),
        );

        return availableLoads.filter(
            (load) => !selectedLoadIds.has(load.id) && load.status === 'LIVRER',
        );
    }, [availableLoads, data.items]);

    useEffect(() => {
        if ((isCreateOpen || isEditOpen) && data.client_id) {
            const url = operations.default.livraisons.index({
                query: {
                    invoiceable: 1,
                    client_id: data.client_id,
                },
            }).url;

            fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
            })
                .then((res) => res.json())
                .then(setAvailableLoads);
        }
    }, [isCreateOpen, isEditOpen, data.client_id]);

    // Vider les articles si le client change
    useEffect(() => {
        if (data.client_id && data.items.length > 0) {
            if (
                selectedInvoice &&
                data.client_id !== selectedInvoice.client_id.toString()
            ) {
                setData((prev) => ({
                    ...prev,
                    items: [],
                    total_amount: 0,
                    total_missing: 0,
                }));
            }
        }
    }, [data.client_id]);

    useEffect(() => {
        if (selectedInvoice && isEditOpen) {
            setData({
                client_id: selectedInvoice.client_id.toString(),
                date: selectedInvoice.date,
                items: selectedInvoice.items.map((item) => ({
                    id: item.id,
                    load_id: item.load_id,
                    bl_number: item.bl_number,
                    quantity_delivered: item.quantity_delivered,
                    unit_price: item.unit_price,
                    missing_quantity: item.missing_quantity,
                    is_partial: item.is_partial ?? false,
                    total: item.total,
                    vehicle_registration:
                        item.load_details?.vehicle_registration,
                    product: item.load_details?.product,
                })),
                total_amount: selectedInvoice.total_amount,
                total_missing: selectedInvoice.total_missing,
            });
        }
    }, [selectedInvoice, isEditOpen]);

    const handleEditItem = (index: number, field: string, value: any) => {
        const newItems = [...data.items];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === 'load_id') {
            const load = availableLoads.find(
                (l: any) => l.id.toString() === value.toString(),
            );

            if (load) {
                newItems[index] = {
                    ...newItems[index],
                    load_id: load.id,
                    bl_number: load.bl_number || '',
                    quantity_delivered: load.volume,
                    unit_price: load.unit_price || 0,
                    missing_quantity: 0,
                    is_partial: false,
                    total: (load.volume ?? 0) * (load.unit_price || 0),
                    vehicle_registration: load.vehicle_registration,
                    product: load.product,
                    remaining_quantity: 0,
                };
            }
        }

        if (
            field === 'unit_price' ||
            field === 'quantity_delivered' ||
            field === 'missing_quantity'
        ) {
            const qty = parseFloat(newItems[index].quantity_delivered) || 0;
            const missing = parseFloat(newItems[index].missing_quantity) || 0;
            const price = parseFloat(newItems[index].unit_price) || 0;
            newItems[index].total = (qty - missing) * price;
        }

        recalculateTotals(newItems);
    };

    const removeItem = (index: number) => {
        const newItems = data.items.filter((_, i) => i !== index);
        recalculateTotals(newItems);
    };

    const addNewItem = () => {
        const newItem = {
            load_id: '',
            bl_number: '',
            quantity_delivered: 0,
            unit_price: 0,
            missing_quantity: 0,
            is_partial: false,
            total: 0,
            vehicle_registration: '',
            product: '',
        };

        setData((prev) => ({
            ...prev,
            items: [...prev.items, newItem],
        }));
    };

    const addAllAvailableLoads = () => {
        const newItemsFromLoads = filteredAvailableLoads.map((load) => ({
            id: undefined, // Nouveau item de facture
            load_id: load.id,
            bl_number: load.bl_number || '',
            quantity_delivered: load.volume,
            unit_price: load.unit_price || 0,
            missing_quantity: 0,
            is_partial: false,
            total: (load.volume ?? 0) * (load.unit_price || 0),
            vehicle_registration: load.vehicle_registration,
            product: load.product,
            remaining_quantity: 0,
        }));

        const updatedItems = [...data.items, ...newItemsFromLoads];
        // On retire les lignes vides (sans load_id) s'il y en a
        const finalItems = updatedItems.filter(
            (item) => item.load_id || item.vehicle_registration,
        );

        recalculateTotals(finalItems);
    };

    const recalculateTotals = (items: any[]) => {
        const totalAmount = items.reduce(
            (acc, item) => acc + (parseFloat(item.total) || 0),
            0,
        );
        const totalMissing = items.reduce(
            (acc, item) => acc + (parseFloat(item.missing_quantity) || 0),
            0,
        );

        setData((prev) => ({
            ...prev,
            items: items,
            total_amount: totalAmount,
            total_missing: totalMissing,
        }));
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();

        post(finances.default.factureChargement.store().url, {
            onSuccess: () => {
                setIsCreateOpen(false);
                reset();
            },
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedInvoice) {
            return;
        }

        put(finances.default.factureChargement.update(selectedInvoice.id).url, {
            onSuccess: () => {
                setIsEditOpen(false);
                reset();
            },
        });
    };

    const handleDelete = (id: number) => {
        setInvoiceToDelete(id);
        setIsDeleteOpen(true);
    };

    const confirmDelete = () => {
        if (invoiceToDelete) {
            router.delete(
                finances.default.factureChargement.destroy(invoiceToDelete).url,
                {
                    onFinish: () => {
                        setIsDeleteOpen(false);
                        setInvoiceToDelete(null);
                    },
                },
            );
        }
    };

    const columns = useMemo<ColumnDef<Invoice>[]>(
        () => [
            {
                accessorKey: 'number',
                header: 'Numéro',
                cell: ({ row }) => (
                    <div className="font-bold">{row.original.number}</div>
                ),
            },
            {
                accessorKey: 'date',
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === 'asc')
                        }
                    >
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) =>
                    format(new Date(row.original.date), 'dd/MM/yyyy'),
            },
            {
                accessorKey: 'client_name',
                header: 'Client',
            },
            {
                accessorKey: 'total_amount',
                header: 'Montant Total',
                cell: ({ row }) => (
                    <div className="font-medium text-primary">
                        {formatNumber(row.original.total_amount || 0)} CFA
                    </div>
                ),
            },
            {
                accessorKey: 'total_missing',
                header: 'Manquant Total',
                cell: ({ row }) => (
                    <div>{formatNumber(row.original.total_missing || 0)} L</div>
                ),
            },
            {
                id: 'actions',
                cell: ({ row }) => {
                    const invoice = row.original;

                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={() => {
                                        router.visit(
                                            finances.default.factureChargement.show(
                                                invoice.id,
                                            ).url,
                                        );
                                    }}
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Consulter
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        setSelectedInvoice(invoice);
                                        setIsEditOpen(true);
                                    }}
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDelete(invoice.id)}
                                >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Supprimer
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ],
        [],
    );

    const sharedFormProps = {
        data,
        setData,
        errors,
        processing,
        clients,
        availableLoads,
        filteredAvailableLoads,
        handleEditItem,
        addNewItem,
        addAllAvailableLoads,
        removeItem,
        lockClient: lockClient && Boolean(prefilledClient),
        lockedClientName: prefilledClient?.nom,
    };

    return (
        <>
            <Head title="Factures Chargement" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        Factures Chargement
                    </h1>
                    <Button
                        onClick={() => {
                            if (prefilledClient) {
                                setData({
                                    client_id: prefilledClient.id.toString(),
                                    date: format(new Date(), 'yyyy-MM-dd'),
                                    items: [],
                                    total_amount: 0,
                                    total_missing: 0,
                                });
                            } else {
                                reset();
                            }

                            clearErrors();
                            setIsCreateOpen(true);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nouvelle Facture
                    </Button>
                </div>

                <DataTable
                    columns={columns}
                    data={invoices}
                    searchKey="number"
                    searchPlaceholder="Rechercher par numéro..."
                    hidePagination
                />
            </div>

            {/* Modal de Confirmation de Suppression */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmer la suppression</DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer cette facture ?
                            Les livraisons liées repasseront au statut "LIVRER".
                            Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Création */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <InvoiceForm
                    {...sharedFormProps}
                    onSubmit={handleCreate}
                    onCancel={() => setIsCreateOpen(false)}
                    title="Nouvelle Facture"
                    submitLabel="Générer la facture"
                />
            </Dialog>

            {/* Modal Modification */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <InvoiceForm
                    {...sharedFormProps}
                    onSubmit={handleUpdate}
                    onCancel={() => setIsEditOpen(false)}
                    title={`Modifier la Facture ${selectedInvoice?.number}`}
                    submitLabel="Enregistrer les modifications"
                />
            </Dialog>
        </>
    );
}

FacturesChargement.layout = (page: any) => ({
    breadcrumbs: [
        { title: 'Finances', href: '#' },
        {
            title: 'Facture chargement',
            href: finances.default.factureChargement.index().url,
        },
    ],
    children: page,
});
