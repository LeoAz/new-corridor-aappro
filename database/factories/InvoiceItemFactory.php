<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Load;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InvoiceItem>
 */
class InvoiceItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $quantity = $this->faker->numberBetween(1000, 5000);
        $unitPrice = $this->faker->numberBetween(600, 800);

        return [
            'invoice_id' => Invoice::factory(),
            'bl_number' => 'BL-'.$this->faker->unique()->numberBetween(10000, 99999),
            'load_id' => Load::factory(),
            'quantity_delivered' => $quantity,
            'unit_price' => $unitPrice,
            'missing_quantity' => 0,
            'is_partial' => false,
            'total' => $quantity * $unitPrice,
            'is_paid' => false,
        ];
    }
}
