import { Head, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Edit, MoreHorizontal, Plus, Trash, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as configuration from '@/routes/configuration';

interface Compartment {
    id?: number;
    product: string;
    quantity: number;
}

interface Depot {
    id: number;
    name: string;
    compartments: Compartment[];
}

interface Props {
    depots: Depot[];
}

export default function Depots({ depots }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedDepot, setSelectedDepot] = useState<Depot | null>(null);

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        name: '',
        compartments: [] as Compartment[],
    });

    const columns = useMemo<ColumnDef<Depot>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Nom du dépôt',
                cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
            },
            {
                accessorKey: 'compartments',
                header: 'Compartiments',
                cell: ({ row }) => {
                    const compartments = row.original.compartments;

                    return (
                        <div className="flex flex-wrap gap-1">
                            {compartments.map((c, i) => (
                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                                    {c.product} ({c.quantity} L)
                                </span>
                            ))}
                            {compartments.length === 0 && <span className="text-muted-foreground text-xs italic">Aucun compartiment</span>}
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                cell: ({ row }) => {
                    const depot = row.original;

                    return (
                        <div className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => openEditModal(depot)}>
                                        <Edit className="mr-2 h-4 w-4" /> Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openDeleteModal(depot)} className="text-destructive">
                                        <Trash className="mr-2 h-4 w-4" /> Supprimer
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                },
            },
        ],
        [],
    );

    const openCreateModal = () => {
        reset();
        clearErrors();
        setSelectedDepot(null);
        setIsModalOpen(true);
    };

    const openEditModal = (depot: Depot) => {
        setSelectedDepot(depot);
        setData({
            name: depot.name,
            compartments: depot.compartments.map(c => ({
                id: c.id,
                product: c.product,
                quantity: c.quantity,
            })),
        });
        clearErrors();
        setIsModalOpen(true);
    };

    const openDeleteModal = (depot: Depot) => {
        setSelectedDepot(depot);
        setIsDeleteModalOpen(true);
    };

    const addCompartment = () => {
        setData('compartments', [
            ...data.compartments,
            { product: '', quantity: 0 }
        ]);
    };

    const removeCompartment = (index: number) => {
        const newCompartments = [...data.compartments];
        newCompartments.splice(index, 1);
        setData('compartments', newCompartments);
    };

    const updateCompartment = (index: number, field: keyof Compartment, value: string | number) => {
        const newCompartments = [...data.compartments];
        newCompartments[index] = { ...newCompartments[index], [field]: value };
        setData('compartments', newCompartments);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedDepot) {
            put(configuration.default.depots.update(selectedDepot.id).url, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    toast.success('Dépôt mis à jour avec succès');
                },
            });
        } else {
            post(configuration.default.depots.store().url, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    toast.success('Dépôt créé avec succès');
                },
            });
        }
    };

    const handleDelete = () => {
        if (!selectedDepot) {
            return;
        }

        destroy(configuration.default.depots.destroy(selectedDepot.id).url, {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                toast.success('Dépôt supprimé avec succès');
            },
        });
    };

    return (
        <>
            <Head title="Gestion des dépôts" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">Gestion des dépôts</h1>
                    <Button onClick={openCreateModal}>
                        <Plus className="mr-2 h-4 w-4" /> Nouveau dépôt
                    </Button>
                </div>

                <DataTable
                    columns={columns}
                    data={depots}
                    searchKey="name"
                    showNumbering={true}
                />
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-6xl">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{selectedDepot ? 'Modifier le dépôt' : 'Nouveau dépôt'}</DialogTitle>
                            <DialogDescription>
                                Gérez les informations du dépôt et ses compartiments.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nom du dépôt</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Ex: Dépôt Central"
                                />
                                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Compartiments</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addCompartment}>
                                        <Plus className="mr-2 h-4 w-4" /> Ajouter
                                    </Button>
                                </div>

                                {data.compartments.length === 0 && (
                                    <p className="text-sm text-muted-foreground italic text-center py-4 border-2 border-dashed rounded-md">
                                        Aucun compartiment ajouté.
                                    </p>
                                )}

                                <div className="space-y-3">
                                    {data.compartments.map((comp, index) => (
                                        <div key={index} className="flex items-end gap-3 p-3 bg-muted/50 rounded-lg relative">
                                            <div className="grid flex-1 gap-2">
                                                <Label className="text-xs">Produit</Label>
                                                <Input
                                                    value={comp.product}
                                                    onChange={(e) => updateCompartment(index, 'product', e.target.value)}
                                                    placeholder="Ex: Essence"
                                                />
                                                {errors[`compartments.${index}.product` as any] && (
                                                    <p className="text-xs text-destructive">{errors[`compartments.${index}.product` as any]}</p>
                                                )}
                                            </div>
                                            <div className="grid w-32 gap-2">
                                                <Label className="text-xs">Quantité (L)</Label>
                                                <Input
                                                    type="number"
                                                    value={comp.quantity}
                                                    onChange={(e) => updateCompartment(index, 'quantity', parseFloat(e.target.value))}
                                                />
                                                {errors[`compartments.${index}.quantity` as any] && (
                                                    <p className="text-xs text-destructive">{errors[`compartments.${index}.quantity` as any]}</p>
                                                )}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => removeCompartment(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {selectedDepot ? 'Enregistrer les modifications' : 'Créer le dépôt'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Supprimer le dépôt</DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer le dépôt "{selectedDepot?.name}" ? Cette action supprimera également tous les compartiments associés.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={processing}>
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Depots.layout = {
    breadcrumbs: [
        { title: 'Configuration', href: '#' },
        { title: 'Dépôts', href: configuration.default.depots.index().url },
    ],
};
