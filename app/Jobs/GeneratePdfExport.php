<?php

namespace App\Jobs;

use App\Concerns\GeneratesPdf;
use App\Enums\ExportStatus;
use App\Models\Export;
use App\Notifications\ExportFinished;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Génère le PDF d'un export en arrière-plan, puis notifie l'utilisateur.
 */
class GeneratePdfExport implements ShouldQueue
{
    use GeneratesPdf;
    use Queueable;

    public const QUEUE = 'exports';

    public const DISK = 'local';

    /** Une génération échouée échouerait à l'identique : pas de nouvel essai. */
    public int $tries = 1;

    public int $timeout = 300;

    /** L'export a pu être supprimé (nettoyage) avant son traitement. */
    public bool $deleteWhenMissingModels = true;

    /** Limite mémoire du worker pour un export, plus large que celle des requêtes web. */
    public const MEMORY_LIMIT = '1024M';

    public function __construct(public Export $export)
    {
        $this->onQueue(self::QUEUE);
    }

    public function handle(): void
    {
        $this->export->update([
            'status' => ExportStatus::PROCESSING,
            'started_at' => now(),
        ]);

        $exporter = $this->export->type->exporter();
        $pdf = $this->buildPdfExport($exporter, $this->export->filters, self::MEMORY_LIMIT);

        $path = 'exports/'.$this->export->id.'.pdf';
        Storage::disk(self::DISK)->put($path, $pdf->output());

        $this->export->update([
            'status' => ExportStatus::COMPLETED,
            'disk' => self::DISK,
            'path' => $path,
            'filename' => $exporter->filename(),
            'completed_at' => now(),
        ]);

        $this->export->user->notify(new ExportFinished($this->export));
    }

    public function failed(?Throwable $exception): void
    {
        $this->export->update([
            'status' => ExportStatus::FAILED,
            'error' => $exception?->getMessage(),
            'completed_at' => now(),
        ]);

        $this->export->user->notify(new ExportFinished($this->export));
    }
}
