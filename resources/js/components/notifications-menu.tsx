import { Link, router, usePage, usePoll } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, CheckCheck, Download, FileWarning, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import * as exportsRoutes from '@/routes/exports';
import * as notificationsRoutes from '@/routes/notifications';
import type { AppNotification } from '@/types';

/** Intervalle de rafraîchissement tant qu'un export est en cours de génération. */
const PENDING_EXPORTS_POLL_INTERVAL = 3000;

function downloadFile(url: string): void {
    window.location.href = url;
}

function markAsRead(notification: AppNotification): void {
    if (notification.read) {
        return;
    }

    router.post(
        notificationsRoutes.read(notification.id).url,
        {},
        {
            only: ['notifications'],
            preserveScroll: true,
            preserveState: true,
        },
    );
}

function announce(notification: AppNotification): void {
    if (notification.download_url) {
        const downloadUrl = notification.download_url;

        toast.success(notification.title, {
            description: notification.message,
            duration: 15000,
            action: {
                label: 'Télécharger',
                onClick: () => downloadFile(downloadUrl),
            },
        });

        return;
    }

    toast.error(notification.title, { description: notification.message });
}

export function NotificationsMenu() {
    const { notifications } = usePage().props;
    const pendingExports = notifications?.pending_exports ?? 0;
    const items = useMemo(
        () => notifications?.items ?? [],
        [notifications?.items],
    );
    const knownIds = useRef<Set<string> | null>(null);

    const { start, stop } = usePoll(
        PENDING_EXPORTS_POLL_INTERVAL,
        { only: ['notifications'] },
        { autoStart: false, keepAlive: true },
    );

    useEffect(() => {
        if (pendingExports > 0) {
            start();
        } else {
            stop();
        }
    }, [pendingExports, start, stop]);

    // Annonce par un toast les notifications arrivées depuis l'ouverture de la page.
    useEffect(() => {
        if (knownIds.current === null) {
            knownIds.current = new Set(items.map((item) => item.id));

            return;
        }

        items
            .filter((item) => !item.read && !knownIds.current?.has(item.id))
            .forEach(announce);

        items.forEach((item) => knownIds.current?.add(item.id));
    }, [items]);

    if (!notifications) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label="Notifications"
                >
                    <Bell className="h-5 w-5" />
                    {notifications.unread_count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                            {notifications.unread_count > 9
                                ? '9+'
                                : notifications.unread_count}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    {notifications.unread_count > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() =>
                                router.post(
                                    notificationsRoutes.readAll().url,
                                    {},
                                    {
                                        only: ['notifications'],
                                        preserveScroll: true,
                                        preserveState: true,
                                    },
                                )
                            }
                        >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Tout marquer comme lu
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />

                {pendingExports > 0 && (
                    <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {pendingExports > 1
                            ? `${pendingExports} rapports en cours de génération…`
                            : 'Un rapport est en cours de génération…'}
                    </div>
                )}

                {items.length === 0 && pendingExports === 0 && (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        Aucune notification
                    </div>
                )}

                {items.map((item) => (
                    <DropdownMenuItem
                        key={item.id}
                        className={cn(
                            'flex items-start gap-2 py-2',
                            !item.read && 'bg-muted/50',
                        )}
                        onSelect={() => {
                            markAsRead(item);

                            if (item.download_url) {
                                downloadFile(item.download_url);
                            }
                        }}
                    >
                        {item.download_url ? (
                            <Download className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                            <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        )}
                        <div className="flex min-w-0 flex-col">
                            <span
                                className={cn(
                                    'text-sm',
                                    !item.read && 'font-semibold',
                                )}
                            >
                                {item.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {item.message}
                            </span>
                            {item.created_at && (
                                <span className="text-[11px] text-muted-foreground">
                                    {formatDistanceToNow(
                                        new Date(item.created_at),
                                        { addSuffix: true, locale: fr },
                                    )}
                                </span>
                            )}
                        </div>
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link
                        href={exportsRoutes.index().url}
                        className="justify-center text-sm"
                    >
                        Voir tous mes exports
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
