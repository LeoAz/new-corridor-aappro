import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, FileText, Filter, Search, History, Car, CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
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
import { cn, formatNumber } from '@/lib/utils';
import * as clientsActions from '@/routes/clients';

interface Operation {
    date: string;
    label: string;
    reference: string;
    debit: number;
    credit: number;
    balance: number;
    type: string;
}

interface Payment {
    id: number;
    date: string;
    payment_type: string;
    is_advance: boolean;
    amount: number;
    payment_method: string;
    reference: string;
    note: string;
    loads?: any[];
    invoice_items?: any[];
    depot_invoice_items?: any[];
}

interface Load {
    id: number;
    date: string;
    truck_number: string;
    product: string;
    quantity: number;
    status: string;
    destination?: string;
    bl_number?: string;
    payment_reference?: string;
    payment_date?: string;
    depot?: { nom: string };
    compartment?: { nom: string };
}

interface Props {
    client?: any;
    clients: any[];
    statement?: {
        operations: Operation[];
        initialBalance: number;
        finalBalance: number;
    };
    loads?: {
        en_cours: Load[];
        livrer: Load[];
        facturer: Load[];
        paye: Load[];
    };
    paymentHistory?: Payment[];
    filters: {
        date_from: string | null;
        date_to: string | null;
    };
}

export default function SuiviClient({ client, clients, statement, loads, paymentHistory, filters }: Props) {
    const [activeTab, setActiveTab] = useState('statement');
    const [dateFrom, setDateFrom] = useState<string>(filters?.date_from || '');
    const [dateTo, setDateTo] = useState<string>(filters?.date_to || '');
    const [isClientComboboxOpen, setIsClientComboboxOpen] = useState(false);

    const handleFilter = () => {
        if (!client) {
            return;
        }

        router.get(clientsActions.default.suiviClient.show(client.id).url, {
            date_from: dateFrom,
            date_to: dateTo,
        }, { preserveState: true });
    };

    const handleClientChange = (clientId: string) => {
        router.get(clientsActions.default.suiviClient.show(clientId).url, {
            date_from: dateFrom,
            date_to: dateTo,
        });
    };

    return (
        <>
            <Head title={`Suivi Client - ${client?.nom || 'Choisir un client'}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        Suivi client
                    </h1>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="md:col-span-1">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Sélection Client</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Popover open={isClientComboboxOpen} onOpenChange={setIsClientComboboxOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isClientComboboxOpen}
                                        className="w-full justify-between"
                                    >
                                        {client
                                            ? clients.find((c) => c.id === client.id)?.nom
                                            : "Choisir un client..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Rechercher un client..." />
                                        <CommandList>
                                            <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                                            <CommandGroup>
                                                {clients.map((c) => (
                                                    <CommandItem
                                                        key={c.id}
                                                        value={c.nom}
                                                        onSelect={() => {
                                                            handleClientChange(c.id.toString());
                                                            setIsClientComboboxOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                client?.id === c.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {c.nom}
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

                {client ? (
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-2 border-b pb-1 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setActiveTab('statement')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px] whitespace-nowrap ${
                                    activeTab === 'statement'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                                }`}
                            >
                                <FileText className="h-4 w-4" />
                                Relevé de compte
                            </button>
                            <button
                                onClick={() => setActiveTab('loads')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px] whitespace-nowrap ${
                                    activeTab === 'loads'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                                }`}
                            >
                                <Car className="h-4 w-4" />
                                Historique Chargements
                            </button>
                            <button
                                onClick={() => setActiveTab('payments')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px] whitespace-nowrap ${
                                    activeTab === 'payments'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                                }`}
                            >
                                <History className="h-4 w-4" />
                                Historique paiements
                            </button>
                        </div>

                        {/* 1. RELEVÉ DE COMPTE */}
                        {activeTab === 'statement' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Card className="border-none shadow-none bg-white overflow-hidden">
                                    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                                        <h3 className="font-bold text-gray-800 uppercase tracking-tight">Relevé de compte détaillé</h3>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const url = new URL(clientsActions.default.suiviClient.download(client.id).url, window.location.origin);

                                                if (dateFrom) {
                                                    url.searchParams.append('date_from', dateFrom);
                                                }

                                                if (dateTo) {
                                                    url.searchParams.append('date_to', dateTo);
                                                }

                                                window.location.href = url.toString();
                                            }}
                                            className="print:hidden h-8 text-xs font-medium border-gray-200 hover:bg-gray-50"
                                        >
                                            <Download className="mr-2 h-3.5 w-3.5" /> Exporter PDF
                                        </Button>
                                    </div>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm border-collapse">
                                                <thead>
                                                    <tr className="border-b border-gray-100 bg-gray-50/50">
                                                        <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Date</th>
                                                        <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Opération</th>
                                                        <th className="px-6 py-3 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Débit</th>
                                                        <th className="px-6 py-3 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Crédit</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    <tr className="bg-white">
                                                        <td className="px-6 py-4 text-gray-400 font-medium tabular-nums">
                                                            {dateFrom ? format(new Date(dateFrom), 'dd/MM/yyyy') : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-gray-700 uppercase text-[11px] tracking-wider">REPORT DE SOLDE</td>
                                                        <td className="px-6 py-4 text-right text-gray-400">-</td>
                                                        <td className="px-6 py-4 text-right text-gray-800 font-medium tabular-nums">
                                                            {statement?.initialBalance && statement.initialBalance !== 0 ? formatNumber(Math.abs(statement.initialBalance)) : '-'}
                                                        </td>
                                                    </tr>
                                                    {statement?.operations?.map((op, index) => (
                                                        <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-6 py-4 text-gray-400 tabular-nums">
                                                                {format(new Date(op.date), 'dd/MM/yyyy')}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-gray-700 font-medium">
                                                                    {op.label} {op.reference && <span className="text-gray-400 ml-1">#{op.reference}</span>}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right text-gray-700 font-medium tabular-nums">
                                                                {op.debit > 0 ? formatNumber(op.debit) : '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-right text-gray-700 font-medium tabular-nums">
                                                                {op.credit > 0 ? formatNumber(op.credit) : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!statement?.operations || statement.operations.length === 0) && (
                                                        <tr>
                                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                                                                Aucun mouvement enregistré sur cette période.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="flex flex-col items-end px-6 py-8 space-y-2">
                                            <div className="flex items-center w-full max-w-[300px] justify-between text-gray-600">
                                                <span className="text-sm font-medium">Total Débit:</span>
                                                <span className="text-lg font-bold tabular-nums">{formatNumber(statement?.operations?.reduce((acc, op) => acc + op.debit, 0) || 0)}</span>
                                            </div>
                                            <div className="flex items-center w-full max-w-[300px] justify-between text-gray-600">
                                                <span className="text-sm font-medium">Total Crédit:</span>
                                                <span className="text-lg font-bold tabular-nums">
                                                    {formatNumber((statement?.operations?.reduce((acc, op) => acc + op.credit, 0) || 0) + (statement?.initialBalance || 0))}
                                                </span>
                                            </div>
                                            <div className="w-full max-w-[400px] border-t-2 border-gray-100 pt-4 mt-2 flex items-center justify-between">
                                                <span className="text-xl font-black text-blue-900 uppercase tracking-tight">SOLDE DU COMPTE:</span>
                                                <span className={`text-xl font-black tabular-nums ${(statement?.finalBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {formatNumber(Math.abs(statement?.finalBalance || 0))} <span className="text-sm ml-1 font-bold">FCFA</span>
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 italic mt-2">
                                                * Un solde positif en rouge indique une créance, un solde négatif en vert indique une avance client.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* 2. HISTORIQUE CHARGEMENTS */}
                        {activeTab === 'loads' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {['en_cours', 'livrer', 'facturer', 'paye'].map((statusKey) => {
                                    const statusLoads = loads?.[statusKey as keyof typeof loads] || [];
                                    const labels = {
                                        en_cours: 'Chargements en cours',
                                        livrer: 'Livraisons en attente de facturation',
                                        facturer: 'Livraisons facturées (non payées)',
                                        paye: 'Livraisons payées'
                                    };

                                    if (statusLoads.length === 0) {
                                        return null;
                                    }

                                    return (
                                        <Card key={statusKey} className="border-none shadow-none bg-white overflow-hidden">
                                            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                                                <h3 className="font-bold text-gray-800 uppercase tracking-tight">{labels[statusKey as keyof typeof labels]}</h3>
                                                <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                    {statusLoads.length} Chargements
                                                </div>
                                            </div>
                                            <CardContent className="p-0">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm border-collapse">
                                                        <thead>
                                                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                                                <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Date</th>
                                                                <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Véhicule</th>
                                                                <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Produit</th>
                                                                <th className="px-6 py-3 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Quantité</th>
                                                                <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Dépôt</th>
                                                                <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">{statusKey === 'en_cours' ? 'Destination' : 'Réf/BL'}</th>
                                                                {statusKey === 'paye' && (
                                                                    <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Règlement</th>
                                                                )}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                            {statusLoads.map((load) => (
                                                                <tr key={load.id} className="hover:bg-gray-50 transition-colors">
                                                                    <td className="px-6 py-4 text-gray-400 tabular-nums whitespace-nowrap">
                                                                        {load.date ? format(new Date(load.date), 'dd/MM/yyyy') : '-'}
                                                                    </td>
                                                                    <td className="px-6 py-4 font-bold text-blue-700 text-[11px]">
                                                                        {load.truck_number}
                                                                    </td>
                                                                    <td className="px-6 py-4 font-bold text-gray-800">
                                                                        {load.compartment?.nom || '-'}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right font-bold text-gray-800 tabular-nums">
                                                                        {formatNumber(load.quantity)} <span className="text-[10px] font-normal text-gray-400">L</span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-gray-600 font-medium">
                                                                        {load.depot?.nom || '-'}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-gray-600 font-medium">
                                                                        {statusKey === 'en_cours' ? load.destination : (load.bl_number || '-')}
                                                                    </td>
                                                                    {statusKey === 'paye' && (
                                                                        <td className="px-6 py-4">
                                                                            {load.payment_reference ? (
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-blue-600 font-bold text-[10px] uppercase">#{load.payment_reference}</span>
                                                                                    {load.payment_date && (
                                                                                        <span className="text-[9px] text-gray-400 font-medium">le {format(new Date(load.payment_date), 'dd/MM/yyyy')}</span>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-gray-400">-</span>
                                                                            )}
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ))}
                                                            {statusLoads.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                                                                        Aucun chargement dans cette catégorie.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}

                        {/* 3. HISTORIQUE PAIEMENTS */}
                        {activeTab === 'payments' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Card className="border-none shadow-none bg-white overflow-hidden">
                                    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                                        <div>
                                            <h3 className="font-bold text-gray-800 uppercase tracking-tight">Historique des flux financiers</h3>
                                            <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-bold">Total encaissé sur la période : {formatNumber(paymentHistory?.reduce((acc, p) => acc + p.amount, 0) || 0)} CFA</p>
                                        </div>
                                    </div>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-base border-collapse">
                                                <thead>
                                                    <tr className="border-b border-gray-100 bg-gray-50/50">
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-xs tracking-widest">Date</th>
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-xs tracking-widest">Type</th>
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-xs tracking-widest">Référence</th>
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-xs tracking-widest">Méthode</th>
                                                        <th className="px-6 py-4 text-left font-bold text-gray-500 uppercase text-xs tracking-widest">Détails / Véhicules</th>
                                                        <th className="px-6 py-4 text-right font-bold text-gray-500 uppercase text-xs tracking-widest">Montant</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {paymentHistory?.map((payment) => (
                                                        <tr key={payment.id} className="hover:bg-gray-50 transition-colors align-top">
                                                            <td className="px-6 py-5 text-gray-400 tabular-nums whitespace-nowrap">
                                                                {payment.date ? format(new Date(payment.date), 'dd/MM/yyyy') : '-'}
                                                            </td>
                                                            <td className="px-6 py-5">
                                                                <span className={`inline-flex items-center rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                                                                    payment.is_advance
                                                                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                                                                        : 'bg-green-50 text-green-600 border-green-100'
                                                                }`}>
                                                                    {payment.is_advance ? 'Avance' : 'Règlement'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-5 font-bold text-gray-600 text-sm font-mono">
                                                                #{payment.reference || `ID-${payment.id}`}
                                                            </td>
                                                            <td className="px-6 py-5 text-gray-500 font-medium uppercase text-xs">
                                                                {payment.payment_method}
                                                            </td>
                                                            <td className="px-6 py-5">
                                                                <div className="space-y-1.5">
                                                                    {payment.note && <p className="text-xs text-gray-400 italic mb-2.5">&ldquo;{payment.note}&rdquo;</p>}
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {(payment.loads && payment.loads.length > 0) ? (
                                                                            payment.loads.map((load: any) => (
                                                                                <span key={load.id} className="inline-flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded text-[10px] font-bold text-gray-600 border border-gray-200 uppercase">
                                                                                    <Car className="h-3 w-3" /> {load.vehicle_registration} ({formatNumber(load.volume)}L)
                                                                                </span>
                                                                            ))
                                                                        ) : (payment.invoice_items && payment.invoice_items.length > 0) ? (
                                                                            payment.invoice_items.map((item: any) => (
                                                                                <span key={item.id} className="inline-flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded text-[10px] font-bold text-gray-600 border border-gray-200 uppercase">
                                                                                    Facture #{item.invoice_number}
                                                                                </span>
                                                                            ))
                                                                        ) : (
                                                                            <span className="text-[10px] text-gray-400 uppercase font-bold italic tracking-tighter">Flux direct</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className={`px-6 py-5 text-right font-black text-lg tabular-nums ${payment.is_advance ? 'text-blue-700' : 'text-green-700'}`}>
                                                                {formatNumber(payment.amount)} <span className="text-xs font-normal opacity-50">CFA</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!paymentHistory || paymentHistory.length === 0) && (
                                                        <tr>
                                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                                                                Aucun paiement enregistré.
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
                        <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
                        <h2 className="text-xl font-semibold text-muted-foreground">Sélectionnez un client pour afficher son suivi</h2>
                        <p className="text-sm text-muted-foreground mt-2">Utilisez le menu à gauche pour choisir un client dans la liste.</p>
                    </div>
                )}
            </div>
        </>
    );
}

SuiviClient.layout = (page: any) => (
    <AppLayout breadcrumbs={[{ title: 'Clients', href: '/clients/suivi-client' }, { title: 'Suivi client', href: '/clients/suivi-client' }]}>
        {page}
    </AppLayout>
);
