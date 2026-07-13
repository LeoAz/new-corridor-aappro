<?php

namespace Database\Seeders;

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Load;
use Illuminate\Database\Seeder;

class InvoiceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $clients = Client::all();
        foreach ($clients as $client) {
            $loads = Load::where('client_id', $client->id)
                ->limit(5)
                ->get();

            if ($loads->count() > 0) {
                $invoice = Invoice::factory()->create([
                    'client_id' => $client->id,
                    'client_name' => $client->nom,
                ]);

                foreach ($loads as $load) {
                    InvoiceItem::factory()->create([
                        'invoice_id' => $invoice->id,
                        'load_id' => $load->id,
                        'quantity_delivered' => $load->volume,
                    ]);

                    $load->update(['status' => LoadStatus::FACTURE]);
                }
            }
        }
    }
}
