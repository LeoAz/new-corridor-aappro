<?php

namespace App\Services\Exports;

/**
 * Un rapport exportable en PDF, générable de façon synchrone ou par le queue worker.
 */
interface PdfExport
{
    public function label(): string;

    /**
     * Clés de filtres acceptées par l'export.
     *
     * @return array<int, string>
     */
    public function filterKeys(): array;

    /**
     * Normalise les filtres au moment de la demande (ex: période par défaut),
     * pour que le PDF généré plus tard corresponde à ce que l'utilisateur voyait.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function resolveFilters(array $filters): array;

    public function view(): string;

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function viewData(array $filters): array;

    public function filename(): string;

    public function paper(): string;

    public function orientation(): string;
}
