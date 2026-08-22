import { useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { formatCurrency, formatVolume } from '@/lib/format';
import { formatNumber } from '@/lib/utils';
import * as finances from '@/routes/finances';

import type { ClientInvoice, Depot, InvoiceLine } from '../types';

export default function EditInvoiceDialog({
    open,
    onOpenChange,
    invoice,
    type,
    depots,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoice: ClientInvoice | null;
    type: InvoiceLine['type'] | null;
    depots: Depot[];
    onSuccess: () => void;
}) {
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

    React.useEffect(() => {
        if (!open || !invoice || !type) {
            return;
        }

        if (type === 'chargement') {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, invoice, type]);

    const selectedEditDepot = React.useMemo(
        () =>
            depots.find(
                (depot) =>
                    depot.id.toString() === editDepotInvoiceForm.data.depot_id,
            ),
        [depots, editDepotInvoiceForm.data.depot_id],
    );

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

    const closeEditClientInvoice = () => {
        onOpenChange(false);
        editLoadInvoiceForm.reset();
        editDepotInvoiceForm.reset();
    };

    const submitEditClientInvoice = (e: React.FormEvent) => {
        e.preventDefault();

        if (!invoice || !type) {
            return;
        }

        if (type === 'chargement') {
            editLoadInvoiceForm.put(
                finances.default.factureChargement.update(invoice.id).url,
                {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        closeEditClientInvoice();
                        onSuccess();
                    },
                },
            );

            return;
        }

        editDepotInvoiceForm.put(
            finances.default.factureDepots.update(invoice.id).url,
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    closeEditClientInvoice();
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
                    closeEditClientInvoice();
                }
            }}
        >
            <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto border border-border shadow-none sm:max-w-[90rem] xl:max-w-[96rem]">
                <DialogHeader>
                    <DialogTitle>
                        Modifier la facture {invoice?.number}
                    </DialogTitle>
                    <DialogDescription>
                        Les modifications restent dans le suivi client et le
                        sheet des factures sera rafraîchi après enregistrement.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={submitEditClientInvoice}
                    className="space-y-4 p-6 pt-0"
                >
                    {type === 'chargement' ? (
                        <>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-load-invoice-date">
                                        Date
                                    </Label>
                                    <Input
                                        id="edit-load-invoice-date"
                                        type="date"
                                        value={editLoadInvoiceForm.data.date}
                                        onChange={(e) =>
                                            editLoadInvoiceForm.setData(
                                                'date',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    {editLoadInvoiceForm.errors.date && (
                                        <p className="text-sm text-destructive">
                                            {editLoadInvoiceForm.errors.date}
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
                                                            aria-label="Livraison partielle"
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
                                            editDepotInvoiceForm.data.depot_id
                                        }
                                        onValueChange={(value) =>
                                            editDepotInvoiceForm.setData(
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
                                    {editDepotInvoiceForm.errors.depot_id && (
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
                                        value={editDepotInvoiceForm.data.date}
                                        onChange={(e) =>
                                            editDepotInvoiceForm.setData(
                                                'date',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    {editDepotInvoiceForm.errors.date && (
                                        <p className="text-sm text-destructive">
                                            {editDepotInvoiceForm.errors.date}
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
    );
}
