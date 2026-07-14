<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rapport des Ventes (Chargements)</title>
    <style>
        body { font-family: 'Helvetica', sans-serif; font-size: 9pt; color: #333; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 16pt; text-transform: uppercase; }
        .info { margin-bottom: 20px; }
        .info table { width: 100%; }
        .info td { vertical-align: top; }
        .stats { margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 5px; }
        .stats table { width: 100%; border-collapse: collapse; }
        .stats th { text-align: left; font-size: 8pt; color: #666; text-transform: uppercase; }
        .stats td { font-size: 12pt; font-weight: bold; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table th { background: #eee; padding: 8px; border: 1px solid #ddd; font-size: 7.5pt; text-transform: uppercase; text-align: left; }
        .table td { padding: 8px; border: 1px solid #ddd; font-size: 8.5pt; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 8pt; color: #777; border-top: 1px solid #ddd; padding-top: 5px; }
        .qrcode { text-align: right; }
        .badge { display: inline-block; padding: 1px 4px; border-radius: 3px; font-size: 7pt; font-weight: bold; text-transform: uppercase; }
        .badge-gasoil { background-color: #e0f2fe; color: #0369a1; }
        .badge-super { background-color: #fef2f2; color: #b91c1c; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Rapport des Ventes (Chargements)</h1>
        <p>Généré le {{ $date }}</p>
    </div>

    <div class="info">
        <table>
            <tr>
                <td>
                    <strong>Période :</strong>
                    @if(isset($filters['date_from']) && $filters['date_from']) du {{ \Carbon\Carbon::parse($filters['date_from'])->format('d/m/Y') }} @endif
                    @if(isset($filters['date_to']) && $filters['date_to']) au {{ \Carbon\Carbon::parse($filters['date_to'])->format('d/m/Y') }} @endif
                    @if(!isset($filters['date_from']) && !isset($filters['date_to'])) Toutes les dates @endif
                    <br>
                    <strong>Client :</strong> {{ $invoices->first()->client->nom ?? 'Tous' }}
                </td>
                <td class="qrcode">
                    <img src="data:image/svg+xml;base64,{{ $qrcode }}" width="80">
                </td>
            </tr>
        </table>
    </div>

    <div class="stats">
        <table>
            <tr>
                <th>Total Factures</th>
                <th>Montant Total</th>
            </tr>
            <tr>
                <td>{{ $invoices->count() }}</td>
                <td>{{ number_format($totalAmount, 0, '.', ' ') }} CFA</td>
            </tr>
        </table>
    </div>

    @foreach($invoices->groupBy(fn($i) => \Carbon\Carbon::parse($i->date)->format('Y-m-d')) as $date => $dateInvoices)
        <h3 style="background: #f0f0f0; padding: 5px; border-left: 4px solid #333; font-size: 11pt; margin-top: 20px;">Date : {{ \Carbon\Carbon::parse($date)->format('d/m/Y') }}</h3>

        @foreach($dateInvoices->groupBy('client_id') as $clientId => $clientInvoices)
            <div style="margin-bottom: 20px;">
                <h4 style="margin-bottom: 8px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 4px;">Client : {{ $clientInvoices->first()->client->nom ?? 'Inconnu' }}</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th style="width: 20px;">N°</th>
                            <th>N° Facture</th>
                            <th>Véhicule</th>
                            <th>Produit</th>
                            <th>N° BL</th>
                            <th class="text-right">Quantité</th>
                            <th class="text-right">P.U.</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        @php
                            $clientTotal = 0;
                            $rowCount = 1;
                        @endphp
                        @foreach($clientInvoices as $invoice)
                            @php $clientTotal += (float)$invoice->total_amount; @endphp
                            @foreach($invoice->items as $item)
                                <tr>
                                    <td>{{ $rowCount++ }}</td>
                                    @if($loop->first)
                                        <td rowspan="{{ $invoice->items->count() }}" style="vertical-align: top;">
                                            <strong>{{ $invoice->number }}</strong>
                                        </td>
                                    @endif
                                    <td>{{ $item->loadDetails->vehicle_registration ?? 'N/A' }}</td>
                                    <td>
                                        <span class="badge {{ strtolower($item->loadDetails->product ?? '') == 'gasoil' ? 'badge-gasoil' : 'badge-super' }}">
                                            {{ $item->loadDetails->product ?? 'N/A' }}
                                        </span>
                                    </td>
                                    <td>{{ $item->bl_number ?? 'N/A' }}</td>
                                    <td class="text-right">{{ number_format($item->quantity_delivered, 0, '.', ' ') }} L</td>
                                    <td class="text-right">{{ number_format($item->unit_price, 0, '.', ' ') }}</td>
                                    <td class="text-right font-bold">{{ number_format($item->total, 0, '.', ' ') }}</td>
                                </tr>
                            @endforeach
                            @if($invoice->total_missing > 0)
                                <tr style="background-color: #fffafb;">
                                    <td colspan="5" class="text-right" style="color: #b91c1c; font-size: 8pt;">Déduction Manquant ({{ number_format($invoice->total_missing, 2, ',', ' ') }} L)</td>
                                    <td colspan="3" class="text-right font-bold" style="color: #b91c1c;">- {{ number_format($invoice->total_missing * ($invoice->items->first()->unit_price ?? 0), 0, '.', ' ') }}</td>
                                </tr>
                            @endif
                        @endforeach
                    </tbody>
                    <tfoot>
                        <tr style="background: #f5f5f5;">
                            <td colspan="7" class="text-right font-bold">TOTAL CLIENT POUR LA JOURNÉE</td>
                            <td class="text-right font-bold" style="font-size: 10pt;">{{ number_format($clientTotal, 0, '.', ' ') }} CFA</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        @endforeach
    @endforeach

    <div style="margin-top: 20px; border-top: 2px solid #333; padding-top: 10px; text-align: right;">
        <span style="font-size: 14pt; font-weight: bold;">TOTAL GÉNÉRAL : {{ number_format($totalAmount, 0, '.', ' ') }} CFA</span>
    </div>

    <div class="footer">
        Système de Gestion Corridor Appro - Rapport des Ventes - Page 1
    </div>
</body>
</html>
