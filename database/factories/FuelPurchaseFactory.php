<?php

namespace Database\Factories;

use App\Models\Compartment;
use App\Models\Depot;
use App\Models\FuelPurchase;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FuelPurchase>
 */
class FuelPurchaseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $quantity = $this->faker->numberBetween(5000, 20000);
        $unitPrice = $this->faker->numberBetween(550, 650);

        return [
            'product' => $this->faker->randomElement(['GASOIL', 'SUPER', 'JET A1']),
            'depot_id' => Depot::factory(),
            'compartment_id' => Compartment::factory(),
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'total_price' => $quantity * $unitPrice,
            'purchase_date' => $this->faker->date(),
        ];
    }
}
