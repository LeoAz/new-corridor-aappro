<?php

use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $invoiceItems = InvoiceItem::all();

        foreach ($invoiceItems as $item) {
            $newTotal = ($item->quantity_delivered - ($item->missing_quantity ?? 0)) * $item->unit_price;
            $item->update(['total' => $newTotal]);
        }

        $invoices = Invoice::all();

        foreach ($invoices as $invoice) {
            $totalAmount = $invoice->items()->sum('total');
            $totalMissing = $invoice->items()->sum('missing_quantity');

            $invoice->update([
                'total_amount' => $totalAmount,
                'total_missing' => $totalMissing,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $invoiceItems = InvoiceItem::all();

        foreach ($invoiceItems as $item) {
            $oldTotal = $item->quantity_delivered * $item->unit_price;
            $item->update(['total' => $oldTotal]);
        }

        $invoices = Invoice::all();

        foreach ($invoices as $invoice) {
            $totalAmount = $invoice->items()->sum('total');
            $totalMissing = $invoice->items()->sum('missing_quantity');

            $invoice->update([
                'total_amount' => $totalAmount,
                'total_missing' => $totalMissing,
            ]);
        }
    }
};
