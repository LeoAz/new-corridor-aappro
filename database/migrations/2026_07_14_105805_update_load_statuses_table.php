<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('loads')->where('status', 'FACTURE')->update(['status' => 'FACTURÉ']);
        DB::table('loads')->where('status', 'LIVRE')->update(['status' => 'LIVRÉ']);
        DB::table('loads')->where('status', 'LIVRE ET FACTURE')->update(['status' => 'LIVRÉ ET FACTURÉ']);
    }

    public function down(): void
    {
        DB::table('loads')->where('status', 'FACTURÉ')->update(['status' => 'FACTURE']);
        DB::table('loads')->where('status', 'LIVRÉ ET FACTURÉ')->update(['status' => 'LIVRE ET FACTURE']);
    }
};
