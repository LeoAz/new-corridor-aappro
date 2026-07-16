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
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #000;
            text-transform: uppercase;
        }
        .report-title {
            font-size: 16px;
            font-weight: bold;
            margin-top: 10px;
            text-align: center;
            text-transform: uppercase;
            background-color: #f2f2f2;
            padding: 5px;
        }
        .info-section {
            margin-bottom: 20px;
            width: 100%;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
        }
        .info-table td {
            padding: 5px 0;
            vertical-align: top;
        }
        .section-header {
            font-size: 14px;
            font-weight: bold;
            color: #000;
            border-bottom: 1px solid #333;
            padding-bottom: 5px;
            margin-bottom: 15px;
            text-transform: uppercase;
        }
        .stats-grid {
            width: 100%;
            margin-bottom: 20px;
            clear: both;
        }
        .stats-box {
            padding: 10px 0;
            width: 32%;
            float: left;
            margin-right: 1%;
            margin-bottom: 10px;
        }
        .stats-box.last {
            margin-right: 0;
        }
        .stats-label {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 5px;
            display: block;
        }
        .stats-value {
            font-size: 14px;
            font-weight: bold;
        }
        .table-section {
            margin-bottom: 30px;
            clear: both;
        }
        .table-title {
            font-size: 12px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
            text-transform: uppercase;
            border-left: 3px solid #333;
            padding-left: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0;
        }
        th {
            background-color: #fff;
            text-align: left;
            padding: 8px 4px;
            font-weight: bold;
            border-bottom: 2px solid #333;
            font-size: 10px;
            text-transform: uppercase;
        }
        td {
            padding: 8px 4px;
            border-bottom: 1px solid #eee;
            font-size: 10px;
        }
        .table-total {
            background-color: #fff;
            font-weight: bold;
        }
        .table-total td {
            border-top: 2px solid #333;
            border-bottom: none;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .badge {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 8px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .badge-success { background-color: #dcfce7; color: #166534; }
        .badge-warning { background-color: #fef9c3; color: #854d0e; }
        .badge-info { background-color: #e0f2fe; color: #075985; }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 9px;
            color: #999;
            border-top: 1px solid #eee;
            padding-top: 10px;
        }
        .page-break {
            page-break-after: always;
        }
        .clearfix::after {
            content: "";
            clear: both;
            display: table;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-name">CORRIDOR APPRO</div>
            <div class="report-title">RELEVÉ DE COMPTE CLIENT</div>
        </div>

        <div class="info-section">
            <div class="section-header">INFORMATIONS DU CLIENT</div>
            <table class="info-table">
                <tr>
                    <td width="60%">
                        <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">{{ $client->nom }}</div>
                        @if($client->contact) <strong>Contact :</strong> {{ $client->contact }}<br> @endif
                        @if($client->address) <strong>Adresse :</strong> {{ $client->address }}<br> @endif
                    </td>
                    <td width="40%" class="text-right">
                        <strong>Date d'extraction :</strong> {{ now()->format('d/m/Y H:i') }}<br>
                        @if($startDate || $endDate)
                            <strong>Période :</strong>
                            @if($startDate) Du {{ \Carbon\Carbon::parse($startDate)->format('d/m/Y') }} @endif
                            @if($endDate) Au {{ \Carbon\Carbon::parse($endDate)->format('d/m/Y') }} @endif
                        @endif
                    </td>
                </tr>
            </table>
        </div>

        <div class="info-section">
            <div class="section-header">RÉSUMÉ FINANCIER</div>
            <div class="stats-grid clearfix">
                <div class="stats-box">
                    <span class="stats-label">Solde Initial</span>
                    <span class="stats-value">{{ number_format($stats['initial_balance'], 0, ',', ' ') }} FCFA</span>
                </div>
                <div class="stats-box">
                    <span class="stats-label">Total Facturé</span>
                    <span class="stats-value">{{ number_format($stats['total_invoiced'], 0, ',', ' ') }} FCFA</span>
                </div>
                <div class="stats-box last">
                    <span class="stats-label">Total Payé</span>
                    <span class="stats-value">{{ number_format($stats['total_paid'], 0, ',', ' ') }} FCFA</span>
                </div>
            </div>
            <div class="stats-grid clearfix" style="margin-bottom: 0;">
                <div class="stats-box">
                    <span class="stats-label">Solde Client Actuel</span>
                    <span class="stats-value" style="color: {{ $stats['current_balance'] > 0 ? '#b91c1c' : '#15803d' }}">
                        {{ number_format($stats['current_balance'], 0, ',', ' ') }} FCFA
                    </span>
                </div>
                <div class="stats-box">
                    <span class="stats-label">Non Facturé (Est.)</span>
                    <span class="stats-value" style="color: #6b7280;">{{ number_format($stats['total_not_invoiced'], 0, ',', ' ') }} FCFA</span>
                </div>
                <div class="stats-box last" style="background-color: {{ ($stats['current_balance'] + $stats['total_not_invoiced']) > 0 ? '#fef2f2' : '#f0fdf4' }}; padding-left: 10px; padding-right: 10px;">
                    <span class="stats-label">Total Dû (Estimé)</span>
                    <span class="stats-value" style="color: {{ ($stats['current_balance'] + $stats['total_not_invoiced']) > 0 ? '#b91c1c' : '#15803d' }}">
                        {{ number_format($stats['current_balance'] + $stats['total_not_invoiced'], 0, ',', ' ') }} FCFA
                    </span>
                </div>
            </div>
        </div>

        <div class="table-section">
            <div class="table-title">LIVRAISONS FACTURÉES ET PAYÉES</div>
            <table>
                <thead>
                    <tr>
                        <th width="5%">#</th>
                        <th width="10%">Date</th>
                        <th width="12%">N° BL</th>
                        <th width="15%">Camion</th>
                        <th width="13%">Produit</th>
                        <th width="10%" class="text-right">Qté</th>
                        <th width="17%" class="text-right">Montant</th>
                        <th width="18%">Statut</th>
                    </tr>
                </thead>
                <tbody>
                    @php
                        $totalQtyPayer = 0;
                        $totalAmountPayer = 0;
                    @endphp
                    @forelse($loadsFacturerPayer as $index => $load)
                        @php
                            $amount = $load->invoiceItems->first()?->total ?? 0;
                            $totalQtyPayer += $load->volume;
                            $totalAmountPayer += $amount;
                        @endphp
                        <tr>
                            <td>{{ $index + 1 }}</td>
                            <td>{{ $load->unload_date?->format('d/m/Y') }}</td>
                            <td>{{ $load->invoiceItems->first()?->bl_number ?? '-' }}</td>
                            <td>{{ $load->vehicle_registration }}</td>
                            <td>{{ $load->product }}</td>
                            <td class="text-right">{{ number_format($load->volume, 0, ',', ' ') }}</td>
                            <td class="text-right">{{ number_format($amount, 0, ',', ' ') }}</td>
                            <td><span class="badge badge-success">PAYÉ</span></td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="8" class="text-center">Aucune livraison facturée et payée</td>
                        </tr>
                    @endforelse
                </tbody>
                @if($loadsFacturerPayer->count() > 0)
                <tfoot>
                    <tr class="table-total">
                        <td colspan="5" class="text-right">TOTAL</td>
                        <td class="text-right">{{ number_format($totalQtyPayer, 0, ',', ' ') }}</td>
                        <td class="text-right">{{ number_format($totalAmountPayer, 0, ',', ' ') }}</td>
                        <td></td>
                    </tr>
                </tfoot>
                @endif
            </table>
        </div>

        <div class="table-section">
            <div class="table-title">LIVRAISONS FACTURÉES (EN ATTENTE DE PAIEMENT)</div>
            <table>
                <thead>
                    <tr>
                        <th width="5%">#</th>
                        <th width="10%">Date</th>
                        <th width="15%">N° BL</th>
                        <th width="18%">Camion</th>
                        <th width="18%">Produit</th>
                        <th width="15%" class="text-right">Qté</th>
                        <th width="19%" class="text-right">Montant</th>
                    </tr>
                </thead>
                <tbody>
                    @php
                        $totalQtyFacturer = 0;
                        $totalAmountFacturer = 0;
                    @endphp
                    @forelse($loadsFacturer as $index => $load)
                        @php
                            $amount = $load->invoiceItems->first()?->total ?? 0;
                            $totalQtyFacturer += $load->volume;
                            $totalAmountFacturer += $amount;
                        @endphp
                        <tr>
                            <td>{{ $index + 1 }}</td>
                            <td>{{ $load->unload_date?->format('d/m/Y') }}</td>
                            <td>{{ $load->invoiceItems->first()?->bl_number ?? '-' }}</td>
                            <td>{{ $load->vehicle_registration }}</td>
                            <td>{{ $load->product }}</td>
                            <td class="text-right">{{ number_format($load->volume, 0, ',', ' ') }}</td>
                            <td class="text-right">{{ number_format($amount, 0, ',', ' ') }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="7" class="text-center">Aucune livraison en attente de paiement</td>
                        </tr>
                    @endforelse
                </tbody>
                @if($loadsFacturer->count() > 0)
                <tfoot>
                    <tr class="table-total">
                        <td colspan="5" class="text-right">TOTAL</td>
                        <td class="text-right">{{ number_format($totalQtyFacturer, 0, ',', ' ') }}</td>
                        <td class="text-right">{{ number_format($totalAmountFacturer, 0, ',', ' ') }}</td>
                    </tr>
                </tfoot>
                @endif
            </table>
        </div>

        <div class="table-section">
            <div class="table-title">LIVRAISONS LIVRÉES (NON FACTURÉES)</div>
            <table>
                <thead>
                    <tr>
                        <th width="5%">#</th>
                        <th width="12%">Date</th>
                        <th width="23%">Camion</th>
                        <th width="23%">Produit</th>
                        <th width="15%" class="text-right">Qté</th>
                        <th width="22%" class="text-right">Montant (Est.)</th>
                    </tr>
                </thead>
                <tbody>
                    @php
                        $totalQtyLivrer = 0;
                        $totalAmountLivrer = 0;
                    @endphp
                    @forelse($loadsLivrer as $index => $load)
                        @php
                            $estAmount = $load->volume * ($load->unit_price ?? 0);
                            $totalQtyLivrer += $load->volume;
                            $totalAmountLivrer += $estAmount;
                        @endphp
                        <tr>
                            <td>{{ $index + 1 }}</td>
                            <td>{{ $load->unload_date?->format('d/m/Y') }}</td>
                            <td>{{ $load->vehicle_registration }}</td>
                            <td>{{ $load->product }}</td>
                            <td class="text-right">{{ number_format($load->volume, 0, ',', ' ') }}</td>
                            <td class="text-right">{{ number_format($estAmount, 0, ',', ' ') }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" class="text-center">Aucune livraison non facturée</td>
                        </tr>
                    @endforelse
                </tbody>
                @if($loadsLivrer->count() > 0)
                <tfoot>
                    <tr class="table-total">
                        <td colspan="4" class="text-right">TOTAL ESTIMÉ</td>
                        <td class="text-right">{{ number_format($totalQtyLivrer, 0, ',', ' ') }}</td>
                        <td class="text-right">{{ number_format($totalAmountLivrer, 0, ',', ' ') }}</td>
                    </tr>
                </tfoot>
                @endif
            </table>
        </div>

        <div class="footer">
            Corridor Appro - Système de gestion intégrée - Généré le {{ date('d/m/Y H:i') }}
        </div>
    </div>
</body>
</html>
