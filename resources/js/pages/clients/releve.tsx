import { Head, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Check, ChevronsUpDown, Download, FileText, Filter, Search } from 'lucide-react';
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

interface Props {
    client?: any;
    clients: any[];
    statement?: {
        operations: Operation[];
        initialBalance: number;
        finalBalance: number;
    };
    filters: {
        date_from: string | null;
        date_to: string | null;
    };
}

export default function Releve({ client, clients, statement, filters }: Props) {
    const [dateFrom, setDateFrom] = useState<string>(filters?.date_from || '');
    const [dateTo, setDateTo] = useState<string>(filters?.date_to || '');
    const [isClientComboboxOpen, setIsClientComboboxOpen] = useState(false);

    const handleFilter = () => {
        if (!client) {
            return;
        }

        router.get(clientsActions.default.releve.show(client.id).url, {
            date_from: dateFrom,
            date_to: dateTo,
        }, { preserveState: true });
    };

    const handleClientChange = (clientId: string) => {
        router.get(clientsActions.default.releve.show(clientId).url, {
            date_from: dateFrom,
            date_to: dateTo,
        });
    };

    const operations = statement?.operations || [];
    const initialBalance = statement?.initialBalance || 0;
    const finalBalance = statement?.finalBalance || 0;

    const columns: ColumnDef<Operation>[] = [
        {
            accessorKey: 'date',
            header: 'Date',
            cell: ({ row }) => row.original.date ? format(new Date(row.original.date), 'dd/MM/yyyy') : '-',
        },
        {
            accessorKey: 'label',
            header: 'Opération',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className={cn("font-medium", row.original.type === 'initial' && "font-bold uppercase text-[11px] tracking-wider")}>
                        {row.original.label}
                    </span>
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
                    {row.original.debit > 0 ? formatNumber(row.original.debit) : (row.original.debit === 0 && row.original.type === 'initial' ? '0' : '-')}
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

    const tableData: Operation[] = [
        {
            date: dateFrom || client?.created_at || new Date().toISOString(),
            label: 'SOLDE INITIAL / REPORT',
            reference: '',
            debit: initialBalance < 0 ? Math.abs(initialBalance) : 0,
            credit: initialBalance > 0 ? initialBalance : 0,
            balance: initialBalance,
            type: 'initial',
        },
        ...operations,
    ];

    return (
        <>
            <Head title={`Relevé - ${client?.nom || 'Choisir un client'}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        Relevé de compte client
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
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <Card className="border-none shadow-none bg-white overflow-hidden">
                            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                                <h3 className="font-bold text-gray-800 uppercase tracking-tight">Relevé de compte détaillé</h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const url = new URL(clientsActions.default.releve.download(client.id).url, window.location.origin);

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
                                <DataTable
                                    columns={columns}
                                    data={tableData}
                                    searchKey="label"
                                    searchPlaceholder="Filtrer par opération..."
                                    hidePagination={true}
                                />

                                <div className="mt-8 space-y-4">
                                    <div className="flex flex-col items-end border-b pb-4 border-gray-100">
                                        <div className="flex items-center w-full max-w-[400px] justify-between text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-2">
                                            <span>Totaux de la période (Solde Inclus)</span>
                                        </div>
                                        <div className="flex items-center w-full max-w-[400px] justify-between">
                                            <span className="text-sm font-medium text-gray-500">Total Débit:</span>
                                            <span className="text-lg font-bold tabular-nums text-red-600">
                                                {formatNumber(operations.reduce((acc, op) => acc + op.debit, 0) + (initialBalance < 0 ? Math.abs(initialBalance) : 0))}
                                            </span>
                                        </div>
                                        <div className="flex items-center w-full max-w-[400px] justify-between">
                                            <span className="text-sm font-medium text-gray-500">Total Crédit:</span>
                                            <span className="text-lg font-bold tabular-nums text-emerald-600">
                                                {formatNumber(operations.reduce((acc, op) => acc + op.credit, 0) + (initialBalance > 0 ? initialBalance : 0))}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end">
                                        <div className="w-full max-w-[400px] flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-xl font-black text-blue-900 uppercase tracking-tight">SOLDE DU COMPTE:</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                    {finalBalance < 0 ? 'Le client doit (Débit)' : 'L\'entreprise doit (Crédit)'}
                                                </span>
                                            </div>
                                            <span className={`text-2xl font-black tabular-nums ${finalBalance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {formatNumber(Math.abs(finalBalance))} <span className="text-sm ml-1 font-bold">CFA</span>
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 italic mt-4 text-right">
                                            * Un solde négatif en rouge indique que le client doit, un solde positif en vert indique une avance client.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border-2 border-dashed">
                        <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
                        <h2 className="text-xl font-semibold text-muted-foreground">Sélectionnez un client pour afficher son relevé</h2>
                        <p className="text-sm text-muted-foreground mt-2">Utilisez le menu à gauche pour choisir un client dans la liste.</p>
                    </div>
                )}
            </div>
        </>
    );
}

Releve.layout = (page: any) => (
    <AppLayout breadcrumbs={[{ title: 'Clients', href: '/clients/releve' }, { title: 'Relevé de compte', href: '/clients/releve' }]}>
        {page}
    </AppLayout>
);
