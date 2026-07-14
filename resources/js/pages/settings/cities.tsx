import { Head, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Edit, MoreHorizontal, Plus, Trash } from 'lucide-react';
import { useMemo, useState } from 'react';

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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';

interface City {
    id: number;
    name: string;
    created_at: string;
}

interface Props {
    cities: City[];
}

export default function CitiesPage({ cities }: Props) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingCity, setEditingCity] = useState<City | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [cityToDelete, setCityToDelete] = useState<City | null>(null);

    const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm({
        name: '',
    });

    const columns = useMemo<ColumnDef<City>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Nom de la ville',
                cell: ({ row }) => <div className="font-medium text-foreground">{row.getValue('name')}</div>,
            },
            {
                id: 'actions',
                cell: ({ row }) => {
                    const city = row.original;
                    return (
                        <div className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => openEditDialog(city)}>
                                        <Edit className="mr-2 h-4 w-4" /> Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setCityToDelete(city);
                                            setIsDeleteDialogOpen(true);
                                        }}
                                        className="text-destructive focus:text-destructive"
                                    >
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

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('settings.cities.store'), {
            onSuccess: () => {
                setIsCreateDialogOpen(false);
                reset();
            },
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingCity) {
            return;
        }

        put(route('settings.cities.update', editingCity.id), {
            onSuccess: () => {
                setEditingCity(null);
                reset();
            },
        });
    };

    const handleDelete = () => {
        if (!cityToDelete) {
            return;
        }

        destroy(route('settings.cities.destroy', cityToDelete.id), {
            onSuccess: () => {
                setIsDeleteDialogOpen(false);
                setCityToDelete(null);
            },
        });
    };

    const openEditDialog = (city: City) => {
        setEditingCity(city);
        setData({
            name: city.name,
        });
    };

    return (
        <>
            <Head title="Gestion des villes" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestion des villes</h1>
                        <p className="text-sm text-muted-foreground">
                            Gérez les villes de destination pour les chargements.
                        </p>
                    </div>
                    <Button
                        onClick={() => {
                            reset();
                            setIsCreateDialogOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Ajouter une ville
                    </Button>
                </div>

                <DataTable
                    columns={columns}
                    data={cities}
                    searchKey="name"
                    searchPlaceholder="Rechercher une ville..."
                    hidePagination={true}
                    showNumbering={true}
                />
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleCreate}>
                        <DialogHeader>
                            <DialogTitle>Ajouter une nouvelle ville</DialogTitle>
                            <DialogDescription>
                                Entrez le nom de la ville de destination.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nom de la ville <span className="text-destructive">*</span></Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Ex: Abidjan, Bouaké..."
                                    autoFocus
                                />
                                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annuler</Button>
                            <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white">Enregistrer</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingCity} onOpenChange={(open) => !open && setEditingCity(null)}>
                <DialogContent>
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle>Modifier la ville</DialogTitle>
                            <DialogDescription>
                                Mettez à jour le nom de la ville.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit_name">Nom de la ville <span className="text-destructive">*</span></Label>
                                <Input
                                    id="edit_name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                />
                                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditingCity(null)}>Annuler</Button>
                            <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white">Mettre à jour</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Confirmer la suppression</DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer la ville <strong>{cityToDelete?.name}</strong> ?
                            Cette action sera impossible si la ville est déjà utilisée dans des chargements.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={processing}>Supprimer définitivement</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

CitiesPage.layout = (page: any) => (
    <AppLayout breadcrumbs={[{ title: 'Configuration', href: '#' }, { title: 'Villes', href: '/settings/cities' }]}>
        {page}
    </AppLayout>
);
