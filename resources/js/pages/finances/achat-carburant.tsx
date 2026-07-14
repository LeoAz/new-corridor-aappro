import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowUpDown, CalendarIcon, Check, ChevronsUpDown, Download, Edit, MoreHorizontal, Plus, Search, Trash, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatNumber } from '@/lib/utils';
import * as achatCarburant from '@/routes/finances/achat-carburant';

interface Compartment {
    id: number;
    product: string;
    depot_id: number;
    quantity: number;
}

interface Depot {
    id: number;
    name: string;
    compartments?: Compartment[];
}

interface FuelPurchase {
    id: number;
    product: string;
    depot_id: number;
    compartment_id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    purchase_date: string;
    depot: Depot;
    compartment: Compartment;
}

interface Props {
    purchases: FuelPurchase[];
    depots: Depot[];
    filters: {
        product?: string;
        date_from?: string;
        date_to?: string;
    };
}

export default function AchatCarburant({ purchases, depots, filters }: Props) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState<FuelPurchase | null>(null);

    const [isDepotComboboxOpen, setIsDepotComboboxOpen] = useState(false);

    const initialDateRange: DateRange | undefined = useMemo(() => {
        if (filters.date_from && filters.date_to) {
            return {
                from: new Date(filters.date_from),
                to: new Date(filters.date_to),
            };
        }

        return undefined;
    }, [filters.date_from, filters.date_to]);

    const [localFilters, setLocalFilters] = useState({
        product: filters.product || '',
        dateRange: initialDateRange,
    });

    const columns = useMemo<ColumnDef<FuelPurchase>[]>(
        () => [
            {
                accessorKey: 'purchase_date',
                header: ({ column }) => (
                    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => format(new Date(row.getValue('purchase_date')), 'dd/MM/yyyy'),
            },
            {
                accessorKey: 'product',
                header: ({ column }) => (
                    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                        Produit
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
            },
            {
                accessorKey: 'quantity',
                header: ({ column }) => (
                    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                        Quantité (L)
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => formatNumber((row.getValue('quantity') as number) || 0),
            },
            {
                accessorKey: 'unit_price',
                header: ({ column }) => (
                    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                        Prix Unitaire
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => formatNumber((row.getValue('unit_price') as number) || 0) + ' FCFA',
            },
            {
                accessorKey: 'total_price',
                header: ({ column }) => (
                    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                        Total
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => formatNumber((row.getValue('total_price') as number) || 0) + ' FCFA',
            },
            {
                accessorKey: 'depot.name',
                header: ({ column }) => (
                    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                        Dépôt
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => row.original.depot?.name,
            },
            {
                id: 'actions',
                cell: ({ row }) => {
                    const purchase = row.original;

                    return (
                        <div className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Ouvrir le menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => openEditModal(purchase)}>
                                        <Edit className="mr-2 h-4 w-4" /> Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openDeleteModal(purchase)} className="text-destructive">
                                        <Trash className="mr-2 h-4 w-4" /> Supprimer
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                },
            },
        ],
        [],
    );

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        product: '',
        quantity: 0,
        unit_price: 0,
        total_price: 0,
        depot_id: '',
        compartment_id: '',
    });

    const selectedDepot = useMemo(() => {
        return depots.find((d) => d.id.toString() === data.depot_id);
    }, [data.depot_id, depots]);

    // Update total price when quantity or unit price changes
    useEffect(() => {
        setData('total_price', (data.quantity || 0) * (data.unit_price || 0));
    }, [data.quantity, data.unit_price]);

    const openCreateModal = () => {
        reset();
        clearErrors();
        setIsCreateModalOpen(true);
    };

    const openEditModal = (purchase: FuelPurchase) => {
        setSelectedPurchase(purchase);
        setData({
            purchase_date: format(new Date(purchase.purchase_date), 'yyyy-MM-dd'),
            product: purchase.product,
            quantity: purchase.quantity,
            unit_price: purchase.unit_price,
            total_price: purchase.total_price,
            depot_id: purchase.depot_id.toString(),
            compartment_id: purchase.compartment_id.toString(),
        });
        clearErrors();
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (purchase: FuelPurchase) => {
        setSelectedPurchase(purchase);
        setIsDeleteModalOpen(true);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        post(achatCarburant.store().url, {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                toast.success('Achat de carburant enregistré avec succès');
                reset();
            },
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPurchase) {
            return;
        }

        put(achatCarburant.update(selectedPurchase.id).url, {
            onSuccess: () => {
                setIsEditModalOpen(false);
                toast.success('Achat de carburant mis à jour avec succès');
            },
        });
    };

    const handleDelete = () => {
        if (!selectedPurchase) {
            return;
        }

        destroy(achatCarburant.destroy(selectedPurchase.id).url, {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                toast.success('Achat de carburant supprimé avec succès');
            },
        });
    };

    const applyFilters = () => {
        router.get(
            achatCarburant.index().url,
            {
                product: localFilters.product,
                date_from: localFilters.dateRange?.from ? format(localFilters.dateRange.from, 'yyyy-MM-dd') : '',
                date_to: localFilters.dateRange?.to ? format(localFilters.dateRange.to, 'yyyy-MM-dd') : '',
            },
            { preserveState: true, replace: true },
        );
    };

    const resetFilters = () => {
        setLocalFilters({
            product: '',
            dateRange: undefined,
        });
        router.get(achatCarburant.index().url, {}, { preserveState: true, replace: true });
    };

    const allProducts = useMemo(() => {
        const products = new Set<string>();
        depots.forEach((d) => {
            d.compartments?.forEach((c) => products.add(c.product));
        });

        return Array.from(products);
    }, [depots]);

    return (
        <>
            <Head title="Achat de carburant" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">Achat de carburant</h1>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                const params = new URLSearchParams();

                                if (localFilters.product) {
                                    params.append('product', localFilters.product);
                                }

                                if (localFilters.dateRange?.from) {
                                    params.append('date_from', format(localFilters.dateRange.from, 'yyyy-MM-dd'));
                                }

                                if (localFilters.dateRange?.to) {
                                    params.append('date_to', format(localFilters.dateRange.to, 'yyyy-MM-dd'));
                                }

                                window.open(achatCarburant.default.download().url + '?' + params.toString(), '_blank');
                            }}
                        >
                            <Download className="mr-2 h-4 w-4" /> Export PDF
                        </Button>
                        <Button onClick={openCreateModal}>
                            <Plus className="mr-2 h-4 w-4" /> Nouvel achat
                        </Button>
                    </div>
                </div>

                <Card className="p-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="filter-product">Produit</Label>
                            <Select
                                value={localFilters.product}
                                onValueChange={(v) => setLocalFilters((prev) => ({ ...prev, product: v }))}
                            >
                                <SelectTrigger id="filter-product">
                                    <SelectValue placeholder="Tous les produits" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value=" ">Tous les produits</SelectItem>
                                    {allProducts.map((p) => (
                                        <SelectItem key={p} value={p}>
                                            {p}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label>Période</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={'outline'}
                                        className={cn(
                                            'w-full justify-start text-left font-normal',
                                            !localFilters.dateRange && 'text-muted-foreground',
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {localFilters.dateRange?.from ? (
                                            localFilters.dateRange.to ? (
                                                <>
                                                    {format(localFilters.dateRange.from, 'dd/MM/yy', { locale: fr })} -{' '}
                                                    {format(localFilters.dateRange.to, 'dd/MM/yy', { locale: fr })}
                                                </>
                                            ) : (
                                                format(localFilters.dateRange.from, 'dd/MM/yy', { locale: fr })
                                            )
                                        ) : (
                                            <span>Choisir une période</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={localFilters.dateRange?.from}
                                        selected={localFilters.dateRange}
                                        onSelect={(range) => setLocalFilters((prev) => ({ ...prev, dateRange: range }))}
                                        numberOfMonths={2}
                                        locale={fr}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex gap-2 pb-0.5">
                            <Button onClick={applyFilters}>
                                <Search className="mr-2 h-4 w-4" /> Filtrer
                            </Button>
                            <Button variant="ghost" onClick={resetFilters}>
                                <X className="mr-2 h-4 w-4" /> Réinitialiser
                            </Button>
                        </div>
                    </div>
                </Card>

                <DataTable
                    columns={columns}
                    data={purchases}
                    searchKey="product"
                    searchPlaceholder="Rechercher par produit..."
                    hidePagination
                    showNumbering={true}
                />
            </div>

            {/* Create Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="max-w-4xl">
                    <form onSubmit={handleCreate}>
                        <DialogHeader>
                            <DialogTitle>Nouvel achat de carburant</DialogTitle>
                            <DialogDescription>Enregistrez un nouvel achat de carburant pour approvisionner vos stocks.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Date d'achat</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={'outline'}
                                                className={cn(
                                                    'w-full justify-start text-left font-normal',
                                                    !data.purchase_date && 'text-muted-foreground',
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {data.purchase_date ? (
                                                    format(new Date(data.purchase_date), 'dd MMMM yyyy', { locale: fr })
                                                ) : (
                                                    <span>Choisir une date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={data.purchase_date ? new Date(data.purchase_date) : undefined}
                                                onSelect={(d) => setData('purchase_date', d ? format(d, 'yyyy-MM-dd') : '')}
                                                initialFocus
                                                locale={fr}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {errors.purchase_date && <p className="text-sm text-destructive">{errors.purchase_date}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="depot_id">Dépôt</Label>
                                    <Popover open={isDepotComboboxOpen} onOpenChange={setIsDepotComboboxOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={isDepotComboboxOpen}
                                                className="w-full justify-between"
                                            >
                                                {data.depot_id ? depots.find((d) => d.id.toString() === data.depot_id)?.name : 'Sélectionner un dépôt...'}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                            <Command>
                                                <CommandInput placeholder="Rechercher un dépôt..." />
                                                <CommandList>
                                                    <CommandEmpty>Aucun dépôt trouvé.</CommandEmpty>
                                                    <CommandGroup>
                                                        {depots.map((depot) => (
                                                            <CommandItem
                                                                key={depot.id}
                                                                value={depot.name}
                                                                onSelect={() => {
                                                                    setData((prev) => ({
                                                                        ...prev,
                                                                        depot_id: depot.id.toString(),
                                                                        compartment_id: '',
                                                                        product: '',
                                                                    }));
                                                                    setIsDepotComboboxOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        'mr-2 h-4 w-4',
                                                                        data.depot_id === depot.id.toString() ? 'opacity-100' : 'opacity-0',
                                                                    )}
                                                                />
                                                                {depot.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    {errors.depot_id && <p className="text-sm text-destructive">{errors.depot_id}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="compartment_id">Compartiment (Produit)</Label>
                                    <Select
                                        value={data.compartment_id}
                                        onValueChange={(v) => {
                                            const comp = selectedDepot?.compartments?.find((c) => c.id.toString() === v);
                                            setData((prev) => ({
                                                ...prev,
                                                compartment_id: v,
                                                product: comp?.product || '',
                                            }));
                                        }}
                                        disabled={!data.depot_id}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={data.depot_id ? 'Sélectionner un compartiment' : 'Sélectionnez d’abord un dépôt'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedDepot?.compartments?.map((comp) => (
                                                <SelectItem key={comp.id} value={comp.id.toString()}>
                                                    {comp.product} (Actuel: {formatNumber(comp.quantity || 0)} L)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.compartment_id && <p className="text-sm text-destructive">{errors.compartment_id}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="quantity">Quantité (Litres)</Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        value={data.quantity}
                                        onChange={(e) => setData('quantity', parseFloat(e.target.value))}
                                    />
                                    {errors.quantity && <p className="text-sm text-destructive">{errors.quantity}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="unit_price">Prix Unitaire (FCFA)</Label>
                                    <Input
                                        id="unit_price"
                                        type="number"
                                        value={data.unit_price}
                                        onChange={(e) => setData('unit_price', parseFloat(e.target.value))}
                                    />
                                    {errors.unit_price && <p className="text-sm text-destructive">{errors.unit_price}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="total_price">Prix Total (FCFA)</Label>
                                    <Input
                                        id="total_price"
                                        type="number"
                                        value={data.total_price}
                                        readOnly
                                        className="bg-muted"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={processing}>
                                Enregistrer l'achat
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-4xl">
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle>Modifier l'achat de carburant</DialogTitle>
                            <DialogDescription>Modifiez les informations de l'achat sélectionné.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Date d'achat</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={'outline'}
                                                className={cn(
                                                    'w-full justify-start text-left font-normal',
                                                    !data.purchase_date && 'text-muted-foreground',
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {data.purchase_date ? (
                                                    format(new Date(data.purchase_date), 'dd MMMM yyyy', { locale: fr })
                                                ) : (
                                                    <span>Choisir une date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={data.purchase_date ? new Date(data.purchase_date) : undefined}
                                                onSelect={(d) => setData('purchase_date', d ? format(d, 'yyyy-MM-dd') : '')}
                                                initialFocus
                                                locale={fr}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {errors.purchase_date && <p className="text-sm text-destructive">{errors.purchase_date}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_depot_id">Dépôt</Label>
                                    <Popover open={isDepotComboboxOpen} onOpenChange={setIsDepotComboboxOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={isDepotComboboxOpen}
                                                className="w-full justify-between"
                                            >
                                                {data.depot_id ? depots.find((d) => d.id.toString() === data.depot_id)?.name : 'Sélectionner un dépôt...'}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                            <Command>
                                                <CommandInput placeholder="Rechercher un dépôt..." />
                                                <CommandList>
                                                    <CommandEmpty>Aucun dépôt trouvé.</CommandEmpty>
                                                    <CommandGroup>
                                                        {depots.map((depot) => (
                                                            <CommandItem
                                                                key={depot.id}
                                                                value={depot.name}
                                                                onSelect={() => {
                                                                    setData((prev) => ({
                                                                        ...prev,
                                                                        depot_id: depot.id.toString(),
                                                                        compartment_id: '',
                                                                        product: '',
                                                                    }));
                                                                    setIsDepotComboboxOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        'mr-2 h-4 w-4',
                                                                        data.depot_id === depot.id.toString() ? 'opacity-100' : 'opacity-0',
                                                                    )}
                                                                />
                                                                {depot.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    {errors.depot_id && <p className="text-sm text-destructive">{errors.depot_id}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_compartment_id">Compartiment (Produit)</Label>
                                    <Select
                                        value={data.compartment_id}
                                        onValueChange={(v) => {
                                            const comp = selectedDepot?.compartments?.find((c) => c.id.toString() === v);
                                            setData((prev) => ({
                                                ...prev,
                                                compartment_id: v,
                                                product: comp?.product || '',
                                            }));
                                        }}
                                        disabled={!data.depot_id}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={data.depot_id ? 'Sélectionner un compartiment' : 'Sélectionnez d’abord un dépôt'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedDepot?.compartments?.map((comp) => (
                                                <SelectItem key={comp.id} value={comp.id.toString()}>
                                                    {comp.product} (Actuel: {formatNumber(comp.quantity || 0)} L)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.compartment_id && <p className="text-sm text-destructive">{errors.compartment_id}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_quantity">Quantité (Litres)</Label>
                                    <Input
                                        id="edit_quantity"
                                        type="number"
                                        value={data.quantity}
                                        onChange={(e) => setData('quantity', parseFloat(e.target.value))}
                                    />
                                    {errors.quantity && <p className="text-sm text-destructive">{errors.quantity}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_unit_price">Prix Unitaire (FCFA)</Label>
                                    <Input
                                        id="edit_unit_price"
                                        type="number"
                                        value={data.unit_price}
                                        onChange={(e) => setData('unit_price', parseFloat(e.target.value))}
                                    />
                                    {errors.unit_price && <p className="text-sm text-destructive">{errors.unit_price}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_total_price">Prix Total (FCFA)</Label>
                                    <Input
                                        id="edit_total_price"
                                        type="number"
                                        value={data.total_price}
                                        readOnly
                                        className="bg-muted"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={processing}>
                                Enregistrer les modifications
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Supprimer l'achat</DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer cet achat ? La quantité sera déduite du stock du compartiment.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={processing}>
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

AchatCarburant.layout = {
    breadcrumbs: [
        { title: 'Finances', href: '#' },
        { title: 'Achat de carburant', href: achatCarburant.index().url },
    ],
};
