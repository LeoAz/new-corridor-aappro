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
        Schema::table('loads', function (Blueprint $table) {
            if (! Schema::hasColumn('loads', 'client_payment_id')) {
                $table->foreignId('client_payment_id')->nullable()->constrained('client_payments')->onDelete('set null');
            }
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            if (! Schema::hasColumn('invoice_items', 'is_paid')) {
                $table->boolean('is_paid')->default(false);
            }
            if (! Schema::hasColumn('invoice_items', 'client_payment_id')) {
                $table->foreignId('client_payment_id')->nullable()->constrained('client_payments')->onDelete('set null');
            }
        });

        Schema::table('depot_invoice_items', function (Blueprint $table) {
            if (! Schema::hasColumn('depot_invoice_items', 'is_paid')) {
                $table->boolean('is_paid')->default(false);
            }
            if (! Schema::hasColumn('depot_invoice_items', 'client_payment_id')) {
                $table->foreignId('client_payment_id')->nullable()->constrained('client_payments')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loads', function (Blueprint $table) {
            if (Schema::hasColumn('loads', 'client_payment_id')) {
                $table->dropForeign(['client_payment_id']);
                $table->dropColumn(['client_payment_id']);
            }
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            if (Schema::hasColumn('invoice_items', 'client_payment_id')) {
                $table->dropForeign(['client_payment_id']);
                $table->dropColumn(['client_payment_id']);
            }
            if (Schema::hasColumn('invoice_items', 'is_paid')) {
                $table->dropColumn(['is_paid']);
            }
        });

        Schema::table('depot_invoice_items', function (Blueprint $table) {
            if (Schema::hasColumn('depot_invoice_items', 'client_payment_id')) {
                $table->dropForeign(['client_payment_id']);
                $table->dropColumn(['client_payment_id']);
            }
            if (Schema::hasColumn('depot_invoice_items', 'is_paid')) {
                $table->dropColumn(['is_paid']);
            }
        });
    }
};
