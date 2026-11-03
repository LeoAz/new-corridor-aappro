<?php

use App\Enums\ExportStatus;
use App\Enums\ExportType;
use App\Enums\LoadStatus;
use App\Jobs\GeneratePdfExport;
use App\Models\Client;
use App\Models\Depot;
use App\Models\Export;
use App\Models\Load;
use App\Models\User;
use App\Notifications\ExportFinished;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->user = User::factory()->create();
});

test('requesting an export stores it and queues its generation', function () {
    Queue::fake();

    $response = $this->actingAs($this->user)->postJson(route('exports.store'), [
        'type' => ExportType::RAPPORT_CHARGEMENTS->value,
        'filters' => ['product' => 'GASOIL', 'unknown' => 'ignored'],
    ]);

    $response->assertStatus(202)
        ->assertJsonPath('export.status', ExportStatus::PENDING->value)
        ->assertJsonPath('export.label', 'Rapport des chargements');

    $export = Export::sole();

    expect($export->user_id)->toBe($this->user->id)
        ->and($export->filters)->toBe(['product' => 'GASOIL']);

    Queue::assertPushedOn(GeneratePdfExport::QUEUE, GeneratePdfExport::class, fn ($job) => $job->export->is($export));
});

test('an unknown export type is rejected', function () {
    Queue::fake();

    $this->actingAs($this->user)->postJson(route('exports.store'), ['type' => 'inconnu'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('type');

    Queue::assertNothingPushed();
});

test('the job generates the pdf and notifies the user', function () {
    Storage::fake('local');
    Notification::fake();

    Load::factory()->create(['status' => LoadStatus::EN_COURS, 'load_date' => now()]);
    $export = Export::factory()->for($this->user)->create();

    (new GeneratePdfExport($export))->handle();

    $export->refresh();

    expect($export->status)->toBe(ExportStatus::COMPLETED)
        ->and($export->filename)->toStartWith('rapport-chargements-')
        ->and($export->completed_at)->not->toBeNull();

    Storage::disk('local')->assertExists($export->path);
    expect(Storage::disk('local')->get($export->path))->toStartWith('%PDF');

    Notification::assertSentTo($this->user, ExportFinished::class, function (ExportFinished $notification) use ($export) {
        $data = $notification->toArray($this->user);

        return $data['export_id'] === $export->id
            && $data['download_url'] === route('exports.download', $export);
    });
});

test('a failed job marks the export as failed and notifies the user', function () {
    Notification::fake();

    $export = Export::factory()->for($this->user)->create();

    (new GeneratePdfExport($export))->failed(new RuntimeException('Allowed memory size exhausted'));

    $export->refresh();

    expect($export->status)->toBe(ExportStatus::FAILED)
        ->and($export->toClientArray()['download_url'])->toBeNull();

    Notification::assertSentTo($this->user, ExportFinished::class, fn (ExportFinished $notification) => $notification->toArray($this->user)['download_url'] === null);
});

test('a user can poll the status of their export', function () {
    $export = Export::factory()->for($this->user)->completed()->create();

    $this->actingAs($this->user)->getJson(route('exports.show', $export))
        ->assertOk()
        ->assertJsonPath('export.status', ExportStatus::COMPLETED->value)
        ->assertJsonPath('export.download_url', route('exports.download', $export));
});

test('a user can download a completed export and its notification is marked as read', function () {
    Storage::fake('local');

    $export = Export::factory()->for($this->user)->completed()->create(['filename' => 'rapport-chargements.pdf']);
    Storage::disk('local')->put($export->path, '%PDF-1.7 test');
    $this->user->notify(new ExportFinished($export));

    $this->actingAs($this->user)->get(route('exports.download', $export))
        ->assertOk()
        ->assertDownload('rapport-chargements.pdf');

    expect($this->user->unreadNotifications()->count())->toBe(0);
});

test('an export that is not ready cannot be downloaded', function () {
    $export = Export::factory()->for($this->user)->create();

    $this->actingAs($this->user)->get(route('exports.download', $export))->assertNotFound();
});

test('a user cannot see or download the export of another user', function () {
    $export = Export::factory()->completed()->create();

    $this->actingAs($this->user)->getJson(route('exports.show', $export))->assertForbidden();
    $this->actingAs($this->user)->get(route('exports.download', $export))->assertForbidden();
});

test('the exports page lists only the exports of the user', function () {
    $mine = Export::factory()->for($this->user)->completed()->create();
    Export::factory()->completed()->create();

    $response = $this->actingAs($this->user)->get(route('exports.index'));

    $exports = $response->viewData('page')['props']['exports'];

    expect(collect($exports)->pluck('id')->all())->toBe([$mine->id]);
});

test('notifications are shared with every page and can be marked as read', function () {
    $export = Export::factory()->for($this->user)->completed()->create();
    Export::factory()->for($this->user)->create();
    $this->user->notify(new ExportFinished($export));

    $props = $this->actingAs($this->user)->get(route('exports.index'))->viewData('page')['props']['notifications'];

    expect($props['unread_count'])->toBe(1)
        ->and($props['pending_exports'])->toBe(1)
        ->and($props['items'][0]['export_id'])->toBe($export->id)
        ->and($props['items'][0]['read'])->toBeFalse();

    $notificationId = $props['items'][0]['id'];

    $this->actingAs($this->user)->post(route('notifications.read', $notificationId))->assertRedirect();

    expect($this->user->unreadNotifications()->count())->toBe(0);
});

test('a user can mark all notifications as read', function () {
    $this->user->notify(new ExportFinished(Export::factory()->for($this->user)->completed()->create()));
    $this->user->notify(new ExportFinished(Export::factory()->for($this->user)->failed()->create()));

    $this->actingAs($this->user)->post(route('notifications.read-all'))->assertRedirect();

    expect($this->user->unreadNotifications()->count())->toBe(0);
});

test('expired exports are pruned with their file', function () {
    Storage::fake('local');

    $expired = Export::factory()->for($this->user)->completed()->create(['created_at' => now()->subHours(Export::RETENTION_HOURS + 1)]);
    Storage::disk('local')->put($expired->path, '%PDF');
    $recent = Export::factory()->for($this->user)->completed()->create();

    $this->artisan('model:prune', ['--model' => [Export::class]])->assertSuccessful();

    expect(Export::pluck('id')->all())->toBe([$recent->id]);
    Storage::disk('local')->assertMissing($expired->path);
});

test('every export type can be generated by the queue worker', function (ExportType $type, Closure $filters) {
    Storage::fake('local');
    Notification::fake();

    $depot = Depot::factory()->create();
    $client = Client::factory()->create();
    Load::factory()->create([
        'depot_id' => $depot->id,
        'client_id' => $client->id,
        'status' => LoadStatus::EN_COURS,
        'load_date' => now(),
    ]);

    $export = Export::factory()->for($this->user)->create([
        'type' => $type,
        'filters' => $type->exporter()->resolveFilters($filters($depot, $client)),
    ]);

    (new GeneratePdfExport($export))->handle();

    $export->refresh();

    expect($export->status)->toBe(ExportStatus::COMPLETED)
        ->and(Storage::disk('local')->get($export->path))->toStartWith('%PDF');
})->with([
    'rapport chargements' => [ExportType::RAPPORT_CHARGEMENTS, fn () => []],
    'rapport livraisons' => [ExportType::RAPPORT_LIVRAISONS, fn () => []],
    'rapport ventes chargement' => [ExportType::RAPPORT_VENTES_CHARGEMENT, fn () => []],
    'rapport ventes dépôt' => [ExportType::RAPPORT_VENTES_DEPOT, fn () => []],
    'chargements en cours' => [ExportType::CHARGEMENTS_EN_COURS, fn () => []],
    'livraisons' => [ExportType::LIVRAISONS, fn () => []],
    'achats carburant' => [ExportType::ACHATS_CARBURANT, fn () => []],
    'suivi stock' => [ExportType::SUIVI_STOCK, fn ($depot) => ['depot_id' => $depot->id, 'date_from' => now()->startOfMonth()->toDateString(), 'date_to' => now()->toDateString()]],
    'suivi client' => [ExportType::SUIVI_CLIENT, fn ($depot, $client) => ['client_id' => $client->id]],
    'relevé client' => [ExportType::RELEVE_CLIENT, fn ($depot, $client) => ['client_id' => $client->id]],
]);

test('exports requiring a client or a depot reject a request without it', function (ExportType $type, string $missingFilter) {
    Queue::fake();

    $this->actingAs($this->user)->postJson(route('exports.store'), ['type' => $type->value, 'filters' => []])
        ->assertUnprocessable()
        ->assertJsonValidationErrors($missingFilter);

    Queue::assertNothingPushed();
})->with([
    'suivi stock' => [ExportType::SUIVI_STOCK, 'depot_id'],
    'suivi client' => [ExportType::SUIVI_CLIENT, 'client_id'],
    'relevé client' => [ExportType::RELEVE_CLIENT, 'client_id'],
]);

test('report exports freeze the default period when the request is made', function () {
    Queue::fake();

    $this->actingAs($this->user)->postJson(route('exports.store'), ['type' => ExportType::RAPPORT_LIVRAISONS->value])
        ->assertStatus(202);

    expect(Export::sole()->filters)->toBe([
        'date_from' => now()->startOfMonth()->toDateString(),
        'date_to' => now()->endOfMonth()->toDateString(),
    ]);
});
