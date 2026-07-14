<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rapport des Livraisons</title>
    <style>
        body { font-family: 'Helvetica', sans-serif; font-size: 10pt; color: #333; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; position: relative; }
        .header h1 { margin: 0; font-size: 18pt; text-transform: uppercase; }
        .header .date { position: absolute; right: 0; top: 10px; font-size: 9pt; }
        .info { margin-bottom: 20px; }
        .info table { width: 100%; }
        .info td { vertical-align: top; }
        .stats { margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 5px; }
        .stats table { width: 100%; border-collapse: collapse; }
        .stats th { text-align: left; font-size: 9pt; color: #666; text-transform: uppercase; }
        .stats td { font-size: 14pt; font-weight: bold; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table th { background: #00695c; color: white; padding: 8px; border: 1px solid #004d40; font-size: 8pt; text-transform: uppercase; text-align: left; }
        .table td { padding: 8px; border: 1px solid #ddd; font-size: 9pt; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
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
        <div class="date">Généré le {{ $date }}</div>
    </div>

    <div class="info">
        <table style="width: 100%;">
            <tr>
                <td style="width: 70%;">
                    <div style="background: #e0f2f1; padding: 10px; border-radius: 5px; border-left: 5px solid #00695c;">
                        <strong>Période :</strong>
                        @if(isset($filters['date_from']) && $filters['date_from']) du {{ \Carbon\Carbon::parse($filters['date_from'])->format('d/m/Y') }} @endif
                        @if(isset($filters['date_to']) && $filters['date_to']) au {{ \Carbon\Carbon::parse($filters['date_to'])->format('d/m/Y') }} @endif
                        @if(!isset($filters['date_from']) && !isset($filters['date_to'])) Toutes les dates @endif
                        <br>
                        <strong>Produit :</strong> {{ $filters['product'] ?? 'Tous' }} |
                        <strong>Lieu de Déchargement :</strong> {{ $filters['unload_location'] ?? 'Tous' }}
                    </div>
                </td>
                <td class="qrcode" style="width: 30%;">
                    <img src="data:image/svg+xml;base64,{{ $qrcode }}" width="90">
                </td>
            </tr>
        </table>
    </div>

    <div class="stats">
        <table>
            <tr>
                <th style="width: 20%;">Total Camions</th>
                <th style="width: 30%;">Volume Total</th>
                <th style="width: 50%;">Répartition par Produit</th>
            </tr>
            <tr>
                <td>{{ $loads->count() }}</td>
                <td>{{ number_format($totalVolume, 0, '.', ' ') }} L</td>
                <td style="font-size: 10pt; font-weight: normal;">
                    @foreach($stats as $stat)
                        <span class="badge {{ $stat['product'] === 'GASOIL' ? 'bg-blue' : ($stat['product'] === 'SUPER' ? 'bg-orange' : 'bg-purple') }}" style="margin-right: 5px;">
                            {{ $stat['product'] ?: 'INCONNU' }} : {{ $stat['count'] }} ({{ number_format($stat['volume'], 0, '.', ' ') }} L)
                        </span>
                    @endforeach
                </td>
            </tr>
        </table>
    </div>

    @foreach($groupedLoads as $date => $clients)
        <h3 style="background: #00695c; color: white; padding: 8px; margin-top: 20px;">Date : {{ \Carbon\Carbon::parse($date)->format('d/m/Y') }}</h3>

        @foreach($clients as $clientName => $clientLoads)
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 10px 0; color: #00695c; border-bottom: 1px solid #e0f2f1;">Client : {{ $clientName }}</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th style="width: 40px;">N°</th>
                            <th style="width: 120px;">Véhicule</th>
                            <th>Lieu de Chargement</th>
                            <th>Lieu de Déchargement</th>
                            <th style="width: 100px;">Produit</th>
                            <th style="width: 120px;" class="text-right">Volume</th>
                            <th style="width: 100px;" class="text-center">Statut</th>
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
                            <td class="text-center">{{ $rowCount++ }}</td>
                            <td class="font-bold">{{ $load->vehicle_registration }}</td>
                            <td>{{ $load->load_location }}</td>
                            <td>{{ $load->unload_location }}</td>
                            <td>
                                <span class="badge {{ $load->product === 'GASOIL' ? 'bg-blue' : ($load->product === 'SUPER' ? 'bg-orange' : 'bg-purple') }}">
                                    {{ $load->product }}
                                </span>
                            </td>
                            <td class="text-right font-bold">{{ number_format($load->volume, 0, '.', ' ') }} L</td>
                            <td class="text-center">{{ $load->status }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                    <tfoot>
                        <tr style="background: #e0f2f1;">
                            <td colspan="5" class="text-right font-bold">TOTAL CLIENT</td>
                            <td class="text-right font-bold" style="font-size: 11pt;">{{ number_format($clientTotal, 0, '.', ' ') }} L</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        @endforeach
    @endforeach

    <div style="margin-top: 30px; border-top: 3px double #00695c; padding-top: 10px; text-align: right;">
        <span style="font-size: 16pt; font-weight: bold; text-transform: uppercase; color: #004d40;">Total Général : {{ number_format($totalVolume, 0, '.', ' ') }} L</span>
    </div>

    <div class="footer">
        Système de Gestion Corridor Appro - Rapport des Livraisons - Page 1
    </div>
</body>
</html>
