import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ArrowUpDown, CalendarIcon, Eye, MoreHorizontal, Pencil, Plus, Trash, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { DataTable } from '@/components/ui/data-table';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatNumber } from '@/lib/utils';
import * as finances from '@/routes/finances';

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

interface Client {
    id: number;
    nom: string;
}

interface InvoiceItem {
    id?: number;
    compartment_id: string;
    quantity: number;
    unit_price: number;
    total: number;
    compartment?: {
        product: string;
    };
}

interface Invoice {
    id: number;
    number: string;
    date: string;
    client_id: number;
    depot_id: number;
    total_amount: number;
    client?: { nom: string };
    depot?: { name: string };
    items: InvoiceItem[];
}

interface Props {
    invoices: Invoice[];
    clients: Client[];
    depots: Depot[];
}

export default function FacturesDepot({ invoices, clients, depots }: Props) {
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const { data, setData, post, put, processing, reset, errors } = useForm({
        client_id: '',
        depot_id: '',
        date: new Date().toISOString().split('T')[0],
        items: [{ compartment_id: '', quantity: 0, unit_price: 0, total: 0 }] as any[],
        total_amount: 0,
    });

    // Reset when creating
    const openCreate = () => {
        reset();
        setData({
            client_id: '',
            depot_id: '',
            date: new Date().toISOString().split('T')[0],
            items: [{ compartment_id: '', quantity: 0, unit_price: 0, total: 0 }],
            total_amount: 0,
        });
        setIsCreateOpen(true);
    };

    // Load data for editing
    useEffect(() => {
        if (selectedInvoice && isEditOpen) {
            setData({
                client_id: selectedInvoice.client_id.toString(),
                depot_id: selectedInvoice.depot_id.toString(),
                date: selectedInvoice.date,
                items: selectedInvoice.items.map(item => ({
                    id: item.id,
                    compartment_id: item.compartment_id.toString(),
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total: item.total,
                })),
                total_amount: selectedInvoice.total_amount,
            });
        }
    }, [selectedInvoice, isEditOpen]);

    const handleAddItem = () => {
        setData('items', [...data.items, { compartment_id: '', quantity: 0, unit_price: 0, total: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...data.items];
        newItems.splice(index, 1);
        const totalAmount = newItems.reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);

        setData((prev) => ({ ...prev, items: newItems, total_amount: totalAmount }));
    };

    const handleEditItem = (index: number, field: string, value: any) => {
        const newItems = [...data.items];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === 'unit_price' || field === 'quantity') {
            const qty = parseFloat(newItems[index].quantity) || 0;
            const price = parseFloat(newItems[index].unit_price) || 0;
            newItems[index].total = qty * price;
        }

        const totalAmount = newItems.reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);

        setData((prev) => ({ ...prev, items: newItems, total_amount: totalAmount }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(finances.default.factureDepots.store().url, {
            onSuccess: () => {
                setIsCreateOpen(false);
                reset();
                toast.success('Facture dépôt créée avec succès');
            },
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedInvoice) {
            return;
        }

        put(finances.default.factureDepots.update(selectedInvoice.id).url, {
            onSuccess: () => {
                setIsEditOpen(false);
                reset();
                toast.success('Facture dépôt mise à jour avec succès');
            },
        });
    };

    const handleDelete = (id: number) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette facture ? Le stock sera restitué aux compartiments.')) {
            router.delete(finances.default.factureDepots.destroy(id).url, {
                onSuccess: () => toast.success('Facture supprimée'),
            });
        }
    };

    const currentDepot = useMemo(() => {
        return depots.find(d => d.id.toString() === data.depot_id);
    }, [data.depot_id, depots]);

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
                accessorKey: 'client.nom',
                header: 'Client',
                cell: ({ row }) => row.original.client?.nom || 'N/A',
            },
            {
                accessorKey: 'depot.name',
                header: 'Dépôt',
                cell: ({ row }) => row.original.depot?.name || 'N/A',
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
                                <DropdownMenuItem onClick={() => router.visit(finances.default.factureDepots.show(invoice.id).url)}>
                                    <Eye className="mr-2 h-4 w-4" /> Consulter
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        setSelectedInvoice(invoice);
                                        setIsEditOpen(true);
                                    }}
                                >
                                    <Pencil className="mr-2 h-4 w-4" /> Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(invoice.id)}>
                                    <Trash className="mr-2 h-4 w-4" /> Supprimer
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ],
        [],
    );

    return (
        <>
            <Head title="Factures Dépôt" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">Factures Dépôt</h1>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Nouvelle Facture
                    </Button>
                </div>

                <DataTable
                    columns={columns}
                    data={invoices}
                    searchKey="number"
                    searchPlaceholder="Rechercher par numéro..."
                />
            </div>

            {/* Modal Création/Modification (Reused logic) */}
            <Dialog
                open={isCreateOpen || isEditOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsCreateOpen(false);
                        setIsEditOpen(false);
                        reset();
                    }
                }}
            >
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{isEditOpen ? `Modifier la Facture ${selectedInvoice?.number}` : 'Nouvelle Facture Dépôt'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={isEditOpen ? handleUpdate : handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Client</Label>
                                <Select value={data.client_id} onValueChange={(v) => setData('client_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Client" /></SelectTrigger>
                                    <SelectContent>
                                        {clients.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nom}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {errors.client_id && <p className="text-xs text-destructive">{errors.client_id}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Dépôt</Label>
                                <Select value={data.depot_id} onValueChange={(v) => setData('depot_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Dépôt" /></SelectTrigger>
                                    <SelectContent>
                                        {depots.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {errors.depot_id && <p className="text-xs text-destructive">{errors.depot_id}</p>}
                            </div>
                            <div className="space-y-2 flex flex-col">
                                <Label>Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !data.date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {data.date ? format(new Date(data.date), "dd/MM/yyyy") : <span>Choisir une date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={data.date ? new Date(data.date) : undefined} onSelect={(date) => setData('date', date ? date.toISOString().split('T')[0] : '')} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
                            </div>
                        </div>

                        <div className="border rounded-md max-h-[300px] overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Compartiment / Produit</th>
                                        <th className="px-4 py-2 text-right w-32">Quantité</th>
                                        <th className="px-4 py-2 text-right w-32">P.U</th>
                                        <th className="px-4 py-2 text-right w-32">Total</th>
                                        <th className="px-4 py-2 text-center w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item, index) => (
                                        <tr key={index} className="border-t">
                                            <td className="px-4 py-2">
                                                <Select value={item.compartment_id} onValueChange={(v) => handleEditItem(index, 'compartment_id', v)}>
                                                    <SelectTrigger className="h-8"><SelectValue placeholder="Produit" /></SelectTrigger>
                                                    <SelectContent>
                                                        {currentDepot?.compartments.map(c => (
                                                            <SelectItem key={c.id} value={c.id?.toString() || ''}>
                                                                {c.product} ({c.quantity} L dispo)
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <Input type="number" step="0.01" value={item.quantity} onChange={(e) => handleEditItem(index, 'quantity', e.target.value)} className="h-8 text-right" />
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <Input type="number" step="0.01" value={item.unit_price} onChange={(e) => handleEditItem(index, 'unit_price', e.target.value)} className="h-8 text-right" />
                                            </td>
                                            <td className="px-4 py-2 text-right font-medium">
                                                {formatNumber(item.total || 0)}
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveItem(index)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="mt-2">
                            <Plus className="mr-2 h-4 w-4" /> Ajouter un produit
                        </Button>

                        <div className="flex flex-col items-end border-t pt-4">
                            <div className="flex space-x-4 text-xl font-black">
                                <span>MONTANT TOTAL:</span>
                                <span className="text-primary">{formatNumber(data.total_amount)} CFA</span>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsCreateOpen(false);
                                    setIsEditOpen(false);
                                    reset();
                                }}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {isEditOpen ? 'Enregistrer les modifications' : 'Générer la facture'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

FacturesDepot.layout = (page: any) => ({
    breadcrumbs: [
        { title: 'Finances', href: '#' },
        { title: 'Facture dépôt', href: finances.default.factureDepots.index().url },
    ],
    children: page,
});
