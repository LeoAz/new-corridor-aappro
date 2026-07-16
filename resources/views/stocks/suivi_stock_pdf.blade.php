<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Suivi Stock - {{ $depot->name }}</title>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; color: #333; margin: 0; padding: 0; }
        .container { padding: 20px; }
        .header { margin-bottom: 30px; border-bottom: 2px solid #1e3a8a; padding-bottom: 15px; }
        .header table { width: 100%; }
        .title { font-size: 20px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; margin: 0; }
        .info { margin-top: 5px; color: #666; font-size: 10px; }
        .qr-code { text-align: right; }

        .section-title { font-size: 13px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; margin: 25px 0 10px 0; border-left: 4px solid #1e3a8a; padding-left: 10px; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background-color: #f8fafc; color: #64748b; font-weight: bold; text-transform: uppercase; font-size: 9px; padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #f1f5f9; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .text-blue { color: #1e3a8a; }

        .summary-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .summary-title { font-weight: bold; color: #64748b; font-size: 9px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }

        .compartment-grid { display: table; width: 100%; table-layout: fixed; margin-bottom: 20px; }
        .compartment-item { display: table-cell; padding: 10px; border: 1px solid #e2e8f0; text-align: center; background-color: #fff; }
        .compartment-name { font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
        .compartment-value { font-size: 16px; font-weight: bold; color: #1e3a8a; }

        .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <table>
                <tr>
                    <td>
                        <h1 class="title">Suivi du Stock</h1>
                        <div class="info">
                            Dépôt: <strong>{{ $depot->name }}</strong><br>
                            @if(isset($filteredProduct) && $filteredProduct)
                                Produit: <strong>{{ $filteredProduct }}</strong><br>
                            @endif
                            Période: Du <strong>{{ date('d/m/Y', strtotime($dateFrom)) }}</strong> au <strong>{{ date('d/m/Y', strtotime($dateTo)) }}</strong><br>
                            Généré le: {{ date('d/m/Y H:i') }}
                        </div>
                    </td>
                    <td class="qr-code">
                        @if($qrCode)
                            <img src="data:image/svg+xml;base64,{{ $qrCode }}" width="80">
                        @endif
                    </td>
                </tr>
            </table>
        </div>

        <div class="section-title">Situation Actuelle</div>
        <div class="compartment-grid">
            @foreach($depot->compartments as $comp)
                @if(!isset($compartment_id) || !$compartment_id || $compartment_id == $comp->id)
                    <div class="compartment-item">
                        <div class="compartment-name">{{ $comp->product }}</div>
                        <div class="compartment-value">{{ number_format($comp->quantity, 0, '.', ' ') }} L</div>
                    </div>
                @endif
            @endforeach
        </div>

        <div class="section-title">Historique des Achats (Entrées)</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 20px;">N°</th>
                    <th>Date</th>
                    <th>Compartiment</th>
                    <th class="text-right">Quantité</th>
                    <th class="text-right">Prix Unitaire</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                @forelse($purchases as $purchase)
                    <tr>
                        <td>{{ $loop->iteration }}</td>
                        <td>{{ $purchase->purchase_date->format('d/m/Y') }}</td>
                        <td class="font-bold">{{ $purchase->compartment->product }}</td>
                        <td class="text-right font-bold">{{ number_format($purchase->quantity, 0, '.', ' ') }} L</td>
                        <td class="text-right">{{ number_format($purchase->unit_price, 0, '.', ' ') }}</td>
                        <td class="text-right font-bold text-blue">{{ number_format($purchase->total_price, 0, '.', ' ') }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">Aucun achat sur cette période</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        <div class="section-title">Ventes Directes (Dépôt)</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 20px;">N°</th>
                    <th>Date</th>
                    <th>N° Facture</th>
                    <th>Client</th>
                    <th>Produit</th>
                    <th class="text-right">Quantité</th>
                </tr>
            </thead>
            <tbody>
                @forelse($depotSales as $item)
                    <tr>
                        <td>{{ $loop->iteration }}</td>
                        <td>{{ $item->depotInvoice->date->format('d/m/Y') }}</td>
                        <td class="font-bold text-blue">{{ $item->depotInvoice->number }}</td>
                        <td>{{ $item->depotInvoice->client?->nom ?? 'Client inconnu' }}</td>
                        <td>{{ $item->compartment->product }}</td>
                        <td class="text-right font-bold">{{ number_format($item->quantity, 0, '.', ' ') }} L</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">Aucune vente directe sur cette période</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        <div class="section-title">Chargements (Sorties en cours)</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 20px;">N°</th>
                    <th>Date Charg.</th>
                    <th>Véhicule</th>
                    <th>Client</th>
                    <th>Produit</th>
                    <th class="text-right">Volume</th>
                    <th>Statut</th>
                </tr>
            </thead>
            <tbody>
                @forelse($chargements as $load)
                    <tr>
                        <td>{{ $loop->iteration }}</td>
                        <td>{{ $load->load_date->format('d/m/Y') }}</td>
                        <td class="font-bold text-blue">{{ $load->vehicle_registration }}</td>
                        <td>{{ $load->client?->nom ?? 'Client inconnu' }}</td>
                        <td>{{ $load->product }}</td>
                        <td class="text-right font-bold">{{ number_format($load->volume, 0, '.', ' ') }} L</td>
                        <td>{{ $load->status->value }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">Aucun chargement en cours sur cette période</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        <div class="section-title">Livraisons (Sorties confirmées)</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 20px;">N°</th>
                    <th>Date Charg.</th>
                    <th>Véhicule</th>
                    <th>Client</th>
                    <th>Produit</th>
                    <th class="text-right">Volume</th>
                    <th>Statut</th>
                </tr>
            </thead>
            <tbody>
                @forelse($livraisons as $load)
                    <tr>
                        <td>{{ $loop->iteration }}</td>
                        <td>{{ $load->load_date->format('d/m/Y') }}</td>
                        <td class="font-bold text-blue">{{ $load->vehicle_registration }}</td>
                        <td>{{ $load->client?->nom ?? 'Client inconnu' }}</td>
                        <td>{{ $load->product }}</td>
                        <td class="text-right font-bold">{{ number_format($load->volume, 0, '.', ' ') }} L</td>
                        <td>{{ $load->status->value }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">Aucune livraison sur cette période</td>
                    </tr>
                @endforelse
            </tbody>
            @if($depotSales->count() > 0 || $chargements->count() > 0 || $livraisons->count() > 0 || $purchases->count() > 0)
            <tfoot>
                <tr>
                    <th colspan="3" class="text-right">TOTAL GÉNÉRAL</th>
                    <th class="text-right">Entrées: {{ number_format($purchases->sum('quantity'), 0, '.', ' ') }} L</th>
                    <th colspan="2" class="text-right">Sorties: {{ number_format($chargements->sum('volume') + $livraisons->sum('volume') + $depotSales->sum('quantity'), 0, '.', ' ') }} L</th>
                </tr>
            </tfoot>
            @endif
        </table>

        <div class="footer">
            Corridor Appro - Système de gestion intégrée - Document généré automatiquement
        </div>
    </div>
</body>
</html>
