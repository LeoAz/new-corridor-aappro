<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // LIVRÉ -> LIVRER
        DB::table('loads')->where('status', 'LIVRÉ')->update(['status' => 'LIVRER']);

        // FACTURÉ -> FACTURER
        DB::table('loads')->where('status', 'FACTURÉ')->update(['status' => 'FACTURER']);

        // LIVRÉ ET FACTURÉ -> FACTURER
        DB::table('loads')->where('status', 'LIVRÉ ET FACTURÉ')->update(['status' => 'FACTURER']);

        // PAYÉ -> FACTURER ET PAYER
        DB::table('loads')->where('status', 'PAYÉ')->update(['status' => 'FACTURER ET PAYER']);

        // LIVRÉ ET PAYÉ -> FACTURER ET PAYER
        DB::table('loads')->where('status', 'LIVRÉ ET PAYÉ')->update(['status' => 'FACTURER ET PAYER']);

        // Anciens formats possibles (sans accents) par sécurité
        DB::table('loads')->where('status', 'LIVRE')->update(['status' => 'LIVRER']);
        DB::table('loads')->where('status', 'FACTURE')->update(['status' => 'FACTURER']);
        DB::table('loads')->where('status', 'PAYE')->update(['status' => 'FACTURER ET PAYER']);
        DB::table('loads')->where('status', 'LIVRE ET FACTURE')->update(['status' => 'FACTURER']);
    }

    public function down(): void
    {
        //
    }
};
