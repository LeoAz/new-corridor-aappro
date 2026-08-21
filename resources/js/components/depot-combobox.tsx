import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import type { Depot } from '@/types';

export default function DepotCombobox({
    id,
    label = 'Dépôt',
    depots,
    value,
    onChange,
    error,
}: {
    id?: string;
    label?: string;
    depots: Depot[];
    value: string;
    onChange: (depotId: string) => void;
    error?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedDepot = depots.find((d) => d.id?.toString() === value?.toString());

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        variant="outline"
                        role="combobox"
                        aria-expanded={isOpen}
                        className="w-full justify-between"
                    >
                        {selectedDepot?.name || 'Sélectionner un dépôt (facultatif)...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command>
                        <CommandInput placeholder="Rechercher un dépôt..." />
                        <CommandList>
                            <CommandEmpty>Aucun dépôt trouvé.</CommandEmpty>
                            <CommandGroup>
                                <CommandItem
                                    value="none"
                                    onSelect={() => {
                                        onChange('');
                                        setIsOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')}
                                    />
                                    Aucun dépôt
                                </CommandItem>
                                {depots.map((depot) => (
                                    <CommandItem
                                        key={depot.id}
                                        value={depot.name}
                                        keywords={[depot.name]}
                                        onSelect={() => {
                                            onChange(depot.id.toString());
                                            setIsOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                value?.toString() === depot.id?.toString() ? 'opacity-100' : 'opacity-0',
                                            )}
                                        />
                                        {depot.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
