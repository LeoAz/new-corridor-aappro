<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rapport des Ventes (Dépôt)</title>
    <style>
        body { font-family: 'Helvetica', sans-serif; font-size: 10pt; color: #333; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 18pt; text-transform: uppercase; }
        .info { margin-bottom: 20px; }
        .info table { width: 100%; }
        .info td { vertical-align: top; }
        .stats { margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 5px; }
        .stats table { width: 100%; border-collapse: collapse; }
        .stats th { text-align: left; font-size: 9pt; color: #666; text-transform: uppercase; }
        .stats td { font-size: 14pt; font-weight: bold; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table th { background: #eee; padding: 8px; border: 1px solid #ddd; font-size: 8pt; text-transform: uppercase; text-align: left; }
        .table td { padding: 8px; border: 1px solid #ddd; font-size: 9pt; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 8pt; color: #777; border-top: 1px solid #ddd; padding-top: 5px; }
        .qrcode { text-align: right; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Rapport des Ventes (Dépôt)</h1>
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
        <h3 style="background: #f0f0f0; padding: 5px; border-left: 4px solid #333;">Date : {{ \Carbon\Carbon::parse($date)->format('d/m/Y') }}</h3>

        @foreach($dateInvoices->groupBy('client_id') as $clientId => $clientInvoices)
            <div style="margin-left: 10px; margin-bottom: 15px;">
                <h4 style="margin-bottom: 5px; color: #555;">Client : {{ $clientInvoices->first()->client->nom ?? 'Inconnu' }}</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th>N° Facture</th>
                            <th>Dépôt</th>
                            <th>Détails</th>
                            <th class="text-right">Montant</th>
                        </tr>
                    </thead>
                    <tbody>
                        @php $clientTotal = 0; @endphp
                        @foreach($clientInvoices as $invoice)
                        @php $clientTotal += (float)$invoice->total_amount; @endphp
                        <tr>
                            <td>{{ $invoice->number }}</td>
                            <td>{{ $invoice->depot->name ?? 'Dépôt' }}</td>
                            <td>
                                @foreach($invoice->items as $item)
                                    {{ $item->compartment->product ?? 'Produit' }} ({{ number_format($item->quantity, 0, '.', ' ') }}L)@if(!$loop->last), @endif
                                @endforeach
                            </td>
                            <td class="text-right font-bold">{{ number_format($invoice->total_amount, 0, '.', ' ') }} CFA</td>
                        </tr>
                        @endforeach
                    </tbody>
                    <tfoot>
                        <tr style="background: #f9f9f9;">
                            <td colspan="3" class="text-right font-bold">TOTAL CLIENT</td>
                            <td class="text-right font-bold">{{ number_format($clientTotal, 0, '.', ' ') }} CFA</td>
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
        Système de Gestion Corridor Appro - Rapport des Ventes Dépôt - Page 1
    </div>
</body>
</html>
