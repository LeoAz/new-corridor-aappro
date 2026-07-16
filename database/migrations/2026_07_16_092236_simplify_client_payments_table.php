<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('client_payments', function (Blueprint $table) {
            // Supprimer les colonnes inutiles
            $table->dropForeign(['load_id']);
            $table->dropColumn('load_id');
            $table->dropForeign(['depot_invoice_id']);
            $table->dropColumn('depot_invoice_id');
            $table->dropColumn('payment_type');
            $table->dropColumn('is_advance');
            $table->dropForeign(['parent_id']);
            $table->dropColumn('parent_id');

            // Renommer reference en numero pour plus de clarté selon l'énoncé
            $table->renameColumn('reference', 'numero');

            // Ajouter banque
            $table->string('banque')->nullable()->after('date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('client_payments', function (Blueprint $table) {
            $table->foreignId('load_id')->nullable()->constrained('loads')->onDelete('set null');
            $table->foreignId('depot_invoice_id')->nullable()->constrained('depot_invoices')->onDelete('set null');
            $table->string('payment_type')->nullable();
            $table->boolean('is_advance')->default(false);
            $table->foreignId('parent_id')->nullable()->constrained('client_payments')->onDelete('set null');
            $table->renameColumn('numero', 'reference');
            $table->dropColumn('banque');
        });
    }
};
