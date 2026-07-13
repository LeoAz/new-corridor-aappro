<?php

namespace App\Http\Controllers;

use App\Enums\LoadStatus;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Load;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function downloadPdf($id)
    {
        $invoice = Invoice::with(['client', 'items.loadDetails'])->findOrFail($id);

        // Calculate count of vehicles by product
        $vehicleCounts = $invoice->items->groupBy(function ($item) {
            return $item->loadDetails->product ?? 'Inconnu';
        })->map(function ($group) {
            return $group->count();
        });

        // Generate QR Code content
        $qrData = sprintf(
            "Facture: %s\nDate: %s\nClient: %s\nMontant: %s CFA\nVéhicules: %d",
            $invoice->number,
            $invoice->date,
            $invoice->client_name,
            number_format($invoice->total_amount, 0, ',', ' '),
            $invoice->items->count()
        );

        $renderer = new ImageRenderer(
            new RendererStyle(200),
            new SvgImageBackEnd
        );
        $writer = new Writer($renderer);
        $qrCode = $writer->writeString($qrData);

        $pdf = Pdf::loadView('invoices.pdf', compact('invoice', 'vehicleCounts', 'qrCode'));

        return $pdf->download("Facture_{$invoice->number}.pdf");
    }

    public function index()
    {
        $invoices = Invoice::with(['client', 'items.loadDetails'])
            ->latest('date')
            ->get();

        return Inertia::render('finances/factures-chargement', [
            'invoices' => $invoices,
            'clients' => Client::all(),
        ]);
    }

    public function show($id)
    {
        $invoice = Invoice::with(['client', 'items.loadDetails'])->findOrFail($id);

        // Calculate count of vehicles by product
        $vehicleCounts = $invoice->items->groupBy(function ($item) {
            return $item->loadDetails->product ?? 'Inconnu';
        })->map(function ($group) {
            return $group->count();
        });

        return Inertia::render('finances/factures-chargement/show', [
            'invoice' => $invoice,
            'vehicleCounts' => $vehicleCounts,
        ]);
    }

    public function update(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable|exists:invoice_items,id',
            'items.*.load_id' => 'required|exists:loads,id',
            'items.*.bl_number' => 'nullable|string',
            'items.*.quantity_delivered' => 'required|numeric',
            'items.*.unit_price' => 'required|numeric',
            'items.*.missing_quantity' => 'nullable|numeric',
            'items.*.total' => 'required|numeric',
            'total_amount' => 'required|numeric',
            'total_missing' => 'nullable|numeric',
        ]);

        return DB::transaction(function () use ($validated, $invoice) {
            $invoice->update([
                'client_id' => $validated['client_id'],
                'date' => $validated['date'],
                'client_name' => Client::find($validated['client_id'])->nom,
                'total_missing' => $validated['total_missing'] ?? 0,
                'total_amount' => $validated['total_amount'],
            ]);

            // Track IDs of items to keep
            $keepIds = [];

            foreach ($validated['items'] as $item) {
                if (isset($item['id'])) {
                    $invoiceItem = InvoiceItem::find($item['id']);
                    $invoiceItem->update([
                        'bl_number' => $item['bl_number'] ?? '',
                        'quantity_delivered' => $item['quantity_delivered'],
                        'unit_price' => $item['unit_price'],
                        'missing_quantity' => $item['missing_quantity'] ?? 0,
                        'total' => $item['total'],
                    ]);
                    $keepIds[] = $invoiceItem->id;
                } else {
                    $newItem = InvoiceItem::create([
                        'invoice_id' => (int) $invoice->id,
                        'bl_number' => $item['bl_number'] ?? '',
                        'load_id' => $item['load_id'],
                        'quantity_delivered' => $item['quantity_delivered'],
                        'unit_price' => $item['unit_price'],
                        'missing_quantity' => $item['missing_quantity'] ?? 0,
                        'total' => $item['total'],
                    ]);
                    $keepIds[] = $newItem->id;

                    // Update load status to INVOICED
                    Load::where('id', $item['load_id'])->update([
                        'status' => LoadStatus::FACTURE,
                    ]);
                }
            }

            // Remove items that are no longer in the list and reset their load status
            $removedItems = InvoiceItem::where('invoice_id', $invoice->id)
                ->whereNotIn('id', $keepIds)
                ->get();

            foreach ($removedItems as $item) {
                Load::where('id', $item->load_id)->update([
                    'status' => LoadStatus::LIVRE,
                ]);
                $item->delete();
            }

            return back()->with('message', 'Facture mise à jour avec succès');
        });
    }

    public function destroy($id)
    {
        $invoice = Invoice::findOrFail($id);

        return DB::transaction(function () use ($invoice) {
            foreach ($invoice->items as $item) {
                Load::where('id', $item->load_id)->update([
                    'status' => LoadStatus::LIVRE,
                ]);
            }

            $invoice->delete();

            return back()->with('message', 'Facture supprimée avec succès');
        });
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.load_id' => 'required|exists:loads,id',
            'items.*.bl_number' => 'nullable|string',
            'items.*.quantity_delivered' => 'required|numeric',
            'items.*.unit_price' => 'required|numeric',
            'items.*.missing_quantity' => 'nullable|numeric',
            'items.*.total' => 'required|numeric',
            'total_amount' => 'required|numeric',
            'total_missing' => 'nullable|numeric',
        ]);

        return DB::transaction(function () use ($validated) {
            $year = date('Y', strtotime($validated['date']));

            // Generate invoice number: FAC-YYYY-XXXXX
            $lastInvoice = Invoice::whereYear('date', $year)
                ->orderBy('id', 'desc')
                ->first();

            $nextNumber = 1;
            if ($lastInvoice) {
                $lastNumber = (int) substr($lastInvoice->number, -5);
                $nextNumber = $lastNumber + 1;
            }

            $invoiceNumber = sprintf('FAC-%s-%05d', $year, $nextNumber);

            $invoice = Invoice::create([
                'client_id' => $validated['client_id'],
                'number' => $invoiceNumber,
                'date' => $validated['date'],
                'client_name' => Client::find($validated['client_id'])->nom,
                'issuer_name' => auth()->user()?->name ?? 'Système',
                'total_missing' => $validated['total_missing'] ?? 0,
                'total_amount' => $validated['total_amount'],
            ]);

            foreach ($validated['items'] as $item) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'bl_number' => $item['bl_number'] ?? '',
                    'load_id' => $item['load_id'],
                    'quantity_delivered' => $item['quantity_delivered'],
                    'unit_price' => $item['unit_price'],
                    'missing_quantity' => $item['missing_quantity'] ?? 0,
                    'total' => $item['total'],
                ]);

                // Update load status to INVOICED
                Load::where('id', $item['load_id'])->update([
                    'status' => LoadStatus::FACTURE,
                ]);
            }

            return back()->with('message', 'Facture générée avec succès');
        });
    }
}
