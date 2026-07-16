<?php

use App\Http\Controllers\CityController;
use App\Http\Controllers\ClientController;
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

    // Paramètres
    Route::prefix('settings')->name('settings.')->group(function () {
        Route::resource('cities', CityController::class)->only(['index', 'store', 'update', 'destroy']);
    });

    // Opérations
    Route::prefix('operations')->name('operations.')->group(function () {
        Route::get('chargements/download', [LoadController::class, 'downloadPdf'])->name('chargements.download');
        Route::resource('chargements', LoadController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::post('chargements/{chargement}/deliver', [DeliveryController::class, 'deliver'])->name('chargements.deliver');
        Route::get('livraisons/download', [DeliveryController::class, 'downloadPdf'])->name('livraisons.download');
        Route::resource('livraisons', DeliveryController::class)->only(['index', 'update', 'destroy']);
    });

    // Finances
    Route::prefix('finances')->name('finances.')->group(function () {
        Route::get('achat-carburant/download', [FuelPurchaseController::class, 'downloadPdf'])->name('achat-carburant.download');
        Route::resource('achat-carburant', FuelPurchaseController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::get('facture-chargement/{id}/download', [InvoiceController::class, 'downloadPdf'])->name('facture-chargement.download');
        Route::resource('facture-chargement', InvoiceController::class);
        Route::get('facture-depots/{id}/download', [DepotInvoiceController::class, 'downloadPdf'])->name('facture-depots.download');
        Route::resource('facture-depots', DepotInvoiceController::class);
    });

    // Clients
    Route::prefix('clients')->name('clients.')->group(function () {
        Route::resource('gestion', ClientController::class)->parameters(['gestion' => 'client'])->except(['create', 'edit', 'show']);
        Route::resource('reglements', ClientPaymentController::class)->only(['store', 'update', 'destroy']);
        Route::get('releve', [ClientStatementController::class, 'index'])->name('releve.index');
        Route::get('releve/{client}/download', [ClientStatementController::class, 'downloadPdf'])->name('releve.download');
        Route::get('releve/{client}', [ClientStatementController::class, 'show'])->name('releve.show');
        Route::get('suivi-client', [ClientTrackingController::class, 'index'])->name('suivi-client.index');
        Route::get('suivi-client/export-pdf', [ClientTrackingController::class, 'exportPdf'])->name('suivi-client.export-pdf');
        Route::post('suivi-client/payment', [ClientTrackingController::class, 'processPayment'])->name('suivi-client.payment');
        Route::post('suivi-client/update-payment-load', [ClientTrackingController::class, 'updatePaymentLoad'])->name('suivi-client.update-payment-load');
        Route::post('suivi-client/unlink-load', [ClientTrackingController::class, 'unlinkLoad'])->name('suivi-client.unlink-load');
        Route::get('suivi-client/{client}/invoices', [ClientTrackingController::class, 'getInvoices'])->name('suivi-client.invoices');
        Route::get('suivi-creances', fn () => null)->name('suivi-creances');
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
