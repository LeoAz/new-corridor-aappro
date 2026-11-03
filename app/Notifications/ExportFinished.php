<?php

namespace App\Notifications;

use App\Enums\ExportStatus;
use App\Models\Export;
use Illuminate\Notifications\Notification;

/**
 * Informe l'utilisateur, dans l'application, que son export est prêt ou a échoué.
 */
class ExportFinished extends Notification
{
    public function __construct(public Export $export) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function databaseType(object $notifiable): string
    {
        return 'export-finished';
    }

    /**
     * @return array{export_id: string, status: string, title: string, message: string, download_url: string|null}
     */
    public function toArray(object $notifiable): array
    {
        $isCompleted = $this->export->status === ExportStatus::COMPLETED;

        return [
            'export_id' => $this->export->id,
            'status' => $this->export->status->value,
            'title' => $isCompleted ? 'Rapport prêt' : 'Échec de l\'export',
            'message' => $isCompleted
                ? $this->export->type->label().' est prêt à être téléchargé.'
                : 'La génération de « '.$this->export->type->label().' » a échoué.',
            'download_url' => $isCompleted ? route('exports.download', $this->export) : null,
        ];
    }
}
