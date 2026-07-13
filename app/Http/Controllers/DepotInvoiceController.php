<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Compartment;
use App\Models\Depot;
use App\Models\DepotInvoice;
use App\Models\DepotInvoiceItem;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DepotInvoiceController extends Controller
{
    public function downloadPdf($id)
    {
        $invoice = DepotInvoice::with(['client', 'depot', 'items.compartment'])->findOrFail($id);

        // Calculate count by product for the header/summary
        $productSummary = $invoice->items->groupBy(function ($item) {
            return $item->compartment->product ?? 'Inconnu';
        })->map(function ($group) {
            return $group->sum('quantity');
        });

        // Generate QR Code content
        $qrData = sprintf(
            "Facture Dépôt: %s\nDate: %s\nClient: %s\nDépôt: %s\nMontant: %s CFA",
            $invoice->number,
            $invoice->date,
            $invoice->client->nom,
            $invoice->depot->name,
            number_format($invoice->total_amount, 0, ',', ' ')
        );

        $renderer = new ImageRenderer(
            new RendererStyle(200),
            new SvgImageBackEnd
        );
        $writer = new Writer($renderer);
        $qrCode = $writer->writeString($qrData);

        // Reuse the same template but adapt it if necessary.
        // For now, let's use a similar approach to InvoiceController
        $pdf = Pdf::loadView('invoices.depot_pdf', compact('invoice', 'productSummary', 'qrCode'));

        return $pdf->download("Facture_Depot_{$invoice->number}.pdf");
    }

    public function index()
    {
        $invoices = DepotInvoice::with(['client', 'depot', 'items.compartment'])
            ->latest('date')
            ->get();

        return Inertia::render('finances/factures-depot', [
            'invoices' => $invoices,
            'clients' => Client::all(),
            'depots' => Depot::with('compartments')->get(),
        ]);
    }

    public function show($id)
    {
        $invoice = DepotInvoice::with(['client', 'depot', 'items.compartment'])->findOrFail($id);

        $productSummary = $invoice->items->groupBy(function ($item) {
            return $item->compartment->product ?? 'Inconnu';
        })->map(function ($group) {
            return $group->sum('quantity');
        });

        return Inertia::render('finances/factures-depot/show', [
            'invoice' => $invoice,
            'productSummary' => $productSummary,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'depot_id' => 'required|exists:depots,id',
            'date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.compartment_id' => 'required|exists:compartments,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.total' => 'required|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated) {
            $year = date('Y', strtotime($validated['date']));

            // Generate invoice number: FAC-DEP-YYYY-XXXXX
            $lastInvoice = DepotInvoice::whereYear('date', $year)
                ->orderBy('id', 'desc')
                ->first();

            $nextNumber = 1;
            if ($lastInvoice) {
                // Handle different format if necessary, or just extract last 5 digits
                preg_match('/(\d+)$/', $lastInvoice->number, $matches);
                $nextNumber = isset($matches[1]) ? (int) $matches[1] + 1 : 1;
            }

            $invoiceNumber = sprintf('FAC-DEP-%s-%05d', $year, $nextNumber);

            $invoice = DepotInvoice::create([
                'client_id' => $validated['client_id'],
                'depot_id' => $validated['depot_id'],
                'number' => $invoiceNumber,
                'date' => $validated['date'],
                'issuer_name' => auth()->user()?->name ?? 'Système',
                'total_amount' => $validated['total_amount'],
            ]);

            foreach ($validated['items'] as $item) {
                DepotInvoiceItem::create([
                    'depot_invoice_id' => $invoice->id,
                    'compartment_id' => $item['compartment_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total' => $item['total'],
                ]);

                // Decrement stock in compartment
                $compartment = Compartment::lockForUpdate()->find($item['compartment_id']);
                $compartment->decrement('quantity', $item['quantity']);
            }

            return back()->with('message', 'Facture dépôt générée avec succès');
        });
    }

    public function update(Request $request, $id)
    {
        $invoice = DepotInvoice::with('items')->findOrFail($id);
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'depot_id' => 'required|exists:depots,id',
            'date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable|exists:depot_invoice_items,id',
            'items.*.compartment_id' => 'required|exists:compartments,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.total' => 'required|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated, $invoice) {
            // Restore old quantities to compartments
            foreach ($invoice->items as $oldItem) {
                Compartment::where('id', $oldItem->compartment_id)->increment('quantity', $oldItem->quantity);
            }

            $invoice->update([
                'client_id' => $validated['client_id'],
                'depot_id' => $validated['depot_id'],
                'date' => $validated['date'],
                'total_amount' => $validated['total_amount'],
            ]);

            $keepIds = [];
            foreach ($validated['items'] as $item) {
                if (isset($item['id'])) {
                    $invoiceItem = DepotInvoiceItem::find($item['id']);
                    $invoiceItem->update([
                        'compartment_id' => $item['compartment_id'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'total' => $item['total'],
                    ]);
                    $keepIds[] = $invoiceItem->id;
                } else {
                    $newItem = DepotInvoiceItem::create([
                        'depot_invoice_id' => $invoice->id,
                        'compartment_id' => $item['compartment_id'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'total' => $item['total'],
                    ]);
                    $keepIds[] = $newItem->id;
                }

                // Apply new quantities
                Compartment::where('id', $item['compartment_id'])->decrement('quantity', $item['quantity']);
            }

            // Remove items that are no longer in the list
            $invoice->items()->whereNotIn('id', $keepIds)->delete();

            return back()->with('message', 'Facture dépôt mise à jour avec succès');
        });
    }

    public function destroy($id)
    {
        $invoice = DepotInvoice::with('items')->findOrFail($id);

        return DB::transaction(function () use ($invoice) {
            foreach ($invoice->items as $item) {
                Compartment::where('id', $item->compartment_id)->increment('quantity', $item->quantity);
            }

            $invoice->delete();

            return back()->with('message', 'Facture dépôt supprimée avec succès');
        });
    }
}
