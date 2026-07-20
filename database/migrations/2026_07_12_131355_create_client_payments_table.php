<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->foreignId('load_id')->nullable()->constrained('loads')->onDelete('set null');
            $table->foreignId('depot_invoice_id')->nullable()->constrained('depot_invoices')->onDelete('set null');
            $table->string('payment_type')->nullable();
            $table->boolean('is_advance')->default(false);
            $table->decimal('amount', 15, 2);
            $table->string('payment_method')->default('ESPECE');
            $table->date('date');
            $table->string('reference')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('client_payments')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_payments');
    }
};
