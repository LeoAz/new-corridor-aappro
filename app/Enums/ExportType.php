<?php

namespace App\Enums;

use App\Services\Exports\AchatsCarburantExport;
use App\Services\Exports\ChargementsEnCoursExport;
use App\Services\Exports\ChargementsReportExport;
use App\Services\Exports\LivraisonsOperationsExport;
use App\Services\Exports\LivraisonsReportExport;
use App\Services\Exports\PdfExport;
use App\Services\Exports\ReleveClientExport;
use App\Services\Exports\SuiviClientExport;
use App\Services\Exports\SuiviStockExport;
use App\Services\Exports\VentesChargementReportExport;
use App\Services\Exports\VentesDepotReportExport;

enum ExportType: string
{
    case RAPPORT_CHARGEMENTS = 'rapport-chargements';
    case RAPPORT_LIVRAISONS = 'rapport-livraisons';
    case RAPPORT_VENTES_CHARGEMENT = 'rapport-ventes-chargement';
    case RAPPORT_VENTES_DEPOT = 'rapport-ventes-depot';
    case CHARGEMENTS_EN_COURS = 'chargements-en-cours';
    case LIVRAISONS = 'livraisons';
    case ACHATS_CARBURANT = 'achats-carburant';
    case SUIVI_STOCK = 'suivi-stock';
    case SUIVI_CLIENT = 'suivi-client';
    case RELEVE_CLIENT = 'releve-client';

    public function exporter(): PdfExport
    {
        return match ($this) {
            self::RAPPORT_CHARGEMENTS => app(ChargementsReportExport::class),
            self::RAPPORT_LIVRAISONS => app(LivraisonsReportExport::class),
            self::RAPPORT_VENTES_CHARGEMENT => app(VentesChargementReportExport::class),
            self::RAPPORT_VENTES_DEPOT => app(VentesDepotReportExport::class),
            self::CHARGEMENTS_EN_COURS => app(ChargementsEnCoursExport::class),
            self::LIVRAISONS => app(LivraisonsOperationsExport::class),
            self::ACHATS_CARBURANT => app(AchatsCarburantExport::class),
            self::SUIVI_STOCK => app(SuiviStockExport::class),
            self::SUIVI_CLIENT => app(SuiviClientExport::class),
            self::RELEVE_CLIENT => app(ReleveClientExport::class),
        };
    }

    public function label(): string
    {
        return $this->exporter()->label();
    }
}
