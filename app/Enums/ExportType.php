<?php

namespace App\Enums;

use App\Services\Exports\ChargementsReportExport;
use App\Services\Exports\PdfExport;

enum ExportType: string
{
    case RAPPORT_CHARGEMENTS = 'rapport-chargements';

    public function exporter(): PdfExport
    {
        return match ($this) {
            self::RAPPORT_CHARGEMENTS => app(ChargementsReportExport::class),
        };
    }

    public function label(): string
    {
        return $this->exporter()->label();
    }
}
