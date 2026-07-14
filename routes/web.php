<?php

use App\Http\Controllers\ClientPaymentController;
use App\Http\Controllers\ClientStatementController;
use App\Http\Controllers\ClientTrackingController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\DepotController;
use App\Http\Controllers\DepotInvoiceController;
use App\Http\Controllers\FuelPurchaseController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\LoadController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\StockTrackingController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return redirect()->route('operations.chargements.index');
    })->name('dashboard');

    // Configuration
    Route::prefix('configuration')->name('configuration.')->group(function () {
        Route::resource('depots', DepotController::class)->only(['index', 'store', 'update', 'destroy']);
    });

    // Opérations
    Route::prefix('operations')->name('operations.')->group(function () {
        Route::get('chargements/download', [LoadController::class, 'downloadPdf'])->name('chargements.download');
        Route::resource('chargements', LoadController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::post('chargements/{chargement}/deliver', [DeliveryController::class, 'deliver'])->name('chargements.deliver');
        Route::get('livraisons/download', [DeliveryController::class, 'downloadPdf'])->name('livraisons.download');
        Route::resource('livraisons', DeliveryController::class)->only(['index', 'update', 'destroy']);
        Route::get('#3', fn () => null)->name('reglements.index');
    });

    // Finances
    Route::prefix('finances')->name('finances.')->group(function () {
        Route::get('achat-carburant/download', [FuelPurchaseController::class, 'downloadPdf'])->name('achat-carburant.download');
        Route::resource('achat-carburant', FuelPurchaseController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::get('facture-chargement/{id}/download', [InvoiceController::class, 'downloadPdf'])->name('facture-chargement.download');
        Route::resource('facture-chargement', InvoiceController::class);
        Route::get('facture-depots/{id}/download', [DepotInvoiceController::class, 'downloadPdf'])->name('facture-depots.download');
        Route::resource('facture-depots', DepotInvoiceController::class);
        Route::get('reglements/advances/{clientId}', [ClientPaymentController::class, 'getAdvances'])->name('reglements.advances');
        Route::get('reglements/{reglement}/download', [ClientPaymentController::class, 'downloadPdf'])->name('reglements.download');
        Route::resource('reglements', ClientPaymentController::class)->only(['index', 'store', 'update', 'show', 'destroy']);
    });

    // Clients
    Route::prefix('clients')->name('clients.')->group(function () {
        Route::get('releve', [ClientStatementController::class, 'index'])->name('releve.index');
        Route::get('releve/{client}/download', [ClientStatementController::class, 'downloadPdf'])->name('releve.download');
        Route::get('releve/{client}', [ClientStatementController::class, 'show'])->name('releve.show');
        Route::get('suivi-client', [ClientTrackingController::class, 'index'])->name('suivi-client.index');
        Route::get('suivi-client/{client}/download', [ClientTrackingController::class, 'downloadPdf'])->name('suivi-client.download');
        Route::get('suivi-client/{client}', [ClientTrackingController::class, 'show'])->name('suivi-client.show');
        Route::get('#7', fn () => null)->name('index');
        Route::get('#8', fn () => null)->name('suivi-creances');
    });

    // Rapports
    Route::prefix('rapports')->name('rapports.')->group(function () {
        Route::get('chargements', [ReportController::class, 'chargements'])->name('chargements');
        Route::get('chargements/download', [ReportController::class, 'downloadChargements'])->name('chargements.download');
        Route::get('livraisons', [ReportController::class, 'livraisons'])->name('livraisons');
        Route::get('livraisons/download', [ReportController::class, 'downloadLivraisons'])->name('livraisons.download');
        Route::get('vente-chargement', [ReportController::class, 'ventesChargement'])->name('vente-chargement');
        Route::get('vente-chargement/download', [ReportController::class, 'downloadVentesChargement'])->name('vente-chargement.download');
        Route::get('vente-depot', [ReportController::class, 'ventesDepot'])->name('vente-depot');
        Route::get('vente-depot/download', [ReportController::class, 'downloadVentesDepot'])->name('vente-depot.download');
    });
    // Stock Tracking
    Route::get('stocks/suivi-stock', [StockTrackingController::class, 'index'])->name('stocks.suivi-stock');
    Route::get('stocks/suivi-stock/download', [StockTrackingController::class, 'downloadPdf'])->name('stocks.suivi-stock.download');
});

require __DIR__.'/settings.php';
