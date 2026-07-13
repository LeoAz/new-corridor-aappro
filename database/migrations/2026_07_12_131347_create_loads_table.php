<?php

use App\Enums\LoadStatus;
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
        Schema::create('loads', function (Blueprint $table) {
            $table->id();
            $table->dateTime('load_date');
            $table->string('load_location')->nullable();
            $table->string('product');
            $table->string('volume');
            $table->string('vehicle_registration')->nullable();
            $table->foreignId('depot_id')->nullable()->constrained('depots')->onDelete('cascade');
            $table->boolean('is_unload')->default(false);
            $table->dateTime('unload_date')->nullable();
            $table->string('unload_location')->nullable();
            $table->string('status')->default(LoadStatus::EN_COURS->value);
            $table->boolean('is_paid')->default(false);
            $table->foreignId('city_id')->nullable()->constrained('cities')->onDelete('cascade');
            $table->foreignId('client_id')->nullable()->constrained('clients')->onDelete('cascade');
            $table->string('client_name')->nullable();
            $table->foreignId('compartment_id')->nullable()->constrained('compartments')->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loads');
    }
};
