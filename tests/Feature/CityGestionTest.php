<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Load;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CityGestionTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    public function test_can_list_cities(): void
    {
        City::factory()->count(3)->create();

        $response = $this->get(route('settings.cities.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('settings/cities')
            ->has('cities', 3)
        );
    }

    public function test_can_create_city(): void
    {
        $response = $this->post(route('settings.cities.store'), [
            'name' => 'Abidjan',
        ]);

        $response->assertStatus(302);
        $this->assertDatabaseHas('cities', ['name' => 'Abidjan']);
    }

    public function test_cannot_create_duplicate_city(): void
    {
        City::create(['name' => 'Abidjan']);

        $response = $this->post(route('settings.cities.store'), [
            'name' => 'Abidjan',
        ]);

        $response->assertSessionHasErrors('name');
    }

    public function test_can_update_city(): void
    {
        $city = City::create(['name' => 'Ancien Nom']);

        $response = $this->put(route('settings.cities.update', $city), [
            'name' => 'Nouveau Nom',
        ]);

        $response->assertStatus(302);
        $this->assertDatabaseHas('cities', [
            'id' => $city->id,
            'name' => 'Nouveau Nom',
        ]);
    }

    public function test_can_delete_city(): void
    {
        $city = City::create(['name' => 'Ville à supprimer']);

        $response = $this->delete(route('settings.cities.destroy', $city));

        $response->assertStatus(302);
        $this->assertDatabaseMissing('cities', ['id' => $city->id]);
    }

    public function test_cannot_delete_city_with_loads(): void
    {
        $city = City::create(['name' => 'Ville liée']);
        Load::factory()->create(['city_id' => $city->id]);

        $response = $this->delete(route('settings.cities.destroy', $city));

        $response->assertStatus(302);
        $this->assertDatabaseHas('cities', ['id' => $city->id]);
        $response->assertSessionHas('error');
    }
}
