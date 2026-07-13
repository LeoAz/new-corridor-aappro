<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Administrateur',
            'email' => 'admin@corridor.test',
            'password' => bcrypt('password'),
        ]);

        $this->call([
            CitySeeder::class,
            ClientSeeder::class,
            DepotSeeder::class,
            FuelPurchaseSeeder::class,
            LoadSeeder::class,
            InvoiceSeeder::class,
        ]);
    }
}
