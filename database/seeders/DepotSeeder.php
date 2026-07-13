<?php

namespace Database\Seeders;

use App\Models\Compartment;
use App\Models\Depot;
use Illuminate\Database\Seeder;

class DepotSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $depots = ['DOT (Dakar)', 'SENSTOCK', 'ARYA'];
        $products = ['GASOIL', 'SUPER', 'FUEL'];

        foreach ($depots as $name) {
            $depot = Depot::create(['name' => $name]);

            foreach ($products as $product) {
                Compartment::create([
                    'depot_id' => $depot->id,
                    'product' => $product,
                    'quantity' => 1000000,
                ]);
            }
        }
    }
}
