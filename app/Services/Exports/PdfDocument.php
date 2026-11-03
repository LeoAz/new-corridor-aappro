<?php

namespace App\Services\Exports;

use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;

/**
 * Le contenu d'un PDF à générer : vue Blade, données, nom de fichier et format.
 */
final readonly class PdfDocument
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __construct(
        public string $view,
        public array $data,
        public string $filename,
        public ?string $paper = null,
        public string $orientation = 'portrait',
    ) {}

    public function toPdf(): DomPdf
    {
        $pdf = Pdf::loadView($this->view, $this->data);

        if ($this->paper) {
            $pdf->setPaper($this->paper, $this->orientation);
        }

        return $pdf;
    }
}
