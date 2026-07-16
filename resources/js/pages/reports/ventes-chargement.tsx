import { Head, router } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Banknote, CalendarIcon, Download, Filter, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { DataTable } from '@/components/ui/data-table';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatNumber, toUrl } from '@/lib/utils';
import * as reportsActions from '@/routes/rapports';

interface Invoice {
    id: number;
    number: string;
    date: string;
    total_amount: number;
    client: { id: number; nom: string };
    items: Array<{
        id: number;
        load_details?: {
            vehicle_registration: string;
        };
    }>;
}

interface Stats {
    total_amount: number;
    total_invoices: number;
}

interface Client {
    id: number;
    nom: string;
}

interface Props {
    invoices: Invoice[];
    stats: Stats;
    filters: {
        date_from: string;
        date_to: string;
        client_id: number | string;
    };
    clients: Client[];
}

export default function ReportVentesChargement({ invoices, stats, filters, clients }: Props) {
    const [dateFrom, setDateFrom] = useState<string>(filters?.date_from || '');
    const [dateTo, setDateTo] = useState<string>(filters?.date_to || '');
    const [clientId, setClientId] = useState<number | string>(filters?.client_id || 'all');
    const [isClientComboboxOpen, setIsClientComboboxOpen] = useState(false);

    const columns = useMemo<ColumnDef<Invoice>[]>(() => [
        {
            accessorKey: 'date',
            header: 'Date',
            cell: ({ row }) => format(new Date(row.original.date), 'dd/MM/yyyy'),
        },
        {
            accessorKey: 'number',
            header: 'N° Facture',
            cell: ({ row }) => <span className="font-bold">{row.original.number}</span>,
        },
        {
            accessorKey: 'client.nom',
            header: 'Client',
            cell: ({ row }) => row.original.client?.nom || '-',
        },
        {
            id: 'vehicles',
            header: 'Véhicule(s)',
            cell: ({ row }) => (
                <div>
                    {row.original.items?.map((item, idx) => (
                        <div key={idx} className="text-xs">
                            {item.load_details?.vehicle_registration || '-'}
                        </div>
                    )) || '-'}
                </div>
            ),
        },
        {
            accessorKey: 'total_amount',
            header: () => <div className="text-right">Montant</div>,
            cell: ({ row }) => <div className="text-right font-black">{formatNumber(row.original.total_amount)} CFA</div>,
        },
    ], []);

    const handleFilter = () => {
        router.get(toUrl(reportsActions.default.venteChargement()), {
            date_from: dateFrom,
            date_to: dateTo,
            client_id: clientId === 'all' ? '' : clientId,
        }, { preserveState: true });
    };

    const handleDownload = () => {
        const url = new URL(toUrl(reportsActions.default.venteChargement.download()), window.location.origin);

        if (dateFrom) {
            url.searchParams.append('date_from', dateFrom);
        }

        if (dateTo) {
            url.searchParams.append('date_to', dateTo);
        }

        if (clientId && clientId !== 'all') {
            url.searchParams.append('client_id', clientId.toString());
        }

        window.location.href = url.toString();
    };

    const selectedClient = clients.find((c) => c.id === clientId);

    return (
        <>
            <Head title="Rapport Ventes Chargement" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground font-mono uppercase tracking-tight">Rapport des ventes sur chargement</h1>
                    <Button onClick={handleDownload} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Exporter PDF
                    </Button>
                </div>

                {/* Filtres */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                            <Label>Client</Label>
                            <Popover open={isClientComboboxOpen} onOpenChange={setIsClientComboboxOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={isClientComboboxOpen} className="w-full justify-between font-normal">
                                        <div className="flex items-center gap-2">
                                            <Search className="h-4 w-4 opacity-50" />
                                            {clientId === 'all' ? 'Tous les clients' : selectedClient?.nom}
                                        </div>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0">
                                    <Command>
                                        <CommandInput placeholder="Rechercher un client..." />
                                        <CommandList>
                                            <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    onSelect={() => {
                                                        setClientId('all');
                                                        setIsClientComboboxOpen(false);
                                                    }}
                                                >
                                                    Tous les clients
                                                </CommandItem>
                                                {clients.map((client) => (
                                                    <CommandItem
                                                        key={client.id}
                                                        onSelect={() => {
                                                            setClientId(client.id);
                                                            setIsClientComboboxOpen(false);
                                                        }}
                                                    >
                                                        {client.nom}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                                <Banknote className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Nombre de factures</span>
                        </div>
                        <div className="mt-2 text-2xl font-bold">{stats.total_invoices}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600">
                                <Banknote className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Montant Total</span>
                        </div>
                        <div className="mt-2 text-2xl font-bold">{formatNumber(stats.total_amount)} CFA</div>
                    </div>
                </div>

                {/* Liste des factures */}
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={invoices}
                        hidePagination={true}
                    />
                    {invoices.length > 0 && (
                        <div className="bg-muted/50 border-t border-border p-4 flex justify-between items-center font-black">
                            <span className="uppercase tracking-wider text-xs">Total Général</span>
                            <span className="text-xl text-primary">{formatNumber(stats.total_amount)} CFA</span>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

ReportVentesChargement.layout = {
    breadcrumbs: [
        { title: 'Rapports', href: '#' },
        { title: 'Vente chargement', href: toUrl(reportsActions.default.venteChargement()) },
    ],
};
