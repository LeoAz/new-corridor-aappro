<?php

namespace App\Http\Middleware;

use App\Enums\ExportStatus;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'notifications' => fn () => $this->notifications($request),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * Notifications in-app de l'utilisateur et nombre d'exports encore en cours de génération.
     *
     * @return array{unread_count: int, pending_exports: int, items: array<int, array<string, mixed>>}|null
     */
    private function notifications(Request $request): ?array
    {
        $user = $request->user();

        if (! $user) {
            return null;
        }

        return [
            'unread_count' => $user->unreadNotifications()->count(),
            'pending_exports' => $user->exports()
                ->whereIn('status', [ExportStatus::PENDING, ExportStatus::PROCESSING])
                ->where('created_at', '>=', now()->subHour())
                ->count(),
            'items' => $user->notifications()->latest()->limit(10)->get()
                ->map(fn (DatabaseNotification $notification) => [
                    'id' => $notification->id,
                    'read' => $notification->read_at !== null,
                    'created_at' => $notification->created_at?->toIso8601String(),
                    ...$notification->data,
                ])
                ->all(),
        ];
    }
}
