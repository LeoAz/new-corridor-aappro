import { Head, usePoll } from '@inertiajs/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, FileText, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import * as exportsRoutes from '@/routes/exports';
import type { ExportItem, ExportStatus } from '@/types';

interface Props {
    exports: ExportItem[];
    retentionHours: number;
}

const STATUS_STYLES: Record<ExportStatus, string> = {
    pending:
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    completed:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

function formatDate(value: string | null): string {
    return value
        ? format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: fr })
        : '—';
}

export default function ExportsIndex({ exports, retentionHours }: Props) {
    const hasPendingExports = exports.some(
        (item) => item.status === 'pending' || item.status === 'processing',
    );

    const { start, stop } = usePoll(
        3000,
        { only: ['exports', 'notifications'] },
        { autoStart: false },
    );

    useEffect(() => {
        if (hasPendingExports) {
            start();
        } else {
            stop();
        }
    }, [hasPendingExports, start, stop]);

    return (
        <>
            <Head title="Mes exports" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Mes exports
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Les rapports générés restent disponibles pendant{' '}
                        {retentionHours} heures.
                    </p>
                </div>

                <div className="rounded-xl border border-border bg-card shadow-sm">
                    {exports.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
                            <FileText className="h-8 w-8" />
                            Aucun export pour le moment. Lancez un export PDF
                            depuis un rapport.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rapport</TableHead>
                                    <TableHead>Demandé le</TableHead>
                                    <TableHead>Terminé le</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {exports.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            {item.label}
                                            {item.error && (
                                                <div className="text-xs text-destructive">
                                                    {item.error}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(item.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(item.completed_at)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={cn(
                                                    'gap-1',
                                                    STATUS_STYLES[item.status],
                                                )}
                                            >
                                                {(item.status === 'pending' ||
                                                    item.status ===
                                                        'processing') && (
                                                    <Loader2 className="animate-spin" />
                                                )}
                                                {item.status_label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.download_url && (
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-2"
                                                >
                                                    <a href={item.download_url}>
                                                        <Download className="h-4 w-4" />
                                                        Télécharger
                                                    </a>
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
        </>
    );
}

ExportsIndex.layout = {
    breadcrumbs: [{ title: 'Mes exports', href: exportsRoutes.index().url }],
};
