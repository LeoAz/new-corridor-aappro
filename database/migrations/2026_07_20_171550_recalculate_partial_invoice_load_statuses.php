<?php

use App\Enums\LoadStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('loads')
            ->leftJoin('invoice_items', 'loads.id', '=', 'invoice_items.load_id')
            ->where('loads.status', '!=', LoadStatus::PAYE->value)
            ->select(
                'loads.id',
                'loads.volume',
                DB::raw('COUNT(invoice_items.id) as invoice_items_count'),
                DB::raw('SUM(CASE WHEN invoice_items.is_partial = 0 AND invoice_items.id IS NOT NULL THEN 1 ELSE 0 END) as full_invoice_items_count'),
                DB::raw('COALESCE(SUM(CASE WHEN invoice_items.is_partial = 1 THEN invoice_items.quantity_delivered ELSE 0 END), 0) as partial_invoiced_quantity')
            )
            ->groupBy('loads.id', 'loads.volume')
            ->orderBy('loads.id')
            ->each(function (object $load): void {
                $volume = (float) $load->volume;
                $invoiceItemsCount = (int) $load->invoice_items_count;
                $fullInvoiceItemsCount = (int) $load->full_invoice_items_count;
                $partialInvoicedQuantity = (float) $load->partial_invoiced_quantity;

                $status = match (true) {
                    $invoiceItemsCount === 0 => LoadStatus::LIVRER->value,
                    $fullInvoiceItemsCount > 0 => LoadStatus::FACTURER->value,
                    $partialInvoicedQuantity < $volume => LoadStatus::FACTURE_PARTIELLE->value,
                    default => LoadStatus::FACTURER->value,
                };

                DB::table('loads')
                    ->where('id', $load->id)
                    ->update(['status' => $status]);
            });
    }

    public function down(): void
    {
        DB::table('loads')
            ->where('status', LoadStatus::FACTURE_PARTIELLE->value)
            ->update(['status' => LoadStatus::FACTURER->value]);
    }
};
