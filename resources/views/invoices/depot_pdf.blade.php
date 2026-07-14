<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 12px;
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
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .invoice-info {
            margin-top: 20px;
        }
        .invoice-number {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .invoice-date {
            color: #666;
        }
        .qr-code {
            width: 100px;
            height: 100px;
        }
        .qr-caption {
            font-size: 8px;
            color: #999;
            margin-top: 4px;
        }
        .billing-section {
            margin-bottom: 30px;
            clear: both;
        }
        .billing-grid {
            width: 100%;
        }
        .billing-col {
            width: 50%;
            vertical-align: top;
        }
        .section-title {
            font-size: 10px;
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
        .summary-item {
            margin-bottom: 4px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        th {
            background-color: #f9f9f9;
            text-align: left;
            padding: 10px;
            font-size: 10px;
            text-transform: uppercase;
            color: #666;
            border-bottom: 2px solid #eee;
        }
        td {
            padding: 10px;
            border-bottom: 1px solid #eee;
        }
        .text-right {
            text-align: right;
        }
        .totals-section {
            width: 50%;
            float: right;
            margin-top: 20px;
        }
        .total-row {
            margin-bottom: 8px;
            padding-bottom: 4px;
            white-space: nowrap;
            display: table;
            width: 100%;
        }
        .total-label {
            display: table-cell;
            color: #666;
            font-size: 13px;
            text-align: left;
            padding-left: 20px;
        }
        .total-value {
            display: table-cell;
            text-align: right;
            font-weight: bold;
            font-size: 14px;
        }
        .grand-total {
            border-top: 2px solid #000;
            padding-top: 12px;
            margin-top: 10px;
        }
        .grand-total .total-label {
            color: #000;
            font-weight: 900;
            font-size: 16px;
            text-transform: uppercase;
        }
        .grand-total .total-value {
            font-size: 20px;
            font-weight: 900;
        }
        .footer {
            margin-top: 50px;
            border-top: 1px solid #eee;
            padding-top: 20px;
            text-align: center;
            color: #999;
            font-size: 10px;
        }
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: bold;
        }
        .badge-gasoil { background-color: #e0f2fe; color: #0369a1; }
        .badge-super { background-color: #fef2f2; color: #b91c1c; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-left">
                <div class="company-name">CORRIDOR PETROLEUM</div>
                <div class="service-name">Bamako - MALI | DÉPÔT: {{ $invoice->depot->name }}</div>

                <div class="invoice-info">
                    <div class="invoice-number">{{ $invoice->number }}</div>
                    <div class="invoice-date">Date: {{ \Carbon\Carbon::parse($invoice->date)->format('d/m/Y') }}</div>
                </div>
            </div>

            <div class="header-right">
                <img src="data:image/svg+xml;base64,{{ base64_encode($qrCode) }}" class="qr-code">
                <div class="qr-caption">SCANNER POUR VÉRIFIER</div>
            </div>
        </div>

        <div class="billing-section">
            <table class="billing-grid">
                <tr>
                    <td class="billing-col" style="border: none;">
                        <div class="section-title">FACTURÉ À:</div>
                        <div class="client-name">{{ $invoice->client->nom }}</div>
                        <div style="color: #666;">Client ID: #{{ $invoice->client_id }}</div>
                    </td>
                    <td class="billing-col" style="border: none;">
                        <div class="section-title">RÉSUMÉ DES PRODUITS:</div>
                        @foreach($productSummary as $product => $quantity)
                            <div class="summary-item">
                                <strong>{{ $product }}:</strong> {{ number_format($quantity, 0, ',', ' ') }} L
                            </div>
                        @endforeach
                    </td>
                </tr>
            </table>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 25px;">N°</th>
                    <th>Compartiment / Produit</th>
                    <th class="text-right">Quantité</th>
                    <th class="text-right">P.U.</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->items as $item)
                    <tr>
                        <td>{{ $loop->iteration }}</td>
                        <td>
                            <div style="font-weight: bold;">{{ $item->compartment->product ?? 'N/A' }}</div>
                            <div style="font-size: 10px; color: #666;">Comp ID: #{{ $item->compartment_id }}</div>
                        </td>
                        <td class="text-right">{{ number_format($item->quantity, 2, ',', ' ') }} L</td>
                        <td class="text-right">{{ number_format($item->unit_price, 2, ',', ' ') }} CFA</td>
                        <td class="text-right" style="font-weight: bold;">{{ number_format($item->total, 2, ',', ' ') }} CFA</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <div class="totals-section">
            <div class="total-row grand-total">
                <span class="total-label">MONTANT TOTAL</span>
                <span class="total-value">
                    <div style="font-size: 20px; line-height: 1;">{{ number_format($invoice->total_amount, 0, ',', ' ') }} CFA</div>
                </span>
            </div>
        </div>

        <div style="clear: both;"></div>

        <div class="footer">
            <p>CORRIDOR APPRO - Service de facturation automatique (Vente Dépôt)</p>
            <p>Ceci est une facture officielle générée par le système.</p>
        </div>
    </div>
</body>
</html>
