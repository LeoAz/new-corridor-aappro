import { router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { CreditCard, Search, Undo2 } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { formatCurrency, formatDateFr } from '@/lib/format';
import { LOAD_STATUS } from '@/lib/load-status';
import { formatNumber } from '@/lib/utils';
import tracking from '@/routes/clients/suivi-client';

import type { Load } from './types';

export default function LoadsTable({
    loads,
    delivered_loads,
    selectedLoads,
    onSelectedLoadsChange,
    onOpenPaymentModal,
    isDeliveredLoadsSheetOpen,
    onDeliveredLoadsSheetOpenChange,
}: {
    loads: Load[];
    delivered_loads: Load[];
    selectedLoads: Load[];
    onSelectedLoadsChange: (rows: Load[]) => void;
    onOpenPaymentModal: () => void;
    isDeliveredLoadsSheetOpen: boolean;
    onDeliveredLoadsSheetOpenChange: (open: boolean) => void;
}) {
    const [search, setSearch] = React.useState('');
    const [productFilter, setProductFilter] = React.useState('all');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [loadToReset, setLoadToReset] = React.useState<Load | null>(null);

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

    const handleRowSelectionChange = React.useCallback(
        (rows: Load[]) => {
            onSelectedLoadsChange(rows);
        },
        [onSelectedLoadsChange],
    );

    const deliveredLoadColumns: ColumnDef<Load>[] = React.useMemo(
        () => [
            {
                accessorKey: 'load_date',
                header: 'Date Charg.',
                cell: ({ row }) => formatDateFr(row.original.load_date),
            },
            {
                accessorKey: 'unload_date',
                header: 'Date Livr.',
                cell: ({ row }) => formatDateFr(row.original.unload_date),
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
                        disabled={
                            row.original.status !== LOAD_STATUS.FACTURER &&
                            row.original.status !==
                                LOAD_STATUS.LIVRE_PARTIELLEMENT
                        }
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            },
            { accessorKey: 'numero', header: 'N°' },
            {
                accessorKey: 'load_date',
                header: 'Date Charg.',
                cell: ({ row }) => formatDateFr(row.original.load_date),
            },
            {
                accessorKey: 'unload_date',
                header: 'Date Livr.',
                cell: ({ row }) => formatDateFr(row.original.unload_date),
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

                    if (status === LOAD_STATUS.PAYE) {
                        variant = 'default';
                    }

                    if (status === LOAD_STATUS.FACTURER) {
                        variant = 'secondary';
                    }

                    if (status === LOAD_STATUS.LIVRE_PARTIELLEMENT) {
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

                    if (load.status !== LOAD_STATUS.PAYE) {
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
            <div className="space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">
                            Livraisons facturées
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Sélectionnez uniquement les lignes non payées à
                            marquer comme payées.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative w-full max-w-sm sm:w-64">
                            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="BL, Camion..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
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
                                <SelectItem value={LOAD_STATUS.FACTURER}>
                                    {LOAD_STATUS.FACTURER}
                                </SelectItem>
                                <SelectItem
                                    value={LOAD_STATUS.LIVRE_PARTIELLEMENT}
                                >
                                    {LOAD_STATUS.LIVRE_PARTIELLEMENT}
                                </SelectItem>
                                <SelectItem value={LOAD_STATUS.PAYE}>
                                    {LOAD_STATUS.PAYE}
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            disabled={selectedLoads.length === 0}
                            onClick={onOpenPaymentModal}
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
                    onRowSelectionChange={handleRowSelectionChange}
                />
            </div>

            <Sheet
                open={isDeliveredLoadsSheetOpen}
                onOpenChange={onDeliveredLoadsSheetOpenChange}
            >
                <SheetContent className="flex flex-col p-0 sm:max-w-4xl">
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
        </>
    );
}
