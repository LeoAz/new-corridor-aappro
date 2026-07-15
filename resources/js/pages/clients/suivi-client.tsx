import { Head, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    CalendarIcon,
    Car,
    Check,
    ChevronsUpDown,
    Download,
    FileText,
    Filter,
    History,
    Search
} from 'lucide-react';
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
import { DataTable } from '@/components/ui/data-table';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    compartment: string;
    quantity: number;
    status: string;
    destination?: string;
    bl_number?: string;
    payment_reference?: string;
    payment_date?: string;
    depot?: string;
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
    const [dateFrom, setDateFrom] = useState<string>(filters?.date_from || '');
    const [dateTo, setDateTo] = useState<string>(filters?.date_to || '');
    const [isClientComboboxOpen, setIsClientComboboxOpen] = useState(false);

    const statementColumns: ColumnDef<Operation>[] = [
        {
            accessorKey: 'date',
            header: 'Date',
            cell: ({ row }) => format(new Date(row.original.date), 'dd/MM/yyyy'),
        },
        {
            accessorKey: 'label',
            header: 'Opération',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium">{row.original.label}</span>
                    {row.original.reference && (
                        <span className="text-[10px] text-muted-foreground uppercase">Réf: #{row.original.reference}</span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'debit',
            header: () => <div className="text-right">Débit</div>,
            cell: ({ row }) => (
                <div className="text-right font-medium text-red-600">
                    {row.original.debit > 0 ? formatNumber(row.original.debit) : '-'}
                </div>
            ),
        },
        {
            accessorKey: 'credit',
            header: () => <div className="text-right">Crédit</div>,
            cell: ({ row }) => (
                <div className="text-right font-medium text-emerald-600">
                    {row.original.credit > 0 ? formatNumber(row.original.credit) : '-'}
                </div>
            ),
        },
    ];

    const loadColumns: ColumnDef<Load>[] = [
        {
            accessorKey: 'date',
            header: 'Date',
            cell: ({ row }) => row.original.date ? format(new Date(row.original.date), 'dd/MM/yyyy') : '-',
        },
        {
            accessorKey: 'truck_number',
            header: 'Véhicule',
            cell: ({ row }) => <span className="font-bold text-blue-600">{row.original.truck_number}</span>,
        },
        {
            accessorKey: 'product',
            header: 'Produit',
            cell: ({ row }) => <span className="font-medium">{row.original.compartment || row.original.product || '-'}</span>,
        },
        {
            accessorKey: 'quantity',
            header: () => <div className="text-right">Quantité</div>,
            cell: ({ row }) => (
                <div className="text-right font-bold">
                    {formatNumber(row.original.quantity)} <span className="text-[10px] font-normal text-muted-foreground ml-1">L</span>
                </div>
            ),
        },
        {
            accessorKey: 'depot',
            header: 'Dépôt',
            cell: ({ row }) => row.original.depot || '-',
        },
        {
            id: 'reference',
            header: 'Réf / BL',
            cell: ({ row }) => row.original.bl_number || row.original.destination || '-',
        },
    ];

    const paidLoadColumns: ColumnDef<Load>[] = [
        ...loadColumns,
        {
            accessorKey: 'payment_reference',
            header: 'Règlement',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    {row.original.payment_reference ? (
                        <>
                            <span className="text-blue-600 font-bold text-[10px]">#{row.original.payment_reference}</span>
                            {row.original.payment_date && (
                                <span className="text-[9px] text-muted-foreground">le {format(new Date(row.original.payment_date), 'dd/MM/yyyy')}</span>
                            )}
                        </>
                    ) : '-'}
                </div>
            ),
        },
    ];

    const paymentColumns: ColumnDef<Payment>[] = [
        {
            accessorKey: 'date',
            header: 'Date',
            cell: ({ row }) => row.original.date ? format(new Date(row.original.date), 'dd/MM/yyyy') : '-',
        },
        {
            accessorKey: 'payment_type',
            header: 'Type',
            cell: ({ row }) => (
                <span className={`inline-flex items-center rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                    row.original.is_advance
                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                        : 'bg-green-50 text-green-600 border-green-100'
                }`}>
                    {row.original.is_advance ? 'Avance' : 'Règlement'}
                </span>
            ),
        },
        {
            accessorKey: 'reference',
            header: 'Référence',
            cell: ({ row }) => (
                <span className="font-bold text-gray-600 text-sm font-mono">
                    #{row.original.reference || `ID-${row.original.id}`}
                </span>
            ),
        },
        {
            accessorKey: 'payment_method',
            header: 'Méthode',
            cell: ({ row }) => (
                <span className="text-gray-500 font-medium uppercase text-xs">
                    {row.original.payment_method}
                </span>
            ),
        },
        {
            id: 'details',
            header: 'Détails / Véhicules',
            cell: ({ row }) => (
                <div className="space-y-1.5">
                    {row.original.note && <p className="text-xs text-gray-400 italic mb-2.5">&ldquo;{row.original.note}&rdquo;</p>}
                    <div className="flex flex-wrap gap-2">
                        {(row.original.loads && row.original.loads.length > 0) ? (
                            row.original.loads.map((load: any) => (
                                <span key={load.id} className="inline-flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded text-[10px] font-bold text-gray-600 border border-gray-200 uppercase">
                                    <Car className="h-3 w-3" /> {load.vehicle_registration} ({formatNumber(load.volume)}L)
                                </span>
                            ))
                        ) : (row.original.invoice_items && row.original.invoice_items.length > 0) ? (
                            row.original.invoice_items.map((item: any) => (
                                <span key={item.id} className="inline-flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded text-[10px] font-bold text-gray-600 border border-gray-200 uppercase">
                                    Facture #{item.invoice_number}
                                </span>
                            ))
                        ) : (
                            <span className="text-[10px] text-gray-400 uppercase font-bold italic tracking-tighter">Flux direct</span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'amount',
            header: () => <div className="text-right">Montant</div>,
            cell: ({ row }) => (
                <div className={`text-right font-black text-lg tabular-nums ${row.original.is_advance ? 'text-blue-700' : 'text-green-700'}`}>
                    {formatNumber(row.original.amount)} <span className="text-xs font-normal opacity-50">CFA</span>
                </div>
            ),
        },
    ];

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
                        <Tabs defaultValue="statement" className="w-full">
                            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
                                <TabsTrigger
                                    value="statement"
                                    className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:text-foreground"
                                >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Relevé de compte
                                </TabsTrigger>
                                <TabsTrigger
                                    value="loads"
                                    className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:text-foreground"
                                >
                                    <Car className="h-4 w-4 mr-2" />
                                    Historique Chargements
                                </TabsTrigger>
                                <TabsTrigger
                                    value="deliveries"
                                    className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:text-foreground"
                                >
                                    <Car className="h-4 w-4 mr-2" />
                                    Historique Livraisons
                                </TabsTrigger>
                                <TabsTrigger
                                    value="paid-deliveries"
                                    className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:text-foreground"
                                >
                                    <Check className="h-4 w-4 mr-2" />
                                    Livraisons Payées
                                </TabsTrigger>
                                <TabsTrigger
                                    value="payments"
                                    className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:text-foreground"
                                >
                                    <History className="h-4 w-4 mr-2" />
                                    Historique paiements
                                </TabsTrigger>
                            </TabsList>

                            {/* 1. RELEVÉ DE COMPTE */}
                            <TabsContent value="statement" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
                                    <CardContent className="p-6">
                                        <div className="mb-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <span className="font-bold text-gray-500 text-xs uppercase tracking-widest">Report de solde :</span>
                                                <div className="flex gap-4">
                                                    {statement?.initialBalance && statement.initialBalance < 0 ? (
                                                        <span className="text-red-600 font-bold tabular-nums">Débit: {formatNumber(Math.abs(statement.initialBalance))} FCFA</span>
                                                    ) : null}
                                                    {statement?.initialBalance && statement.initialBalance >= 0 ? (
                                                        <span className="text-emerald-600 font-bold tabular-nums">Crédit: {formatNumber(statement.initialBalance)} FCFA</span>
                                                    ) : null}
                                                    {!statement?.initialBalance && <span className="text-gray-400 font-bold">0 FCFA</span>}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-400 italic">
                                                Au {dateFrom ? format(new Date(dateFrom), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}
                                            </p>
                                        </div>

                                        <DataTable
                                            columns={statementColumns}
                                            data={statement?.operations || []}
                                            searchKey="label"
                                            searchPlaceholder="Filtrer par opération..."
                                            hidePagination={true}
                                        />

                                        <div className="flex flex-col items-end mt-8 space-y-2">
                                            <div className="flex items-center w-full max-w-[300px] justify-between text-gray-600">
                                                <span className="text-sm font-medium">Total Débit:</span>
                                                <span className="text-lg font-bold tabular-nums">
                                                    {formatNumber(
                                                        (statement?.operations?.reduce((acc, op) => acc + op.debit, 0) || 0) +
                                                        ((statement?.initialBalance || 0) < 0 ? Math.abs(statement?.initialBalance || 0) : 0)
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center w-full max-w-[300px] justify-between text-gray-600">
                                                <span className="text-sm font-medium">Total Crédit:</span>
                                                <span className="text-lg font-bold tabular-nums">
                                                    {formatNumber(
                                                        (statement?.operations?.reduce((acc, op) => acc + op.credit, 0) || 0) +
                                                        ((statement?.initialBalance || 0) > 0 ? statement?.initialBalance || 0 : 0)
                                                    )}
                                                </span>
                                            </div>
                                            <div className="w-full max-w-[400px] border-t-2 border-gray-100 pt-4 mt-2 flex items-center justify-between">
                                                <span className="text-xl font-black text-blue-900 uppercase tracking-tight">SOLDE DU COMPTE:</span>
                                                <span className={`text-xl font-black tabular-nums ${(statement?.finalBalance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {formatNumber(Math.abs(statement?.finalBalance || 0))} <span className="text-sm ml-1 font-bold">FCFA</span>
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 italic mt-2">
                                                * Un solde négatif en rouge indique que le client doit, un solde positif en vert indique une avance client.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* 2. HISTORIQUE CHARGEMENTS */}
                            <TabsContent value="loads" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Card className="border-none shadow-none bg-white overflow-hidden">
                                    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                                        <h3 className="font-bold text-gray-800 uppercase tracking-tight">Historique des chargements</h3>
                                        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                            {loads?.en_cours.length || 0} Chargements en cours
                                        </div>
                                    </div>
                                    <CardContent className="p-6">
                                        <DataTable
                                            columns={loadColumns}
                                            data={loads?.en_cours || []}
                                            searchKey="truck_number"
                                            searchPlaceholder="Filtrer par véhicule..."
                                            hidePagination={true}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* 3. HISTORIQUE LIVRAISONS */}
                            <TabsContent value="deliveries" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Card className="border-none shadow-none bg-white overflow-hidden">
                                    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                                        <h3 className="font-bold text-gray-800 uppercase tracking-tight">Historique des livraisons</h3>
                                        <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                            {(loads?.livrer.length || 0) + (loads?.facturer.length || 0)} Livraisons
                                        </div>
                                    </div>
                                    <CardContent className="p-6">
                                        <DataTable
                                            columns={loadColumns}
                                            data={[...(loads?.livrer || []), ...(loads?.facturer || [])]}
                                            searchKey="truck_number"
                                            searchPlaceholder="Filtrer par véhicule..."
                                            hidePagination={true}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* 4. LIVRAISONS PAYÉES */}
                            <TabsContent value="paid-deliveries" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Card className="border-none shadow-none bg-white overflow-hidden">
                                    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                                        <h3 className="font-bold text-gray-800 uppercase tracking-tight">Livraisons réglées</h3>
                                        <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                            {loads?.paye.length || 0} Livraisons payées
                                        </div>
                                    </div>
                                    <CardContent className="p-6">
                                        <DataTable
                                            columns={paidLoadColumns}
                                            data={loads?.paye || []}
                                            searchKey="truck_number"
                                            searchPlaceholder="Filtrer par véhicule..."
                                            hidePagination={true}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* 5. HISTORIQUE PAIEMENTS */}
                            <TabsContent value="payments" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Card className="border-none shadow-none bg-white overflow-hidden">
                                    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                                        <div>
                                            <h3 className="font-bold text-gray-800 uppercase tracking-tight">Historique des flux financiers</h3>
                                            <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-bold">Total encaissé sur la période : {formatNumber(paymentHistory?.reduce((acc, p) => acc + p.amount, 0) || 0)} CFA</p>
                                        </div>
                                    </div>
                                    <CardContent className="p-6">
                                        <DataTable
                                            columns={paymentColumns}
                                            data={paymentHistory || []}
                                            searchKey="reference"
                                            searchPlaceholder="Filtrer par référence..."
                                            hidePagination={true}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
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
