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
        .payment-info {
            margin-top: 20px;
        }
        .payment-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .payment-date {
            color: #666;
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
        .badge-reglement { background-color: #ecfdf5; color: #047857; }
        .badge-avance { background-color: #eff6ff; color: #1d4ed8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-left">
                <div class="company-name">CORRIDOR PETROLEUM</div>
                <div class="service-name">Bamako - MALI | REÇU DE RÈGLEMENT</div>

                <div class="payment-info">
                    <div class="payment-title">Référence: {{ $payment->reference ?: 'REG-' . $payment->id }}</div>
                    <div class="payment-date">Date: {{ $payment->date->format('d/m/Y') }}</div>
                </div>
            </div>
            <div class="header-right">
                <div style="font-size: 10px; color: #999;">MODE DE PAIEMENT</div>
                <div style="font-weight: bold; font-size: 14px;">{{ $payment->payment_method->value ?? $payment->payment_method }}</div>
            </div>
        </div>

        <div class="billing-section">
            <table class="billing-grid">
                <tr>
                    <td class="billing-col" style="border: none;">
                        <div class="section-title">RÈGLEMENT DE:</div>
                        <div class="client-name">{{ $payment->client->nom }}</div>
                        <div style="color: #666;">Client ID: #{{ $payment->client_id }}</div>
                    </td>
                    <td class="billing-col" style="border: none;">
                        <div class="section-title">TYPE DE PAIEMENT:</div>
                        <div>
                            <span class="badge {{ $payment->is_advance ? 'badge-avance' : 'badge-reglement' }}">
                                {{ $payment->is_advance ? 'AVANCE' : 'RÈGLEMENT' }}
                            </span>
                        </div>
                    </td>
                </tr>
            </table>
        </div>

        @if($payment->loads->count() > 0 || $payment->depotInvoiceItems->count() > 0)
        <table>
            <thead>
                <tr>
                    <th style="width: 25px;">N°</th>
                    <th>Description / Référence</th>
                    <th class="text-right">Détails</th>
                    <th class="text-right">Montant</th>
                </tr>
            </thead>
            <tbody>
                @php $rowCount = 1; @endphp
                @foreach($payment->loads as $load)
                    @php
                        $invoiceItem = $payment->invoiceItems->where('load_id', $load->id)->first();
                        $amount = $invoiceItem ? $invoiceItem->total : 0;
                    @endphp
                    <tr>
                        <td>{{ $rowCount++ }}</td>
                        <td>
                            <div style="font-weight: bold;">Livraison: {{ $load->vehicle_registration }}</div>
                            <div style="font-size: 10px; color: #666;">Produit: {{ $load->product }} | Ville: {{ $load->city->name ?? $load->load_location ?? 'N/A' }}</div>
                        </td>
                        <td class="text-right">
                            {{ number_format($invoiceItem->quantity_delivered ?? 0, 2, ',', ' ') }} L
                            @if(($invoiceItem->missing_quantity ?? 0) > 0)
                                <br><small style="color: #b91c1c;">Manquant: {{ number_format($invoiceItem->missing_quantity, 2, ',', ' ') }} L</small>
                            @endif
                        </td>
                        <td class="text-right">{{ number_format($amount, 0, ',', ' ') }} CFA</td>
                    </tr>
                @endforeach

                @foreach($payment->depotInvoiceItems as $item)
                    <tr>
                        <td>{{ $rowCount++ }}</td>
                        <td>
                            <div style="font-weight: bold;">Facture Dépôt: {{ $item->depotInvoice->number ?? 'N/A' }}</div>
                            <div style="font-size: 10px; color: #666;">{{ $item->description }}</div>
                        </td>
                        <td class="text-right">-</td>
                        <td class="text-right">{{ number_format($item->amount ?? 0, 0, ',', ' ') }} CFA</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
        @else
        <div style="padding: 20px; border: 1px solid #eee; margin-bottom: 30px; text-align: center; color: #666;">
            Ce paiement est enregistré en tant qu'avance sur compte.
        </div>
        @endif

        @if($payment->note)
        <div style="margin-bottom: 30px;">
            <div class="section-title">NOTE / OBSERVATION:</div>
            <div style="padding: 10px; background-color: #f9f9f9; border-radius: 4px;">
                {{ $payment->note }}
            </div>
        </div>
        @endif

        <div class="totals-section">
            <div class="total-row grand-total">
                <span class="total-label">MONTANT TOTAL</span>
                <span class="total-value">
                    <div style="font-size: 20px; line-height: 1;">{{ number_format($payment->amount, 0, ',', ' ') }} CFA</div>
                </span>
            </div>
        </div>

        <div style="clear: both;"></div>

        <div class="footer">
            <p>CORRIDOR APPRO &bull; Bamako, Mali &bull; Reçu de règlement officiel</p>
            <p>Imprimé le {{ date('d/m/Y') }}</p>
        </div>
    </div>
</body>
</html>
