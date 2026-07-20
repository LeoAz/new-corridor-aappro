<?php

namespace Database\Seeders;

use App\Models\City;
use Illuminate\Database\Seeder;

class CitySeeder extends Seeder
{
    public function run(): void
    {
        $cities = ['Dakar', 'Thies', 'Saint-Louis', 'Kaolack', 'Ziguinchor', 'Tamba', 'Diourbel', 'Louga', 'Kolda', 'Matam'];
        foreach ($cities as $city) {
            City::create(['name' => $city]);
        }
    }
}
