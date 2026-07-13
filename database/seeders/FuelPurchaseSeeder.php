<?php

namespace Database\Seeders;

use App\Models\Depot;
use App\Models\FuelPurchase;
use Illuminate\Database\Seeder;

class FuelPurchaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $depots = Depot::all();
        foreach ($depots as $depot) {
            $compartments = $depot->compartments;
            foreach ($compartments as $compartment) {
                FuelPurchase::factory(2)->create([
                    'depot_id' => $depot->id,
                    'compartment_id' => $compartment->id,
                    'product' => $compartment->product,
                ]);
            }
        }
    }
}
