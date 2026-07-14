import { Head, router, useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { CheckCircle2, Download, Eye, MoreHorizontal, Pencil, Plus, Search, Trash, X, Building2, Truck, ReceiptText, CreditCard, Calendar, User, FileText, ChevronRight, Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import AlertError from '@/components/alert-error';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { cn, formatNumber } from '@/lib/utils';
import * as finances from '@/routes/finances';
import * as operations from '@/routes/operations';

type ClientPayment = Record<string, any>;

const normalizeLoadWithInvoiceItem = (load: any, paymentId?: number) => {
    const invoiceItem = paymentId
        ? load.invoice_items?.find((item: any) => Number(item.client_payment_id) === Number(paymentId)) || load.invoice_items?.[0]
        : load.invoice_items?.[0];

    return {
        ...load,
        volume: Number(load.volume || invoiceItem?.quantity_delivered || 0),
        unit_price: Number(invoiceItem?.unit_price || load.unit_price || 0),
        missing_quantity: Number(invoiceItem?.missing_quantity || load.missing_quantity || 0),
    };
};

const isInvoicedLoad = (load: any) => load.status === 'FACTURER' || load.invoice_items?.length > 0 || Number(load.unit_price || 0) > 0 || load.status === 'FACTURER ET PAYER';

const getInvoiceItemForLoad = (payment: any, loadId: number) => {
    return payment.invoice_items?.find((item: any) => Number(item.load_id) === Number(loadId));
};

const normalizePaymentLoads = (payment: any) => {
    return (payment.loads || []).map((load: any) => {
        const invoiceItem = getInvoiceItemForLoad(payment, load.id);
        const normalizedLoad = normalizeLoadWithInvoiceItem(load, payment.id);

        return {
            ...normalizedLoad,
            unit_price: Number(invoiceItem?.unit_price || normalizedLoad.unit_price || 0),
            missing_quantity: Number(invoiceItem?.missing_quantity || normalizedLoad.missing_quantity || 0),
        };
    });
};

const getPaymentDepotInvoiceIds = (payment: any) => {
    const ids = (payment.depot_invoice_items || [])
        .map((item: any) => item.depot_invoice_id)
        .filter(Boolean);

    return ids.length > 0 ? ids : (payment.depot_invoice_id ? [payment.depot_invoice_id] : []);
};

const mergeLoadsById = (currentLoads: any[], incomingLoads: any[]) => {
    const loadsById = new Map(currentLoads.map((load) => [load.id, load]));

    incomingLoads.forEach((load) => {
        loadsById.set(load.id, {
            ...(loadsById.get(load.id) || {}),
            ...load,
        });
    });

    return Array.from(loadsById.values());
};

interface Props {
    payments: ClientPayment[];
    clients: any[];
    paymentMethods: string[];
}

export default function Reglements({ payments, clients, paymentMethods }: Props) {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editStep, setEditStep] = useState(1);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [allClientLoads, setAllClientLoads] = useState<any[]>([]);
    const [allDepotInvoices, setAllDepotInvoices] = useState<any[]>([]);
    const [advances, setAdvances] = useState<any[]>([]);
    const [paymentType, setPaymentType] = useState<'DELIVERY' | 'DEPOT'>('DELIVERY');
    const [selectedPayment, setSelectedPayment] = useState<ClientPayment | null>(null);
    const [detailedPayment, setDetailedPayment] = useState<any>(null);

    const editForm = useForm({
        amount: 0,
        payment_method: '',
        date: '',
        reference: '',
        note: '',
    });

    const advanceForm = useForm({
        client_id: '',
        amount: 0,
        payment_method: 'Virement bancaire',
        date: format(new Date(), 'yyyy-MM-dd'),
        reference: '',
        note: '',
        use_advance: false,
        is_new_advance: true,
    });

    const paymentForm = useForm({
        client_id: '',
        delivery_ids: [] as number[],
        depot_invoice_ids: [] as number[],
        amount: 0,
        payment_method: 'Chèque',
        date: format(new Date(), 'yyyy-MM-dd'),
        reference: '',
        note: '',
        use_advance: false,
        advance_id: '',
        is_new_advance: false,
        missing_quantities: {} as Record<number, number>,
    });

    useEffect(() => {
        if (isPaymentModalOpen && paymentForm.data.client_id) {
            const clientId = paymentForm.data.client_id;
            // Fetch advances and depot invoices
            fetch(finances.default.reglements.advances(Number(clientId)).url)
                .then((res) => res.json())
                .then((data) => {
                    setAdvances(data.advances || []);
                    setAllDepotInvoices((prev) => {
                        const newInvoices = data.depot_invoices || [];
                        const existingIds = new Set(newInvoices.map((i: any) => i.id));
                        // Keep current ones if they are not in the new list (e.g. they are already linked and paid)
                        const currentLinked = prev.filter(i => !existingIds.has(i.id));

                        return [...currentLinked, ...newInvoices];
                    });
                });

            // Fetch loads
            fetch(`${operations.default.livraisons.index().url}?client_id=${clientId}&status=LIVRER,FACTURER`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            })
                .then((res) => res.json())
                .then((data) => {
                    const loads = (Array.isArray(data) ? data : (data.deliveries || [])).map((load: any) => normalizeLoadWithInvoiceItem(load));
                    setAllClientLoads((prev) => {
                        const existingIds = new Set(loads.map((l: any) => l.id));
                        // Keep current ones if they are not in the new list (e.g. they are already linked and paid)
                        const currentLinked = prev.filter(l => !existingIds.has(l.id));

                        return [...currentLinked, ...loads];
                    });
                });
        }
    }, [isPaymentModalOpen, paymentForm.data.client_id]);

    const filteredClientLoads = useMemo(() => {
        const ids = paymentForm.data.delivery_ids;

        return allClientLoads.filter(
            (load) =>
                !ids.includes(load.id) &&
                (load.vehicle_registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    load.product.toLowerCase().includes(searchTerm.toLowerCase())),
        );
    }, [allClientLoads, paymentForm.data.delivery_ids, searchTerm]);

    const selectedLoadsList = useMemo(() => {
        const ids = paymentForm.data.delivery_ids;
        const allMap = new Map(allClientLoads.map((r) => [r.id, r]));

        return ids.map((id) => allMap.get(id)).filter(Boolean) as any[];
    }, [allClientLoads, paymentForm.data.delivery_ids]);

    const filteredDepotInvoices = useMemo(() => {
        const ids = paymentForm.data.depot_invoice_ids;

        return allDepotInvoices.filter(
            (inv) =>
                !ids.includes(inv.id) &&
                (inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    inv.product?.toLowerCase().includes(searchTerm.toLowerCase())),
        );
    }, [allDepotInvoices, paymentForm.data.depot_invoice_ids, searchTerm]);

    const selectedDepotInvoicesList = useMemo(() => {
        const ids = paymentForm.data.depot_invoice_ids;
        const allMap = new Map(allDepotInvoices.map((r) => [r.id, r]));

        return ids.map((id) => allMap.get(id)).filter(Boolean) as any[];
    }, [allDepotInvoices, paymentForm.data.depot_invoice_ids]);

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (paymentType === 'DELIVERY' && currentStep < 3) {
            setCurrentStep(currentStep + 1);

            return;
        }

        const url = isEditing && selectedPayment
            ? finances.default.reglements.update(selectedPayment.id).url
            : finances.default.reglements.store().url;

        const method = isEditing ? 'put' : 'post';

        paymentForm[method](url, {
            onSuccess: () => {
                setIsPaymentModalOpen(false);
                setIsEditing(false);
                setSelectedPayment(null);
                paymentForm.reset();
                setCurrentStep(1);
                setPaymentType('DELIVERY');
                toast.success(isEditing ? 'Règlement mis à jour avec succès' : 'Règlement enregistré avec succès');
            },
            onError: (errors: any) => {
                Object.values(errors).forEach((error: any) => {
                    toast.error(error);
                });
            },
        } as any);
    };

    const addLoadToPayment = (load: any) => {
        paymentForm.setData('delivery_ids', [...paymentForm.data.delivery_ids, load.id]);

        if (isInvoicedLoad(load) && load.missing_quantity !== undefined) {
            paymentForm.setData('missing_quantities' as any, {
                ...(paymentForm.data as any).missing_quantities,
                [load.id]: load.missing_quantity,
            });
        }
    };

    const removeLoadFromPayment = (loadId: number) => {
        paymentForm.setData('delivery_ids', paymentForm.data.delivery_ids.filter((id) => id !== loadId));
    };

    const addDepotInvoiceToPayment = (inv: any) => {
        paymentForm.setData('depot_invoice_ids', [...paymentForm.data.depot_invoice_ids, inv.id]);
    };

    const removeDepotInvoiceFromPayment = (invId: number) => {
        paymentForm.setData('depot_invoice_ids', paymentForm.data.depot_invoice_ids.filter((id) => id !== invId));
    };

    const totalSelectedAmount = useMemo(() => {
        let total = 0;

        if (paymentType === 'DELIVERY') {
            selectedLoadsList.forEach((load) => {
                const missing = Number((paymentForm.data.missing_quantities as any)[load.id] || 0);
                const volume = Number(load.volume || 0);
                const unitPrice = Number(load.unit_price || 0);

                total += (volume - missing) * unitPrice;
            });
        } else {
            selectedDepotInvoicesList.forEach((inv) => {
                total += Number(inv.total_amount || 0);
            });
        }

        return total;
    }, [paymentType, selectedLoadsList, selectedDepotInvoicesList, paymentForm.data.missing_quantities]);

    useEffect(() => {
        if (currentStep === 3 && paymentForm.data.amount === 0 && totalSelectedAmount > 0) {
            paymentForm.setData('amount', totalSelectedAmount);
        }
    }, [currentStep, totalSelectedAmount, paymentForm.data.amount]);

    const handleAmountChange = (newAmount: number) => {
        paymentForm.setData('amount', newAmount);

        // Si on est en mode livraison et qu'il n'y a qu'une seule livraison sélectionnée,
        // on peut ajuster automatiquement le manquant pour correspondre au montant saisi
        if (paymentType === 'DELIVERY' && selectedLoadsList.length === 1) {
            const load = selectedLoadsList[0];
            const unitPrice = Number(load.unit_price || 0);

            if (unitPrice > 0) {
                const targetQuantity = newAmount / unitPrice;
                const calculatedMissing = Number(load.volume || 0) - targetQuantity;

                // On met à jour le manquant si le calcul est cohérent
                if (calculatedMissing >= 0) {
                    const newMissing = {
                        ...(paymentForm.data as any).missing_quantities,
                        [load.id]: Math.round(calculatedMissing * 100) / 100,
                    };
                    paymentForm.setData('missing_quantities' as any, newMissing);
                }
            }
        }
    };

    const handleMissingQuantityChange = (loadId: number, value: string) => {
        const numValue = parseFloat(value) || 0;
        const newMissing = {
            ...(paymentForm.data as any).missing_quantities,
            [loadId]: numValue,
        };

        paymentForm.setData('missing_quantities' as any, newMissing);

        // Update total amount based on selected loads and their missing quantities
        if (paymentType === 'DELIVERY') {
            const total = selectedLoadsList.reduce((acc, load) => {
                const missing = newMissing[load.id] || 0;
                const quantity = Number(load.volume || 0) - missing;
                const unitPrice = Number(load.unit_price || 0);

                return acc + (quantity * unitPrice);
            }, 0);
            paymentForm.setData('amount', total);
        }
    };

    const fetchDetails = async (id: number) => {
        try {
            const response = await fetch(finances.default.reglements.show(id).url);
            const data = await response.json();
            setDetailedPayment(data);
            setIsDetailsModalOpen(true);
        } catch {
            toast.error('Erreur lors du chargement des détails');
        }
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPayment) {
            return;
        }

        editForm.put(finances.default.reglements.update(selectedPayment.id).url, {
            onSuccess: () => {
                setIsEditModalOpen(false);
                toast.success('Règlement mis à jour');
            },
            onError: (errors) => {
                Object.values(errors).forEach((error) => {
                    toast.error(error);
                });
            },
        });
    };

    const handleAdvanceSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        advanceForm.post(finances.default.reglements.store().url, {
            onSuccess: () => {
                setIsAdvanceModalOpen(false);
                advanceForm.reset();
                toast.success('Avance enregistrée');
            },
            onError: (errors) => {
                Object.values(errors).forEach((error) => {
                    toast.error(error);
                });
            },
        });
    };

    const columns = useMemo(
        () => [
            {
                accessorKey: 'date',
                header: 'Date',
                cell: ({ row }: any) => row.original.date ? format(new Date(row.original.date), 'dd/MM/yyyy') : '-',
            },
            {
                accessorKey: 'client.nom',
                header: 'Client',
                cell: ({ row }: any) => row.original.client?.nom || '-',
            },
            {
                accessorKey: 'payment_type',
                header: 'Type',
                cell: ({ row }: any) => (
                    <Badge variant={row.original.is_advance ? 'outline' : 'default'} className="uppercase text-[10px]">
                        {row.original.is_advance ? 'Avance' : (row.original.depot_invoice_id ? 'Vente Dépôt' : 'Livraison')}
                    </Badge>
                ),
            },
            {
                accessorKey: 'amount',
                header: 'Montant',
                cell: ({ row }: any) => formatNumber(row.original.amount) + ' CFA',
            },
            {
                id: 'loads',
                header: 'Livraisons liées',
                cell: ({ row }: any) => {
                    const loads = row.original.loads || [];

                    if (loads.length === 0) {
                        return <span className="text-muted-foreground text-xs">Aucune livraison</span>;
                    }

                    return (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="secondary" size="sm" className="h-7 text-xs font-medium cursor-default">
                                    <Truck className="mr-1 h-3 w-3" />
                                    {loads.length} {loads.length > 1 ? 'livraisons' : 'livraison'}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="p-0 border-none shadow-none" side="right" align="start">
                                <div className="bg-card text-card-foreground rounded-lg border w-72 overflow-hidden">
                                    <div className="bg-muted/50 p-3 border-b">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-primary/10 p-1.5 rounded-md">
                                                <Truck className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold leading-none">Détails des livraisons</h4>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {loads.length} {loads.length > 1 ? 'chargements associés' : 'chargement associé'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
                                        {loads.map((load: any) => (
                                            <div key={load.id} className="bg-muted/30 p-2 rounded-md border border-border/50 transition-colors hover:bg-muted/50">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-xs uppercase tracking-wider">{load.vehicle_registration}</span>
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1 leading-none font-normal">
                                                        {load.product}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {load.loading_date ? format(new Date(load.loading_date), 'dd/MM/yyyy') : '-'}
                                                    </div>
                                                    <div className="font-semibold text-foreground">
                                                        {formatNumber(load.volume)} L
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-muted/50 p-2 px-3 border-t flex justify-between items-center text-[10px] text-muted-foreground">
                                        <span>Total volume</span>
                                        <span className="font-bold text-foreground">
                                            {formatNumber(loads.reduce((acc: number, load: any) => acc + (load.volume || 0), 0))} L
                                        </span>
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    );
                }
            },
            {
                accessorKey: 'payment_method',
                header: 'Méthode',
            },
            {
                accessorKey: 'reference',
                header: 'Référence',
            },
            {
                id: 'actions',
                cell: ({ row }: any) => (
                    <div className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                    onClick={() => fetchDetails(row.original.id)}
                                >
                                    <Eye className="mr-2 h-4 w-4" /> Détails
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        window.open(finances.default.reglements.download(row.original.id).url, '_blank');
                                    }}
                                >
                                    <Download className="mr-2 h-4 w-4" /> Imprimer PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        setSelectedPayment(row.original);
                                        setIsEditing(true);

                                        const paymentLoads = normalizePaymentLoads(row.original);
                                        const depotInvoiceIds = getPaymentDepotInvoiceIds(row.original);
                                        const type = depotInvoiceIds.length > 0 ? 'DEPOT' : 'DELIVERY';
                                        setPaymentType(type);

                                        // Ensure existing loads/invoices are in the selection pools
                                        if (paymentLoads.length > 0) {
                                            setAllClientLoads((prev) => {
                                                return mergeLoadsById(prev, paymentLoads);
                                            });
                                        }

                                        const depotInvoices = (row.original.depot_invoice_items || [])
                                            .map((item: any) => item.depot_invoice)
                                            .filter(Boolean);

                                        if (row.original.depot_invoice) {
                                            depotInvoices.push(row.original.depot_invoice);
                                        }

                                        if (depotInvoices.length > 0) {
                                            setAllDepotInvoices((prev) => {
                                                const existingIds = new Set(prev.map((i) => i.id));
                                                const newInvoices = depotInvoices.filter((invoice: any) => !existingIds.has(invoice.id));

                                                return [...prev, ...newInvoices];
                                            });
                                        }

                                        // Map missing quantities from invoiceItems
                                        const missingQuantities: Record<number, number> = {};
                                        paymentLoads.forEach((load: any) => {
                                            missingQuantities[load.id] = Number(load.missing_quantity || 0);
                                        });

                                        paymentForm.setData({
                                            client_id: row.original.client_id.toString(),
                                            delivery_ids: paymentLoads.map((l: any) => l.id),
                                            depot_invoice_ids: depotInvoiceIds,
                                            amount: Number(row.original.amount),
                                            payment_method: row.original.payment_method,
                                            date: row.original.date ? format(new Date(row.original.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                                            reference: row.original.reference || '',
                                            note: row.original.note || '',
                                            use_advance: !!row.original.parent_id,
                                            advance_id: row.original.parent_id?.toString() || '',
                                            is_new_advance: !!row.original.is_advance,
                                            missing_quantities: missingQuantities,
                                        });

                                        setIsEditing(true);
                                        setSelectedPayment(row.original);
                                        setPaymentType(type);
                                        setCurrentStep(1);
                                        setIsPaymentModalOpen(true);
                                    }}
                                >
                                    <Pencil className="mr-2 h-4 w-4" /> Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        setSelectedPayment(row.original);
                                        setIsDeleteModalOpen(true);
                                    }}
                                    className="text-destructive"
                                >
                                    <Trash className="mr-2 h-4 w-4" /> Supprimer
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ),
            },
        ],
        [],
    );

    const handleDelete = () => {
        if (!selectedPayment) {
            return;
        }

        router.delete(finances.default.reglements.destroy(selectedPayment.id).url, {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                toast.success('Règlement supprimé avec succès');
            },
            onError: (errors) => {
                Object.values(errors).forEach((error) => {
                    toast.error(error);
                });
            },
        });
    };

    return (
        <>
            <Head title="Règlements" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        Historique des règlements
                    </h1>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => {
                                paymentForm.reset();
                                setIsEditing(false);
                                setSelectedPayment(null);
                                setCurrentStep(1);
                                setPaymentType('DELIVERY');
                                setIsPaymentModalOpen(true);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            <Truck className="mr-2 h-4 w-4" /> Règlement sur livraisons
                        </Button>
                        <Button
                            onClick={() => {
                                paymentForm.reset();
                                setIsEditing(false);
                                setSelectedPayment(null);
                                setCurrentStep(1);
                                setPaymentType('DEPOT');
                                setIsPaymentModalOpen(true);
                            }}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            <Building2 className="mr-2 h-4 w-4" /> Règlement sur vente dépôt
                        </Button>
                        <Button
                            onClick={() => setIsAdvanceModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Saisir une avance
                        </Button>
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    data={payments}
                    searchKey="reference"
                    searchPlaceholder="Rechercher par référence..."
                    showNumbering={true}
                />
            </div>

            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmer la suppression</DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer ce règlement ?
                            {selectedPayment?.payment_type === 'REGLEMENT' &&
                                " Les livraisons associées repasseront au statut 'FACTURÉ'."}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Modification */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className={cn(selectedPayment && !selectedPayment.is_advance && editStep === 1 ? "max-w-3xl" : "max-w-lg")}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-blue-600" />
                            Modifier le règlement
                        </DialogTitle>
                        <DialogDescription>
                            {selectedPayment?.is_advance
                                ? "Mettez à jour les informations de l'avance."
                                : editStep === 1
                                    ? "Visualisez les éléments associés à ce règlement."
                                    : "Mettez à jour les informations de paiement."}
                        </DialogDescription>
                    </DialogHeader>

                    {!selectedPayment?.is_advance && (
                        <div className="flex items-center justify-center mb-6">
                            <div className="flex items-center w-full max-w-xs">
                                <div className="relative flex flex-col items-center flex-1">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors z-10",
                                        editStep >= 1 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
                                    )}>
                                        {editStep > 1 ? <Check className="h-4 w-4" /> : "1"}
                                    </div>
                                    <span className="text-[10px] mt-1 font-medium text-slate-500 uppercase tracking-tighter">Éléments</span>
                                </div>
                                <div className={cn("h-0.5 flex-1 transition-colors", editStep > 1 ? "bg-blue-600" : "bg-slate-200")} />
                                <div className="relative flex flex-col items-center flex-1">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors z-10",
                                        editStep === 2 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
                                    )}>
                                        2
                                    </div>
                                    <span className="text-[10px] mt-1 font-medium text-slate-500 uppercase tracking-tighter">Infos</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleEdit} className="space-y-4">
                        {Object.keys(editForm.errors).length > 0 && (
                            <div className="px-6 pt-2">
                                <AlertError errors={Object.values(editForm.errors)} />
                            </div>
                        )}
                        {selectedPayment && !selectedPayment.is_advance && editStep === 1 ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                            {selectedPayment.depot_invoice_id ? "Facture Dépôt" : "Livraisons liées"}
                                        </span>
                                        <Badge variant="outline" className="bg-white">
                                            {selectedPayment.loads?.length || 0} {selectedPayment.loads?.length === 1 ? 'élément' : 'éléments'}
                                        </Badge>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-2">
                                        {selectedPayment.depot_invoice_id ? (
                                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                                                        <Building2 className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900">Facture Dépôt</p>
                                                        <p className="text-xs text-slate-500">ID: {selectedPayment.depot_invoice_id}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-blue-600">{formatNumber(selectedPayment.amount)} CFA</p>
                                                </div>
                                            </div>
                                        ) : (
                                            selectedPayment.loads?.map((load: any) => (
                                                <div key={load.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                                            <Truck className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-slate-900">{load.vehicle_registration}</p>
                                                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" /> {load.loading_date ? format(new Date(load.loading_date), 'dd/MM/yyyy') : '-'} • {load.product}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-slate-700">{formatNumber(load.volume)} L</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {(!selectedPayment.loads || selectedPayment.loads.length === 0) && !selectedPayment.depot_invoice_id && (
                                            <div className="text-center py-8 text-slate-400 text-sm">
                                                Aucun élément lié trouvé.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                                        Annuler
                                    </Button>
                                    <Button type="button" onClick={() => setEditStep(2)} className="bg-blue-600 hover:bg-blue-700">
                                        Suivant <ChevronRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 flex items-center gap-2">
                                            <CreditCard className="h-3 w-3" /> Montant
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={editForm.data.amount}
                                                onChange={(e) => editForm.setData('amount', Number(e.target.value))}
                                                required
                                                className="pr-12 font-bold text-blue-700"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">CFA</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 flex items-center gap-2">
                                            <Calendar className="h-3 w-3" /> Date
                                        </Label>
                                        <Input
                                            type="date"
                                            value={editForm.data.date}
                                            onChange={(e) => editForm.setData('date', e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-600 flex items-center gap-2">
                                        <ReceiptText className="h-3 w-3" /> Méthode de paiement
                                    </Label>
                                    <Select
                                        value={editForm.data.payment_method}
                                        onValueChange={(v) => editForm.setData('payment_method', v)}
                                    >
                                        <SelectTrigger className="h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {paymentMethods.map((m) => (
                                                <SelectItem key={m} value={m}>{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-600 flex items-center gap-2">
                                        <Search className="h-3 w-3" /> Référence
                                    </Label>
                                    <Input
                                        value={editForm.data.reference}
                                        onChange={(e) => editForm.setData('reference', e.target.value)}
                                        placeholder="N° de chèque, virement..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-600 flex items-center gap-2">
                                        <FileText className="h-3 w-3" /> Note
                                    </Label>
                                    <Input
                                        value={editForm.data.note}
                                        onChange={(e) => editForm.setData('note', e.target.value)}
                                        placeholder="Note optionnelle..."
                                    />
                                </div>
                                <DialogFooter className="pt-4">
                                    <div className="flex justify-between w-full">
                                        {selectedPayment && !selectedPayment.is_advance ? (
                                            <Button type="button" variant="ghost" onClick={() => setEditStep(1)}>
                                                Retour
                                            </Button>
                                        ) : (
                                            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                                                Annuler
                                            </Button>
                                        )}
                                        <Button type="submit" disabled={editForm.processing} className="bg-blue-600 hover:bg-blue-700">
                                            {editForm.processing ? "Enregistrement..." : "Enregistrer les modifications"}
                                        </Button>
                                    </div>
                                </DialogFooter>
                            </div>
                        )}
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Détails */}
            <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Détails du règlement</DialogTitle>
                    </DialogHeader>
                    {detailedPayment && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                                <div>
                                    <p className="text-muted-foreground">Client</p>
                                    <p className="font-bold">{detailedPayment.client?.nom}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Montant</p>
                                    <p className="font-bold">{formatNumber(detailedPayment.amount)} CFA</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Date</p>
                                    <p className="font-bold">{detailedPayment.date ? format(new Date(detailedPayment.date), 'dd/MM/yyyy') : '-'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Méthode</p>
                                    <p className="font-bold">{detailedPayment.payment_method}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Type</p>
                                    <p className="font-bold">{detailedPayment.payment_type}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Référence</p>
                                    <p className="font-bold">{detailedPayment.reference || '-'}</p>
                                </div>
                            </div>

                            {detailedPayment.loads?.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="font-semibold">Livraisons payées</h3>
                                    <div className="border rounded-md overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-muted">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Date</th>
                                                    <th className="px-3 py-2 text-left">Véhicule</th>
                                                    <th className="px-3 py-2 text-left">Ville</th>
                                                    <th className="px-3 py-2 text-right">Volume</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailedPayment.loads.map((load: any) => (
                                                    <tr key={load.id} className="border-t hover:bg-muted/50 transition-colors">
                                                        <td className="px-3 py-2">{load.load_date ? format(new Date(load.load_date), 'dd/MM/yyyy') : '-'}</td>
                                                        <td className="px-3 py-2 font-medium">{load.vehicle_registration}</td>
                                                        <td className="px-3 py-2">{load.city?.name}</td>
                                                        <td className="px-3 py-2 text-right">{formatNumber(load.volume)} L</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {detailedPayment.invoice_items?.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="font-semibold">Factures liées</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {detailedPayment.invoice_items.map((item: any) => (
                                            <div key={item.id} className="text-xs border px-3 py-1 rounded bg-blue-50 text-blue-800">
                                                Facture: <span className="font-bold">{item.invoice?.number}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {detailedPayment.note && (
                                <div className="p-3 bg-yellow-50 border border-yellow-100 rounded text-sm text-yellow-800">
                                    <strong>Note:</strong> {detailedPayment.note}
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setIsDetailsModalOpen(false)}>Fermer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Saisie Règlement sur Livraisons / Dépôt */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className={cn('w-[calc(100vw-2rem)] transition-all duration-300 overflow-hidden border border-border p-0 shadow-none', currentStep === 2 ? 'sm:max-w-7xl' : 'sm:max-w-6xl')}>
                    <form onSubmit={handlePaymentSubmit}>
                        {/* Stepper Header */}
                        <div className="bg-slate-900 p-6 text-white">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        {isEditing ? <Pencil className="h-5 w-5 text-blue-400" /> : <CreditCard className="h-5 w-5 text-blue-400" />}
                                        {isEditing ? 'Modifier ' : 'Nouveau '}
                                        {paymentType === 'DELIVERY' ? 'Règlement Livraisons' : 'Règlement Vente Dépôt'}
                                    </h2>
                                    <p className="text-slate-400 text-sm mt-1">
                                        {isEditing ? 'Modification d\'un règlement existant' : 'Saisie d\'un nouveau règlement client'}
                                    </p>
                                </div>
                                {paymentType === 'DELIVERY' && (
                                    <Badge variant="outline" className="border-slate-700 text-slate-300">
                                        Étape {currentStep} sur 3
                                    </Badge>
                                )}
                            </div>

                            {paymentType === 'DELIVERY' && (
                                <div className="relative flex justify-between">
                                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
                                    {[
                                        { step: 1, label: 'Infos de base', icon: FileText },
                                        { step: 2, label: 'Livraisons', icon: Truck },
                                        { step: 3, label: 'Confirmation', icon: CheckCircle2 },
                                    ].map((s) => (
                                        <div key={s.step} className="relative z-10 flex flex-col items-center gap-2">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                                                currentStep === s.step
                                                    ? "bg-blue-600 border-blue-500"
                                                    : currentStep > s.step
                                                        ? "bg-green-600 border-green-400"
                                                        : "bg-slate-900 border-slate-700 text-slate-500"
                                            )}>
                                                {currentStep > s.step ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-medium uppercase tracking-wider",
                                                currentStep === s.step ? "text-blue-400" : currentStep > s.step ? "text-green-400" : "text-slate-500"
                                            )}>
                                                {s.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6">
                            {Object.keys(paymentForm.errors).length > 0 && (
                                <div className="mb-4">
                                    <AlertError errors={Object.values(paymentForm.errors)} />
                                </div>
                            )}
                            {currentStep === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-blue-600 font-semibold mb-2">
                                            <User className="h-4 w-4" />
                                            Identification du Client
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-slate-600">Sélectionner le client</Label>
                                            <Select
                                                value={paymentForm.data.client_id}
                                                onValueChange={(v) => paymentForm.setData('client_id', v)}
                                            >
                                                <SelectTrigger className="h-12 border-slate-200">
                                                    <SelectValue placeholder="Choisir un client..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {clients.map((c: any) => (
                                                        <SelectItem key={c.id} value={c.id.toString()}>
                                                            {c.nom}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Separator className="bg-slate-100" />

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-blue-600 font-semibold mb-2">
                                            <Calendar className="h-4 w-4" />
                                            Détails du Paiement
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-600">Date du règlement</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="date"
                                                        value={paymentForm.data.date}
                                                        onChange={(e) => paymentForm.setData('date', e.target.value)}
                                                        required
                                                        className="h-11 border-slate-200"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-600">Méthode de paiement</Label>
                                                <Select
                                                    value={paymentForm.data.payment_method}
                                                    onValueChange={(v) => paymentForm.setData('payment_method', v)}
                                                >
                                                    <SelectTrigger className="h-11 border-slate-200">
                                                        <SelectValue placeholder="Choisir..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {paymentMethods.map((m) => (
                                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-600">Référence (Chèque/Virement)</Label>
                                                <Input
                                                    value={paymentForm.data.reference}
                                                    onChange={(e) => paymentForm.setData('reference', e.target.value)}
                                                    placeholder="Ex: CHQ-001..."
                                                    className="h-11 border-slate-200"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-600">Montant total</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        value={paymentForm.data.amount || ''}
                                                        onChange={(e) => handleAmountChange(Number(e.target.value))}
                                                        required
                                                        readOnly={paymentType === 'DEPOT' && paymentForm.data.depot_invoice_ids.length > 0}
                                                        className={cn(
                                                            "h-11 border-slate-200 pr-12 font-bold text-blue-700",
                                                            paymentType === 'DEPOT' && paymentForm.data.depot_invoice_ids.length > 0 && "bg-slate-50 cursor-not-allowed"
                                                        )}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">CFA</span>
                                                </div>
                                            </div>
                                        </div>

                                        {paymentType === 'DEPOT' && (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="flex items-center gap-2 text-blue-600 font-semibold mb-2">
                                                    <Building2 className="h-4 w-4" />
                                                    Sélection de la Facture
                                                </div>
                                                <Select
                                                    value={paymentForm.data.depot_invoice_ids[0]?.toString() || ''}
                                                    onValueChange={(v) => {
                                                        const id = Number(v);
                                                        paymentForm.setData('depot_invoice_ids', [id]);
                                                        const inv = allDepotInvoices.find(i => i.id === id);

                                                        if (inv) {
                                                            paymentForm.setData('amount', inv.total_amount);
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="h-12 border-slate-200">
                                                        <SelectValue placeholder="Choisir la facture à régler..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {allDepotInvoices.map((inv: any) => (
                                                            <SelectItem key={inv.id} value={inv.id.toString()}>
                                                                {inv.number} - {inv.product || 'Produit'} ({formatNumber(inv.total_amount)} CFA)
                                                            </SelectItem>
                                                        ))}
                                                        {allDepotInvoices.length === 0 && (
                                                            <SelectItem value="none" disabled>Aucune facture impayée</SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="use_advance_p"
                                                checked={paymentForm.data.use_advance}
                                                onCheckedChange={(checked) => {
                                                    paymentForm.setData('use_advance', !!checked);

                                                    if (checked) {
                                                        paymentForm.setData('is_new_advance', false);
                                                    }
                                                }}
                                                className="border-blue-300 data-[state=checked]:bg-blue-600"
                                            />
                                            <Label htmlFor="use_advance_p" className="text-blue-900 font-medium cursor-pointer">
                                                Utiliser une avance existante
                                            </Label>
                                        </div>

                                        {paymentForm.data.use_advance && (
                                            <div className="animate-in zoom-in-95 duration-200">
                                                <Select
                                                    value={paymentForm.data.advance_id}
                                                    onValueChange={(v) => {
                                                        paymentForm.setData('advance_id', v);

                                                        const adv = advances.find((a) => a.id.toString() === v);

                                                        if (adv) {
                                                            paymentForm.setData('amount', adv.remaining);
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="bg-white border-blue-200 h-11">
                                                        <SelectValue placeholder="Sélectionner une avance..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {advances.map((adv) => (
                                                            <SelectItem key={adv.id} value={adv.id.toString()}>
                                                                {adv.reference || 'Avance sans réf.'} - {formatNumber(adv.remaining)} CFA
                                                            </SelectItem>
                                                        ))}
                                                        {advances.length === 0 && <SelectItem value="none" disabled>Aucune avance</SelectItem>}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {!paymentForm.data.use_advance && (
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="is_new_advance_p"
                                                    checked={paymentForm.data.is_new_advance}
                                                    onCheckedChange={(checked) => paymentForm.setData('is_new_advance', !!checked)}
                                                    className="border-blue-300 data-[state=checked]:bg-blue-600"
                                                />
                                                <Label htmlFor="is_new_advance_p" className="text-blue-900 font-medium cursor-pointer">
                                                    Considérer comme un acompte (Nouvelle avance)
                                                </Label>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-600 flex items-center gap-2">
                                            <FileText className="h-3 w-3" /> Note interne
                                        </Label>
                                        <Input
                                            value={paymentForm.data.note}
                                            onChange={(e) => paymentForm.setData('note', e.target.value)}
                                            placeholder="Commentaire optionnel..."
                                            className="h-11 border-slate-200"
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-600 text-white p-2 rounded-lg">
                                                {paymentType === 'DELIVERY' ? <Truck className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">
                                                    {paymentType === 'DELIVERY' ? 'Sélection des Livraisons' : 'Sélection des Factures Dépôt'}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {paymentType === 'DELIVERY'
                                                        ? 'Ajoutez les bons de livraison concernés par ce paiement'
                                                        : 'Ajoutez les factures de vente sur dépôt à régler'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="relative w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                placeholder="Rechercher..."
                                                className="pl-9 h-10 bg-white"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 h-[450px]">
                                        {/* Colonne Gauche: Disponibles */}
                                        <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-white">
                                            <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Disponibles</span>
                                                <Badge variant="secondary" className="bg-slate-200 text-slate-700">
                                                    {paymentType === 'DELIVERY' ? filteredClientLoads.length : filteredDepotInvoices.length}
                                                </Badge>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                                {paymentType === 'DELIVERY' ? (
                                                    filteredClientLoads.map((load) => (
                                                        <div key={load.id} className="p-3 border border-slate-100 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all group relative cursor-pointer" onClick={() => addLoadToPayment(load)}>
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="font-bold text-sm text-slate-900">{load.vehicle_registration}</span>
                                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{formatNumber(load.volume)} L</span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                                <ReceiptText className="h-3 w-3" /> {load.product}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                                                                <Calendar className="h-2.5 w-2.5" /> {load.unload_date ? format(new Date(load.unload_date), 'dd/MM/yyyy') : '-'}
                                                            </p>
                                                            <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Plus className="h-5 w-5 text-blue-600" />
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    filteredDepotInvoices.map((inv) => (
                                                        <div key={inv.id} className="p-3 border border-slate-100 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all group relative cursor-pointer" onClick={() => addDepotInvoiceToPayment(inv)}>
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="font-bold text-sm text-slate-900">{inv.number}</span>
                                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{formatNumber(inv.total_amount)} CFA</span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                                <Building2 className="h-3 w-3" /> {inv.product || 'Produit'}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                                                                <Calendar className="h-2.5 w-2.5" /> {inv.date ? format(new Date(inv.date), 'dd/MM/yyyy') : '-'}
                                                            </p>
                                                            <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Plus className="h-5 w-5 text-blue-600" />
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                                {(paymentType === 'DELIVERY' ? filteredClientLoads.length : filteredDepotInvoices.length) === 0 && (
                                                    <div className="flex flex-col items-center justify-center h-full py-10 text-slate-400">
                                                        <Search className="h-8 w-8 mb-2 opacity-20" />
                                                        <p className="text-xs">Aucun élément disponible</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Colonne Droite: Sélectionnés */}
                                        <div className="flex flex-col border border-green-200 rounded-lg overflow-hidden bg-green-50/10">
                                            <div className="p-3 bg-green-50 border-b border-green-200 flex justify-between items-center">
                                                <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Sélectionnés</span>
                                                <Badge className="bg-green-600 text-white border-none">
                                                    {paymentType === 'DELIVERY' ? selectedLoadsList.length : selectedDepotInvoicesList.length}
                                                </Badge>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                                {paymentType === 'DELIVERY' ? (
                                                    selectedLoadsList.map((load) => (
                                                        <div key={load.id} className="p-3 border border-green-200 rounded-lg bg-white relative group">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <span className="font-bold text-sm text-slate-900">{load.vehicle_registration}</span>
                                                                    <p className="text-[10px] text-slate-500">{load.product}</p>
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                    onClick={() => removeLoadFromPayment(load.id)}
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-md border border-slate-100">
                                                                <div className="text-[10px]">
                                                                    <p className="text-slate-400 uppercase tracking-tighter">Volume</p>
                                                                    <p className="font-bold text-slate-700">{formatNumber(load.volume)} L</p>
                                                                </div>
                                                                {isInvoicedLoad(load) ? (
                                                                    <div className="space-y-1">
                                                                        <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Manquant (L)</p>
                                                                        <Input
                                                                            type="number"
                                                                            className="h-6 text-[10px] border-green-200 focus-visible:ring-green-400 bg-white"
                                                                            value={paymentForm.data.missing_quantities[load.id] ?? ''}
                                                                            onChange={(e) => handleMissingQuantityChange(load.id, e.target.value)}
                                                                            placeholder="0"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-[10px]">
                                                                        <p className="text-slate-400 uppercase tracking-tighter">Manquant</p>
                                                                        <p className="font-bold text-slate-400">Non facturé</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    selectedDepotInvoicesList.map((inv) => (
                                                        <div key={inv.id} className="p-3 border border-green-200 rounded-lg bg-white relative group">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <div>
                                                                    <span className="font-bold text-sm text-slate-900">{inv.number}</span>
                                                                    <p className="text-[10px] text-slate-500">{inv.product || 'Vente Dépôt'}</p>
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                    onClick={() => removeDepotInvoiceFromPayment(inv.id)}
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                            <p className="font-bold text-green-700 text-sm">{formatNumber(inv.total_amount)} CFA</p>
                                                        </div>
                                                    ))
                                                )}
                                                {(paymentType === 'DELIVERY' ? selectedLoadsList.length : selectedDepotInvoicesList.length) === 0 && (
                                                    <div className="flex flex-col items-center justify-center h-full py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                                        <Truck className="h-8 w-8 mb-2 opacity-10" />
                                                        <p className="text-xs">Glissez ou cliquez pour ajouter</p>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Footer de sélection */}
                                            <div className="p-3 bg-green-600 text-white font-bold flex justify-between items-center shrink-0">
                                                <span className="text-[10px] uppercase">Sous-total sélectionné</span>
                                                <span className="text-sm">{formatNumber(totalSelectedAmount)} CFA</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="bg-blue-600 text-white rounded-lg border border-blue-600 p-6 overflow-hidden relative">
                                        <div className="absolute -right-8 -top-8 opacity-10">
                                            <CheckCircle2 className="h-40 w-40" />
                                        </div>
                                        <div className="relative z-10">
                                            <p className="text-blue-100 text-xs font-medium uppercase tracking-widest mb-2">Montant à encaisser</p>
                                            <h3 className="text-4xl font-black">{formatNumber(paymentForm.data.amount)} <span className="text-xl font-light">CFA</span></h3>

                                            <div className="grid grid-cols-2 gap-8 mt-8 border-t border-blue-500/30 pt-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-blue-500/50 p-2 rounded-lg"><User className="h-4 w-4" /></div>
                                                    <div>
                                                        <p className="text-[10px] text-blue-200 uppercase tracking-tighter">Client</p>
                                                        <p className="font-bold text-sm truncate max-w-[150px]">{clients.find(c => c.id.toString() === paymentForm.data.client_id)?.nom}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-blue-500/50 p-2 rounded-lg"><Calendar className="h-4 w-4" /></div>
                                                    <div>
                                                        <p className="text-[10px] text-blue-200 uppercase tracking-tighter">Date</p>
                                                        <p className="font-bold text-sm">{paymentForm.data.date ? format(new Date(paymentForm.data.date), 'dd MMMM yyyy') : '-'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-3 uppercase tracking-wider">
                                                <CreditCard className="h-3.5 w-3.5 text-blue-500" /> Mode & Référence
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-slate-900">{paymentForm.data.payment_method}</p>
                                                <p className="text-xs text-slate-500 font-medium">{paymentForm.data.reference || 'Aucune référence saisie'}</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-3 uppercase tracking-wider">
                                                <ReceiptText className="h-3.5 w-3.5 text-blue-500" /> Type de règlement
                                            </div>
                                            <Badge variant={paymentForm.data.is_new_advance ? "destructive" : "default"} className="rounded-md">
                                                {paymentForm.data.is_new_advance ? 'AVANCE / ACOMPTE' : (paymentType === 'DELIVERY' ? 'RÈGLEMENT LIVRAISONS' : 'RÈGLEMENT VENTE DÉPÔT')}
                                            </Badge>
                                        </div>
                                    </div>

                                    {!paymentForm.data.is_new_advance && (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                                    <Truck className="h-4 w-4 text-blue-500" />
                                                    {paymentType === 'DELIVERY' ? 'Détail des Livraisons' : 'Factures Sélectionnées'}
                                                </h4>
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-600">{paymentType === 'DELIVERY' ? selectedLoadsList.length : selectedDepotInvoicesList.length}</Badge>
                                            </div>
                                            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto bg-white custom-scrollbar">
                                                {paymentType === 'DELIVERY' ? (
                                                    selectedLoadsList.map((load) => (
                                                        <div key={load.id} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                            <div>
                                                                <p className="font-bold text-xs text-slate-900">{load.vehicle_registration}</p>
                                                                <p className="text-[10px] text-slate-500">{load.product}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-xs text-blue-700">{formatNumber(load.volume)} L</p>
                                                                {paymentForm.data.missing_quantities[load.id] > 0 && (
                                                                    <p className="text-[9px] font-bold text-red-500 uppercase">Manquant: {paymentForm.data.missing_quantities[load.id]} L</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    selectedDepotInvoicesList.map((inv) => (
                                                        <div key={inv.id} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                            <div>
                                                                <p className="font-bold text-xs text-slate-900">{inv.number}</p>
                                                                <p className="text-[10px] text-slate-500">{inv.product || 'Vente Dépôt'}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-xs text-blue-700">{formatNumber(inv.total_amount)} CFA</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {paymentForm.data.note && (
                                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                            <p className="text-[10px] font-bold text-yellow-700 uppercase tracking-widest mb-1">Note interne</p>
                                            <p className="text-sm text-yellow-900">{paymentForm.data.note}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-50 p-6 flex justify-between items-center border-t border-slate-100">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => (paymentType === 'DELIVERY' && currentStep > 1) ? setCurrentStep(currentStep - 1) : setIsPaymentModalOpen(false)}
                                className="text-slate-500 hover:text-slate-900 hover:bg-slate-200 h-12 px-6 font-semibold"
                            >
                                {(paymentType === 'DELIVERY' && currentStep > 1) ? 'Retour à l\'étape précédente' : 'Abandonner'}
                            </Button>

                            <div className="flex gap-3">
                                <Button
                                    type="submit"
                                    className={cn(
                                        "h-12 px-8 rounded-lg font-bold transition-all duration-300 shadow-none",
                                        (paymentType === 'DEPOT' || currentStep === 3)
                                            ? "bg-green-600 hover:bg-green-700 text-white"
                                            : "bg-blue-600 hover:bg-blue-700 text-white"
                                    )}
                                    disabled={
                                        paymentForm.processing ||
                                        (currentStep === 1 && !paymentForm.data.client_id) ||
                                        (paymentType === 'DEPOT' && paymentForm.data.depot_invoice_ids.length === 0) ||
                                        (paymentType === 'DELIVERY' && currentStep === 2 && !paymentForm.data.is_new_advance && selectedLoadsList.length === 0)
                                    }
                                >
                                    {paymentForm.processing ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Traitement...
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {paymentType === 'DEPOT' || currentStep === 3
                                                ? (isEditing ? 'Mettre à jour le règlement' : 'Confirmer le règlement')
                                                : 'Continuer vers l\'étape suivante'}
                                            <ChevronRight className="h-4 w-4" />
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Saisie Avance */}
            <Dialog open={isAdvanceModalOpen} onOpenChange={setIsAdvanceModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Saisir une avance</DialogTitle>
                        <DialogDescription>
                            Enregistrez un nouvel acompte pour un client.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAdvanceSubmit} className="space-y-4 p-6 pt-0">
                        {Object.keys(advanceForm.errors).length > 0 && (
                            <div className="mb-4">
                                <AlertError errors={Object.values(advanceForm.errors)} />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Client</Label>
                            <Select
                                value={advanceForm.data.client_id}
                                onValueChange={(v) => advanceForm.setData('client_id', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir un client..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.nom}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Montant de l'avance</Label>
                                <Input
                                    type="number"
                                    value={advanceForm.data.amount}
                                    onChange={(e) => advanceForm.setData('amount', Number(e.target.value))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input
                                    type="date"
                                    value={advanceForm.data.date}
                                    onChange={(e) => advanceForm.setData('date', e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Méthode de paiement</Label>
                            <Select
                                value={advanceForm.data.payment_method}
                                onValueChange={(v) => advanceForm.setData('payment_method', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {paymentMethods.map((m) => (
                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Référence</Label>
                            <Input
                                value={advanceForm.data.reference}
                                onChange={(e) => advanceForm.setData('reference', e.target.value)}
                                placeholder="N° Chèque ou Virement"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Note</Label>
                            <Input
                                value={advanceForm.data.note}
                                onChange={(e) => advanceForm.setData('note', e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAdvanceModalOpen(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={advanceForm.processing}>
                                Enregistrer l'avance
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

Reglements.layout = (page: any) => (
    <AppLayout breadcrumbs={[{ title: 'Règlements', href: finances.default.reglements.index().url }]}>
        {page}
    </AppLayout>
);
