import { Head, Link } from '@inertiajs/react';
import { format } from 'date-fns';
import { ChevronLeft, FileDown } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatNumber } from '@/lib/utils';
import * as finances from '@/routes/finances';

interface InvoiceItem {
    id: number;
    bl_number: string;
    load_id: number;
    quantity_delivered: number;
    unit_price: number;
    total: number;
    missing_quantity: number;
    load_details?: {
        vehicle_registration: string;
        product: string;
    };
}

interface Invoice {
    id: number;
    number: string;
    date: string;
    client_id: number;
    client_name: string;
    total_amount: number;
    total_missing: number;
    issuer_name: string;
    items: InvoiceItem[];
}

interface Props {
    invoice: Invoice;
    vehicleCounts: Record<string, number>;
}

export default function ShowInvoice({ invoice, vehicleCounts }: Props) {
    const qrUrl = useMemo(() => {
        const qrData = `Facture Chargement: ${invoice.number}\nDate: ${invoice.date}\nClient: ${invoice.client_name}\nMontant: ${formatNumber(invoice.total_amount)} CFA`;

        return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
    }, [invoice]);

    const handleDownloadPDF = () => {
        window.location.href = finances.default.factureChargement.download(invoice.id).url;
    };

    return (
        <>
            <Head title={`Facture ${invoice.number}`} />

            <div className="flex flex-col gap-8 p-4 md:p-8 print:p-0">
                {/* Actions Toolbar */}
                <div className="flex items-center justify-between border-b pb-6 print:hidden">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={finances.default.factureChargement.index().url}>
                                <ChevronLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <h1 className="text-xl font-bold">Détails de la Facture Chargement</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleDownloadPDF}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Télécharger PDF
                        </Button>
                    </div>
                </div>

                {/* Invoice Paper */}
                <div className="mx-auto w-full max-w-4xl bg-white p-12 shadow-sm border border-slate-200 print:border-none print:shadow-none print:max-w-none print:p-10 print:m-0 print:w-[210mm] print:mx-auto">
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <div className="text-4xl font-black tracking-tighter text-slate-900 mb-2">CORRIDOR APPRO</div>
                            <div className="text-xs text-slate-500 uppercase tracking-[0.2em] font-semibold">Service Facturation (Chargement)</div>

                            <div className="mt-8">
                                <div className="text-2xl font-bold text-slate-900">{invoice.number}</div>
                                <div className="text-slate-500 mt-1">Date: {format(new Date(invoice.date), 'dd MMMM yyyy')}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <img src={qrUrl} alt="QR Code Facture" className="w-32 h-32 border p-1 rounded bg-white shadow-sm" />
                            <div className="text-[10px] text-slate-400 uppercase mt-2 font-medium">Scanner pour vérifier</div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-200 mb-10 w-full" />

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-12 mb-12">
                        <div>
                            <div className="text-[10px] font-bold uppercase text-slate-400 mb-3 tracking-wider">Facturé à:</div>
                            <div className="text-lg font-bold text-slate-900">{invoice.client_name}</div>
                            <div className="text-sm text-slate-500 mt-1.5">Client ID: #{invoice.client_id}</div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <div className="text-[10px] font-bold uppercase text-slate-400 mb-3 tracking-wider">Résumé des Véhicules:</div>
                            <div className="space-y-1">
                                {Object.entries(vehicleCounts).map(([product, count]) => (
                                    <div key={product} className="text-sm text-slate-700">
                                        <span className="font-semibold text-slate-900">{product}:</span> {count} véhicule(s)
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="mb-10">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-900 text-slate-900">
                                    <th className="text-left py-4 font-bold uppercase text-[10px] tracking-wider">VÉHICULE</th>
                                    <th className="text-left py-4 font-bold uppercase text-[10px] tracking-wider">PRODUIT</th>
                                    <th className="text-right py-4 font-bold uppercase text-[10px] tracking-wider">QUANTITÉ</th>
                                    <th className="text-right py-4 font-bold uppercase text-[10px] tracking-wider">P.U</th>
                                    <th className="text-right py-4 font-bold uppercase text-[10px] tracking-wider">MANQUANT</th>
                                    <th className="text-right py-4 font-bold uppercase text-[10px] tracking-wider">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoice.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="py-5 font-semibold text-slate-900">{item.load_details?.vehicle_registration}</td>
                                        <td className="py-5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                                item.load_details?.product.toLowerCase() === 'gasoil'
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'bg-red-50 text-red-700'
                                            }`}>
                                                {item.load_details?.product}
                                            </span>
                                        </td>
                                        <td className="py-5 text-right font-medium text-slate-700">{formatNumber(item.quantity_delivered)} L</td>
                                        <td className="py-5 text-right font-medium text-slate-700">{formatNumber(item.unit_price)} CFA</td>
                                        <td className="py-5 text-right text-red-600 font-bold">{formatNumber(item.missing_quantity)} L</td>
                                        <td className="py-5 text-right font-bold text-slate-900">{formatNumber(item.total || 0)} CFA</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Block */}
                    <div className="flex justify-end mt-12">
                        <div className="w-1/2 space-y-3">
                            <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Total Partiel</span>
                                <span className="text-slate-900 font-bold">{formatNumber(invoice.total_amount)} CFA</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Total Manquant</span>
                                <span className="text-red-600 font-bold">{formatNumber(invoice.total_missing)} L</span>
                            </div>
                            <div className="flex justify-between items-center py-4 border-t-2 border-slate-900 mt-4">
                                <span className="text-sm font-black text-slate-900 uppercase">MONTANT TOTAL</span>
                                <span className="text-2xl font-black text-slate-900">{formatNumber(invoice.total_amount)} CFA</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-20 pt-10 border-t border-slate-100 text-center">
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                            CORRIDOR APPRO &bull; Bamako, Mali &bull; Facture officielle de chargement
                        </p>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    aside, header, [data-slot="sidebar-wrapper"] { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
                    body { background: white !important; }
                    .print\\:hidden { display: none !important; }
                    .app-shell, .app-content { width: 100% !important; display: block !important; padding: 0 !important; }
                }
            `}} />
        </>
    );
}

ShowInvoice.layout = (page: any) => {
    const invoice = page.props?.invoice;

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Finances', href: '#' },
                { title: 'Facture chargement', href: finances.default.factureChargement.index().url },
                { title: invoice?.number || 'Détails', href: '' },
            ]}
        >
            {page}
        </AppLayout>
    );
};
