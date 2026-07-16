<?php

use App\Models\User;

test('client payment crud routes are removed', function (string $method, string $uri) {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->{$method}($uri)
        ->assertNotFound();
})->with([
    ['get', '/finances/reglements'],
    ['post', '/finances/reglements'],
    ['get', '/finances/reglements/1'],
    ['put', '/finances/reglements/1'],
    ['delete', '/finances/reglements/1'],
    ['get', '/finances/reglements/1/download'],
    ['get', '/finances/reglements/advances/1'],
]);
