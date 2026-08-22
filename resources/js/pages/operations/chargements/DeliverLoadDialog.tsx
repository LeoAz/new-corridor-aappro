import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

import AlertError from '@/components/alert-error';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { SimpleAutocomplete } from '@/components/ui/simple-autocomplete';
import { cn } from '@/lib/utils';
import type { Client, Load } from '@/types';

export default function DeliverLoadDialog({
    open,
    onOpenChange,
    data,
    setData,
    errors,
    processing,
    onSubmit,
    clients,
    selectedLoad,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: any;
    setData: (...args: any[]) => void;
    errors: Record<string, string>;
    processing: boolean;
    onSubmit: (e: React.FormEvent) => void;
    clients: Client[];
    selectedLoad: Load | null;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <form onSubmit={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>Effectuer la livraison</DialogTitle>
                        <DialogDescription>
                            Saisissez les informations de livraison pour le
                            véhicule{' '}
                            <span className="font-bold">
                                {selectedLoad?.vehicle_registration}
                            </span>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    {Object.keys(errors).length > 0 && (
                        <div className="px-6 pt-4">
                            <AlertError errors={Object.values(errors)} />
                        </div>
                    )}

                    <div className="grid gap-4 px-6 py-4">
                        <div className="space-y-2">
                            <Label>Date de livraison</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={'outline'}
                                        className={cn(
                                            'w-full justify-start text-left font-normal',
                                            !data.unload_date &&
                                                'text-muted-foreground',
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {data.unload_date ? (
                                            format(
                                                new Date(data.unload_date),
                                                'dd MMMM yyyy',
                                                { locale: fr },
                                            )
                                        ) : (
                                            <span>Choisir une date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={
                                            data.unload_date
                                                ? new Date(data.unload_date)
                                                : undefined
                                        }
                                        onSelect={(d) =>
                                            setData(
                                                'unload_date',
                                                d
                                                    ? format(d, 'yyyy-MM-dd')
                                                    : '',
                                            )
                                        }
                                        locale={fr}
                                    />
                                </PopoverContent>
                            </Popover>
                            {errors.unload_date && (
                                <p className="text-sm text-destructive">
                                    {errors.unload_date}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="unload_location">
                                Lieu de livraison
                            </Label>
                            <Input
                                id="unload_location"
                                placeholder="Ex: Chantier X, Ville Y"
                                value={data.unload_location}
                                onChange={(e) =>
                                    setData('unload_location', e.target.value)
                                }
                            />
                            {errors.unload_location && (
                                <p className="text-sm text-destructive">
                                    {errors.unload_location}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="deliver_client_id">Client</Label>
                            <SimpleAutocomplete
                                options={clients.map((c) => ({
                                    value: c.id?.toString() || '',
                                    label: c.nom,
                                }))}
                                value={data.client_id || ''}
                                onValueChange={(v) => setData('client_id', v)}
                                onLabelChange={(l) => setData('client_name', l)}
                                placeholder="Sélectionner un client..."
                                emptyMessage="Aucun client trouvé."
                            />
                            {errors.client_id && (
                                <p className="text-sm text-destructive">
                                    {errors.client_id}
                                </p>
                            )}
                            {errors.client_name && (
                                <p className="text-sm text-destructive">
                                    {errors.client_name}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="deliver_volume">Volume livré</Label>
                            <Input
                                id="deliver_volume"
                                type="number"
                                step="0.01"
                                value={data.volume}
                                onChange={(e) =>
                                    setData(
                                        'volume',
                                        parseFloat(e.target.value),
                                    )
                                }
                            />
                            {errors.volume && (
                                <p className="text-sm text-destructive">
                                    {errors.volume}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Valider la livraison
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
