<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Invoice;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'client_id' => Client::factory(),
            'number' => 'FAC-'.date('Y').'-'.$this->faker->unique()->numberBetween(10000, 99999),
            'date' => now(),
            'client_name' => $this->faker->company,
            'issuer_name' => $this->faker->name,
            'total_missing' => 0,
            'total_amount' => $this->faker->randomFloat(2, 1000, 1000000),
        ];
    }
}
