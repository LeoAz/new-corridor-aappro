<?php

namespace Database\Factories;

use App\Enums\ExportStatus;
use App\Enums\ExportType;
use App\Models\Export;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Export>
 */
class ExportFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => ExportType::RAPPORT_CHARGEMENTS,
            'filters' => [],
            'status' => ExportStatus::PENDING,
        ];
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ExportStatus::COMPLETED,
            'disk' => 'local',
            'path' => 'exports/'.fake()->uuid().'.pdf',
            'filename' => 'rapport.pdf',
            'started_at' => now(),
            'completed_at' => now(),
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ExportStatus::FAILED,
            'error' => 'Erreur de génération',
            'started_at' => now(),
            'completed_at' => now(),
        ]);
    }
}
