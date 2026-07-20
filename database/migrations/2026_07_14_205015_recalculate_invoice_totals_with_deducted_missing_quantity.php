<?php

use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $invoiceItems = InvoiceItem::all();

        foreach ($invoiceItems as $item) {
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

    public function down(): void
    {
        $invoiceItems = InvoiceItem::all();

        foreach ($invoiceItems as $item) {
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
