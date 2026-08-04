<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rapport des Chargements</title>
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
        .table th { background: #333; color: white; padding: 8px; border: 1px solid #333; font-size: 8pt; text-transform: uppercase; text-align: left; }
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
        .page-break { page-break-after: always; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Rapport des Chargements</h1>
        <div class="date">Généré le {{ $date }}</div>
    </div>

    <div class="info">
        <table style="width: 100%;">
            <tr>
                <td style="width: 70%;">
                    <div style="background: #f0f0f0; padding: 10px; border-radius: 5px;">
                        <strong>Période :</strong>
                        @if(isset($filters['date_from']) && $filters['date_from']) du {{ \Carbon\Carbon::parse($filters['date_from'])->format('d/m/Y') }} @endif
                        @if(isset($filters['date_to']) && $filters['date_to']) au {{ \Carbon\Carbon::parse($filters['date_to'])->format('d/m/Y') }} @endif
                        @if(!isset($filters['date_from']) && !isset($filters['date_to'])) Toutes les dates @endif
                        <br>
                        <strong>Produit :</strong> {{ $filters['product'] ?? 'Tous' }} |
                        <strong>Lieu :</strong> {{ $filters['load_location'] ?? 'Tous' }} <br>
                        <strong>Client :</strong> {{ $client->nom ?? 'Tous' }}
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

    <table class="table">
        <thead>
            <tr>
                <th style="width: 40px;">N°</th>
                <th style="width: 80px;">DATE</th>
                <th>DEPOT</th>
                <th>PRODUIT</th>
                <th class="text-right">QUANTITE</th>
                <th class="text-right">VOLUME</th>
                <th class="text-center">STATUT</th>
            </tr>
        </thead>
        <tbody>
            @foreach($loads as $load)
            <tr>
                <td class="text-center">{{ $loop->iteration }}</td>
                <td>{{ \Carbon\Carbon::parse($load->load_date)->format('d/m/Y') }}</td>
                <td>{{ $load->depot->name ?? 'N/A' }}</td>
                <td>
                    <span class="badge {{ $load->product === 'GASOIL' ? 'bg-blue' : ($load->product === 'SUPER' ? 'bg-orange' : 'bg-purple') }}">
                        {{ $load->product }}
                    </span>
                </td>
                <td class="text-right">{{ number_format($load->volume, 0, '.', ' ') }}</td>
                <td class="text-right font-bold">{{ number_format($load->volume, 0, '.', ' ') }} L</td>
                <td class="text-center">{{ $load->status }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div style="margin-top: 20px;">
        <h3 style="background: #333; color: white; padding: 8px;">Statistiques par Dépôt</h3>
        <table class="table">
            <thead>
                <tr>
                    <th>Dépôt</th>
                    <th>Produit</th>
                    <th class="text-center">Nombre de Chargements</th>
                    <th class="text-right">Total Quantité/Volume</th>
                </tr>
            </thead>
            <tbody>
                @foreach($depotStats as $depotName => $products)
                    @foreach($products as $stat)
                        <tr>
                            @if($loop->first)
                                <td rowspan="{{ count($products) }}" style="vertical-align: middle;" class="font-bold">{{ $depotName }}</td>
                            @endif
                            <td>{{ $stat['product'] }}</td>
                            <td class="text-center">{{ $stat['count'] }}</td>
                            <td class="text-right font-bold">{{ number_format($stat['volume'], 0, '.', ' ') }} L</td>
                        </tr>
                    @endforeach
                @endforeach
            </tbody>
        </table>
    </div>

    <div style="margin-top: 30px; border-top: 3px double #333; padding-top: 10px; text-align: right;">
        <span style="font-size: 16pt; font-weight: bold; text-transform: uppercase;">Total Général : {{ number_format($totalVolume, 0, '.', ' ') }} L</span>
    </div>

    <div class="footer">
        Système de Gestion Corridor Appro - Rapport des Chargements - Page 1
    </div>
</body>
</html>
