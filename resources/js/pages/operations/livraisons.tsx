import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    ArrowUpDown,
    CalendarIcon,
    ChevronsUpDown,
    Download,
    Edit,
    Filter,
    MoreHorizontal,
    Search,
    Trash,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

import AlertError from '@/components/alert-error';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { SimpleAutocomplete } from '@/components/ui/simple-autocomplete';
import { cn, formatNumber } from '@/lib/utils';
import * as operations from '@/routes/operations';

interface Client {
    id: number;
    nom: string;
}

interface Depot {
    name: string;
}

interface Compartment {
    product: string;
}

interface Load {
    id: number;
    load_date: string;
    load_location: string | null;
    product: string;
    volume: number;
    vehicle_registration: string;
    unload_date: string;
    unload_location: string;
    status: string;
    unit_price?: number | null;
    client_id: number | null;
    client: Client | null;
    depot?: Depot | null;
    compartment?: Compartment | null;
}

interface StatByProduct {
    product: string;
    count: number;
    volume: number;
}

interface Props {
    deliveries: Load[];
    clients: Client[];
    paymentMethods?: any[];
    stats: {
        by_product: StatByProduct[];
        total_loads: number;
        total_volume: number;
    };
    filters: {
        product?: string;
        date_from?: string;
        date_to?: string;
        load_locations?: string | string[];
    };
    distinct_locations: string[];
}

export default function Livraisons({
    deliveries = [],
    clients = [],
    filters,
    distinct_locations = [],
    stats,
}: Props) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<Load | null>(null);

    const initialDateRange: DateRange | undefined = useMemo(() => {
        if (filters.date_from && filters.date_to) {
            return {
                from: new Date(filters.date_from),
                to: new Date(filters.date_to),
            };
        }

        return undefined;
    }, [filters.date_from, filters.date_to]);

    const initialLocations: string[] = useMemo(() => {
        if (!filters.load_locations) {
            return [];
        }

        return Array.isArray(filters.load_locations)
            ? filters.load_locations
            : filters.load_locations.split(',');
    }, [filters.load_locations]);

    const [localFilters, setLocalFilters] = useState({
        product: filters.product || '',
        dateRange: initialDateRange,
        load_locations: initialLocations,
    });

    const columns = useMemo<ColumnDef<Load>[]>(
        () => [
            {
                accessorKey: 'unload_date',
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === 'asc')
                        }
                    >
                        Date Livraison
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) =>
                    row.original.unload_date
                        ? format(
                              new Date(row.original.unload_date),
                              'dd/MM/yyyy',
                          )
                        : '-',
            },
            {
                accessorKey: 'vehicle_registration',
                header: 'Véhicule',
                cell: ({ row }) => (
                    <div className="font-medium">
                        {row.original.vehicle_registration}
                    </div>
                ),
            },
            {
                accessorKey: 'load_location',
                header: 'Lieu Chargement',
            },
            {
                accessorKey: 'client.nom',
                header: 'Client',
                cell: ({ row }) => row.original.client?.nom || '-',
            },
            {
                accessorKey: 'product',
                header: 'Produit',
                cell: ({ row }) =>
                    row.original.compartment?.product ||
                    row.original.product ||
                    '-',
            },
            {
                accessorKey: 'depot.name',
                header: 'Dépôt',
                cell: ({ row }) => row.original.depot?.name || '-',
            },
            {
                accessorKey: 'volume',
                header: 'Volume',
                cell: ({ row }) => formatNumber(row.original.volume) + ' L',
            },
            {
                accessorKey: 'unload_location',
                header: 'Lieu Livraison',
            },
            {
                accessorKey: 'status',
                header: 'Statut',
                cell: ({ row }) => {
                    const status = row.original.status;

                    return (
                        <div
                            className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                status === 'FACTURER ET PAYER'
                                    ? 'bg-green-100 text-green-800'
                                    : status === 'FACTURER'
                                      ? 'bg-orange-100 text-orange-800'
                                      : status === 'LIVRER'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-gray-100 text-gray-800',
                            )}
                        >
                            {status}
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                cell: ({ row }) => {
                    const delivery = row.original;

                    return (
                        <div className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>
                                        Actions
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() => openEditModal(delivery)}
                                    >
                                        <Edit className="mr-2 h-4 w-4" />{' '}
                                        Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            openDeleteModal(delivery)
                                        }
                                        className="text-destructive"
                                    >
                                        <Trash className="mr-2 h-4 w-4" />{' '}
                                        Annuler Livraison
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

    const {
        data,
        setData,
        put,
        delete: destroy,
        processing,
        errors,
        clearErrors,
    } = useForm({
        unload_date: '',
        unload_location: '',
        client_id: '',
        client_name: '',
    });

    const openEditModal = (delivery: Load) => {
        setSelectedDelivery(delivery);
        setData({
            unload_date: delivery.unload_date
                ? format(new Date(delivery.unload_date), 'yyyy-MM-dd')
                : '',
            unload_location: delivery.unload_location || '',
            client_id: delivery.client_id?.toString() || '',
            client_name: delivery.client?.nom || '',
        });
        clearErrors();
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (delivery: Load) => {
        setSelectedDelivery(delivery);
        setIsDeleteModalOpen(true);
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedDelivery) {
            return;
        }

        put(operations.default.livraisons.update(selectedDelivery.id).url, {
            onSuccess: () => {
                setIsEditModalOpen(false);
                toast.success('Livraison mise à jour avec succès');
            },
        });
    };

    const handleDelete = () => {
        if (!selectedDelivery) {
            return;
        }

        destroy(
            operations.default.livraisons.destroy(selectedDelivery.id).url,
            {
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    toast.success('Livraison annulée avec succès');
                },
            },
        );
    };

    const applyFilters = () => {
        router.get(
            operations.default.livraisons.index().url,
            {
                product: localFilters.product,
                date_from: localFilters.dateRange?.from
                    ? format(localFilters.dateRange.from, 'yyyy-MM-dd')
                    : '',
                date_to: localFilters.dateRange?.to
                    ? format(localFilters.dateRange.to, 'yyyy-MM-dd')
                    : '',
                load_locations:
                    localFilters.load_locations.length > 0
                        ? localFilters.load_locations.join(',')
                        : '',
            },
            { preserveState: true, replace: true },
        );
    };

    const resetFilters = () => {
        setLocalFilters({
            product: '',
            dateRange: undefined,
            load_locations: [],
        });
        router.get(
            operations.default.livraisons.index().url,
            {},
            { preserveState: true, replace: true },
        );
    };

    const toggleLocationFilter = (location: string) => {
        setLocalFilters((prev) => {
            const isSelected = prev.load_locations.includes(location);

            if (isSelected) {
                return {
                    ...prev,
                    load_locations: prev.load_locations.filter(
                        (l) => l !== location,
                    ),
                };
            } else {
                return {
                    ...prev,
                    load_locations: [...prev.load_locations, location],
                };
            }
        });
    };

    const allProducts = useMemo(() => {
        const products = new Set<string>();
        deliveries.forEach((d) => products.add(d.product));

        return Array.from(products);
    }, [deliveries]);

    return (
        <>
            <Head title="Livraisons" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        Liste des livraisons
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                const params = new URLSearchParams();

                                if (localFilters.product) {
                                    params.append(
                                        'product',
                                        localFilters.product,
                                    );
                                }

                                if (localFilters.dateRange?.from) {
                                    params.append(
                                        'date_from',
                                        format(
                                            localFilters.dateRange.from,
                                            'yyyy-MM-dd',
                                        ),
                                    );
                                }

                                if (localFilters.dateRange?.to) {
                                    params.append(
                                        'date_to',
                                        format(
                                            localFilters.dateRange.to,
                                            'yyyy-MM-dd',
                                        ),
                                    );
                                }

                                if (localFilters.load_locations.length > 0) {
                                    params.append(
                                        'load_locations',
                                        localFilters.load_locations.join(','),
                                    );
                                }

                                window.open(
                                    operations.default.livraisons.download()
                                        .url +
                                        '?' +
                                        params.toString(),
                                    '_blank',
                                );
                            }}
                        >
                            <Download className="mr-2 h-4 w-4" /> Export PDF
                        </Button>
                    </div>
                </div>

                <Card className="p-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="filter-product">Produit</Label>
                            <Select
                                value={localFilters.product}
                                onValueChange={(v) =>
                                    setLocalFilters((prev) => ({
                                        ...prev,
                                        product: v,
                                    }))
                                }
                            >
                                <SelectTrigger id="filter-product">
                                    <SelectValue placeholder="Tous les produits" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value=" ">
                                        Tous les produits
                                    </SelectItem>
                                    {allProducts.map((p) => (
                                        <SelectItem key={p} value={p}>
                                            {p}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label>Période de livraison</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={'outline'}
                                        className={cn(
                                            'w-full justify-start text-left font-normal',
                                            !localFilters.dateRange &&
                                                'text-muted-foreground',
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {localFilters.dateRange?.from ? (
                                            localFilters.dateRange.to ? (
                                                <>
                                                    {format(
                                                        localFilters.dateRange
                                                            .from,
                                                        'dd/MM/yy',
                                                        { locale: fr },
                                                    )}{' '}
                                                    -{' '}
                                                    {format(
                                                        localFilters.dateRange
                                                            .to,
                                                        'dd/MM/yy',
                                                        { locale: fr },
                                                    )}
                                                </>
                                            ) : (
                                                format(
                                                    localFilters.dateRange.from,
                                                    'dd/MM/yy',
                                                    { locale: fr },
                                                )
                                            )
                                        ) : (
                                            <span>Choisir une période</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                >
                                    <Calendar
                                        mode="range"
                                        defaultMonth={
                                            localFilters.dateRange?.from
                                        }
                                        selected={localFilters.dateRange}
                                        onSelect={(range) =>
                                            setLocalFilters((prev) => ({
                                                ...prev,
                                                dateRange: range,
                                            }))
                                        }
                                        numberOfMonths={2}
                                        locale={fr}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label>Lieux de chargement</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-between"
                                    >
                                        <div className="flex items-center">
                                            <Filter className="mr-2 h-4 w-4" />
                                            {localFilters.load_locations
                                                .length > 0
                                                ? `${localFilters.load_locations.length} lieu(x) sélectionné(s)`
                                                : 'Tous les lieux'}
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-64 p-0"
                                    align="start"
                                >
                                    <div className="space-y-2 p-2">
                                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                            Lieux disponibles
                                        </div>
                                        <div className="max-h-60 space-y-1 overflow-y-auto">
                                            {distinct_locations.length > 0 ? (
                                                distinct_locations.map(
                                                    (location) => (
                                                        <div
                                                            key={location}
                                                            className="flex cursor-pointer items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent"
                                                            onClick={() =>
                                                                toggleLocationFilter(
                                                                    location,
                                                                )
                                                            }
                                                        >
                                                            <Checkbox
                                                                checked={localFilters.load_locations.includes(
                                                                    location,
                                                                )}
                                                            />
                                                            <span className="text-sm">
                                                                {location}
                                                            </span>
                                                        </div>
                                                    ),
                                                )
                                            ) : (
                                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                    Aucun lieu disponible
                                                </div>
                                            )}
                                        </div>
                                    </div>
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

                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                    <Card className="p-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium tracking-wider text-muted-foreground uppercase">
                                Total Livraisons
                            </span>
                            <span className="text-2xl font-bold">
                                {stats.total_loads}
                            </span>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium tracking-wider text-muted-foreground uppercase">
                                Volume Total
                            </span>
                            <span className="text-2xl font-bold">
                                {formatNumber(stats.total_volume)} L
                            </span>
                        </div>
                    </Card>
                    {stats.by_product.map((s) => (
                        <Card key={s.product} className="p-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium tracking-wider text-muted-foreground uppercase">
                                    {s.product}
                                </span>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-2xl font-bold">
                                        {s.count} Véhs
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatNumber(s.volume)} L
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                <DataTable
                    columns={columns}
                    data={deliveries}
                    searchKey="vehicle_registration"
                    searchPlaceholder="Rechercher par immatriculation..."
                    hidePagination
                    showNumbering={true}
                />
            </div>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-md">
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle>Modifier la livraison</DialogTitle>
                        </DialogHeader>

                        {Object.keys(errors).length > 0 && (
                            <div className="px-6 pt-4">
                                <AlertError errors={Object.values(errors)} />
                            </div>
                        )}

                        <div className="grid gap-4 px-6 py-4">
                            <div className="space-y-2">
                                <Label>Date de livraison</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={'outline'}
                                            className="w-full justify-start text-left font-normal"
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {data.unload_date ? (
                                                format(
                                                    new Date(data.unload_date),
                                                    'dd MMMM yyyy',
                                                    { locale: fr },
                                                )
                                            ) : (
                                                <span>Choisir une date</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={
                                                data.unload_date
                                                    ? new Date(data.unload_date)
                                                    : undefined
                                            }
                                            onSelect={(d) =>
                                                setData(
                                                    'unload_date',
                                                    d
                                                        ? format(
                                                              d,
                                                              'yyyy-MM-dd',
                                                          )
                                                        : '',
                                                )
                                            }
                                            locale={fr}
                                        />
                                    </PopoverContent>
                                </Popover>
                                {errors.unload_date && (
                                    <p className="text-sm text-destructive">
                                        {errors.unload_date}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit_unload_location">
                                    Lieu de livraison
                                </Label>
                                <Input
                                    id="edit_unload_location"
                                    value={data.unload_location}
                                    onChange={(e) =>
                                        setData(
                                            'unload_location',
                                            e.target.value,
                                        )
                                    }
                                />
                                {errors.unload_location && (
                                    <p className="text-sm text-destructive">
                                        {errors.unload_location}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit_client_id">Client</Label>
                                <SimpleAutocomplete
                                    options={clients.map((c) => ({
                                        value: c.id.toString(),
                                        label: c.nom,
                                    }))}
                                    value={data.client_id || ''}
                                    onValueChange={(v) =>
                                        setData('client_id', v)
                                    }
                                    onLabelChange={(l) =>
                                        setData('client_name', l)
                                    }
                                    placeholder="Sélectionner un client..."
                                    emptyMessage="Aucun client trouvé."
                                />
                                {errors.client_id && (
                                    <p className="text-sm text-destructive">
                                        {errors.client_id}
                                    </p>
                                )}
                                {errors.client_name && (
                                    <p className="text-sm text-destructive">
                                        {errors.client_name}
                                    </p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditModalOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" disabled={processing}>
                                Enregistrer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <Dialog
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Annuler la livraison</DialogTitle>
                        <DialogDescription>
                            Voulez-vous vraiment annuler cette livraison ? Le
                            véhicule repassera en statut "EN COURS".
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={processing}
                        >
                            Confirmer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Livraisons.layout = {
    breadcrumbs: [
        { title: 'Opérations', href: '#' },
        {
            title: 'Livraisons',
            href: operations.default.livraisons.index().url,
        },
    ],
};
