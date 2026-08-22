<?php

namespace App\Services;

use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

class QrCodeGenerator
{
    /**
     * Génère un QR code au format SVG (chaîne brute).
     */
    public static function svg(string $data, int $size = 200): string
    {
        $renderer = new ImageRenderer(
            new RendererStyle($size),
            new SvgImageBackEnd
        );

        return (new Writer($renderer))->writeString($data);
    }

    /**
     * Génère un QR code au format SVG encodé en base64, pour une intégration
     * directe en source d'image (ex: data URI dans un template PDF).
     */
    public static function base64(string $data, int $size = 100): string
    {
        return base64_encode(self::svg($data, $size));
    }
}
