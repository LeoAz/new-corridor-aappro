<?php

namespace App\Concerns;

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
}
