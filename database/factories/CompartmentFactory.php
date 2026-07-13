<?php

namespace Database\Factories;

use App\Models\Compartment;
use App\Models\Depot;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Compartment>
 */
class CompartmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'depot_id' => Depot::factory(),
            'product' => $this->faker->word(),
            'quantity' => $this->faker->numberBetween(10000, 50000),
        ];
    }
}
