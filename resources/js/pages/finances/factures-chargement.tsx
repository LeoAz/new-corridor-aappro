import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ArrowUpDown, CalendarIcon, Eye, MoreHorizontal, Pencil, Trash } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import AlertError from '@/components/alert-error';
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

export default function FacturesChargement({ invoices, clients }: Props) {
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const { data, setData, put, processing, reset, errors } = useForm({
        client_id: '',
        date: '',
        items: [] as any[],
        total_amount: 0,
        total_missing: 0,
    });

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

        if (field === 'unit_price' || field === 'quantity_delivered' || field === 'missing_quantity') {
            const qty = parseFloat(newItems[index].quantity_delivered) || 0;
            const price = parseFloat(newItems[index].unit_price) || 0;
            newItems[index].total = qty * price;
        }

        const totalAmount = newItems.reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);
        const totalMissing = newItems.reduce((acc, item) => acc + (parseFloat(item.missing_quantity) || 0), 0);

        setData(prev => ({
            ...prev,
            items: newItems,
            total_amount: totalAmount,
            total_missing: totalMissing
        }));
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
        if (confirm('Êtes-vous sûr de vouloir supprimer cette facture ? Les livraisons liées repasseront au statut "LIVRÉ".')) {
            router.delete(finances.default.factureChargement.destroy(id).url);
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

    return (
        <>
            <Head title="Factures Chargement" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        Factures Chargement
                    </h1>
                </div>

                <DataTable
                    columns={columns}
                    data={invoices}
                    searchKey="number"
                    searchPlaceholder="Rechercher par numéro..."
                    showNumbering={true}
                />
            </div>

            {/* Modal Modification */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto border border-border shadow-none sm:max-w-[90rem] xl:max-w-[96rem]">
                    <DialogHeader>
                        <DialogTitle>Modifier la Facture {selectedInvoice?.number}</DialogTitle>
                    </DialogHeader>

                    {Object.keys(errors).length > 0 && (
                        <div className="px-6 pt-2">
                            <AlertError errors={Object.values(errors)} />
                        </div>
                    )}

                    <form onSubmit={handleUpdate} className="space-y-4 p-6 pt-0">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="client_id">Client</Label>
                                <Select
                                    value={data.client_id}
                                    onValueChange={(v) => setData('client_id', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((client) => (
                                            <SelectItem key={client.id} value={client.id.toString()}>
                                                {client.nom}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item, index) => (
                                        <tr key={index} className="border-t">
                                            <td className="px-4 py-2">{item.vehicle_registration}</td>
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
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={processing}>
                                Enregistrer les modifications
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
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
