<?php

namespace App\Http\Controllers;

use App\Concerns\GeneratesPdf;
use App\Models\Client;
use App\Services\Exports\ReleveClientExport;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClientStatementController extends Controller
{
    use GeneratesPdf;

    public function index()
    {
        return Inertia::render('clients/releve', [
            'clients' => Client::all(['id', 'nom']),
            'filters' => [
                'date_from' => null,
                'date_to' => null,
            ],
            'statement' => [
                'operations' => [],
                'initialBalance' => 0,
                'finalBalance' => 0,
            ],
        ]);
    }

    public function downloadPdf(Request $request, Client $client)
    {
        return $this->downloadPdfExport(app(ReleveClientExport::class), [...$request->all(), 'client_id' => $client->id]);
    }

    public function show(Request $request, Client $client)
    {
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $statement = app(ReleveClientExport::class)->statement($client, $dateFrom, $dateTo);

        return Inertia::render('clients/releve', [
            'client' => $client,
            'clients' => Client::all(['id', 'nom']),
            'statement' => $statement,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }
}
