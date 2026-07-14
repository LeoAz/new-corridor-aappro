<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rapport des Livraisons</title>
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
        .badge { padding: 2px 5px; border-radius: 3px; font-size: 8pt; font-weight: bold; }
        .bg-blue { background: #e1f5fe; color: #01579b; }
        .bg-orange { background: #fff3e0; color: #e65100; }
        .bg-purple { background: #f3e5f5; color: #4a148c; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Rapport des Livraisons</h1>
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
                    <strong>Produit :</strong> {{ $filters['product'] ?? 'Tous' }}<br>
                    <strong>Lieu :</strong> {{ $filters['unload_location'] ?? 'Tous' }}
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
                <th>Total Camions</th>
                <th>Volume Total</th>
            </tr>
            <tr>
                <td>{{ $loads->count() }}</td>
                <td>{{ number_format($totalVolume, 0, '.', ' ') }} L</td>
            </tr>
        </table>
        <div style="margin-top: 10px;">
            @foreach($stats as $stat)
                <span class="badge {{ $stat['product'] === 'GASOIL' ? 'bg-blue' : ($stat['product'] === 'SUPER' ? 'bg-orange' : 'bg-purple') }}" style="margin-right: 10px;">
                    {{ $stat['product'] ?: 'INCONNU' }} : {{ $stat['count'] }} Véhs ({{ number_format($stat['volume'], 0, '.', ' ') }} L)
                </span>
            @endforeach
        </div>
    </div>

    @foreach($groupedLoads as $date => $clients)
        <h3 style="background: #f0f0f0; padding: 5px; border-left: 4px solid #333;">Date : {{ \Carbon\Carbon::parse($date)->format('d/m/Y') }}</h3>

        @foreach($clients as $clientName => $clientLoads)
            <div style="margin-left: 10px; margin-bottom: 15px;">
                <h4 style="margin-bottom: 5px; color: #555;">Client : {{ $clientName }}</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th style="width: 25px;">N°</th>
                            <th>Véhicule</th>
                            <th>Lieu</th>
                            <th>Produit</th>
                            <th class="text-right">Volume</th>
                        </tr>
                    </thead>
                    <tbody>
                        @php
                            $clientTotal = 0;
                            $rowCount = 1;
                        @endphp
                        @foreach($clientLoads as $load)
                        @php $clientTotal += (float)$load->volume; @endphp
                        <tr>
                            <td>{{ $rowCount++ }}</td>
                            <td>{{ $load->vehicle_registration }}</td>
                            <td>{{ $load->unload_location }}</td>
                            <td>
                                <span class="badge {{ $load->product === 'GASOIL' ? 'bg-blue' : ($load->product === 'SUPER' ? 'bg-orange' : 'bg-purple') }}">
                                    {{ $load->product }}
                                </span>
                            </td>
                            <td class="text-right font-bold">{{ number_format($load->volume, 0, '.', ' ') }} L</td>
                        </tr>
                        @endforeach
                    </tbody>
                    <tfoot>
                        <tr style="background: #f9f9f9;">
                            <td colspan="4" class="text-right font-bold">TOTAL CLIENT</td>
                            <td class="text-right font-bold">{{ number_format($clientTotal, 0, '.', ' ') }} L</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        @endforeach
    @endforeach

    <div style="margin-top: 20px; border-top: 2px solid #333; padding-top: 10px; text-align: right;">
        <span style="font-size: 14pt; font-weight: bold;">TOTAL GÉNÉRAL : {{ number_format($totalVolume, 0, '.', ' ') }} L</span>
    </div>

    <div class="footer">
        Système de Gestion Corridor Appro - Rapport des Livraisons - Page 1
    </div>
</body>
</html>
