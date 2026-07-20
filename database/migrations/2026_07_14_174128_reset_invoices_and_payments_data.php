<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Marquer l'ensemble des livraisons comme non payé et changer le statut de FACTURE/PAYE à LIVRER
        DB::table('loads')->update([
            'is_paid' => false,
            'status' => 'LIVRER',
        ]);

        // 2. Supprimer l'ensemble des factures sur le chargement (invoice_items puis invoices)
        DB::table('invoice_items')->delete();
        DB::table('invoices')->delete();

        // 3. Supprimer l'ensembles des reglements (client_payment_items n'existe pas d'après le schéma, on vérifie client_payments)
        // D'après le schéma, il n'y a pas de client_payment_items, mais les invoice_items ont un client_payment_id.
        // On supprime les client_payments.
        DB::table('client_payments')->delete();
    }

    public function down(): void
    {
        //
    }
};
