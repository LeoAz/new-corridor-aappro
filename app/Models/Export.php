<?php

namespace App\Models;

use App\Enums\ExportStatus;
use App\Enums\ExportType;
use Database\Factories\ExportFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * Un export PDF demandé par un utilisateur et généré par le queue worker.
 */
class Export extends Model
{
    /** @use HasFactory<ExportFactory> */
    use HasFactory, HasUuids, Prunable;

    /** Durée de conservation des exports et de leurs fichiers. */
    public const RETENTION_HOURS = 24;

    protected $fillable = [
        'user_id',
        'type',
        'filters',
        'status',
        'disk',
        'path',
        'filename',
        'error',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'type' => ExportType::class,
        'status' => ExportStatus::class,
        'filters' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    protected $attributes = [
        'status' => 'pending',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isDownloadable(): bool
    {
        return $this->status === ExportStatus::COMPLETED
            && $this->path !== null
            && Storage::disk($this->disk)->exists($this->path);
    }

    /**
     * Les exports sont supprimés (avec leur fichier) après la durée de conservation.
     */
    public function prunable(): Builder
    {
        return static::where('created_at', '<=', now()->subHours(self::RETENTION_HOURS));
    }

    protected function pruning(): void
    {
        if ($this->path !== null && $this->disk !== null) {
            Storage::disk($this->disk)->delete($this->path);
        }
    }

    /**
     * @return array{id: string, type: string, label: string, status: string, status_label: string, filename: string|null, error: string|null, created_at: string|null, completed_at: string|null, download_url: string|null}
     */
    public function toClientArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'label' => $this->type->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'filename' => $this->filename,
            'error' => $this->status === ExportStatus::FAILED ? 'La génération du rapport a échoué.' : null,
            'created_at' => $this->created_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'download_url' => $this->status === ExportStatus::COMPLETED ? route('exports.download', $this) : null,
        ];
    }
}
