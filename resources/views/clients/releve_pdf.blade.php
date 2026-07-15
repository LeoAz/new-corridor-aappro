<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 11px;
            color: #333;
            line-height: 1.4;
            margin: 0;
            padding: 0;
        }
        .container {
            padding: 20px;
        }
        .header {
            margin-bottom: 30px;
            position: relative;
        }
        .header-left {
            width: 70%;
        }
        .header-right {
            position: absolute;
            top: 0;
            right: 0;
            text-align: right;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #000;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        .service-name {
            font-size: 11px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .invoice-info {
            margin-top: 20px;
        }
        .invoice-number {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        .invoice-date {
            color: #666;
        }
        .qr-code {
            width: 90px;
            height: 90px;
        }
        .qr-caption {
            font-size: 8px;
            color: #999;
            margin-top: 4px;
        }
        .billing-section {
            margin-bottom: 20px;
            clear: both;
        }
        .billing-grid {
            width: 100%;
        }
        .billing-col {
            width: 100%;
            vertical-align: top;
        }
        .section-title {
            font-size: 9px;
            font-weight: bold;
            color: #999;
            text-transform: uppercase;
            margin-bottom: 8px;
            border-bottom: 1px solid #eee;
            padding-bottom: 4px;
        }
        .client-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 4px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th {
            background-color: #f9f9f9;
            text-align: left;
            padding: 8px;
            font-size: 9px;
            text-transform: uppercase;
            color: #666;
            border-bottom: 2px solid #eee;
        }
        td {
            padding: 8px;
            border-bottom: 1px solid #eee;
        }
        .text-right {
            text-align: right;
        }
        .totals-section {
            width: 45%;
            float: right;
            margin-top: 10px;
        }
        .total-row {
            margin-bottom: 5px;
            padding-bottom: 3px;
            white-space: nowrap;
            display: table;
            width: 100%;
        }
        .total-label {
            display: table-cell;
            color: #666;
            font-size: 11px;
            text-align: left;
        }
        .total-value {
            display: table-cell;
            text-align: right;
            font-weight: bold;
            font-size: 12px;
        }
        .grand-total {
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-top: 5px;
        }
        .grand-total .total-label {
            color: #000;
            font-weight: 900;
            font-size: 14px;
            text-transform: uppercase;
        }
        .grand-total .total-value {
            font-size: 16px;
            font-weight: 900;
        }
        .footer {
            margin-top: 40px;
            border-top: 1px solid #eee;
            padding-top: 15px;
            text-align: center;
            color: #999;
            font-size: 9px;
        }
        .text-red { color: #b91c1c; }
        .text-green { color: #15803d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-left">
                <div class="company-name">CORRIDOR PETROLEUM</div>
                <div class="service-name">Bamako - MALI | RELEVÉ DE COMPTE CLIENT</div>

                <div class="invoice-info">
                    <div class="invoice-number">RELEVÉ : {{ $client->nom }}</div>
                    <div class="invoice-date">Période :
                        @if($dateFrom && $dateTo)
                            Du {{ \Carbon\Carbon::parse($dateFrom)->format('d/m/Y') }} au {{ \Carbon\Carbon::parse($dateTo)->format('d/m/Y') }}
                        @elseif($dateFrom)
                            Depuis le {{ \Carbon\Carbon::parse($dateFrom)->format('d/m/Y') }}
                        @elseif($dateTo)
                            Jusqu'au {{ \Carbon\Carbon::parse($dateTo)->format('d/m/Y') }}
                        @else
                            Historique complet
                        @endif
                    </div>
                </div>
            </div>

            <div class="header-right">
                <img src="data:image/svg+xml;base64,{{ base64_encode($qrCode) }}" class="qr-code">
                <div class="qr-caption">SCANNER POUR VÉRIFIER</div>
            </div>
        </div>

        <div class="billing-section">
            <div class="billing-col">
                <div class="section-title">INFORMATIONS CLIENT:</div>
                <div class="client-name">{{ $client->nom }}</div>
                <div style="color: #666;">ID Client: #{{ $client->id }}</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 25px;">N°</th>
                    <th>Date</th>
                    <th>Désignation / Opération</th>
                    <th class="text-right">Débit</th>
                    <th class="text-right">Crédit</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>-</td>
                    <td style="color: #999;">{{ $dateFrom ? \Carbon\Carbon::parse($dateFrom)->format('d/m/Y') : '-' }}</td>
                    <td style="font-weight: bold; text-transform: uppercase;">REPORT DE SOLDE</td>
                    <td class="text-right" style="font-weight: bold;">
                        @if($initialBalance < 0)
                            <span class="text-red">{{ number_format(abs($initialBalance), 0, ',', ' ') }}</span>
                        @else
                            -
                        @endif
                    </td>
                    <td class="text-right" style="font-weight: bold;">
                        @if($initialBalance > 0)
                            <span class="text-green">{{ number_format(abs($initialBalance), 0, ',', ' ') }}</span>
                        @else
                            -
                        @endif
                    </td>
                </tr>
                @foreach($operations as $op)
                    <tr>
                        <td>{{ $loop->iteration }}</td>
                        <td style="color: #666;">{{ \Carbon\Carbon::parse($op['date'])->format('d/m/Y') }}</td>
                        <td>
                            <div style="font-weight: bold;">{{ $op['label'] }}</div>
                            @if($op['reference'])
                                <div style="font-size: 8px; color: #999;">Réf: #{{ $op['reference'] }}</div>
                            @endif
                        </td>
                        <td class="text-right">
                            @if($op['debit'] > 0)
                                <span class="text-red">{{ number_format($op['debit'], 0, ',', ' ') }}</span>
                            @else
                                -
                            @endif
                        </td>
                        <td class="text-right">
                            @if($op['credit'] > 0)
                                <span class="text-green">{{ number_format($op['credit'], 0, ',', ' ') }}</span>
                            @else
                                -
                            @endif
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <div class="totals-section">
            <div class="total-row">
                <span class="total-label">Total Débit</span>
                <span class="total-value">{{ number_format($operations->sum('debit') + ($initialBalance < 0 ? abs($initialBalance) : 0), 0, ',', ' ') }} CFA</span>
            </div>
            <div class="total-row">
                <span class="total-label">Total Crédit</span>
                <span class="total-value">{{ number_format($operations->sum('credit') + ($initialBalance > 0 ? abs($initialBalance) : 0), 0, ',', ' ') }} CFA</span>
            </div>
            <div class="total-row grand-total">
                <span class="total-label">SOLDE FINAL ({{ $finalBalance < 0 ? 'DÉBIT' : 'CRÉDIT' }})</span>
                <span class="total-value {{ $finalBalance < 0 ? 'text-red' : 'text-green' }}">
                    {{ number_format(abs($finalBalance), 0, ',', ' ') }} CFA
                </span>
            </div>
        </div>

        <div style="clear: both;"></div>

        <div style="page-break-before: always;"></div>

        <h3 class="section-title">HISTORIQUE DES CHARGEMENTS</h3>

        @if(count($loadsEnCours) > 0)
            <h4 style="margin: 10px 0 5px 0;">CHARGEMENTS EN COURS</h4>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Immatriculation</th>
                        <th>Produit / Compartiment</th>
                        <th>Quantité</th>
                        <th>Dépôt</th>
                        <th>Destination</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($loadsEnCours as $load)
                        <tr>
                            <td>{{ \Carbon\Carbon::parse($load['date'])->format('d/m/Y') }}</td>
                            <td>{{ $load['truck_number'] }}</td>
                            <td>{{ $load['product'] ?? ($load['compartment'] ?? 'N/A') }}</td>
                            <td>{{ number_format($load['quantity'], 0, ',', ' ') }} L</td>
                            <td>{{ $load['depot'] ?? 'N/A' }}</td>
                            <td>{{ $load['destination'] ?? 'N/A' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif

        @if(count($loadsLivrer) > 0)
            <h4 style="margin: 10px 0 5px 0;">LIVRAISONS EN ATTENTE DE FACTURATION</h4>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Immatriculation</th>
                        <th>Produit / Compartiment</th>
                        <th>Quantité</th>
                        <th>Dépôt</th>
                        <th>N° BL</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($loadsLivrer as $load)
                        <tr>
                            <td>{{ \Carbon\Carbon::parse($load['date'])->format('d/m/Y') }}</td>
                            <td>{{ $load['truck_number'] }}</td>
                            <td>{{ $load['product'] ?? ($load['compartment'] ?? 'N/A') }}</td>
                            <td>{{ number_format($load['quantity'], 0, ',', ' ') }} L</td>
                            <td>{{ $load['depot'] ?? 'N/A' }}</td>
                            <td>{{ $load['bl_number'] ?? 'N/A' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif

        @if(count($loadsFacturer) > 0)
            <h4 style="margin: 10px 0 5px 0;">LIVRAISONS FACTURÉES (NON PAYÉES)</h4>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Immatriculation</th>
                        <th>Produit / Compartiment</th>
                        <th>Quantité</th>
                        <th>Dépôt</th>
                        <th>N° Facture</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($loadsFacturer as $load)
                        <tr>
                            <td>{{ \Carbon\Carbon::parse($load['date'])->format('d/m/Y') }}</td>
                            <td>{{ $load['truck_number'] }}</td>
                            <td>{{ $load['product'] ?? ($load['compartment'] ?? 'N/A') }}</td>
                            <td>{{ number_format($load['quantity'], 0, ',', ' ') }} L</td>
                            <td>{{ $load['depot'] ?? 'N/A' }}</td>
                            <td>
                                @php
                                    $invoice = \App\Models\Invoice::whereHas('items', function($q) use ($load) {
                                        $q->where('load_id', $load['id']);
                                    })->first();
                                @endphp
                                {{ $invoice?->number ?? 'N/A' }}
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif

        @if(count($loadsPaye) > 0)
            <h4 style="margin: 10px 0 5px 0;">LIVRAISONS PAYÉES</h4>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Immatriculation</th>
                        <th>Produit / Compartiment</th>
                        <th>Quantité</th>
                        <th>Dépôt</th>
                        <th>N° Facture</th>
                        <th>Règlement</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($loadsPaye as $load)
                        <tr>
                            <td>{{ \Carbon\Carbon::parse($load['date'])->format('d/m/Y') }}</td>
                            <td>{{ $load['truck_number'] }}</td>
                            <td>{{ $load['product'] ?? ($load['compartment'] ?? 'N/A') }}</td>
                            <td>{{ number_format($load['quantity'], 0, ',', ' ') }} L</td>
                            <td>{{ $load['depot'] ?? 'N/A' }}</td>
                            <td>
                                @php
                                    $invoice = \App\Models\Invoice::whereHas('items', function($q) use ($load) {
                                        $q->where('load_id', $load['id']);
                                    })->first();
                                @endphp
                                {{ $invoice?->number ?? 'N/A' }}
                            </td>
                            <td>
                                @if($load['payment_reference'])
                                    <div style="font-weight: bold; color: #2563eb;">#{{ $load['payment_reference'] }}</div>
                                    @if($load['payment_date'])
                                        <div style="font-size: 8px; color: #999;">le {{ \Carbon\Carbon::parse($load['payment_date'])->format('d/m/Y') }}</div>
                                    @endif
                                @else
                                    -
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif

        <div class="footer">
            <p>CORRIDOR APPRO &bull; Bamako, Mali &bull; Relevé de compte officiel</p>
            <p>Document généré le {{ date('d/m/Y à H:i') }}</p>
        </div>
    </div>
</body>
</html>
