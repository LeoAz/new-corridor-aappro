import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Download, Filter, Package, Search, Truck } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatNumber, toUrl } from '@/lib/utils';
import * as reportsActions from '@/routes/rapports';

interface Load {
    id: number;
    load_date: string;
    load_location: string;
    product: string;
    volume: number;
    vehicle_registration: string;
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
    filters: {
        date_from: string;
        date_to: string;
        product: string;
        load_location: string;
    };
}

export default function ReportChargements({ loads, stats, filters }: Props) {
    const [dateFrom, setDateFrom] = useState<string>(filters?.date_from || '');
    const [dateTo, setDateTo] = useState<string>(filters?.date_to || '');
    const [product, setProduct] = useState<string>(filters?.product || 'all');
    const [loadLocation, setLoadLocation] = useState<string>(filters?.load_location || '');

    const handleFilter = () => {
        router.get(toUrl(reportsActions.default.chargements()), {
            date_from: dateFrom,
            date_to: dateTo,
            product: product === 'all' ? '' : product,
            load_location: loadLocation,
        }, { preserveState: true });
    };

    const handleDownload = () => {
        const url = new URL(toUrl(reportsActions.default.chargements.download()), window.location.origin);
        if (dateFrom) url.searchParams.append('date_from', dateFrom);
        if (dateTo) url.searchParams.append('date_to', dateTo);
        if (product && product !== 'all') url.searchParams.append('product', product);
        if (loadLocation) url.searchParams.append('load_location', loadLocation);
        window.location.href = url.toString();
    };

    return (
        <>
            <Head title="Rapport Chargements" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground font-mono uppercase tracking-tight">Rapport des chargements</h1>
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
                            <Label>Lieu de chargement</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Rechercher un lieu..."
                                    className="pl-9"
                                    value={loadLocation}
                                    onChange={(e) => setLoadLocation(e.target.value)}
                                />
                            </div>
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
                                <Package className="h-5 w-5" />
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

                {/* Liste des chargements */}
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-muted/50 text-xs font-medium uppercase text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Client</th>
                                <th className="px-4 py-3">Véhicule</th>
                                <th className="px-4 py-3">Lieu</th>
                                <th className="px-4 py-3">Produit</th>
                                <th className="px-4 py-3 text-right">Volume</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-sm">
                            {loads.length > 0 ? (
                                loads.map((load) => (
                                    <tr key={load.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium">{format(new Date(load.load_date), 'dd/MM/yyyy')}</td>
                                        <td className="px-4 py-3">{load.client?.nom || '-'}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{load.vehicle_registration}</td>
                                        <td className="px-4 py-3 text-xs">{load.load_location}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                                load.product === 'GASOIL' ? 'bg-blue-100 text-blue-700' :
                                                load.product === 'SUPER' ? 'bg-orange-100 text-orange-700' :
                                                'bg-purple-100 text-purple-700'
                                            )}>
                                                {load.product}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold">{formatNumber(load.volume)} L</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                                        Aucun chargement trouvé.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {loads.length > 0 && (
                            <tfoot className="bg-muted/50 border-t border-border">
                                <tr className="font-black">
                                    <td colSpan={5} className="px-4 py-4 text-right uppercase tracking-wider text-xs">Total Général</td>
                                    <td className="px-4 py-4 text-right text-lg">{formatNumber(stats.total_volume)} L</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </>
    );
}

ReportChargements.layout = {
    breadcrumbs: [
        { title: 'Rapports', href: '#' },
        { title: 'Chargements', href: toUrl(reportsActions.default.chargements()) },
    ],
};
