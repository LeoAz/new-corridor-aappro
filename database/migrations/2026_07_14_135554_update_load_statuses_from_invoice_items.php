<?php

use App\Enums\LoadStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $loadIds = DB::table('invoice_items')
            ->whereNotNull('load_id')
            ->pluck('load_id');

        DB::table('loads')
            ->whereIn('id', $loadIds)
            ->update(['status' => LoadStatus::FACTURER->value]);
    }

    public function down(): void
    {
        $loadIds = DB::table('invoice_items')
            ->whereNotNull('load_id')
            ->pluck('load_id');

        DB::table('loads')
            ->whereIn('id', $loadIds)
            ->update(['status' => LoadStatus::LIVRER->value]);
    }
};
