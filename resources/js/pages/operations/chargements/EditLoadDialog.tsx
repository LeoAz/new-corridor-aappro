import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

import AlertError from '@/components/alert-error';
import CompartmentProductSelect from '@/components/compartment-product-select';
import DepotCombobox from '@/components/depot-combobox';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SimpleAutocomplete } from '@/components/ui/simple-autocomplete';
import { cn } from '@/lib/utils';
import type { City, Client, Depot } from '@/types';

export default function EditLoadDialog({
    open,
    onOpenChange,
    data,
    setData,
    errors,
    processing,
    onSubmit,
    depots,
    cities,
    clients,
    selectedDepot,
    allProducts,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: any;
    setData: (...args: any[]) => void;
    errors: Record<string, string>;
    processing: boolean;
    onSubmit: (e: React.FormEvent) => void;
    depots: Depot[];
    cities: City[];
    clients: Client[];
    selectedDepot: Depot | undefined;
    allProducts: string[];
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl sm:max-w-7xl">
                <form onSubmit={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>Modifier le chargement</DialogTitle>
                        <DialogDescription>
                            Modifiez les informations du chargement.
                        </DialogDescription>
                    </DialogHeader>

                    {Object.keys(errors).length > 0 && (
                        <div className="px-6 pt-4">
                            <AlertError errors={Object.values(errors)} />
                        </div>
                    )}

                    <div className="grid gap-6 px-6 py-4">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Date de chargement</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={'outline'}
                                            className={cn(
                                                'w-full justify-start text-left font-normal',
                                                !data.load_date &&
                                                    'text-muted-foreground',
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {data.load_date ? (
                                                format(
                                                    new Date(data.load_date),
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
                                                data.load_date
                                                    ? new Date(data.load_date)
                                                    : undefined
                                            }
                                            onSelect={(d) =>
                                                setData(
                                                    'load_date',
                                                    d
                                                        ? format(
                                                              d,
                                                              'yyyy-MM-dd',
                                                          )
                                                        : '',
                                                )
                                            }
                                            locale={fr}
                                        />
                                    </PopoverContent>
                                </Popover>
                                {errors.load_date && (
                                    <p className="text-sm text-destructive">
                                        {errors.load_date}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit_vehicle_registration">
                                    Immatriculation
                                </Label>
                                <Input
                                    id="edit_vehicle_registration"
                                    placeholder="AB-123-CD"
                                    value={data.vehicle_registration}
                                    onChange={(e) =>
                                        setData(
                                            'vehicle_registration',
                                            e.target.value,
                                        )
                                    }
                                />
                                {errors.vehicle_registration && (
                                    <p className="text-sm text-destructive">
                                        {errors.vehicle_registration}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="edit_client_id">Client</Label>
                                <SimpleAutocomplete
                                    options={clients.map((c) => ({
                                        value: c.id?.toString() || '',
                                        label: c.nom,
                                    }))}
                                    value={data.client_id || ''}
                                    onValueChange={(v) =>
                                        setData('client_id', v)
                                    }
                                    onLabelChange={(l) =>
                                        setData('client_name', l)
                                    }
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
                            <DepotCombobox
                                id="edit_depot_id"
                                depots={depots}
                                value={data.depot_id}
                                onChange={(depotId) =>
                                    setData((prev: any) => ({
                                        ...prev,
                                        depot_id: depotId,
                                        compartment_id: '',
                                        product: '',
                                    }))
                                }
                                error={errors.depot_id}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <CompartmentProductSelect
                                id="edit_compartment_id"
                                selectedDepot={selectedDepot}
                                hasDepot={!!data.depot_id}
                                allProducts={allProducts}
                                value={data.compartment_id}
                                onChange={(compartmentId, product) =>
                                    setData((prev: any) => ({
                                        ...prev,
                                        compartment_id: compartmentId,
                                        product,
                                    }))
                                }
                                error={errors.compartment_id}
                            />
                            <div className="space-y-2">
                                <Label htmlFor="edit_volume">Volume</Label>
                                <Input
                                    id="edit_volume"
                                    type="number"
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

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="edit_city_id">
                                    Ville de destination
                                </Label>
                                <Select
                                    value={data.city_id}
                                    onValueChange={(v) => setData('city_id', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une ville" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cities.map((city) => (
                                            <SelectItem
                                                key={city.id}
                                                value={
                                                    city.id?.toString() || ''
                                                }
                                            >
                                                {city.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.city_id && (
                                    <p className="text-sm text-destructive">
                                        {errors.city_id}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit_load_location">
                                    Lieu de chargement
                                </Label>
                                <Input
                                    id="edit_load_location"
                                    value={data.load_location}
                                    onChange={(e) =>
                                        setData('load_location', e.target.value)
                                    }
                                />
                                {errors.load_location && (
                                    <p className="text-sm text-destructive">
                                        {errors.load_location}
                                    </p>
                                )}
                            </div>
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
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
