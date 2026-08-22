import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    ArrowUpDown,
    CalendarIcon,
    Check,
    ChevronsUpDown,
    Download,
    Edit,
    Filter,
    MoreHorizontal,
    Plus,
    Search,
    Trash,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { LOAD_STATUS } from '@/lib/load-status';
import { cn, formatNumber } from '@/lib/utils';
import * as operations from '@/routes/operations';
import type { City, Client, Compartment, Depot, Load } from '@/types';

import CreateLoadDialog from './chargements/CreateLoadDialog';
import DeleteLoadDialog from './chargements/DeleteLoadDialog';
import DeliverLoadDialog from './chargements/DeliverLoadDialog';
import EditLoadDialog from './chargements/EditLoadDialog';

interface StatByProduct {
    product: string;
    count: number;
    volume: number;
    remaining: number;
}

interface Props {
    loads: Load[];
    depots: Depot[];
    cities: City[];
    clients: Client[];
    compartments: Compartment[];
    stats: {
        by_product: StatByProduct[];
        total_loads: number;
        total_volume: number;
        total_remaining: number;
    };
    filters: {
        product?: string;
        date_from?: string;
        date_to?: string;
        load_locations?: string | string[];
    };
    distinct_locations: string[];
}

export default function Chargements({
    loads,
    depots,
    cities,
    clients,
    filters,
    distinct_locations,
    stats,
}: Props) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeliverModalOpen, setIsDeliverModalOpen] = useState(false);
    const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);

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
                        aria-label="Sélectionner tout"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Sélectionner la ligne"
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: 'load_date',
                header: ({ column }) => {
                    return (
                        <Button
                            variant="ghost"
                            onClick={() =>
                                column.toggleSorting(
                                    column.getIsSorted() === 'asc',
                                )
                            }
                        >
                            Date
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                cell: ({ row }) =>
                    format(new Date(row.getValue('load_date')), 'dd/MM/yyyy'),
            },
            {
                accessorKey: 'vehicle_registration',
                header: ({ column }) => {
                    return (
                        <Button
                            variant="ghost"
                            onClick={() =>
                                column.toggleSorting(
                                    column.getIsSorted() === 'asc',
                                )
                            }
                        >
                            Véhicule
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                cell: ({ row }) => (
                    <div className="font-medium">
                        {row.getValue('vehicle_registration')}
                    </div>
                ),
            },
            {
                accessorKey: 'product',
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === 'asc')
                        }
                    >
                        Produit
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) =>
                    row.original.compartment?.product ||
                    row.original.product ||
                    '-',
            },
            {
                accessorKey: 'volume',
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === 'asc')
                        }
                    >
                        Volume (Reste)
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <span>{formatNumber(row.original.volume)}</span>
                        {(row.original.status ===
                            LOAD_STATUS.LIVRE_PARTIELLEMENT ||
                            row.original.status === LOAD_STATUS.EN_COURS) && (
                            <span className="text-xs font-bold text-orange-600">
                                Reste:{' '}
                                {formatNumber(row.original.remaining_quantity)}
                            </span>
                        )}
                    </div>
                ),
            },
            {
                accessorKey: 'depot.name',
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === 'asc')
                        }
                    >
                        Dépôt
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => row.original.depot?.name,
            },
            {
                accessorKey: 'load_location',
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === 'asc')
                        }
                    >
                        Lieu
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
            },
            {
                id: 'actions',
                cell: ({ row }) => {
                    const load = row.original;

                    return (
                        <div className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                    >
                                        <span className="sr-only">
                                            Ouvrir le menu
                                        </span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>
                                        Actions
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() => openDeliverModal(load)}
                                    >
                                        <Check className="mr-2 h-4 w-4" />{' '}
                                        Livrer
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => openEditModal(load)}
                                    >
                                        <Edit className="mr-2 h-4 w-4" />{' '}
                                        Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => openDeleteModal(load)}
                                        className="text-destructive"
                                    >
                                        <Trash className="mr-2 h-4 w-4" />{' '}
                                        Supprimer
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
        post,
        put,
        delete: destroy,
        processing,
        errors,
        reset,
        clearErrors,
    } = useForm({
        load_date: format(new Date(), 'yyyy-MM-dd'),
        load_location: '',
        product: '',
        volume: 0,
        vehicle_registration: '',
        depot_id: '',
        city_id: '',
        client_id: '',
        compartment_id: '',
        client_name: '',
        unload_date: format(new Date(), 'yyyy-MM-dd'),
        unload_location: '',
    });

    const selectedDepot = useMemo(() => {
        return depots.find(
            (d) => d.id?.toString() === data.depot_id?.toString(),
        );
    }, [data.depot_id, depots]);

    const openCreateModal = () => {
        reset();
        clearErrors();
        setIsCreateModalOpen(true);
    };

    const openEditModal = (load: Load) => {
        setSelectedLoad(load);
        setData({
            load_date: format(new Date(load.load_date), 'yyyy-MM-dd'),
            load_location: load.load_location || '',
            product: load.product,
            volume: load.volume,
            vehicle_registration: load.vehicle_registration,
            depot_id: load.depot_id?.toString() || '',
            city_id: load.city_id?.toString() || '',
            client_id: load.client_id?.toString() || '',
            compartment_id: load.compartment_id?.toString() || '',
            client_name: load.client_name || '',
        });
        clearErrors();
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (load: Load) => {
        setSelectedLoad(load);
        setIsDeleteModalOpen(true);
    };

    const openDeliverModal = (load: Load) => {
        setSelectedLoad(load);
        setData({
            ...data,
            unload_date: format(new Date(), 'yyyy-MM-dd'),
            unload_location: load.city?.name || '',
            client_id: load.client_id?.toString() || '',
            client_name: load.client?.nom || '',
            volume: load.volume,
        });
        clearErrors();
        setIsDeliverModalOpen(true);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        post(operations.default.chargements.store().url, {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                toast.success('Chargement créé avec succès');
                reset();
            },
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedLoad) {
            return;
        }

        put(operations.default.chargements.update(selectedLoad.id).url, {
            onSuccess: () => {
                setIsEditModalOpen(false);
                toast.success('Chargement mis à jour avec succès');
            },
        });
    };

    const handleDelete = () => {
        if (!selectedLoad) {
            return;
        }

        destroy(operations.default.chargements.destroy(selectedLoad.id).url, {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                toast.success('Chargement supprimé avec succès');
            },
        });
    };

    const handleDeliver = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedLoad) {
            return;
        }

        post(operations.default.chargements.deliver(selectedLoad.id).url, {
            onSuccess: () => {
                setIsDeliverModalOpen(false);
                toast.success('Livraison effectuée avec succès');
            },
        });
    };

    const applyFilters = () => {
        router.get(
            operations.default.chargements.index().url,
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
            operations.default.chargements.index().url,
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
        depots.forEach((d) => {
            d.compartments?.forEach((c) => products.add(c.product));
        });

        return Array.from(products);
    }, [depots]);

    return (
        <>
            <Head title="Chargements" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        Chargements en cours
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
                                    operations.default.chargements.download()
                                        .url +
                                        '?' +
                                        params.toString(),
                                    '_blank',
                                );
                            }}
                        >
                            <Download className="mr-2 h-4 w-4" /> Export PDF
                        </Button>
                        <Button onClick={openCreateModal}>
                            <Plus className="mr-2 h-4 w-4" /> Nouveau chargement
                        </Button>
                    </div>
                </div>

                {/* Filters */}
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
                            <Label>Période de chargement</Label>
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
                                                <div className="px-2 py-1.5 text-sm text-muted-foreground italic">
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

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="p-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium tracking-wider text-muted-foreground uppercase">
                                Total Chargements
                            </span>
                            <span className="text-2xl font-bold">
                                {stats.total_loads}
                            </span>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium tracking-wider text-muted-foreground uppercase">
                                Volume Total (Reste)
                            </span>
                            <div className="flex items-baseline justify-between">
                                <span className="text-2xl font-bold">
                                    {formatNumber(stats.total_volume)} L
                                </span>
                                <span className="text-xs font-bold text-orange-600">
                                    Reste: {formatNumber(stats.total_remaining)}{' '}
                                    L
                                </span>
                            </div>
                        </div>
                    </Card>
                    {stats.by_product.map((s) => (
                        <Card key={s.product} className="p-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium tracking-wider text-muted-foreground uppercase">
                                    {s.product}
                                </span>
                                <div className="flex w-full flex-col gap-0.5">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-2xl font-bold">
                                            {s.count} Véhs
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Init: {formatNumber(s.volume)} L
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-bold text-orange-600">
                                            Dispo: {formatNumber(s.remaining)} L
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                <DataTable
                    columns={columns}
                    data={loads}
                    searchKey="vehicle_registration"
                    searchPlaceholder="Rechercher par immatriculation..."
                    hidePagination
                    showNumbering={true}
                />
            </div>

            <CreateLoadDialog
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                onSubmit={handleCreate}
                depots={depots}
                cities={cities}
                selectedDepot={selectedDepot}
                allProducts={allProducts}
            />

            <EditLoadDialog
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                onSubmit={handleUpdate}
                depots={depots}
                cities={cities}
                clients={clients}
                selectedDepot={selectedDepot}
                allProducts={allProducts}
            />

            <DeleteLoadDialog
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                processing={processing}
                onConfirm={handleDelete}
            />

            <DeliverLoadDialog
                open={isDeliverModalOpen}
                onOpenChange={setIsDeliverModalOpen}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                onSubmit={handleDeliver}
                clients={clients}
                selectedLoad={selectedLoad}
            />
        </>
    );
}

Chargements.layout = {
    breadcrumbs: [
        { title: 'Opérations', href: '#' },
        {
            title: 'Chargements',
            href: operations.default.chargements.index().url,
        },
    ],
};
