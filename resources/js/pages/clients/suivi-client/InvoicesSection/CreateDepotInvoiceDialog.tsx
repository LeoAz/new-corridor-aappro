import { useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/format';
import { formatNumber } from '@/lib/utils';
import * as finances from '@/routes/finances';

import type { Client, Depot } from '../types';

export default function CreateDepotInvoiceDialog({
    open,
    onOpenChange,
    selectedClient,
    depots,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedClient: Client | null;
    depots: Depot[];
    onSuccess: () => void;
}) {
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

    React.useEffect(() => {
        if (open && selectedClient) {
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
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, selectedClient?.id]);

    const selectedCreateDepot = React.useMemo(
        () =>
            depots.find(
                (depot) =>
                    depot.id.toString() ===
                    createDepotInvoiceForm.data.depot_id,
            ),
        [depots, createDepotInvoiceForm.data.depot_id],
    );

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
        onOpenChange(false);
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
                    onSuccess();
                },
            },
        );
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    closeCreateDepotInvoice();
                }
            }}
        >
            <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto border border-border shadow-none sm:max-w-[90rem] xl:max-w-[96rem]">
                <DialogHeader>
                    <DialogTitle>Nouvelle facture dépôt</DialogTitle>
                    <DialogDescription>
                        Créer une facture dépôt sans quitter le suivi client.
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
                                        <tr key={index} className="border-t">
                                            <td className="px-4 py-2">
                                                <Select
                                                    value={item.compartment_id}
                                                    onValueChange={(value) =>
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
                                                            (compartment) => (
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
                                    createDepotInvoiceForm.data.total_amount,
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
    );
}
