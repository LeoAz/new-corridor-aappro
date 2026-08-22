import { Head, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    ArrowUpRight,
    CalendarIcon,
    CreditCard,
    Download,
    FileText,
    Filter,
    Receipt,
    Truck,
    UserRound,
    Wallet,
} from 'lucide-react';
import * as React from 'react';

import { Autocomplete } from '@/components/ui/autocomplete';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { formatCurrency } from '@/lib/format';
import { LOAD_STATUS } from '@/lib/load-status';
import { cn } from '@/lib/utils';
import tracking from '@/routes/clients/suivi-client';

import InvoicesSection from './suivi-client/InvoicesSection';
import LoadsTable from './suivi-client/LoadsTable';
import PaymentsSection from './suivi-client/PaymentsSection';
import type {
    Client,
    ClientInvoice,
    Depot,
    Load,
    Payment,
    Stats,
} from './suivi-client/types';

interface Props {
    clients: Client[];
    selectedClient: Client | null;
    stats: Stats;
    payments: Payment[];
    loads: Load[];
    initial_balance: number;
    total_payments: number;
    current_balance: number;
    depots: Depot[];
    delivered_loads?: Load[];
}

interface PageProps extends Props {
    [key: string]: unknown;
    auth: any;
    flash: any;
    open_invoices?: boolean;
}

export default function SuiviClient({
    clients,
    selectedClient,
    stats,
    payments,
    loads,
    initial_balance,
    total_payments,
    current_balance,
    depots = [],
    delivered_loads = [],
}: Props) {
    const { props } = usePage<PageProps>();
    const openInvoicesParam = props.open_invoices;

    const [startDate, setStartDate] = React.useState<string>('');
    const [endDate, setEndDate] = React.useState<string>('');
    const [isSheetOpen, setIsSheetOpen] = React.useState(false);
    const [isDeliveredLoadsSheetOpen, setIsDeliveredLoadsSheetOpen] =
        React.useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
    const [selectedLoads, setSelectedLoads] = React.useState<Load[]>([]);
    const [clientInvoices, setClientInvoices] = React.useState<{
        load_invoices: ClientInvoice[];
        depot_invoices: ClientInvoice[];
    }>({
        load_invoices: [],
        depot_invoices: [],
    });

    const totalInvoiced = loads.reduce(
        (total, load) => total + load.total_amount,
        0,
    );
    const unpaidLoads = loads.filter(
        (load) =>
            load.status === LOAD_STATUS.FACTURER ||
            load.status === LOAD_STATUS.LIVRE_PARTIELLEMENT,
    ).length;

    const handleClientChange = (clientId: string) => {
        router.get(
            tracking.index({
                query: {
                    client_id: clientId,
                    start_date: startDate,
                    end_date: endDate,
                },
            }).url,
            {},
            { preserveState: true },
        );
    };

    const handleFilter = () => {
        router.get(
            tracking.index({
                query: {
                    client_id: selectedClient?.id,
                    start_date: startDate,
                    end_date: endDate,
                },
            }).url,
            {},
            { preserveState: true },
        );
    };

    const handleExportPdf = () => {
        if (!selectedClient) {
            return;
        }

        window.location.href = tracking.exportPdf({
            query: {
                client_id: selectedClient.id,
                start_date: startDate,
                end_date: endDate,
            },
        }).url;
    };

    async function fetchInvoices() {
        if (!selectedClient) {
            return;
        }

        try {
            const response = await fetch(
                tracking.invoices(selectedClient.id).url,
            );
            const data = await response.json();
            setClientInvoices(data);
            setIsSheetOpen(true);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        }
    }

    React.useEffect(() => {
        if (openInvoicesParam && selectedClient) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronise l'ouverture du sheet avec le paramètre d'URL open_invoices
            fetchInvoices();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openInvoicesParam, selectedClient]);

    return (
        <>
            <Head title="Suivi client" />

            <div className="flex h-full flex-1 flex-col gap-5 p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-foreground">
                            SUIVI CLIENT
                            {selectedClient ? ` - ${selectedClient.nom}` : ''}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Vue consolidée des livraisons, règlements, factures
                            et solde client.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="w-full lg:w-72">
                            <Autocomplete
                                options={clients.map((c) => ({
                                    value: c.id.toString(),
                                    label: c.nom,
                                }))}
                                value={selectedClient?.id?.toString() || ''}
                                onValueChange={handleClientChange}
                                placeholder="Sélectionner un client..."
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'w-40 justify-start text-left font-normal',
                                            !startDate &&
                                                'text-muted-foreground',
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? (
                                            format(
                                                new Date(startDate),
                                                'dd MMM yyyy',
                                                { locale: fr },
                                            )
                                        ) : (
                                            <span>Date début</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                >
                                    <Calendar
                                        mode="single"
                                        selected={
                                            startDate
                                                ? new Date(startDate)
                                                : undefined
                                        }
                                        onSelect={(date) =>
                                            setStartDate(
                                                date
                                                    ? format(date, 'yyyy-MM-dd')
                                                    : '',
                                            )
                                        }
                                    />
                                </PopoverContent>
                            </Popover>
                            <span className="text-sm text-muted-foreground">
                                au
                            </span>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'w-40 justify-start text-left font-normal',
                                            !endDate && 'text-muted-foreground',
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? (
                                            format(
                                                new Date(endDate),
                                                'dd MMM yyyy',
                                                { locale: fr },
                                            )
                                        ) : (
                                            <span>Date fin</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                >
                                    <Calendar
                                        mode="single"
                                        selected={
                                            endDate
                                                ? new Date(endDate)
                                                : undefined
                                        }
                                        onSelect={(date) =>
                                            setEndDate(
                                                date
                                                    ? format(date, 'yyyy-MM-dd')
                                                    : '',
                                            )
                                        }
                                    />
                                </PopoverContent>
                            </Popover>
                            <Button variant="outline" onClick={handleFilter}>
                                <Filter className="mr-2 h-4 w-4" />
                                Filtrer
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleExportPdf}
                                disabled={!selectedClient}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Exporter PDF
                            </Button>
                        </div>
                    </div>
                </div>

                {!selectedClient ? (
                    <div className="flex min-h-[420px] flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/20">
                        <div className="flex max-w-md flex-col items-center gap-3 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background ring-1 ring-border">
                                <UserRound className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-semibold tracking-tight">
                                    Sélectionnez un client
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Les soldes, règlements, livraisons et
                                    factures seront chargés dans une vue unique.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="grid gap-4 lg:grid-cols-[0.7fr_2.3fr]">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <UserRound className="h-4 w-4 text-primary" />
                                        {selectedClient.nom}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-3 text-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">
                                            Contact
                                        </span>
                                        <span className="font-medium">
                                            {selectedClient.contact || '-'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">
                                            Adresse
                                        </span>
                                        <span className="max-w-64 truncate text-right font-medium">
                                            {selectedClient.address || '-'}
                                        </span>
                                    </div>
                                    <Button
                                        className="mt-2 w-full"
                                        variant="secondary"
                                        onClick={fetchInvoices}
                                    >
                                        <FileText className="mr-2 h-4 w-4" />
                                        Afficher les factures
                                        <ArrowUpRight className="ml-auto h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <Card className="border-primary/20 bg-primary/5">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Solde initial
                                        </CardTitle>
                                        <Wallet className="h-4 w-4 text-primary" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xl font-bold">
                                            {formatCurrency(initial_balance)}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card
                                    className={cn(
                                        current_balance > 0
                                            ? 'border-destructive/20 bg-destructive/5'
                                            : 'border-emerald-500/20 bg-emerald-500/5',
                                    )}
                                >
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Solde actuel
                                        </CardTitle>
                                        <CreditCard
                                            className={cn(
                                                'h-4 w-4',
                                                current_balance > 0
                                                    ? 'text-destructive'
                                                    : 'text-emerald-600',
                                            )}
                                        />
                                    </CardHeader>
                                    <CardContent>
                                        <div
                                            className={cn(
                                                'text-xl font-bold',
                                                current_balance > 0
                                                    ? 'text-destructive'
                                                    : 'text-emerald-600',
                                            )}
                                        >
                                            {formatCurrency(current_balance)}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Total facturé
                                        </CardTitle>
                                        <Receipt className="h-4 w-4 text-amber-600" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xl font-bold">
                                            {formatCurrency(totalInvoiced)}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Règlements
                                        </CardTitle>
                                        <Wallet className="h-4 w-4 text-emerald-600" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xl font-bold">
                                            {formatCurrency(total_payments)}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Livraisons livrées
                                    </CardTitle>
                                    <Truck className="h-4 w-4 text-sky-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div className="text-2xl font-bold">
                                            {stats.livrer}
                                        </div>
                                        {stats.livrer > 0 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() =>
                                                    setIsDeliveredLoadsSheetOpen(
                                                        true,
                                                    )
                                                }
                                            >
                                                Afficher les livraisons
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Factures partielles
                                    </CardTitle>
                                    <Receipt className="h-4 w-4 text-violet-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {stats.livre_partiellement}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Facturées à payer
                                    </CardTitle>
                                    <Receipt className="h-4 w-4 text-amber-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {stats.facturer}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {unpaidLoads} sélectionnable(s) pour
                                        paiement
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Facturées et payées
                                    </CardTitle>
                                    <CreditCard className="h-4 w-4 text-emerald-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {stats.facturer_payer}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-5">
                            <PaymentsSection
                                payments={payments}
                                selectedClient={selectedClient}
                                selectedLoads={selectedLoads}
                                isPaymentModalOpen={isPaymentModalOpen}
                                onPaymentModalOpenChange={setIsPaymentModalOpen}
                                onPaymentSuccess={() => setSelectedLoads([])}
                            />

                            <LoadsTable
                                loads={loads}
                                delivered_loads={delivered_loads}
                                selectedLoads={selectedLoads}
                                onSelectedLoadsChange={setSelectedLoads}
                                onOpenPaymentModal={() =>
                                    setIsPaymentModalOpen(true)
                                }
                                isDeliveredLoadsSheetOpen={
                                    isDeliveredLoadsSheetOpen
                                }
                                onDeliveredLoadsSheetOpenChange={
                                    setIsDeliveredLoadsSheetOpen
                                }
                            />
                        </div>
                    </div>
                )}
            </div>

            <InvoicesSection
                selectedClient={selectedClient}
                depots={depots}
                isSheetOpen={isSheetOpen}
                onSheetOpenChange={setIsSheetOpen}
                clientInvoices={clientInvoices}
                setClientInvoices={setClientInvoices}
                onRefetch={fetchInvoices}
            />
        </>
    );
}

SuiviClient.layout = {
    breadcrumbs: [
        { title: 'Clients', href: '#' },
        {
            title: 'Suivi client',
            href: '/clients/suivi-client',
        },
    ],
};
