import * as clientsActions from '@/actions/App/Http/Controllers/ClientController';
import { Head, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Edit, MoreHorizontal, Trash, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import AlertError from '@/components/alert-error';
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
import { formatNumber } from '@/lib/utils';

interface Client {
    id: number;
    nom: string;
    contact: string | null;
    address: string | null;
    initial_balance: number;
    created_at: string;
}

interface Props {
    clients: Client[];
}

export default function GestionClients({ clients }: Props) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

    const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm({
        nom: '',
        contact: '',
        address: '',
        initial_balance: 0,
    });

    const columns = useMemo<ColumnDef<Client>[]>(
        () => [
            {
                accessorKey: 'nom',
                header: 'Nom',
                cell: ({ row }) => <div className="font-medium text-foreground">{row.getValue('nom')}</div>,
            },
            {
                accessorKey: 'contact',
                header: 'Contact',
                cell: ({ row }) => <div>{row.getValue('contact') || '-'}</div>,
            },
            {
                accessorKey: 'address',
                header: 'Adresse',
                cell: ({ row }) => <div className="max-w-[200px] truncate">{row.getValue('address') || '-'}</div>,
            },
            {
                accessorKey: 'initial_balance',
                header: () => <div className="text-right">Solde Initial</div>,
                cell: ({ row }) => {
                    const balance = parseFloat(row.getValue('initial_balance'));

                    return (
                        <div className="text-right font-medium">
                            <span className={balance > 0 ? 'text-emerald-600' : (balance < 0 ? 'text-red-600' : '')}>
                                {formatNumber(balance)} CFA
                            </span>
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                cell: ({ row }) => {
                    const client = row.original;

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
                                    <DropdownMenuItem onClick={() => openEditDialog(client)}>
                                        <Edit className="mr-2 h-4 w-4" /> Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setClientToDelete(client);
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
        post(clientsActions.store().url, {
            onSuccess: () => {
                setIsCreateDialogOpen(false);
                reset();
            },
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingClient) {
            return;
        }

        put(clientsActions.update(editingClient.id).url, {
            onSuccess: () => {
                setEditingClient(null);
                reset();
            },
        });
    };

    const handleDelete = () => {
        if (!clientToDelete) {
            return;
        }

        destroy(clientsActions.destroy(clientToDelete.id).url, {
            onSuccess: () => {
                setIsDeleteDialogOpen(false);
                setClientToDelete(null);
            },
        });
    };

    const openEditDialog = (client: Client) => {
        setEditingClient(client);
        setData({
            nom: client.nom,
            contact: client.contact || '',
            address: client.address || '',
            initial_balance: client.initial_balance,
        });
    };

    return (
        <>
            <Head title="Gestion des clients" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestion des clients</h1>
                        <p className="text-sm text-muted-foreground">
                            Gérez votre liste de clients et leurs soldes initiaux.
                        </p>
                    </div>
                    <Button
                        onClick={() => {
                            reset();
                            setIsCreateDialogOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <UserPlus className="mr-2 h-4 w-4" /> Ajouter un client
                    </Button>
                </div>

                <DataTable
                    columns={columns}
                    data={clients}
                    searchKey="nom"
                    hidePagination={true}
                    showNumbering={true}
                />
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleCreate}>
                        <DialogHeader>
                            <DialogTitle>Ajouter un nouveau client</DialogTitle>
                            <DialogDescription>
                                Remplissez les informations ci-dessous pour créer un client.
                            </DialogDescription>
                        </DialogHeader>

                        {Object.keys(errors).length > 0 && (
                            <div className="px-4 pt-4">
                                <AlertError errors={Object.values(errors)} />
                            </div>
                        )}

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nom">Nom complet <span className="text-destructive">*</span></Label>
                                <Input
                                    id="nom"
                                    value={data.nom}
                                    onChange={(e) => setData('nom', e.target.value)}
                                    placeholder="Nom du client ou entreprise"
                                />
                                {errors.nom && <p className="text-sm text-destructive">{errors.nom}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="contact">Contact / Téléphone</Label>
                                <Input
                                    id="contact"
                                    value={data.contact}
                                    onChange={(e) => setData('contact', e.target.value)}
                                    placeholder="+225 ..."
                                />
                                {errors.contact && <p className="text-sm text-destructive">{errors.contact}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="address">Adresse</Label>
                                <Input
                                    id="address"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    placeholder="Ville, quartier..."
                                />
                                {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="initial_balance">Solde Initial (CFA)</Label>
                                <Input
                                    id="initial_balance"
                                    type="number"
                                    value={data.initial_balance}
                                    onChange={(e) => setData('initial_balance', parseFloat(e.target.value))}
                                />
                                <p className="text-[10px] text-muted-foreground italic">Négatif = le client doit, Positif = crédit client</p>
                                {errors.initial_balance && <p className="text-sm text-destructive">{errors.initial_balance}</p>}
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
            <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
                <DialogContent>
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle>Modifier le client</DialogTitle>
                            <DialogDescription>
                                Mettez à jour les informations du client.
                            </DialogDescription>
                        </DialogHeader>

                        {Object.keys(errors).length > 0 && (
                            <div className="px-4 pt-4">
                                <AlertError errors={Object.values(errors)} />
                            </div>
                        )}

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit_nom">Nom complet <span className="text-destructive">*</span></Label>
                                <Input
                                    id="edit_nom"
                                    value={data.nom}
                                    onChange={(e) => setData('nom', e.target.value)}
                                />
                                {errors.nom && <p className="text-sm text-destructive">{errors.nom}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit_contact">Contact / Téléphone</Label>
                                <Input
                                    id="edit_contact"
                                    value={data.contact}
                                    onChange={(e) => setData('contact', e.target.value)}
                                />
                                {errors.contact && <p className="text-sm text-destructive">{errors.contact}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit_address">Adresse</Label>
                                <Input
                                    id="edit_address"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                />
                                {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit_initial_balance">Solde Initial (CFA)</Label>
                                <Input
                                    id="edit_initial_balance"
                                    type="number"
                                    value={data.initial_balance}
                                    onChange={(e) => setData('initial_balance', parseFloat(e.target.value))}
                                />
                                {errors.initial_balance && <p className="text-sm text-destructive">{errors.initial_balance}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditingClient(null)}>Annuler</Button>
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
                            Êtes-vous sûr de vouloir supprimer le client <strong>{clientToDelete?.nom}</strong> ?
                            Cette action est irréversible et pourrait affecter l'historique des opérations.
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

GestionClients.layout = (page: any) => (
    <AppLayout breadcrumbs={[{ title: 'Clients', href: '#' }, { title: 'Gestion des clients', href: '/clients/gestion' }]}>
        {page}
    </AppLayout>
);
