import { Head, router } from '@inertiajs/react';
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
                                                    <span className={initialBalance > 0 ? 'text-emerald-600' : (initialBalance < 0 ? 'text-red-600' : 'text-gray-800')}>
                                                        {initialBalance && initialBalance !== 0 ? formatNumber(Math.abs(initialBalance)) : '-'}
                                                    </span>
                                                </td>
                                            </tr>
                                            {operations.map((op, index) => (
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
                                                        {op.debit > 0 ? (
                                                            <span className="text-red-600">{formatNumber(op.debit)}</span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-gray-700 font-medium tabular-nums">
                                                        {op.credit > 0 ? (
                                                            <span className="text-emerald-600">{formatNumber(op.credit)}</span>
                                                        ) : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                            {operations.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                                                        Aucune opération enregistrée sur cette période.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <tfoot className="bg-gray-50/50 border-t-2 border-gray-100">
                                            <tr>
                                                <td colSpan={2} className="px-6 py-4 text-right font-bold text-gray-800 uppercase text-[10px] tracking-widest">Solde Final au {format(new Date(), 'dd/MM/yyyy')}</td>
                                                <td colSpan={2} className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className={`text-xl font-black tabular-nums ${finalBalance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                            {formatNumber(Math.abs(finalBalance))} CFA
                                                        </span>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                                            {finalBalance < 0 ? 'Le client doit (Débit)' : 'L\'entreprise doit (Crédit)'}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
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
