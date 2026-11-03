<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreExportRequest;
use App\Jobs\GeneratePdfExport;
use App\Models\Export;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    public function index(Request $request): Response
    {
        $exports = $request->user()->exports()
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (Export $export) => $export->toClientArray());

        return Inertia::render('exports/index', [
            'exports' => $exports,
            'retentionHours' => Export::RETENTION_HOURS,
        ]);
    }

    /**
     * Enregistre la demande d'export et confie la génération au queue worker.
     * Les filtres sont figés maintenant (ex: période par défaut), pas au moment du traitement.
     */
    public function store(StoreExportRequest $request): JsonResponse
    {
        $type = $request->exportType();

        $export = $request->user()->exports()->create([
            'type' => $type,
            'filters' => $type->exporter()->resolveFilters($request->exportFilters()),
        ]);

        GeneratePdfExport::dispatch($export);

        return response()->json(['export' => $export->refresh()->toClientArray()], 202);
    }

    public function show(Export $export): JsonResponse
    {
        Gate::authorize('view', $export);

        return response()->json(['export' => $export->toClientArray()]);
    }

    public function download(Request $request, Export $export): StreamedResponse
    {
        Gate::authorize('view', $export);

        abort_unless($export->isDownloadable(), 404, 'Ce rapport n\'est plus disponible.');

        $request->user()->unreadNotifications()
            ->where('data->export_id', $export->id)
            ->update(['read_at' => now()]);

        return Storage::disk($export->disk)->download($export->path, $export->filename);
    }
}
