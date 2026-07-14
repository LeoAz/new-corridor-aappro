import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ArrowUpDown, CalendarIcon, Check, ChevronsUpDown, Eye, MoreHorizontal, Pencil, Plus, Trash, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import AlertError from '@/components/alert-error';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatNumber } from '@/lib/utils';
import * as finances from '@/routes/finances';
import * as operations from '@/routes/operations';

interface InvoiceItem {
    id: number;
    bl_number: string;
    load_id: number;
    quantity_delivered: number;
    unit_price: number;
    total: number;
    missing_quantity: number;
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
}

const InvoiceForm = ({ onSubmit, onCancel, title, submitLabel, data, setData, errors, processing, clients, availableLoads, filteredAvailableLoads, handleEditItem, addNewItem, removeItem, openCombobox, setOpenCombobox, openClientCombobox, setOpenClientCombobox }: any) => (
    <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto border border-border shadow-none sm:max-w-[90rem] xl:max-w-[96rem]">
        <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {Object.keys(errors).length > 0 && (
            <div className="px-6 pt-2">
                <AlertError errors={Object.values(errors)} />
            </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4 p-6 pt-0">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="client_id">Client</Label>
                    <Popover open={openClientCombobox} onOpenChange={setOpenClientCombobox}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openClientCombobox}
                                className="w-full justify-between font-normal"
                            >
                                {data.client_id
                                    ? clients.find((client: any) => client.id.toString() === data.client_id.toString())?.nom
                                    : 'Sélectionner un client'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Rechercher un client..." />
                                <CommandList>
                                    <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                                    <CommandGroup>
                                        {clients.map((client: any) => (
                                            <CommandItem
                                                key={client.id}
                                                value={client.nom}
                                                onSelect={() => {
                                                    setData('client_id', client.id.toString());
                                                    setOpenClientCombobox(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        'mr-2 h-4 w-4',
                                                        data.client_id?.toString() === client.id.toString()
                                                            ? 'opacity-100'
                                                            : 'opacity-0'
                                                    )}
                                                />
                                                {client.nom}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2 flex flex-col">
                    <Label htmlFor="date">Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !data.date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {data.date ? format(new Date(data.date), "dd/MM/yyyy") : <span>Choisir une date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={data.date ? new Date(data.date) : undefined}
                                onSelect={(date) => setData('date', date ? date.toISOString().split('T')[0] : '')}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Livraisons</h3>
                <Button type="button" variant="outline" size="sm" className="h-8" onClick={addNewItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une livraison
                </Button>
            </div>

            <div className="border rounded-md max-h-[400px] overflow-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                        <tr>
                            <th className="px-4 py-2 text-left">Véhicule</th>
                            <th className="px-4 py-2 text-left">Produit</th>
                            <th className="px-4 py-2 text-right w-32">Quantité</th>
                            <th className="px-4 py-2 text-right w-32">P.U</th>
                            <th className="px-4 py-2 text-right w-32">Manquant</th>
                            <th className="px-4 py-2 text-right">Total</th>
                            <th className="px-4 py-2 text-center w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((item: any, index: number) => (
                            <tr key={index} className="border-t">
                                <td className="px-4 py-2">
                                    {item.load_id && !availableLoads.some((l: any) => l.id.toString() === item.load_id.toString()) ? (
                                        item.vehicle_registration
                                    ) : (
                                        <Popover
                                            open={openCombobox === index}
                                            onOpenChange={(open) => setOpenCombobox(open ? index : null)}
                                        >
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openCombobox === index}
                                                    className="h-8 w-[200px] justify-between font-normal"
                                                >
                                                    {item.load_id
                                                        ? availableLoads.find(
                                                              (l) => l.id.toString() === item.load_id.toString()
                                                          )?.vehicle_registration + ` (${formatNumber(availableLoads.find(l => l.id.toString() === item.load_id.toString())?.volume)} L)`
                                                        : 'Choisir une livraison'}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Rechercher une livraison..." />
                                                    <CommandList>
                                                        <CommandEmpty>Aucune livraison trouvée.</CommandEmpty>
                                                        <CommandGroup>
                                                            {filteredAvailableLoads.map((load: any) => (
                                                                <CommandItem
                                                                    key={load.id}
                                                                    value={`${load.vehicle_registration} ${load.bl_number || ''} ${load.product || ''}`}
                                                                    onSelect={() => {
                                                                        handleEditItem(index, 'load_id', load.id);
                                                                        setOpenCombobox(null);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            'mr-2 h-4 w-4',
                                                                            item.load_id?.toString() === load.id.toString()
                                                                                ? 'opacity-100'
                                                                                : 'opacity-0'
                                                                        )}
                                                                    />
                                                                    <div className="flex flex-col">
                                                                        <span>{load.vehicle_registration} - {formatNumber(load.volume)} L</span>
                                                                        <span className="text-xs text-muted-foreground">{load.product} {load.bl_number ? `(BL: ${load.bl_number})` : ''}</span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                </td>
                                <td className="px-4 py-2">{item.product}</td>
                                <td className="px-4 py-2 text-right">
                                    <Input
                                        type="number"
                                        value={item.quantity_delivered}
                                        onChange={(e) => handleEditItem(index, 'quantity_delivered', e.target.value)}
                                        className="h-8 text-right"
                                    />
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <Input
                                        type="number"
                                        value={item.unit_price}
                                        onChange={(e) => handleEditItem(index, 'unit_price', e.target.value)}
                                        className="h-8 text-right"
                                    />
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <Input
                                        type="number"
                                        value={item.missing_quantity}
                                        onChange={(e) => handleEditItem(index, 'missing_quantity', e.target.value)}
                                        className="h-8 text-right"
                                    />
                                </td>
                                <td className="px-4 py-2 text-right font-medium">
                                    {formatNumber(item.total || 0)} CFA
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() => removeItem(index)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col items-end space-y-2 border-t pt-4">
                <div className="flex space-x-4 text-lg font-bold">
                    <span>TOTAL MANQUANT:</span>
                    <span className="text-primary">{formatNumber(data.total_missing)} L</span>
                </div>
                <div className="flex space-x-4 text-xl font-black">
                    <span>MONTANT TOTAL:</span>
                    <span className="text-primary">{formatNumber(data.total_amount)} CFA</span>
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Annuler
                </Button>
                <Button type="submit" disabled={processing}>
                    {submitLabel}
                </Button>
            </DialogFooter>
        </form>
    </DialogContent>
);

export default function FacturesChargement({ invoices, clients }: Props) {
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null);
    const [openCombobox, setOpenCombobox] = useState<number | null>(null);
    const [openClientCombobox, setOpenClientCombobox] = useState(false);

    const { data, setData, post, put, processing, reset, errors, clearErrors } = useForm({
        client_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        items: [] as any[],
        total_amount: 0,
        total_missing: 0,
    });

    const [availableLoads, setAvailableLoads] = useState<any[]>([]);

    // Filter available loads: must belong to client and NOT be already in items
    const filteredAvailableLoads = useMemo(() => {
        const selectedLoadIds = new Set(data.items.map(item => item.load_id).filter(id => id));

        return availableLoads.filter(load => !selectedLoadIds.has(load.id));
    }, [availableLoads, data.items]);

    useEffect(() => {
        if ((isCreateOpen || isEditOpen) && data.client_id) {
            const url = operations.default.livraisons.index({
                query: {
                    client_id: data.client_id,
                    status: 'LIVRER'
                }
            }).url;

            fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                }
            })
                .then(res => res.json())
                .then(setAvailableLoads);
        }
    }, [isEditOpen, data.client_id]);

    // Clear items if client changes and items don't belong to the new client
    useEffect(() => {
        if (data.client_id && data.items.length > 0) {
            // Since we don't have client_id in the items, we can't easily check
            // But if the client_id changed from the original invoice's client_id,
            // and the user manually changed it, we might want to warn or clear.
            // For now, let's stick to the requirement: "si le client selectionné change, le sous formulaire doit etre automatiquement vidé si les livraisons ne l'appartiennent pas"
            // Actually, any new available loads will be for the new client.
            // If the user changes client, we should probably clear items that were for the previous client.
            // Since we fetch availableLoads for the current data.client_id,
            // we can assume any item NOT in availableLoads AND NOT in the original selectedInvoice items (if still same client) might be wrong.
            // Simplified: if client_id changes, clear items that were not part of the original invoice if it's a different client.

            if (selectedInvoice && data.client_id !== selectedInvoice.client_id.toString()) {
                setData(prev => ({
                    ...prev,
                    items: [],
                    total_amount: 0,
                    total_missing: 0
                }));
            }
        }
    }, [data.client_id]);

    useEffect(() => {
        if (selectedInvoice && isEditOpen) {
            setData({
                client_id: selectedInvoice.client_id.toString(),
                date: selectedInvoice.date,
                items: selectedInvoice.items.map(item => ({
                    id: item.id,
                    load_id: item.load_id,
                    bl_number: item.bl_number,
                    quantity_delivered: item.quantity_delivered,
                    unit_price: item.unit_price,
                    missing_quantity: item.missing_quantity,
                    total: item.total,
                    vehicle_registration: item.load_details?.vehicle_registration,
                    product: item.load_details?.product
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
            const load = availableLoads.find(l => l.id.toString() === value.toString());

            if (load) {
                newItems[index] = {
                    ...newItems[index],
                    load_id: load.id,
                    bl_number: load.bl_number || '',
                    quantity_delivered: load.volume,
                    unit_price: load.unit_price || 0,
                    missing_quantity: 0,
                    total: (load.volume || 0) * (load.unit_price || 0),
                    vehicle_registration: load.vehicle_registration,
                    product: load.product
                };
            }
        }

        if (field === 'unit_price' || field === 'quantity_delivered' || field === 'missing_quantity') {
            const qty = parseFloat(newItems[index].quantity_delivered) || 0;
            const price = parseFloat(newItems[index].unit_price) || 0;
            newItems[index].total = qty * price;
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
            total: 0,
            vehicle_registration: '',
            product: ''
        };

        setData(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }));
    };

    const recalculateTotals = (items: any[]) => {
        const totalAmount = items.reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);
        const totalMissing = items.reduce((acc, item) => acc + (parseFloat(item.missing_quantity) || 0), 0);

        setData(prev => ({
            ...prev,
            items: items,
            total_amount: totalAmount,
            total_missing: totalMissing
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
            router.delete(finances.default.factureChargement.destroy(invoiceToDelete).url, {
                onFinish: () => {
                    setIsDeleteOpen(false);
                    setInvoiceToDelete(null);
                }
            });
        }
    };

    const columns = useMemo<ColumnDef<Invoice>[]>(
        () => [
            {
                accessorKey: 'number',
                header: 'Numéro',
                cell: ({ row }) => <div className="font-bold">{row.original.number}</div>,
            },
            {
                accessorKey: 'date',
                header: ({ column }) => (
                    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => format(new Date(row.original.date), 'dd/MM/yyyy'),
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
                cell: ({ row }) => <div>{formatNumber(row.original.total_missing || 0)} L</div>,
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
                                <DropdownMenuItem onClick={() => {
                                    router.visit(finances.default.factureChargement.show(invoice.id).url);
                                }}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Consulter
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setIsEditOpen(true);
                                }}>
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
        removeItem,
        openCombobox,
        setOpenCombobox,
        openClientCombobox,
        setOpenClientCombobox
    };

    return (
        <>
            <Head title="Factures Chargement" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        Factures Chargement
                    </h1>
                    <Button onClick={() => {
                        reset();
                        clearErrors();
                        setIsCreateOpen(true);
                    }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nouvelle Facture
                    </Button>
                </div>

                <DataTable
                    columns={columns}
                    data={invoices}
                    searchKey="number"
                    searchPlaceholder="Rechercher par numéro..."
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
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
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
        { title: 'Facture chargement', href: finances.default.factureChargement.index().url },
    ],
    children: page,
});
