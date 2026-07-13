import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, Filter, Search, CalendarIcon, Check, ChevronsUpDown, Package, ShoppingCart, Truck, Activity } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AppLayout from '@/layouts/app-layout';
import { cn, formatNumber, toUrl } from '@/lib/utils';
import * as stocksActions from '@/routes/stocks';

interface Compartment {
    id: number;
    product: string;
    quantity: number;
}

interface Depot {
    id: number;
    name: string;
    compartments: Compartment[];
}

interface Purchase {
    id: number;
    purchase_date: string;
    product: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    compartment: Compartment;
}

interface Load {
    id: number;
    load_date: string;
    vehicle_registration: string;
    product: string;
    volume: number;
    client: { nom: string };
    compartment: Compartment;
    status: string;
}

interface DepotSale {
    date: string;
    client: string;
    compartment: string;
    quantity: number;
    number: string;
}

interface Props {
    depots: Depot[];
    selectedDepot: Depot | null;
    purchases: Purchase[];
    chargements: Load[];
    livraisons: Load[];
    depotSales: DepotSale[];
    filters: {
        depot_id: number | string;
        date_from: string;
        date_to: string;
    };
}

export default function SuiviStock({ depots, selectedDepot, purchases, chargements, livraisons, depotSales, filters }: Props) {
    const [activeTab, setActiveTab] = useState('situation');
    const [dateFrom, setDateFrom] = useState<string>(filters?.date_from || '');
    const [dateTo, setDateTo] = useState<string>(filters?.date_to || '');
    const [isDepotComboboxOpen, setIsDepotComboboxOpen] = useState(false);

    const handleFilter = () => {
        if (!selectedDepot) {
            return;
        }

        router.get(toUrl(stocksActions.default.suiviStock()), {
            depot_id: selectedDepot.id,
            date_from: dateFrom,
            date_to: dateTo,
        }, { preserveState: true });
    };

    const handleDepotChange = (depotId: string) => {
        router.get(toUrl(stocksActions.default.suiviStock()), {
            depot_id: depotId,
            date_from: dateFrom,
            date_to: dateTo,
        });
    };

    return (
        <>
            <Head title={`Suivi Stock - ${selectedDepot?.name || 'Choisir un dépôt'}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        Suivi du stock
                    </h1>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="md:col-span-1">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Sélection Dépôt</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Popover open={isDepotComboboxOpen} onOpenChange={setIsDepotComboboxOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isDepotComboboxOpen}
                                        className="w-full justify-between"
                                    >
                                        {selectedDepot
                                            ? depots.find((d) => d.id === selectedDepot.id)?.name
                                            : "Choisir un dépôt..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Rechercher un dépôt..." />
                                        <CommandList>
                                            <CommandEmpty>Aucun dépôt trouvé.</CommandEmpty>
                                            <CommandGroup>
                                                {depots.map((d) => (
                                                    <CommandItem
                                                        key={d.id}
                                                        value={d.name}
                                                        onSelect={() => {
                                                            handleDepotChange(d.id.toString());
                                                            setIsDepotComboboxOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedDepot?.id === d.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {d.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-3">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center">
                                <Filter className="mr-2 h-4 w-4" /> Filtres par période
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-end gap-4">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="date_from">Du</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !dateFrom && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateFrom ? format(new Date(dateFrom), "PPP", { locale: fr }) : <span>Choisir une date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={dateFrom ? new Date(dateFrom) : undefined}
                                            onSelect={(date) => setDateFrom(date ? format(date, "yyyy-MM-dd") : "")}
                                            initialFocus
                                            locale={fr}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="date_to">Au</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !dateTo && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateTo ? format(new Date(dateTo), "PPP", { locale: fr }) : <span>Choisir une date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={dateTo ? new Date(dateTo) : undefined}
                                            onSelect={(date) => setDateTo(date ? format(date, "yyyy-MM-dd") : "")}
                                            initialFocus
                                            locale={fr}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <Button onClick={handleFilter} className="bg-blue-600 text-white hover:bg-blue-700">
                                <Search className="mr-2 h-4 w-4" /> Actualiser
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {selectedDepot ? (
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-2 border-b pb-1 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setActiveTab('situation')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px] whitespace-nowrap ${
                                    activeTab === 'situation'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                                }`}
                            >
                                <Activity className="h-4 w-4" />
                                Situation du stock
                            </button>
                            <button
                                onClick={() => setActiveTab('purchases')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px] whitespace-nowrap ${
                                    activeTab === 'purchases'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                                }`}
                            >
                                <ShoppingCart className="h-4 w-4" />
                                Historique des achats
                            </button>
                            <button
                                onClick={() => setActiveTab('chargements')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px] whitespace-nowrap ${
                                    activeTab === 'chargements'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                                }`}
                            >
                                <Truck className="h-4 w-4" />
                                Chargements
                            </button>
                            <button
                                onClick={() => setActiveTab('livraisons')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px] whitespace-nowrap ${
                                    activeTab === 'livraisons'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                                }`}
                            >
                                <Check className="h-4 w-4" />
                                Livraisons
                            </button>
                            <button
                                onClick={() => setActiveTab('sales')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px] whitespace-nowrap ${
                                    activeTab === 'sales'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                                }`}
                            >
                                <Package className="h-4 w-4" />
                                Ventes directes
                            </button>
                        </div>

                        {/* 1. SITUATION DU STOCK */}
                        {activeTab === 'situation' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="grid gap-4 md:grid-cols-3">
                                    {selectedDepot.compartments.map((comp) => (
                                        <Card key={comp.id} className="border-none shadow-sm bg-white overflow-hidden">
                                            <CardHeader className="pb-2 bg-gray-50/50">
                                                <CardTitle className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                                    {comp.product}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <div className="flex items-baseline justify-between">
                                                    <span className="text-3xl font-black text-blue-900 tabular-nums">
                                                        {formatNumber(comp.quantity)}
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-400">LITRES</span>
                                                </div>
                                                <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-600 rounded-full"
                                                        style={{ width: `${Math.min((comp.quantity / 1000000) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                <Card className="border-none shadow-none bg-white overflow-hidden">
                                    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                                        <h3 className="font-bold text-gray-800 uppercase tracking-tight">Récapitulatif Dépôt</h3>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const url = new URL(toUrl(stocksActions.default.suiviStock.download()), window.location.origin);
                                                url.searchParams.append('depot_id', selectedDepot.id.toString());

                                                if (dateFrom) {
                                                    url.searchParams.append('date_from', dateFrom);
                                                }

                                                if (dateTo) {
                                                    url.searchParams.append('date_to', dateTo);
                                                }

                                                window.location.href = url.toString();
                                            }}
                                            className="h-8 text-xs font-medium border-gray-200 hover:bg-gray-50"
                                        >
                                            <Download className="mr-2 h-3.5 w-3.5" /> Exporter PDF Complet
                                        </Button>
                                    </div>
                                    <CardContent className="p-6">
                                        <div className="grid md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Entrées (Achats)</h4>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">Total volume acheté :</span>
                                                    <span className="font-bold tabular-nums">{formatNumber(purchases.reduce((acc, p) => acc + p.quantity, 0))} L</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">Investissement total :</span>
                                                    <span className="font-bold tabular-nums text-blue-700">{formatNumber(purchases.reduce((acc, p) => acc + p.total_price, 0))} CFA</span>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Sorties (Ventes & Sorties)</h4>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">Volume chargements (en cours) :</span>
                                                    <span className="font-bold tabular-nums">{formatNumber(chargements.reduce((acc, l) => acc + l.volume, 0))} L</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">Volume livraisons (confirmées) :</span>
                                                    <span className="font-bold tabular-nums">{formatNumber(livraisons.reduce((acc, l) => acc + l.volume, 0))} L</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">Volume ventes directes :</span>
                                                    <span className="font-bold tabular-nums">{formatNumber(depotSales.reduce((acc, s) => acc + s.quantity, 0))} L</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t font-bold">
                                                    <span className="text-gray-900">Total Sorties :</span>
                                                    <span className="text-red-600 tabular-nums">
                                                        {formatNumber(chargements.reduce((acc, l) => acc + l.volume, 0) + livraisons.reduce((acc, l) => acc + l.volume, 0) + depotSales.reduce((acc, s) => acc + s.quantity, 0))} L
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* 2. HISTORIQUE DES ACHATS */}
                        {activeTab === 'purchases' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Card className="border-none shadow-none bg-white overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm border-collapse">
                                                <thead>
                                                    <tr className="border-b border-gray-100 bg-gray-50/50">
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Date</th>
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Compartiment</th>
                                                        <th className="px-6 py-4 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Quantité</th>
                                                        <th className="px-6 py-4 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Prix Unitaire</th>
                                                        <th className="px-6 py-4 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {purchases.map((purchase) => (
                                                        <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4 text-gray-400 tabular-nums">
                                                                {format(new Date(purchase.purchase_date), 'dd/MM/yyyy')}
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-gray-700 uppercase text-[11px]">
                                                                {purchase.compartment?.product || purchase.product}
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-bold text-gray-800 tabular-nums">
                                                                {formatNumber(purchase.quantity)} L
                                                            </td>
                                                            <td className="px-6 py-4 text-right text-gray-500 tabular-nums">
                                                                {formatNumber(purchase.unit_price)}
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-black text-blue-900 tabular-nums">
                                                                {formatNumber(purchase.total_price)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {purchases.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                                                Aucun achat enregistré sur cette période.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* 3. CHARGEMENTS */}
                        {activeTab === 'chargements' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Card className="border-none shadow-none bg-white overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm border-collapse">
                                                <thead>
                                                    <tr className="border-b border-gray-100 bg-gray-50/50">
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Date Charg.</th>
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Véhicule</th>
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Client</th>
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Produit</th>
                                                        <th className="px-6 py-4 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Volume</th>
                                                        <th className="px-6 py-4 text-center font-bold text-gray-500 uppercase text-[10px] tracking-widest">Statut</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {chargements.map((load) => (
                                                        <tr key={load.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4 text-gray-400 tabular-nums">
                                                                {format(new Date(load.load_date), 'dd/MM/yyyy')}
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-blue-700 text-[11px]">
                                                                {load.vehicle_registration}
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-gray-700 uppercase text-[11px]">
                                                                {load.client?.nom || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-600 font-medium">
                                                                {load.product} <span className="text-[10px] text-gray-400">({load.compartment?.product})</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-bold text-gray-800 tabular-nums">
                                                                {formatNumber(load.volume)} L
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="inline-flex items-center rounded bg-gray-50 px-2 py-0.5 text-[9px] font-bold text-gray-600 border border-gray-100 uppercase tracking-tighter">
                                                                    {load.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {chargements.length === 0 && (
                                                        <tr>
                                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                                                                Aucun chargement en cours enregistré sur cette période.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* 4. LIVRAISONS */}
                        {activeTab === 'livraisons' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Card className="border-none shadow-none bg-white overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm border-collapse">
                                                <thead>
                                                    <tr className="border-b border-gray-100 bg-gray-50/50">
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Date Charg.</th>
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Véhicule</th>
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Client</th>
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Produit</th>
                                                        <th className="px-6 py-4 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Volume</th>
                                                        <th className="px-6 py-4 text-center font-bold text-gray-500 uppercase text-[10px] tracking-widest">Statut</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {livraisons.map((load) => (
                                                        <tr key={load.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4 text-gray-400 tabular-nums">
                                                                {format(new Date(load.load_date), 'dd/MM/yyyy')}
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-blue-700 text-[11px]">
                                                                {load.vehicle_registration}
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-gray-700 uppercase text-[11px]">
                                                                {load.client?.nom || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-600 font-medium">
                                                                {load.product} <span className="text-[10px] text-gray-400">({load.compartment?.product})</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-bold text-gray-800 tabular-nums">
                                                                {formatNumber(load.volume)} L
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="inline-flex items-center rounded bg-gray-50 px-2 py-0.5 text-[9px] font-bold text-gray-600 border border-gray-100 uppercase tracking-tighter">
                                                                    {load.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {livraisons.length === 0 && (
                                                        <tr>
                                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                                                                Aucune livraison enregistrée sur cette période.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* 5. VENTES DIRECTES */}
                        {activeTab === 'sales' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Card className="border-none shadow-none bg-white overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm border-collapse">
                                                <thead>
                                                    <tr className="border-b border-gray-100 bg-gray-50/50">
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Date</th>
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">N° Facture</th>
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Client</th>
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Compartiment</th>
                                                        <th className="px-6 py-4 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Quantité</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {depotSales.map((sale, index) => (
                                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4 text-gray-400 tabular-nums">
                                                                {format(new Date(sale.date), 'dd/MM/yyyy')}
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-blue-700 text-[11px]">
                                                                {sale.number}
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-gray-700 uppercase text-[11px]">
                                                                {sale.client}
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-600 font-medium">
                                                                {sale.compartment}
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-bold text-gray-800 tabular-nums">
                                                                {formatNumber(sale.quantity)} L
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {depotSales.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                                                Aucune vente directe enregistrée sur cette période.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border-2 border-dashed">
                        <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
                        <h2 className="text-xl font-semibold text-muted-foreground">Sélectionnez un dépôt pour afficher son suivi</h2>
                        <p className="text-sm text-muted-foreground mt-2">Utilisez le menu ci-dessus pour choisir un dépôt dans la liste.</p>
                    </div>
                )}
            </div>
        </>
    );
}

SuiviStock.layout = (page: any) => (
    <AppLayout breadcrumbs={[{ title: 'Stocks', href: '/stocks/suivi-stock' }, { title: 'Suivi stock', href: '/stocks/suivi-stock' }]}>
        {page}
    </AppLayout>
);
