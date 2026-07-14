import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    ArrowUpDown,
    Banknote,
    Calendar as CalendarDays,
    CalendarIcon,
    Check,
    CheckCircle2,
    ChevronRight,
    ChevronsUpDown,
    CreditCard,
    Download,
    Edit,
    FileText,
    Filter,
    MoreHorizontal,
    Plus,
    ReceiptText,
    Search,
    Trash,
    Truck,
    User,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';
import { SimpleAutocomplete } from '@/components/ui/simple-autocomplete';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn, formatNumber } from '@/lib/utils';
import * as finances from '@/routes/finances';
import * as operations from '@/routes/operations';

interface City {
    id: number;
    name: string;
}

interface Client {
    id: number;
    nom: string;
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
}

interface StatByProduct {
    product: string;
    count: number;
    volume: number;
}

interface Props {
    deliveries: Load[];
    cities: City[];
    clients: Client[];
    paymentMethods: string[];
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
    deliveries,
    clients,
    paymentMethods,
    filters,
    distinct_locations,
    stats,
}: Props) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [allClientLoads, setAllClientLoads] = useState<Load[]>([]);
    const [selectedDelivery, setSelectedDelivery] = useState<Load | null>(null);
    const [selectedRows, setSelectedRows] = useState<Load[]>([]);
    const [advances, setAdvances] = useState<any[]>([]);

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
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => {
                    const status = row.original.status;
                    const canBeInvoiced =
                        status === 'LIVRER' || status === 'FACTURER';

                    return (
                        <Checkbox
                            checked={row.getIsSelected()}
                            onCheckedChange={(value) =>
                                row.toggleSelected(!!value)
                            }
                            disabled={!canBeInvoiced}
                            aria-label="Select row"
                        />
                    );
                },
                enableSorting: false,
                enableHiding: false,
            },
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

    const invoiceForm = useForm({
        client_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        items: [] as any[],
        total_amount: 0,
        total_missing: 0,
    });

    useEffect(() => {
        if (selectedRows.length > 0) {
            const firstClient = selectedRows[0].client_id?.toString() || '';
            const allSameClient = selectedRows.every(
                (r) => (r.client_id?.toString() || '') === firstClient,
            );

            const items = selectedRows.map((row) => ({
                load_id: row.id,
                vehicle_registration: row.vehicle_registration,
                product: row.product,
                quantity_delivered: row.volume,
                unit_price: 0,
                missing_quantity: 0,
                total: 0,
            }));

            invoiceForm.setData((prev: any) => ({
                ...prev,
                client_id: allSameClient ? firstClient : '',
                items: items,
            }));
        }
    }, [selectedRows]);

    const handleUnitPriceChange = (index: number, price: number) => {
        const newItems = [...invoiceForm.data.items];
        newItems[index].unit_price = price;
        newItems[index].total = price * newItems[index].quantity_delivered;

        invoiceForm.setData('items', newItems);

        const total = newItems.reduce((acc, item) => acc + item.total, 0);
        invoiceForm.setData('total_amount', total);
    };

    const handleInvoiceMissingQuantityChange = (
        index: number,
        missing: number,
    ) => {
        const newItems = [...invoiceForm.data.items];
        newItems[index].missing_quantity = missing;
        invoiceForm.setData('items', newItems);

        const totalMissing = newItems.reduce(
            (acc, item) => acc + (item.missing_quantity || 0),
            0,
        );
        invoiceForm.setData('total_missing', totalMissing);
    };

    const handleInvoiceSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        invoiceForm.post(finances.default.factureChargement.store().url, {
            onSuccess: () => {
                setIsInvoiceModalOpen(false);
                setSelectedRows([]);
                toast.success('Facture générée avec succès');
            },
        });
    };

    const paymentForm = useForm({
        client_id: '',
        delivery_ids: [] as number[],
        amount: 0,
        payment_method: 'Chèque',
        date: format(new Date(), 'yyyy-MM-dd'),
        reference: '',
        note: '',
        use_advance: false,
        advance_id: '',
        is_new_advance: false,
        missing_quantities: {} as Record<number, number>,
    });

    useEffect(() => {
        if (isPaymentModalOpen && paymentForm.data.client_id) {
            const clientId = Number(paymentForm.data.client_id);

            fetch(finances.default.reglements.advances(clientId).url)
                .then((res) => res.json())
                .then((data) => setAdvances(data.advances || []));

            fetch(
                `${operations.default.livraisons.index().url}?client_id=${clientId}&status=LIVRER,FACTURER`,
                {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                },
            )
                .then((res) => res.json())
                .then((data) => {
                    const loads = Array.isArray(data)
                        ? data
                        : data.deliveries || [];

                    setAllClientLoads(loads);
                });
        }
    }, [isPaymentModalOpen, paymentForm.data.client_id]);

    const filteredClientLoads = useMemo(() => {
        const ids = paymentForm.data.delivery_ids;

        return allClientLoads.filter(
            (load) =>
                !ids.includes(load.id) &&
                (load.vehicle_registration
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                    load.product
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())),
        );
    }, [allClientLoads, paymentForm.data.delivery_ids, searchTerm]);

    const selectedLoadsList = useMemo(() => {
        const ids = paymentForm.data.delivery_ids;
        // Merge initially selected rows with potential additional loads from allClientLoads
        const initialMap = new Map(selectedRows.map((r) => [r.id, r]));
        const allMap = new Map(allClientLoads.map((r) => [r.id, r]));

        return ids
            .map((id) => allMap.get(id) || initialMap.get(id))
            .filter(Boolean) as Load[];
    }, [allClientLoads, paymentForm.data.delivery_ids, selectedRows]);

    const totalSelectedAmount = useMemo(() => {
        return selectedLoadsList.reduce((total, load) => {
            const missing = paymentForm.data.missing_quantities[load.id] || 0;
            const unitPrice = Number(load.unit_price ?? 0);

            return total + Math.max(load.volume - missing, 0) * unitPrice;
        }, 0);
    }, [selectedLoadsList, paymentForm.data.missing_quantities]);

    useEffect(() => {
        if (
            currentStep === 3 &&
            paymentForm.data.amount === 0 &&
            totalSelectedAmount > 0
        ) {
            paymentForm.setData('amount', totalSelectedAmount);
        }
    }, [currentStep, totalSelectedAmount]);

    const openPaymentModal = () => {
        if (selectedRows.length === 0) {
            return;
        }

        const firstClient = selectedRows[0].client_id;
        const allSameClient = selectedRows.every(
            (r) => r.client_id === firstClient,
        );

        if (!allSameClient) {
            toast.error(
                'Toutes les livraisons sélectionnées doivent appartenir au même client',
            );

            return;
        }

        if (!firstClient) {
            toast.error(
                'Le client doit être défini pour les livraisons sélectionnées',
            );

            return;
        }

        paymentForm.setData((prev: any) => ({
            ...prev,
            client_id: firstClient.toString(),
            delivery_ids: selectedRows.map((r) => r.id),
            amount: 0, // Recalculated based on selection
        }));
        setSearchTerm('');

        setCurrentStep(1);
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);

            return;
        }

        paymentForm.post(finances.default.reglements.store().url, {
            onSuccess: () => {
                setIsPaymentModalOpen(false);
                setSelectedRows([]);
                paymentForm.reset();
                toast.success('Règlement enregistré avec succès');
            },
        } as any);
    };

    const addLoadToPayment = (load: Load) => {
        paymentForm.setData('delivery_ids', [
            ...paymentForm.data.delivery_ids,
            load.id,
        ]);
    };

    const removeLoadFromPayment = (loadId: number) => {
        paymentForm.setData(
            'delivery_ids',
            paymentForm.data.delivery_ids.filter((id) => id !== loadId),
        );
    };

    const handleMissingQuantityChange = (loadId: number, value: string) => {
        const numValue = parseFloat(value) || 0;
        paymentForm.setData('missing_quantities' as any, {
            ...(paymentForm.data as any).missing_quantities,
            [loadId]: numValue,
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
                                    params.append('product', localFilters.product);
                                }

                                if (localFilters.dateRange?.from) {
                                    params.append('date_from', format(localFilters.dateRange.from, 'yyyy-MM-dd'));
                                }

                                if (localFilters.dateRange?.to) {
                                    params.append('date_to', format(localFilters.dateRange.to, 'yyyy-MM-dd'));
                                }

                                if (localFilters.load_locations.length > 0) {
                                    params.append('load_locations', localFilters.load_locations.join(','));
                                }

                                window.open(operations.default.livraisons.download().url + '?' + params.toString(), '_blank');
                            }}
                        >
                            <Download className="mr-2 h-4 w-4" /> Export PDF
                        </Button>
                        {selectedRows.length > 0 && (
                            <div className="flex gap-2">
                                <Button onClick={() => setIsInvoiceModalOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" /> Créer une
                                    facture ({selectedRows.length})
                                </Button>
                                <Button
                                    onClick={openPaymentModal}
                                    className="bg-green-600 text-white hover:bg-green-700"
                                >
                                    <Banknote className="mr-2 h-4 w-4" /> Saisir un
                                    règlement ({selectedRows.length})
                                </Button>
                            </div>
                        )}
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
                                        initialFocus
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
                                                                readOnly
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
                    onRowSelectionChange={setSelectedRows}
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
                        <div className="grid gap-4 py-4">
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
                                            initialFocus
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

            {/* Payment Modal */}
            <Dialog
                open={isPaymentModalOpen}
                onOpenChange={setIsPaymentModalOpen}
            >
                <DialogContent
                    className={cn(
                        'w-[calc(100vw-2rem)] overflow-hidden border-none p-0 shadow-2xl transition-all duration-300',
                        currentStep === 2 ? 'sm:max-w-7xl' : 'sm:max-w-5xl',
                    )}
                >
                    <form onSubmit={handlePaymentSubmit}>
                        <div className="bg-slate-900 p-6 text-white">
                            <div className="mb-8 flex items-center justify-between">
                                <div>
                                    <h2 className="flex items-center gap-2 text-xl font-bold">
                                        <CreditCard className="h-5 w-5 text-blue-400" />
                                        Règlement Livraisons
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-400">
                                        Saisie d'un nouveau règlement client
                                    </p>
                                </div>
                                <Badge
                                    variant="outline"
                                    className="border-slate-700 text-slate-300"
                                >
                                    Étape {currentStep} sur 3
                                </Badge>
                            </div>

                            <div className="relative flex justify-between">
                                <div className="absolute top-1/2 left-0 z-0 h-0.5 w-full -translate-y-1/2 bg-slate-800" />
                                {[
                                    {
                                        step: 1,
                                        label: 'Infos de base',
                                        icon: FileText,
                                    },
                                    {
                                        step: 2,
                                        label: 'Livraisons',
                                        icon: Truck,
                                    },
                                    {
                                        step: 3,
                                        label: 'Confirmation',
                                        icon: CheckCircle2,
                                    },
                                ].map((stepItem) => (
                                    <div
                                        key={stepItem.step}
                                        className="relative z-10 flex flex-col items-center gap-2"
                                    >
                                        <div
                                            className={cn(
                                                'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                                                currentStep === stepItem.step
                                                    ? 'border-blue-400 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]'
                                                    : currentStep >
                                                        stepItem.step
                                                      ? 'border-green-400 bg-green-600'
                                                      : 'border-slate-700 bg-slate-900 text-slate-500',
                                            )}
                                        >
                                            {currentStep > stepItem.step ? (
                                                <Check className="h-5 w-5" />
                                            ) : (
                                                <stepItem.icon className="h-5 w-5" />
                                            )}
                                        </div>
                                        <span
                                            className={cn(
                                                'text-[10px] font-medium tracking-wider uppercase',
                                                currentStep === stepItem.step
                                                    ? 'text-blue-400'
                                                    : currentStep >
                                                        stepItem.step
                                                      ? 'text-green-400'
                                                      : 'text-slate-500',
                                            )}
                                        >
                                            {stepItem.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6">
                            {currentStep === 1 && (
                                <div className="animate-in space-y-6 duration-300 fade-in slide-in-from-bottom-4">
                                    <div className="space-y-4">
                                        <div className="mb-2 flex items-center gap-2 font-semibold text-blue-600">
                                            <User className="h-4 w-4" />
                                            Identification du Client
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-slate-600">
                                                Sélectionner le client
                                            </Label>
                                            <Select
                                                value={
                                                    paymentForm.data.client_id
                                                }
                                                onValueChange={(v) => {
                                                    paymentForm.setData(
                                                        (previous) => ({
                                                            ...previous,
                                                            client_id: v,
                                                            delivery_ids: [],
                                                            amount: 0,
                                                            advance_id: '',
                                                            missing_quantities:
                                                                {},
                                                        }),
                                                    );
                                                    setSearchTerm('');
                                                }}
                                            >
                                                <SelectTrigger className="h-12 border-slate-200">
                                                    <SelectValue placeholder="Choisir un client..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {clients.map((client) => (
                                                        <SelectItem
                                                            key={client.id}
                                                            value={client.id.toString()}
                                                        >
                                                            {client.nom}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Separator className="bg-slate-100" />

                                    <div className="space-y-4">
                                        <div className="mb-2 flex items-center gap-2 font-semibold text-blue-600">
                                            <CalendarDays className="h-4 w-4" />
                                            Détails du Paiement
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-600">
                                                    Date du règlement
                                                </Label>
                                                <Input
                                                    type="date"
                                                    value={
                                                        paymentForm.data.date
                                                    }
                                                    onChange={(e) =>
                                                        paymentForm.setData(
                                                            'date',
                                                            e.target.value,
                                                        )
                                                    }
                                                    required
                                                    className="h-11 border-slate-200"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-600">
                                                    Méthode de paiement
                                                </Label>
                                                <Select
                                                    value={
                                                        paymentForm.data
                                                            .payment_method
                                                    }
                                                    onValueChange={(v) =>
                                                        paymentForm.setData(
                                                            'payment_method',
                                                            v,
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="h-11 border-slate-200">
                                                        <SelectValue placeholder="Choisir..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {paymentMethods.map(
                                                            (method) => (
                                                                <SelectItem
                                                                    key={method}
                                                                    value={
                                                                        method
                                                                    }
                                                                >
                                                                    {method}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-600">
                                                    Référence (Chèque/Virement)
                                                </Label>
                                                <Input
                                                    value={
                                                        paymentForm.data
                                                            .reference
                                                    }
                                                    onChange={(e) =>
                                                        paymentForm.setData(
                                                            'reference',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Ex: CHQ-001..."
                                                    className="h-11 border-slate-200"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-600">
                                                    Montant total
                                                </Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        value={
                                                            paymentForm.data
                                                                .amount || ''
                                                        }
                                                        onChange={(e) =>
                                                            paymentForm.setData(
                                                                'amount',
                                                                Number(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                            )
                                                        }
                                                        required
                                                        className="h-11 border-slate-200 pr-12 font-bold text-blue-700"
                                                    />
                                                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                                                        CFA
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2 text-slate-600">
                                                <FileText className="h-3 w-3" />{' '}
                                                Note interne
                                            </Label>
                                            <Input
                                                value={paymentForm.data.note}
                                                onChange={(e) =>
                                                    paymentForm.setData(
                                                        'note',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Commentaire optionnel..."
                                                className="h-11 border-slate-200"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="use_advance_p"
                                                checked={
                                                    paymentForm.data.use_advance
                                                }
                                                onCheckedChange={(checked) => {
                                                    paymentForm.setData(
                                                        'use_advance',
                                                        !!checked,
                                                    );

                                                    if (checked) {
                                                        paymentForm.setData(
                                                            'is_new_advance',
                                                            false,
                                                        );
                                                    }
                                                }}
                                                className="border-blue-300 data-[state=checked]:bg-blue-600"
                                            />
                                            <Label
                                                htmlFor="use_advance_p"
                                                className="cursor-pointer font-medium text-blue-900"
                                            >
                                                Utiliser une avance existante
                                            </Label>
                                        </div>

                                        {paymentForm.data.use_advance && (
                                            <div className="animate-in duration-200 zoom-in-95">
                                                <Select
                                                    value={
                                                        paymentForm.data
                                                            .advance_id
                                                    }
                                                    onValueChange={(v) => {
                                                        paymentForm.setData(
                                                            'advance_id',
                                                            v,
                                                        );

                                                        const advance =
                                                            advances.find(
                                                                (item) =>
                                                                    item.id.toString() ===
                                                                    v,
                                                            );

                                                        if (advance) {
                                                            paymentForm.setData(
                                                                'amount',
                                                                advance.remaining,
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="h-11 border-blue-200 bg-white">
                                                        <SelectValue placeholder="Sélectionner une avance..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {advances.map(
                                                            (advance) => (
                                                                <SelectItem
                                                                    key={
                                                                        advance.id
                                                                    }
                                                                    value={advance.id.toString()}
                                                                >
                                                                    {advance.reference ||
                                                                        'Avance sans réf.'}{' '}
                                                                    -{' '}
                                                                    {formatNumber(
                                                                        advance.remaining,
                                                                    )}{' '}
                                                                    CFA
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                        {advances.length ===
                                                            0 && (
                                                            <SelectItem
                                                                value="none"
                                                                disabled
                                                            >
                                                                Aucune avance
                                                            </SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {!paymentForm.data.use_advance && (
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="is_new_advance_p"
                                                    checked={
                                                        paymentForm.data
                                                            .is_new_advance
                                                    }
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        paymentForm.setData(
                                                            'is_new_advance',
                                                            !!checked,
                                                        )
                                                    }
                                                    className="border-blue-300 data-[state=checked]:bg-blue-600"
                                                />
                                                <Label
                                                    htmlFor="is_new_advance_p"
                                                    className="cursor-pointer font-medium text-blue-900"
                                                >
                                                    Considérer comme un acompte
                                                    (Nouvelle avance)
                                                </Label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="animate-in space-y-4 duration-300 fade-in slide-in-from-right-4">
                                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-blue-600 p-2 text-white">
                                                <Truck className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">
                                                    Sélection des Livraisons
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Ajoutez les bons de
                                                    livraison concernés par ce
                                                    paiement
                                                </p>
                                            </div>
                                        </div>
                                        <div className="relative w-64">
                                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                placeholder="Rechercher..."
                                                className="h-10 bg-white pl-9"
                                                value={searchTerm}
                                                onChange={(e) =>
                                                    setSearchTerm(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid h-[450px] grid-cols-2 gap-6">
                                        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-3">
                                                <span className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                                                    Disponibles
                                                </span>
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-slate-200 text-slate-700"
                                                >
                                                    {filteredClientLoads.length}
                                                </Badge>
                                            </div>
                                            <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-2">
                                                {filteredClientLoads.map(
                                                    (load) => (
                                                        <div
                                                            key={load.id}
                                                            className="group relative cursor-pointer rounded-lg border border-slate-100 p-3 transition-all hover:border-blue-300 hover:bg-blue-50/30"
                                                            onClick={() =>
                                                                addLoadToPayment(
                                                                    load,
                                                                )
                                                            }
                                                        >
                                                            <div className="mb-1 flex items-start justify-between">
                                                                <span className="text-sm font-bold text-slate-900">
                                                                    {
                                                                        load.vehicle_registration
                                                                    }
                                                                </span>
                                                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                                                                    {formatNumber(
                                                                        load.volume,
                                                                    )}{' '}
                                                                    L
                                                                </span>
                                                            </div>
                                                            <p className="flex items-center gap-1 text-xs text-slate-500">
                                                                <ReceiptText className="h-3 w-3" />{' '}
                                                                {load.product}
                                                            </p>
                                                            <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400 italic">
                                                                <CalendarDays className="h-2.5 w-2.5" />{' '}
                                                                {load.unload_date
                                                                    ? format(
                                                                          new Date(
                                                                              load.unload_date,
                                                                          ),
                                                                          'dd/MM/yyyy',
                                                                      )
                                                                    : '-'}
                                                            </p>
                                                            <div className="absolute right-2 bottom-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                                <Plus className="h-5 w-5 text-blue-600" />
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                                {filteredClientLoads.length ===
                                                    0 && (
                                                    <div className="flex h-full flex-col items-center justify-center py-10 text-slate-400">
                                                        <Search className="mb-2 h-8 w-8 opacity-20" />
                                                        <p className="text-xs">
                                                            Aucune livraison
                                                            disponible
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col overflow-hidden rounded-xl border border-green-200 bg-green-50/10 shadow-sm">
                                            <div className="flex items-center justify-between border-b border-green-200 bg-green-50 p-3">
                                                <span className="text-xs font-bold tracking-wider text-green-700 uppercase">
                                                    Sélectionnés
                                                </span>
                                                <Badge className="border-none bg-green-600 text-white">
                                                    {selectedLoadsList.length}
                                                </Badge>
                                            </div>
                                            <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-2">
                                                {selectedLoadsList.map(
                                                    (load) => (
                                                        <div
                                                            key={load.id}
                                                            className="group relative rounded-lg border border-green-200 bg-white p-3 shadow-sm"
                                                        >
                                                            <div className="mb-2 flex items-start justify-between">
                                                                <div>
                                                                    <span className="text-sm font-bold text-slate-900">
                                                                        {
                                                                            load.vehicle_registration
                                                                        }
                                                                    </span>
                                                                    <p className="text-[10px] text-slate-500">
                                                                        {
                                                                            load.product
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-6 w-6 text-red-400 hover:bg-red-50 hover:text-red-600"
                                                                    onClick={() =>
                                                                        removeLoadFromPayment(
                                                                            load.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-100 bg-slate-50 p-2">
                                                                <div className="text-[10px]">
                                                                    <p className="tracking-tighter text-slate-400 uppercase">
                                                                        Volume
                                                                    </p>
                                                                    <p className="font-bold text-slate-700">
                                                                        {formatNumber(
                                                                            load.volume,
                                                                        )}{' '}
                                                                        L
                                                                    </p>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="text-[10px] tracking-tighter text-slate-400 uppercase">
                                                                        Manquant
                                                                        (L)
                                                                    </p>
                                                                    <Input
                                                                        type="number"
                                                                        className="h-6 border-green-200 bg-white text-[10px] focus-visible:ring-green-400"
                                                                        value={
                                                                            paymentForm
                                                                                .data
                                                                                .missing_quantities[
                                                                                load
                                                                                    .id
                                                                            ] ||
                                                                            ''
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            handleMissingQuantityChange(
                                                                                load.id,
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                                {selectedLoadsList.length ===
                                                    0 && (
                                                    <div className="flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 text-slate-400">
                                                        <Truck className="mb-2 h-8 w-8 opacity-10" />
                                                        <p className="text-xs">
                                                            Cliquez pour ajouter
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex shrink-0 items-center justify-between bg-green-600 p-3 font-bold text-white">
                                                <span className="text-[10px] uppercase">
                                                    Sous-total sélectionné
                                                </span>
                                                <span className="text-sm">
                                                    {formatNumber(
                                                        totalSelectedAmount,
                                                    )}{' '}
                                                    CFA
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="animate-in space-y-6 duration-300 zoom-in-95 fade-in">
                                    <div className="relative overflow-hidden rounded-2xl bg-blue-600 p-6 text-white shadow-lg shadow-blue-200">
                                        <div className="absolute -top-8 -right-8 opacity-10">
                                            <CheckCircle2 className="h-40 w-40" />
                                        </div>
                                        <div className="relative z-10">
                                            <p className="mb-2 text-xs font-medium tracking-widest text-blue-100 uppercase">
                                                Montant à encaisser
                                            </p>
                                            <h3 className="text-4xl font-black">
                                                {formatNumber(
                                                    paymentForm.data.amount,
                                                )}{' '}
                                                <span className="text-xl font-light">
                                                    CFA
                                                </span>
                                            </h3>

                                            <div className="mt-8 grid grid-cols-2 gap-8 border-t border-blue-500/30 pt-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="rounded-lg bg-blue-500/50 p-2">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] tracking-tighter text-blue-200 uppercase">
                                                            Client
                                                        </p>
                                                        <p className="max-w-[150px] truncate text-sm font-bold">
                                                            {
                                                                clients.find(
                                                                    (client) =>
                                                                        client.id.toString() ===
                                                                        paymentForm
                                                                            .data
                                                                            .client_id,
                                                                )?.nom
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="rounded-lg bg-blue-500/50 p-2">
                                                        <CalendarDays className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] tracking-tighter text-blue-200 uppercase">
                                                            Date
                                                        </p>
                                                        <p className="text-sm font-bold">
                                                            {format(
                                                                new Date(
                                                                    paymentForm
                                                                        .data
                                                                        .date,
                                                                ),
                                                                'dd MMMM yyyy',
                                                                { locale: fr },
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
                                                <CreditCard className="h-3.5 w-3.5 text-blue-500" />{' '}
                                                Mode & Référence
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-slate-900">
                                                    {
                                                        paymentForm.data
                                                            .payment_method
                                                    }
                                                </p>
                                                <p className="text-xs font-medium text-slate-500">
                                                    {paymentForm.data
                                                        .reference ||
                                                        'Aucune référence saisie'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
                                                <ReceiptText className="h-3.5 w-3.5 text-blue-500" />{' '}
                                                Type de règlement
                                            </div>
                                            <Badge
                                                variant={
                                                    paymentForm.data
                                                        .is_new_advance
                                                        ? 'destructive'
                                                        : 'default'
                                                }
                                                className="rounded-md"
                                            >
                                                {paymentForm.data.is_new_advance
                                                    ? 'AVANCE / ACOMPTE'
                                                    : 'RÈGLEMENT LIVRAISONS'}
                                            </Badge>
                                        </div>
                                    </div>

                                    {!paymentForm.data.is_new_advance && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                                    <Truck className="h-4 w-4 text-blue-500" />
                                                    Détail des Livraisons
                                                </h4>
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-slate-100 text-slate-600"
                                                >
                                                    {selectedLoadsList.length}
                                                </Badge>
                                            </div>
                                            <div className="custom-scrollbar max-h-40 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                                {selectedLoadsList.map(
                                                    (load) => (
                                                        <div
                                                            key={load.id}
                                                            className="flex items-center justify-between p-3 transition-colors hover:bg-slate-50"
                                                        >
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-900">
                                                                    {
                                                                        load.vehicle_registration
                                                                    }
                                                                </p>
                                                                <p className="text-[10px] text-slate-500 italic">
                                                                    {
                                                                        load.product
                                                                    }
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs font-bold text-blue-700">
                                                                    {formatNumber(
                                                                        load.volume,
                                                                    )}{' '}
                                                                    L
                                                                </p>
                                                                {paymentForm
                                                                    .data
                                                                    .missing_quantities[
                                                                    load.id
                                                                ] > 0 && (
                                                                    <p className="text-[9px] font-bold text-red-500 uppercase">
                                                                        Manquant:{' '}
                                                                        {
                                                                            paymentForm
                                                                                .data
                                                                                .missing_quantities[
                                                                                load
                                                                                    .id
                                                                            ]
                                                                        }{' '}
                                                                        L
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {paymentForm.data.note && (
                                        <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
                                            <p className="mb-1 text-[10px] font-bold tracking-widest text-yellow-700 uppercase">
                                                Note interne
                                            </p>
                                            <p className="text-sm text-yellow-900 italic">
                                                "{paymentForm.data.note}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-6">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() =>
                                    currentStep > 1
                                        ? setCurrentStep(currentStep - 1)
                                        : setIsPaymentModalOpen(false)
                                }
                                className="h-12 px-6 font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                            >
                                {currentStep > 1
                                    ? "Retour à l'étape précédente"
                                    : 'Abandonner'}
                            </Button>

                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    className={cn(
                                        'h-12 rounded-xl px-8 font-bold text-white shadow-lg transition-all duration-300',
                                        currentStep === 3
                                            ? 'bg-green-600 shadow-green-200 hover:bg-green-700'
                                            : 'bg-blue-600 shadow-blue-200 hover:bg-blue-700',
                                    )}
                                    disabled={
                                        paymentForm.processing ||
                                        (currentStep === 1 &&
                                            !paymentForm.data.client_id) ||
                                        (currentStep === 2 &&
                                            !paymentForm.data.is_new_advance &&
                                            selectedLoadsList.length === 0)
                                    }
                                >
                                    {paymentForm.processing ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            Traitement...
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {currentStep === 3
                                                ? 'Confirmer le règlement'
                                                : "Continuer vers l'étape suivante"}
                                            <ChevronRight className="h-4 w-4" />
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </div>
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

            {/* Invoice Modal */}
            <Dialog
                open={isInvoiceModalOpen}
                onOpenChange={setIsInvoiceModalOpen}
            >
                <DialogContent className="max-w-4xl">
                    <form onSubmit={handleInvoiceSubmit}>
                        <DialogHeader>
                            <DialogTitle>Créer une facture</DialogTitle>
                            <DialogDescription>
                                Générer une facture pour les livraisons
                                sélectionnées.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Client</Label>
                                    <SimpleAutocomplete
                                        options={clients.map((c) => ({
                                            value: c.id.toString(),
                                            label: c.nom,
                                        }))}
                                        value={invoiceForm.data.client_id}
                                        onValueChange={(v) =>
                                            invoiceForm.setData('client_id', v)
                                        }
                                        placeholder="Sélectionner un client..."
                                    />
                                    {invoiceForm.errors.client_id && (
                                        <p className="text-sm text-destructive">
                                            {invoiceForm.errors.client_id}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Date Facture</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={'outline'}
                                                className={cn(
                                                    'w-full justify-start text-left font-normal',
                                                    !invoiceForm.data.date &&
                                                        'text-muted-foreground',
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {invoiceForm.data.date ? (
                                                    format(
                                                        new Date(
                                                            invoiceForm.data
                                                                .date,
                                                        ),
                                                        'dd MMMM yyyy',
                                                        {
                                                            locale: fr,
                                                        },
                                                    )
                                                ) : (
                                                    <span>
                                                        Choisir une date
                                                    </span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={
                                                    invoiceForm.data.date
                                                        ? new Date(
                                                              invoiceForm.data
                                                                  .date,
                                                          )
                                                        : undefined
                                                }
                                                onSelect={(d) =>
                                                    invoiceForm.setData(
                                                        'date',
                                                        d
                                                            ? format(
                                                                  d,
                                                                  'yyyy-MM-dd',
                                                              )
                                                            : '',
                                                    )
                                                }
                                                initialFocus
                                                locale={fr}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {invoiceForm.errors.date && (
                                        <p className="text-sm text-destructive">
                                            {invoiceForm.errors.date}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Véhicule</TableHead>
                                            <TableHead>Produit</TableHead>
                                            <TableHead className="text-right">
                                                Volume
                                            </TableHead>
                                            <TableHead className="w-[120px]">
                                                Prix Unit.
                                            </TableHead>
                                            <TableHead className="w-[120px]">
                                                Manquant
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Total
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoiceForm.data.items.map(
                                            (item: any, index: number) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        {
                                                            item.vehicle_registration
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.product}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {formatNumber(
                                                            item.quantity_delivered,
                                                        )}{' '}
                                                        L
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            value={
                                                                item.unit_price
                                                            }
                                                            onChange={(e) =>
                                                                handleUnitPriceChange(
                                                                    index,
                                                                    Number(
                                                                        e.target
                                                                            .value,
                                                                    ),
                                                                )
                                                            }
                                                            className="h-8"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            value={
                                                                item.missing_quantity
                                                            }
                                                            onChange={(e) =>
                                                                handleInvoiceMissingQuantityChange(
                                                                    index,
                                                                    Number(
                                                                        e.target
                                                                            .value,
                                                                    ),
                                                                )
                                                            }
                                                            className="h-8"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {formatNumber(
                                                            item.total,
                                                        )}{' '}
                                                        CFA
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex flex-col items-end gap-2 pr-4">
                                <div className="flex w-64 justify-between border-b pb-2">
                                    <span className="text-sm font-medium">
                                        Total Manquant:
                                    </span>
                                    <span className="font-bold">
                                        {invoiceForm.data.total_missing} L
                                    </span>
                                </div>
                                <div className="flex w-64 justify-between text-lg">
                                    <span className="font-bold">
                                        Montant Total:
                                    </span>
                                    <span className="font-bold text-primary">
                                        {formatNumber(
                                            invoiceForm.data.total_amount,
                                        )}{' '}
                                        CFA
                                    </span>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsInvoiceModalOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={invoiceForm.processing}
                            >
                                Générer la facture
                            </Button>
                        </DialogFooter>
                    </form>
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
