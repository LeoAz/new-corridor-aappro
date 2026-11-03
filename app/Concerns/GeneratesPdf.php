<?php

namespace App\Concerns;

use App\Services\Exports\PdfDocument;
use App\Services\Exports\PdfExport;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

trait GeneratesPdf
{
    /**
     * Rend une vue en PDF et la propose au téléchargement.
     *
     * @param  array<string, mixed>  $data
     */
    protected function downloadPdfView(string $view, array $data, string $filename, ?string $paper = null, string $orientation = 'portrait'): Response
    {
        ini_set('memory_limit', '512M');

        $pdf = Pdf::loadView($view, $data);

        if ($paper) {
            $pdf->setPaper($paper, $orientation);
        }

        return $pdf->download($filename);
    }

    /**
     * Prépare le document d'un export à partir de ses filtres.
     *
     * @param  array<string, mixed>  $filters
     */
    protected function buildPdfExport(PdfExport $export, array $filters, string $memoryLimit = '512M'): PdfDocument
    {
        ini_set('memory_limit', $memoryLimit);

        return $export->document($export->resolveFilters($filters));
    }

    /**
     * Génère un export immédiatement et le propose au téléchargement.
     *
     * @param  array<string, mixed>  $filters
     */
    protected function downloadPdfExport(PdfExport $export, array $filters): Response
    {
        $document = $this->buildPdfExport($export, $filters);

        return $document->toPdf()->download($document->filename);
    }
}
