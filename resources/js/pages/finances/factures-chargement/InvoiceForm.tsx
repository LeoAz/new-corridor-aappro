import { format } from 'date-fns';
import { Check, ChevronsUpDown, Plus, X, CalendarIcon } from 'lucide-react';
import { useState } from 'react';

import AlertError from '@/components/alert-error';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    DialogContent,
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
import { cn, formatNumber } from '@/lib/utils';

const InvoiceForm = ({
    onSubmit,
    onCancel,
    title,
    submitLabel,
    data,
    setData,
    errors,
    processing,
    clients,
    availableLoads,
    filteredAvailableLoads,
    handleEditItem,
    addNewItem,
    addAllAvailableLoads,
    removeItem,
    lockClient,
    lockedClientName,
}: any) => {
    const [openClientCombobox, setOpenClientCombobox] = useState(false);
    const [openCombobox, setOpenCombobox] = useState<number | null>(null);

    return (
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto border border-border shadow-none sm:max-w-[90rem] xl:max-w-[96rem]">
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
            </DialogHeader>

            {Object.keys(errors).length > 0 && (
                <div className="px-6 pt-2">
                    <AlertError errors={Object.values(errors)} />
                </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4 p-6 pt-0">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="client_id">Client</Label>
                        {lockClient ? (
                            <div className="flex h-8 items-center rounded-lg border bg-muted/50 px-3 text-sm font-medium">
                                {lockedClientName || 'Client sélectionné'}
                            </div>
                        ) : (
                            <Popover
                                open={openClientCombobox}
                                onOpenChange={setOpenClientCombobox}
                            >
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openClientCombobox}
                                        className="w-full justify-between font-normal"
                                    >
                                        {data.client_id
                                            ? clients.find(
                                                  (client: any) =>
                                                      client.id.toString() ===
                                                      data.client_id.toString(),
                                              )?.nom
                                            : 'Sélectionner un client'}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[400px] p-0"
                                    align="start"
                                >
                                    <Command>
                                        <CommandInput placeholder="Rechercher un client..." />
                                        <CommandList>
                                            <CommandEmpty>
                                                Aucun client trouvé.
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {clients.map((client: any) => (
                                                    <CommandItem
                                                        key={client.id}
                                                        value={client.nom}
                                                        onSelect={() => {
                                                            setData(
                                                                'client_id',
                                                                client.id.toString(),
                                                            );
                                                            setOpenClientCombobox(
                                                                false,
                                                            );
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 h-4 w-4',
                                                                data.client_id?.toString() ===
                                                                    client.id.toString()
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0',
                                                            )}
                                                        />
                                                        {client.nom}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                    <div className="flex flex-col space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={'outline'}
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !data.date && 'text-muted-foreground',
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {data.date ? (
                                        format(
                                            new Date(data.date),
                                            'dd/MM/yyyy',
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
                                        data.date
                                            ? new Date(data.date)
                                            : undefined
                                    }
                                    onSelect={(date) =>
                                        setData(
                                            'date',
                                            date
                                                ? date
                                                      .toISOString()
                                                      .split('T')[0]
                                                : '',
                                        )
                                    }
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Livraisons</h3>
                    <div className="flex space-x-2">
                        {filteredAvailableLoads.length > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 border-primary text-primary hover:bg-primary hover:text-white"
                                onClick={addAllAvailableLoads}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Tout ajouter ({filteredAvailableLoads.length})
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={addNewItem}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter une livraison
                        </Button>
                    </div>
                </div>

                <div className="max-h-[400px] overflow-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted">
                            <tr>
                                <th className="px-4 py-2 text-left">
                                    Véhicule
                                </th>
                                <th className="px-4 py-2 text-left">Produit</th>
                                <th className="w-32 px-4 py-2 text-right">
                                    Quantité
                                </th>
                                <th className="w-32 px-4 py-2 text-right">
                                    P.U
                                </th>
                                <th className="w-32 px-4 py-2 text-right">
                                    Manquant
                                </th>
                                <th className="px-4 py-2 text-right">Total</th>
                                <th className="w-10 px-4 py-2 text-center"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((item: any, index: number) => (
                                <tr key={index} className="border-t">
                                    <td className="px-4 py-2">
                                        {item.load_id &&
                                        !availableLoads.some(
                                            (l: any) =>
                                                l.id.toString() ===
                                                item.load_id.toString(),
                                        ) ? (
                                            item.vehicle_registration
                                        ) : (
                                            <Popover
                                                open={openCombobox === index}
                                                onOpenChange={(open) =>
                                                    setOpenCombobox(
                                                        open ? index : null,
                                                    )
                                                }
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={
                                                            openCombobox ===
                                                            index
                                                        }
                                                        className="h-8 w-[200px] justify-between font-normal"
                                                    >
                                                        {item.load_id
                                                            ? availableLoads.find(
                                                                  (l: any) =>
                                                                      l.id.toString() ===
                                                                      item.load_id.toString(),
                                                              )
                                                                  ?.vehicle_registration +
                                                              ` (${formatNumber(availableLoads.find((l: any) => l.id.toString() === item.load_id.toString())?.volume)} L)`
                                                            : 'Choisir une livraison'}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-[300px] p-0"
                                                    align="start"
                                                >
                                                    <Command>
                                                        <CommandInput placeholder="Rechercher une livraison..." />
                                                        <CommandList>
                                                            <CommandEmpty>
                                                                Aucune livraison
                                                                trouvée.
                                                            </CommandEmpty>
                                                            <CommandGroup>
                                                                {filteredAvailableLoads.map(
                                                                    (
                                                                        load: any,
                                                                    ) => (
                                                                        <CommandItem
                                                                            key={
                                                                                load.id
                                                                            }
                                                                            value={`${load.vehicle_registration} ${load.bl_number || ''} ${load.product || ''}`}
                                                                            onSelect={() => {
                                                                                handleEditItem(
                                                                                    index,
                                                                                    'load_id',
                                                                                    load.id,
                                                                                );
                                                                                setOpenCombobox(
                                                                                    null,
                                                                                );
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    'mr-2 h-4 w-4',
                                                                                    item.load_id?.toString() ===
                                                                                        load.id.toString()
                                                                                        ? 'opacity-100'
                                                                                        : 'opacity-0',
                                                                                )}
                                                                            />
                                                                            <div className="flex flex-col">
                                                                                <span>
                                                                                    {
                                                                                        load.vehicle_registration
                                                                                    }{' '}
                                                                                    -{' '}
                                                                                    {formatNumber(
                                                                                        load.volume,
                                                                                    )}{' '}
                                                                                    L
                                                                                </span>
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    {
                                                                                        load.product
                                                                                    }{' '}
                                                                                    {load.bl_number
                                                                                        ? `(BL: ${load.bl_number})`
                                                                                        : ''}
                                                                                </span>
                                                                            </div>
                                                                        </CommandItem>
                                                                    ),
                                                                )}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">
                                        {item.product}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <Input
                                            type="number"
                                            value={item.quantity_delivered}
                                            onChange={(e) =>
                                                handleEditItem(
                                                    index,
                                                    'quantity_delivered',
                                                    e.target.value,
                                                )
                                            }
                                            className="h-8 text-right"
                                            disabled
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <Input
                                            type="number"
                                            value={item.unit_price}
                                            onChange={(e) =>
                                                handleEditItem(
                                                    index,
                                                    'unit_price',
                                                    e.target.value,
                                                )
                                            }
                                            className="h-8 text-right"
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <Input
                                            type="number"
                                            value={item.missing_quantity}
                                            onChange={(e) =>
                                                handleEditItem(
                                                    index,
                                                    'missing_quantity',
                                                    e.target.value,
                                                )
                                            }
                                            className="h-8 text-right"
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-right font-medium">
                                        {formatNumber(item.total || 0)} CFA
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => removeItem(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col items-end space-y-2 border-t pt-4">
                    <div className="flex space-x-4 text-lg font-bold">
                        <span>TOTAL MANQUANT:</span>
                        <span className="text-primary">
                            {formatNumber(data.total_missing)} L
                        </span>
                    </div>
                    <div className="flex space-x-4 text-xl font-black">
                        <span>MONTANT TOTAL:</span>
                        <span className="text-primary">
                            {formatNumber(data.total_amount)} CFA
                        </span>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Annuler
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {submitLabel}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
};

export default InvoiceForm;
