<?php

use App\Enums\LoadStatus;
use App\Models\DepotInvoice;
use App\Models\Invoice;
use App\Models\Load;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Carbon::setTestNow('2026-11-15 10:00:00');

    $this->user = User::factory()->create();
});

dataset('reports with a default period', [
    'livraisons' => ['rapports.livraisons', 'loads', fn (string $date) => Load::factory()->create([
        'status' => LoadStatus::LIVRER,
        'unload_date' => $date,
    ])],
    'ventes chargement' => ['rapports.vente-chargement', 'invoices', fn (string $date) => Invoice::factory()->create(['date' => $date])],
    'ventes dépôt' => ['rapports.vente-depot', 'invoices', fn (string $date) => DepotInvoice::factory()->create(['date' => $date])],
]);

test('reports default to the current month when no period is given', function (string $routeName, string $prop, Closure $createRecord) {
    $currentMonth = $createRecord('2026-11-03');
    $createRecord('2026-10-20');

    $response = $this->actingAs($this->user)->get(route($routeName));

    $page = $response->viewData('page')['props'];

    expect(collect($page[$prop])->pluck('id')->all())->toBe([$currentMonth->id])
        ->and($page['filters']['date_from'])->toBe('2026-11-01')
        ->and($page['filters']['date_to'])->toBe('2026-11-30');
})->with('reports with a default period');

test('reports show every date when the period is cleared', function (string $routeName, string $prop, Closure $createRecord) {
    $createRecord('2026-11-03');
    $createRecord('2026-10-20');

    $response = $this->actingAs($this->user)->get(route($routeName, ['date_from' => '', 'date_to' => '']));

    expect($response->viewData('page')['props'][$prop])->toHaveCount(2);
})->with('reports with a default period');

test('reports keep the period chosen by the user', function (string $routeName, string $prop, Closure $createRecord) {
    $createRecord('2026-11-03');
    $october = $createRecord('2026-10-20');

    $response = $this->actingAs($this->user)->get(route($routeName, ['date_from' => '2026-10-01', 'date_to' => '2026-10-31']));

    expect(collect($response->viewData('page')['props'][$prop])->pluck('id')->all())->toBe([$october->id]);
})->with('reports with a default period');

test('report pdf exports default to the current month', function (string $routeName) {
    $this->actingAs($this->user)->get(route($routeName.'.download'))
        ->assertStatus(200)
        ->assertHeader('Content-Type', 'application/pdf');
})->with(['rapports.livraisons', 'rapports.vente-chargement', 'rapports.vente-depot']);

test('chargements report has no default period', function () {
    $oldLoad = Load::factory()->create([
        'status' => LoadStatus::EN_COURS,
        'load_date' => '2026-06-10',
    ]);

    $response = $this->actingAs($this->user)->get(route('rapports.chargements'));

    expect(collect($response->viewData('page')['props']['loads'])->pluck('id')->all())->toBe([$oldLoad->id]);
});
