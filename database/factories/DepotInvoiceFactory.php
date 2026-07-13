<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Depot;
use App\Models\DepotInvoice;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DepotInvoice>
 */
class DepotInvoiceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'number' => 'FAC-DEP-'.fake()->year().'-'.fake()->unique()->numberBetween(10000, 99999),
            'date' => fake()->date(),
            'client_id' => Client::factory(),
            'depot_id' => Depot::factory(),
            'issuer_name' => fake()->name(),
            'total_amount' => fake()->randomFloat(2, 1000, 1000000),
        ];
    }
}
