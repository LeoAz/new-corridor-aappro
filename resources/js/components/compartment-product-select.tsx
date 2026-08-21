import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Depot } from '@/types';

/**
 * Sélecteur de produit lié au compartiment du dépôt choisi. Si aucun dépôt n'est
 * sélectionné, retombe sur une liste de produits en saisie libre (préfixée `manual:`),
 * auquel cas aucun `compartment_id` n'est associé au chargement.
 */
export default function CompartmentProductSelect({
    id,
    label = 'Produit (Compartiment)',
    selectedDepot,
    hasDepot,
    allProducts,
    value,
    onChange,
    error,
}: {
    id?: string;
    label?: string;
    selectedDepot: Depot | undefined;
    hasDepot: boolean;
    allProducts: string[];
    value: string;
    onChange: (compartmentId: string, product: string) => void;
    error?: string;
}) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Select
                value={value}
                onValueChange={(v) => {
                    const comp = selectedDepot?.compartments?.find((c) => c.id?.toString() === v);
                    onChange(v.startsWith('manual:') ? '' : v, comp?.product || v.replace('manual:', ''));
                }}
            >
                <SelectTrigger id={id}>
                    <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                    {hasDepot
                        ? selectedDepot?.compartments?.map((comp) => (
                              <SelectItem key={comp.id} value={comp.id?.toString() || ''}>
                                  {comp.product}
                              </SelectItem>
                          ))
                        : allProducts.map((product) => (
                              <SelectItem key={product} value={`manual:${product}`}>
                                  {product}
                              </SelectItem>
                          ))}
                </SelectContent>
            </Select>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
