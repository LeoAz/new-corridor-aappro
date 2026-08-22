import { router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import * as React from 'react';

import * as clientPaymentActions from '@/actions/App/Http/Controllers/ClientPaymentController';
import { Button } from '@/components/ui/button';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDateFr } from '@/lib/format';
import tracking from '@/routes/clients/suivi-client';

import type { Client, Load, Payment } from './types';

export default function PaymentsSection({
    payments,
    selectedClient,
    selectedLoads,
    isPaymentModalOpen,
    onPaymentModalOpenChange,
    onPaymentSuccess,
}: {
    payments: Payment[];
    selectedClient: Client | null;
    selectedLoads: Load[];
    isPaymentModalOpen: boolean;
    onPaymentModalOpenChange: (open: boolean) => void;
    onPaymentSuccess: () => void;
}) {
    const [isCreatePaymentModalOpen, setIsCreatePaymentModalOpen] =
        React.useState(false);
    const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] =
        React.useState(false);
    const [paymentToDelete, setPaymentToDelete] =
        React.useState<Payment | null>(null);
    const [selectedPayment, setSelectedPayment] =
        React.useState<Payment | null>(null);

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

    React.useEffect(() => {
        if (!isPaymentModalOpen || selectedLoads.length === 0) {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPaymentModalOpen]);

    const submitPayment = (e: React.FormEvent) => {
        e.preventDefault();
        paymentForm.post(tracking.payment().url, {
            onSuccess: () => {
                onPaymentModalOpenChange(false);
                onPaymentSuccess();
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
                cell: ({ row }) => formatDateFr(row.original.date),
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
        [],
    );

    return (
        <>
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold">Règlements</h2>
                        <p className="text-sm text-muted-foreground">
                            Paiements enregistrés sur la période sélectionnée.
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

            {/* Modale de Paiement */}
            <Dialog
                open={isPaymentModalOpen}
                onOpenChange={onPaymentModalOpenChange}
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
                                onClick={() => onPaymentModalOpenChange(false)}
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
