<?php

namespace Database\Factories;

use App\Models\Compartment;
use App\Models\DepotInvoice;
use App\Models\DepotInvoiceItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DepotInvoiceItem>
 */
class DepotInvoiceItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'depot_invoice_id' => DepotInvoice::factory(),
            'compartment_id' => Compartment::factory(),
            'quantity' => fake()->randomFloat(2, 100, 5000),
            'unit_price' => fake()->randomFloat(2, 500, 800),
            'total' => function (array $attributes) {
                return $attributes['quantity'] * $attributes['unit_price'];
            },
        ];
    }
}
