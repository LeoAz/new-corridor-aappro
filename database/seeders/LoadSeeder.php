<?php

namespace Database\Seeders;

use App\Enums\LoadStatus;
use App\Models\City;
use App\Models\Client;
use App\Models\Depot;
use App\Models\Load;
use Illuminate\Database\Seeder;

class LoadSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $clients = Client::all();
        $depots = Depot::with('compartments')->get();
        $cities = City::all();

        foreach ($clients as $client) {
            // Créer 5 chargements EN COURS
            for ($i = 0; $i < 5; $i++) {
                $depot = $depots->random();
                $compartment = $depot->compartments->random();
                Load::factory()->create([
                    'client_id' => $client->id,
                    'client_name' => $client->nom,
                    'depot_id' => $depot->id,
                    'city_id' => $cities->random()->id,
                    'compartment_id' => $compartment->id,
                    'product' => $compartment->product,
                    'status' => LoadStatus::EN_COURS,
                ]);
            }

            // Créer 10 chargements LIVRÉ
            for ($i = 0; $i < 10; $i++) {
                $depot = $depots->random();
                $compartment = $depot->compartments->random();
                Load::factory()->delivered()->create([
                    'client_id' => $client->id,
                    'client_name' => $client->nom,
                    'unload_location' => $client->nom,
                    'depot_id' => $depot->id,
                    'city_id' => $cities->random()->id,
                    'compartment_id' => $compartment->id,
                    'product' => $compartment->product,
                ]);
            }

            // Créer 10 chargements FACTURÉ
            for ($i = 0; $i < 10; $i++) {
                $depot = $depots->random();
                $compartment = $depot->compartments->random();
                Load::factory()->invoiced()->create([
                    'client_id' => $client->id,
                    'client_name' => $client->nom,
                    'unload_location' => $client->nom,
                    'depot_id' => $depot->id,
                    'city_id' => $cities->random()->id,
                    'compartment_id' => $compartment->id,
                    'product' => $compartment->product,
                ]);
            }

            // Créer 10 chargements PAYÉ
            for ($i = 0; $i < 10; $i++) {
                $depot = $depots->random();
                $compartment = $depot->compartments->random();
                Load::factory()->paid()->create([
                    'client_id' => $client->id,
                    'client_name' => $client->nom,
                    'unload_location' => $client->nom,
                    'depot_id' => $depot->id,
                    'city_id' => $cities->random()->id,
                    'compartment_id' => $compartment->id,
                    'product' => $compartment->product,
                ]);
            }
        }
    }
}
