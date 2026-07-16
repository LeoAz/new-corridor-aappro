import { Head, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Download, Filter, Search, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Autocomplete } from '@/components/ui/autocomplete';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatNumber, toUrl } from '@/lib/utils';
import * as reportsActions from '@/routes/rapports';

interface Load {
    id: number;
    unload_date: string;
    unload_location: string;
    product: string;
    volume: number;
    vehicle_registration: string;
    status: string;
    client: { id: number; nom: string };
    depot: { id: number; name: string };
}

interface Stats {
    total_trucks: number;
    total_volume: number;
    by_product: Record<string, { count: number; volume: number }>;
}

interface Props {
    loads: Load[];
    stats: Stats;
    clients: { id: number; nom: string }[];
    filters: {
        date_from: string;
        date_to: string;
        product: string;
        unload_location: string;
        client_id: string;
    };
}

export default function ReportLivraisons({ loads, stats, clients, filters }: Props) {
    const [dateFrom, setDateFrom] = useState<string>(filters?.date_from || '');
    const [dateTo, setDateTo] = useState<string>(filters?.date_to || '');
    const [product, setProduct] = useState<string>(filters?.product || 'all');
    const [unloadLocation, setUnloadLocation] = useState<string>(filters?.unload_location || '');
    const [clientId, setClientId] = useState<string>(filters?.client_id || 'all');

    const columns = useMemo<ColumnDef<Load>[]>(() => [
        {
            accessorKey: 'unload_date',
            header: 'Date',
            cell: ({ row }) => format(new Date(row.original.unload_date), 'dd/MM/yyyy'),
        },
        {
            accessorKey: 'client.nom',
            header: 'Client',
            cell: ({ row }) => row.original.client?.nom || '-',
        },
        {
            accessorKey: 'vehicle_registration',
            header: 'Véhicule',
            cell: ({ row }) => <span className="font-mono text-xs">{row.original.vehicle_registration}</span>,
        },
        {
            accessorKey: 'unload_location',
            header: 'Lieu',
            cell: ({ row }) => <span className="text-xs">{row.original.unload_location}</span>,
        },
        {
            accessorKey: 'status',
            header: 'Statut',
            cell: ({ row }) => (
                <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    row.original.status === 'FACTURER ET PAYER' ? 'bg-green-100 text-green-700' :
                    row.original.status === 'FACTURER' ? 'bg-orange-100 text-orange-700' :
                    row.original.status === 'LIVRER' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                )}>
                    {row.original.status}
                </span>
            ),
        },
        {
            accessorKey: 'volume',
            header: () => <div className="text-right">Volume</div>,
            cell: ({ row }) => <div className="text-right font-bold">{formatNumber(row.original.volume)} L</div>,
        },
    ], []);

    const handleFilter = () => {
        router.get(toUrl(reportsActions.default.livraisons()), {
            date_from: dateFrom,
            date_to: dateTo,
            product: product === 'all' ? '' : product,
            unload_location: unloadLocation,
            client_id: clientId === 'all' ? '' : clientId,
        }, { preserveState: true });
    };

    const handleDownload = () => {
        const url = new URL(toUrl(reportsActions.default.livraisons.download()), window.location.origin);

        if (dateFrom) {
            url.searchParams.append('date_from', dateFrom);
        }

        if (dateTo) {
            url.searchParams.append('date_to', dateTo);
        }

        if (product && product !== 'all') {
            url.searchParams.append('product', product);
        }

        if (unloadLocation) {
            url.searchParams.append('unload_location', unloadLocation);
        }

        if (clientId && clientId !== 'all') {
            url.searchParams.append('client_id', clientId);
        }

        window.location.href = url.toString();
    };

    return (
        <>
            <Head title="Rapport Livraisons" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground font-mono uppercase tracking-tight">Rapport des livraisons</h1>
                    <Button onClick={handleDownload} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Exporter PDF
                    </Button>
                </div>

                {/* Filtres */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                        <div className="space-y-2">
                            <Label>Date de début</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dateFrom && 'text-muted-foreground')}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateFrom ? format(new Date(dateFrom), 'dd MMMM yyyy', { locale: fr }) : 'Choisir une date'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dateFrom ? new Date(dateFrom) : undefined}
                                        onSelect={(date) => setDateFrom(date ? format(date, 'yyyy-MM-dd') : '')}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>Date de fin</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dateTo && 'text-muted-foreground')}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateTo ? format(new Date(dateTo), 'dd MMMM yyyy', { locale: fr }) : 'Choisir une date'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dateTo ? new Date(dateTo) : undefined}
                                        onSelect={(date) => setDateTo(date ? format(date, 'yyyy-MM-dd') : '')}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>Produit</Label>
                            <Select value={product} onValueChange={setProduct}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Tous les produits" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les produits</SelectItem>
                                    <SelectItem value="GASOIL">GASOIL</SelectItem>
                                    <SelectItem value="SUPER">SUPER</SelectItem>
                                    <SelectItem value="FUEL">FUEL</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Lieu de livraison</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Rechercher un lieu..."
                                    className="pl-9"
                                    value={unloadLocation}
                                    onChange={(e) => setUnloadLocation(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Client</Label>
                            <Autocomplete
                                options={[
                                    { value: 'all', label: 'Tous les clients' },
                                    ...clients.map((client) => ({
                                        value: client.id.toString(),
                                        label: client.nom,
                                    })),
                                ]}
                                value={clientId}
                                onValueChange={(value) => setClientId(value || 'all')}
                                placeholder="Sélectionner un client..."
                            />
                        </div>

                        <div className="flex items-end">
                            <Button onClick={handleFilter} className="w-full gap-2">
                                <Filter className="h-4 w-4" />
                                Filtrer
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Statistiques */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                <Truck className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Total Camions</span>
                        </div>
                        <div className="mt-2 text-2xl font-bold">{stats.total_trucks}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600">
                                <Truck className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Volume Total</span>
                        </div>
                        <div className="mt-2 text-2xl font-bold">{formatNumber(stats.total_volume)} L</div>
                    </div>
                    {Array.isArray(stats.by_product) ? stats.by_product.map((item: any) => (
                        <div key={item.product} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="text-sm font-bold text-foreground">{item.product}</div>
                            </div>
                            <div className="mt-1 flex justify-between">
                                <span className="text-xs text-muted-foreground">{item.count} camions</span>
                                <span className="text-xs font-bold text-foreground">{formatNumber(item.volume)} L</span>
                            </div>
                        </div>
                    )) : Object.entries(stats.by_product).map(([prod, data]: [string, any]) => (
                        <div key={prod} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="text-sm font-bold text-foreground">{prod}</div>
                            </div>
                            <div className="mt-1 flex justify-between">
                                <span className="text-xs text-muted-foreground">{data.count} camions</span>
                                <span className="text-xs font-bold text-foreground">{formatNumber(data.volume)} L</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Liste des livraisons */}
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={loads}
                        hidePagination={true}
                    />
                    {loads.length > 0 && (
                        <div className="bg-muted/50 border-t border-border p-4 flex justify-between items-center font-black">
                            <span className="uppercase tracking-wider text-xs">Total Général</span>
                            <span className="text-lg">{formatNumber(stats.total_volume)} L</span>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

ReportLivraisons.layout = {
    breadcrumbs: [
        { title: 'Rapports', href: '#' },
        { title: 'Livraisons', href: toUrl(reportsActions.default.livraisons()) },
    ],
};
