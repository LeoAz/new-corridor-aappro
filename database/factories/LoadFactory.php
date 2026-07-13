<?php

namespace Database\Factories;

use App\Enums\LoadStatus;
use App\Models\City;
use App\Models\Client;
use App\Models\Compartment;
use App\Models\Depot;
use App\Models\Load;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\Factory as EloquentFactory;

/**
 * @extends Factory<Load>
 */
class LoadFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $products = ['GASOIL', 'SUPER', 'FUEL'];

        return [
            'load_date' => $this->faker->dateTimeBetween('-1 month', 'now'),
            'load_location' => $this->faker->address(),
            'product' => $this->faker->randomElement($products),
            'volume' => $this->faker->numberBetween(5000, 30000),
            'vehicle_registration' => strtoupper($this->faker->bothify('??-####-??')),
            'status' => LoadStatus::EN_COURS,
            'depot_id' => Depot::factory(),
            'city_id' => City::factory(),
            'client_id' => Client::factory(),
            'compartment_id' => Compartment::factory(),
            'is_unload' => false,
            'is_paid' => false,
        ];
    }

    public function delivered(): static
    {
        return $this->state(function (array $attributes) {
            $clientId = $attributes['client_id'] ?? null;
            if ($clientId instanceof EloquentFactory) {
                $clientId = $clientId->create()->id;
            }
            if ($clientId instanceof Client) {
                $clientId = $clientId->id;
            }
            $client = Client::find($clientId);

            return [
                'status' => LoadStatus::LIVRE,
                'is_unload' => true,
                'unload_date' => $this->faker->dateTimeBetween($attributes['load_date'], 'now'),
                'unload_location' => $client ? $client->nom : $this->faker->address(),
            ];
        });
    }

    public function invoiced(): static
    {
        return $this->state(function (array $attributes) {
            $clientId = $attributes['client_id'] ?? null;
            if ($clientId instanceof EloquentFactory) {
                $clientId = $clientId->create()->id;
            }
            if ($clientId instanceof Client) {
                $clientId = $clientId->id;
            }
            $client = Client::find($clientId);

            return [
                'status' => LoadStatus::FACTURE,
                'is_unload' => true,
                'unload_date' => $this->faker->dateTimeBetween($attributes['load_date'], 'now'),
                'unload_location' => $client ? $client->nom : $this->faker->address(),
            ];
        });
    }

    public function paid(): static
    {
        return $this->state(function (array $attributes) {
            $clientId = $attributes['client_id'] ?? null;
            if ($clientId instanceof EloquentFactory) {
                $clientId = $clientId->create()->id;
            }
            if ($clientId instanceof Client) {
                $clientId = $clientId->id;
            }
            $client = Client::find($clientId);

            return [
                'status' => LoadStatus::PAYE,
                'is_unload' => true,
                'unload_date' => $this->faker->dateTimeBetween($attributes['load_date'], 'now'),
                'unload_location' => $client ? $client->nom : $this->faker->address(),
                'is_paid' => true,
            ];
        });
    }
}
