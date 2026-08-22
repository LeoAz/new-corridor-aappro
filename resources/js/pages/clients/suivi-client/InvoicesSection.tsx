import { router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Eye, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatDateFr, formatVolume } from '@/lib/format';
import * as finances from '@/routes/finances';

import CreateDepotInvoiceDialog from './InvoicesSection/CreateDepotInvoiceDialog';
import EditInvoiceDialog from './InvoicesSection/EditInvoiceDialog';
import type { Client, ClientInvoice, Depot, InvoiceLine } from './types';

export default function InvoicesSection({
    selectedClient,
    depots,
    isSheetOpen,
    onSheetOpenChange,
    clientInvoices,
    setClientInvoices,
    onRefetch,
}: {
    selectedClient: Client | null;
    depots: Depot[];
    isSheetOpen: boolean;
    onSheetOpenChange: (open: boolean) => void;
    clientInvoices: {
        load_invoices: ClientInvoice[];
        depot_invoices: ClientInvoice[];
    };
    setClientInvoices: React.Dispatch<
        React.SetStateAction<{
            load_invoices: ClientInvoice[];
            depot_invoices: ClientInvoice[];
        }>
    >;
    onRefetch: () => void;
}) {
    const [invoiceToDelete, setInvoiceToDelete] =
        React.useState<InvoiceLine | null>(null);
    const [isCreateDepotInvoiceOpen, setIsCreateDepotInvoiceOpen] =
        React.useState(false);
    const [editingClientInvoice, setEditingClientInvoice] =
        React.useState<ClientInvoice | null>(null);
    const [editingClientInvoiceType, setEditingClientInvoiceType] =
        React.useState<InvoiceLine['type'] | null>(null);
    const [isEditClientInvoiceOpen, setIsEditClientInvoiceOpen] =
        React.useState(false);

    const buildInvoiceLines = (
        invoices: ClientInvoice[],
        type: InvoiceLine['type'],
    ): InvoiceLine[] => {
        return invoices.flatMap((invoice) => {
            if (invoice.items.length === 0) {
                return [
                    {
                        id: `${type}-${invoice.id}`,
                        invoice_id: invoice.id,
                        number: invoice.number,
                        date: invoice.date,
                        product: '-',
                        quantity: 0,
                        missing_quantity: 0,
                        unit_price: 0,
                        total: invoice.total_amount,
                        invoice_total: invoice.total_amount,
                        type,
                    },
                ];
            }

            return invoice.items.map((item) => ({
                id: `${type}-${invoice.id}-${item.id}`,
                invoice_id: invoice.id,
                number: invoice.number,
                date: invoice.date,
                product: item.product,
                quantity: item.quantity,
                missing_quantity: item.missing_quantity,
                is_partial: item.is_partial,
                unit_price: item.unit_price,
                total: item.total,
                invoice_total: invoice.total_amount,
                type,
                truck: item.vehicle_registration,
            }));
        });
    };

    const loadInvoiceLines = React.useMemo(
        () => buildInvoiceLines(clientInvoices.load_invoices, 'chargement'),
        [clientInvoices.load_invoices],
    );
    const depotInvoiceLines = React.useMemo(
        () => buildInvoiceLines(clientInvoices.depot_invoices, 'depot'),
        [clientInvoices.depot_invoices],
    );

    const findClientInvoice = (invoice: InvoiceLine): ClientInvoice | null => {
        const invoices =
            invoice.type === 'chargement'
                ? clientInvoices.load_invoices
                : clientInvoices.depot_invoices;

        return (
            invoices.find(
                (clientInvoice) => clientInvoice.id === invoice.invoice_id,
            ) || null
        );
    };

    const openEditClientInvoice = (invoiceLine: InvoiceLine) => {
        const invoice = findClientInvoice(invoiceLine);

        if (!invoice) {
            return;
        }

        setEditingClientInvoice(invoice);
        setEditingClientInvoiceType(invoiceLine.type);
        setIsEditClientInvoiceOpen(true);
    };

    const visitInvoice = (invoice: InvoiceLine, action: 'show' | 'edit') => {
        if (action === 'edit') {
            openEditClientInvoice(invoice);

            return;
        }

        const queryParams = selectedClient
            ? {
                  client_id: selectedClient.id,
                  redirect_back: 'suivi-client',
              }
            : {};

        if (invoice.type === 'chargement') {
            const url =
                action === 'show'
                    ? finances.default.factureChargement.show(
                          invoice.invoice_id,
                      ).url
                    : finances.default.factureChargement.edit(
                          invoice.invoice_id,
                          {
                              query: {
                                  ...queryParams,
                                  lock_client: 1,
                              },
                          },
                      ).url;

            router.visit(url);

            return;
        }

        const url =
            action === 'show'
                ? finances.default.factureDepots.show(invoice.invoice_id).url
                : finances.default.factureDepots.edit(invoice.invoice_id, {
                      query: queryParams,
                  }).url;

        router.visit(url);
    };

    const downloadInvoice = (invoice: InvoiceLine) => {
        const url =
            invoice.type === 'chargement'
                ? finances.default.factureChargement.download(
                      invoice.invoice_id,
                  ).url
                : finances.default.factureDepots.download(invoice.invoice_id)
                      .url;

        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const confirmInvoiceDeletion = () => {
        if (!invoiceToDelete) {
            return;
        }

        const url =
            invoiceToDelete.type === 'chargement'
                ? finances.default.factureChargement.destroy(
                      invoiceToDelete.invoice_id,
                      {
                          query: {
                              redirect_back: 'suivi-client',
                          },
                      },
                  ).url
                : finances.default.factureDepots.destroy(
                      invoiceToDelete.invoice_id,
                      {
                          query: {
                              redirect_back: 'suivi-client',
                          },
                      },
                  ).url;

        router.delete(url, {
            preserveScroll: true,
            onSuccess: () => {
                const invoiceType = invoiceToDelete.type;
                const invoiceId = invoiceToDelete.invoice_id;

                setClientInvoices((current) => {
                    if (invoiceType === 'chargement') {
                        return {
                            ...current,
                            load_invoices: current.load_invoices.filter(
                                (invoice) => invoice.id !== invoiceId,
                            ),
                        };
                    }

                    return {
                        ...current,
                        depot_invoices: current.depot_invoices.filter(
                            (invoice) => invoice.id !== invoiceId,
                        ),
                    };
                });
                setInvoiceToDelete(null);
            },
        });
    };

    const createLoadInvoice = () => {
        if (!selectedClient) {
            return;
        }

        router.visit(
            finances.default.factureChargement.index({
                query: {
                    client_id: selectedClient.id,
                    create: 1,
                    lock_client: 1,
                    redirect_back: 'suivi-client',
                },
            }).url,
        );
    };

    const createDepotInvoice = () => {
        if (!selectedClient) {
            return;
        }

        setIsCreateDepotInvoiceOpen(true);
    };

    const invoiceColumns: ColumnDef<InvoiceLine>[] = React.useMemo(
        () => [
            {
                accessorKey: 'number',
                header: 'N°',
                cell: ({ row }) => (
                    <div className="min-w-36">
                        <div className="font-semibold text-foreground">
                            {row.original.number}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {row.original.type === 'chargement'
                                ? 'Chargement'
                                : 'Dépôt'}
                        </div>
                        {row.original.is_partial && (
                            <Badge variant="outline" className="mt-1">
                                Partielle
                            </Badge>
                        )}
                    </div>
                ),
            },
            {
                accessorKey: 'truck',
                header: 'Camion',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">
                            {row.original.truck || '-'}
                        </span>
                    </div>
                ),
            },
            {
                accessorKey: 'date',
                header: 'Date',
                cell: ({ row }) => formatDateFr(row.original.date),
            },
            {
                accessorKey: 'product',
                header: 'Produit',
                cell: ({ row }) => (
                    <span className="font-medium">{row.original.product}</span>
                ),
            },
            {
                accessorKey: 'quantity',
                header: () => <div className="text-right">Quantité</div>,
                cell: ({ row }) => (
                    <div className="text-right">
                        {formatVolume(row.original.quantity)}
                    </div>
                ),
            },
            {
                accessorKey: 'missing_quantity',
                header: () => <div className="text-right">Manquant</div>,
                cell: ({ row }) => (
                    <div className="text-right">
                        {formatVolume(row.original.missing_quantity)}
                    </div>
                ),
            },
            {
                accessorKey: 'unit_price',
                header: () => <div className="text-right">P.U</div>,
                cell: ({ row }) => (
                    <div className="text-right">
                        {formatCurrency(row.original.unit_price)}
                    </div>
                ),
            },
            {
                accessorKey: 'total',
                header: () => <div className="text-right">TOTAL</div>,
                cell: ({ row }) => (
                    <div className="text-right font-semibold text-primary">
                        {formatCurrency(row.original.total)}
                    </div>
                ),
            },
            {
                id: 'actions',
                header: () => <div className="text-right">Actions</div>,
                cell: ({ row }) => {
                    const invoice = row.original;

                    return (
                        <div className="flex justify-end gap-1">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => visitInvoice(invoice, 'show')}
                                title="Consulter"
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => visitInvoice(invoice, 'edit')}
                                title="Modifier"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => downloadInvoice(invoice)}
                                title="Télécharger le PDF"
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive"
                                onClick={() => setInvoiceToDelete(invoice)}
                                title="Supprimer"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    );
                },
            },
        ],
        [clientInvoices, selectedClient],
    );

    return (
        <>
            <Sheet open={isSheetOpen} onOpenChange={onSheetOpenChange}>
                <SheetContent className="w-full overflow-y-auto min-[1800px]:max-w-[85rem] min-[2000px]:max-w-[95rem] sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-5xl 2xl:max-w-7xl">
                    <SheetHeader className="border-b">
                        <SheetTitle>
                            Factures de {selectedClient?.nom}
                        </SheetTitle>
                        <SheetDescription>
                            Consultez, modifiez, supprimez ou téléchargez
                            directement les factures du client.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="grid gap-3 px-4 sm:grid-cols-3">
                        <div className="rounded-lg border bg-card p-4">
                            <p className="text-sm text-muted-foreground">
                                Factures chargement
                            </p>
                            <p className="text-2xl font-bold">
                                {clientInvoices.load_invoices.length}
                            </p>
                        </div>
                        <div className="rounded-lg border bg-card p-4">
                            <p className="text-sm text-muted-foreground">
                                Factures dépôt
                            </p>
                            <p className="text-2xl font-bold">
                                {clientInvoices.depot_invoices.length}
                            </p>
                        </div>
                        <div className="rounded-lg border bg-card p-4">
                            <p className="text-sm text-muted-foreground">
                                Total factures
                            </p>
                            <p className="text-2xl font-bold">
                                {formatCurrency(
                                    [
                                        ...clientInvoices.load_invoices,
                                        ...clientInvoices.depot_invoices,
                                    ].reduce(
                                        (total, invoice) =>
                                            total + invoice.total_amount,
                                        0,
                                    ),
                                )}
                            </p>
                        </div>
                    </div>
                    <Tabs defaultValue="chargement" className="px-4 pb-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="chargement">
                                Factures Chargement
                            </TabsTrigger>
                            <TabsTrigger value="depot">
                                Factures Dépôt
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent
                            value="chargement"
                            className="mt-4 space-y-3"
                        >
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h3 className="font-semibold">
                                        Factures de chargement
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        La suppression remet les livraisons
                                        liées au statut LIVRER.
                                    </p>
                                </div>
                                <Button onClick={createLoadInvoice}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nouvelle facture
                                </Button>
                            </div>
                            <DataTable
                                columns={invoiceColumns}
                                data={loadInvoiceLines}
                                searchKey="truck"
                                searchPlaceholder="Filtrer par camion..."
                                hidePagination
                            />
                        </TabsContent>
                        <TabsContent value="depot" className="mt-4 space-y-3">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h3 className="font-semibold">
                                        Factures dépôt
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        La suppression restitue les quantités
                                        aux compartiments du dépôt.
                                    </p>
                                </div>
                                <Button onClick={createDepotInvoice}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nouvelle facture
                                </Button>
                            </div>
                            <DataTable
                                columns={invoiceColumns}
                                data={depotInvoiceLines}
                                searchKey="truck"
                                searchPlaceholder="Filtrer par camion..."
                                hidePagination
                            />
                        </TabsContent>
                    </Tabs>
                </SheetContent>
            </Sheet>

            <CreateDepotInvoiceDialog
                open={isCreateDepotInvoiceOpen}
                onOpenChange={setIsCreateDepotInvoiceOpen}
                selectedClient={selectedClient}
                depots={depots}
                onSuccess={onRefetch}
            />

            <EditInvoiceDialog
                open={isEditClientInvoiceOpen}
                onOpenChange={setIsEditClientInvoiceOpen}
                invoice={editingClientInvoice}
                type={editingClientInvoiceType}
                depots={depots}
                onSuccess={onRefetch}
            />

            <Dialog
                open={Boolean(invoiceToDelete)}
                onOpenChange={(open) => !open && setInvoiceToDelete(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirmer la suppression</DialogTitle>
                        <DialogDescription>
                            {invoiceToDelete?.type === 'chargement'
                                ? 'Cette facture sera supprimée et les livraisons liées repasseront au statut LIVRER.'
                                : 'Cette facture dépôt sera supprimée et les quantités seront restituées au stock.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setInvoiceToDelete(null)}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmInvoiceDeletion}
                        >
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
