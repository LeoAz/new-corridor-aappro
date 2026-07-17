<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; color: #333; line-height: 1.4; margin: 0; padding: 0; }
        .container { padding: 20px; }
        .header { margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .company-name { font-size: 20px; font-weight: bold; text-transform: uppercase; }
        .title { font-size: 16px; font-weight: bold; margin-top: 5px; color: #666; }
        .info { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background-color: #f2f2f2; padding: 8px; border: 1px solid #ddd; text-align: left; text-transform: uppercase; font-size: 9px; }
        td { padding: 8px; border: 1px solid #ddd; }
        .text-right { text-align: right; }
        .footer { position: fixed; bottom: 20px; width: 100%; text-align: center; font-size: 9px; color: #999; }
        .total-section { margin-top: 10px; border-top: 2px solid #000; padding-top: 10px; }
        .total-table { width: 350px; float: right; }
        .total-table td { border: none; padding: 4px; }
        .total-label { font-weight: bold; }
        .total-value { font-weight: bold; font-size: 14px; text-align: right; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-name">CORRIDOR PETROLEUM</div>
            <div class="title">HISTORIQUE DES ACHATS DE CARBURANT</div>
        </div>

        <div class="info">
            Période: {{ $filters['date_from'] ?? 'Début' }} au {{ $filters['date_to'] ?? date('d/m/Y') }}<br>
            Imprimé le: {{ date('d/m/Y') }}
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 25px;">N°</th>
                    <th>Date</th>
                    <th>Produit</th>
                    <th>Dépôt</th>
                    <th>Compartiment</th>
                    <th class="text-right">Quantité (L)</th>
                    <th class="text-right">Prix Unitaire</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($purchases as $purchase)
                <tr>
                    <td>{{ $loop->iteration }}</td>
                    <td>{{ \Carbon\Carbon::parse($purchase->purchase_date)->format('d/m/Y') }}</td>
                    <td>{{ $purchase->product }}</td>
                    <td>{{ $purchase->depot->name }}</td>
                    <td>{{ $purchase->compartment->product }}</td>
                    <td class="text-right">{{ number_format($purchase->quantity, 0, ',', ' ') }}</td>
                    <td class="text-right">{{ number_format($purchase->unit_price, 0, ',', ' ') }}</td>
                    <td class="text-right">{{ number_format($purchase->total_price, 0, ',', ' ') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <div class="total-section">
            <table class="total-table">
                <tr>
                    <td class="total-label">Quantité Totale:</td>
                    <td class="total-value">{{ number_format($purchases->sum('quantity'), 0, ',', ' ') }} L</td>
                </tr>
                <tr>
                    <td class="total-label">Montant Total des Achats:</td>
                    <td class="total-value">{{ number_format($purchases->sum('total_price'), 0, ',', ' ') }} CFA</td>
                </tr>
            </table>
            <div style="clear: both;"></div>
        </div>

        <div class="footer">
            CORRIDOR APPRO - Système de Gestion de Carburant
        </div>
    </div>
</body>
</html>
