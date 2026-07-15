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
        .total-table { width: 300px; float: right; }
        .total-table td { border: none; padding: 4px; }
        .total-label { font-weight: bold; }
        .total-value { font-weight: bold; font-size: 14px; text-align: right; }
        .status-badge { font-size: 8px; padding: 2px 4px; border-radius: 3px; background: #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-name">CORRIDOR PETROLEUM</div>
            <div class="title">LISTE DES LIVRAISONS</div>
        </div>

        <div class="info">
            Période: {{ $filters['date_from'] ?? 'Début' }} au {{ $filters['date_to'] ?? date('d/m/Y') }}<br>
            Imprimé le: {{ date('d/m/Y H:i') }}
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 25px;">N°</th>
                    <th>Date Livraison</th>
                    <th>Camion</th>
                    <th>Produit</th>
                    <th>Dépôt</th>
                    <th>Client</th>
                    <th>Lieu Décharge</th>
                    <th class="text-right">Volume (L)</th>
                </tr>
            </thead>
            <tbody>
                @foreach($deliveries as $delivery)
                <tr>
                    <td>{{ $loop->iteration }}</td>
                    <td>{{ \Carbon\Carbon::parse($delivery->unload_date)->format('d/m/Y') }}</td>
                    <td>{{ $delivery->vehicle_registration }}</td>
                    <td>{{ $delivery->compartment->product ?? ($delivery->product ?? 'N/A') }}</td>
                    <td>{{ $delivery->depot->name ?? 'N/A' }}</td>
                    <td>{{ $delivery->client->nom ?? $delivery->client_name }}</td>
                    <td>{{ $delivery->unload_location }}</td>
                    <td class="text-right">{{ number_format($delivery->volume, 0, ',', ' ') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <div class="total-section">
            <table class="total-table">
                <tr>
                    <td class="total-label">Nombre de livraisons:</td>
                    <td class="total-value">{{ $deliveries->count() }}</td>
                </tr>
                <tr>
                    <td class="total-label">Volume Total:</td>
                    <td class="total-value">{{ number_format($deliveries->sum('volume'), 0, ',', ' ') }} L</td>
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
