<?php

namespace Database\Factories;

use App\Enums\PaymentMethod;
use App\Models\Client;
use App\Models\ClientPayment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClientPayment>
 */
class ClientPaymentFactory extends Factory
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
            'payment_type' => $this->faker->randomElement(['REGLEMENT', 'AVANCE']),
            'is_advance' => function (array $attributes) {
                return $attributes['payment_type'] === 'AVANCE';
            },
            'amount' => $this->faker->numberBetween(50000, 1000000),
            'payment_method' => PaymentMethod::ESPECE,
            'date' => $this->faker->date(),
            'reference' => 'REF-'.$this->faker->unique()->numberBetween(1000, 9999),
        ];
    }
}
