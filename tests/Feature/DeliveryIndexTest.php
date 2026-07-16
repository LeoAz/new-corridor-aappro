<?php

use App\Models\User;

test('delivery index page is accessible without invoice creation props', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('operations.livraisons.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('operations/livraisons')
            ->has('deliveries')
            ->has('clients')
            ->missing('cities')
            ->missing('paymentMethods')
        );
});
