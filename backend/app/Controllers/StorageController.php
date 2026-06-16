<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;

class StorageController extends Controller {
    public function upload(string $bucket): void {
        $path = $_POST['path'] ?? '';
        if (!$path || empty($_FILES['file'])) {
            Response::error('File and path are required', 422);
            return;
        }

        $relativePath = $this->cleanPath($bucket . '/' . $path);
        $targetPath = BASE_PATH . '/storage/uploads/' . $relativePath;
        $targetDir = dirname($targetPath);

        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0777, true);
        }

        if (!move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
            Response::error('Upload failed', 500);
            return;
        }

        Response::json(['data' => ['path' => $path, 'fullPath' => $relativePath], 'error' => null]);
    }

    public function signedUrl(string $bucket): void {
        $path = $this->input('path', '');
        Response::json([
            'data' => ['signedUrl' => $this->publicUrl($bucket, $path)],
            'error' => null,
        ]);
    }

    public function publicFile(string $bucket, string $encodedPath): void {
        $decodedPath = $this->decodePublicPath($encodedPath);
        if ($decodedPath === '') {
            Response::error('File path is required', 422);
            return;
        }

        $relativePath = $this->cleanPath($bucket . '/' . $decodedPath);
        $targetPath = BASE_PATH . '/storage/uploads/' . $relativePath;
        $storageRoot = realpath(BASE_PATH . '/storage/uploads');
        $filePath = realpath($targetPath);

        if (!$storageRoot || !$filePath || strpos($filePath, $storageRoot) !== 0 || !is_file($filePath)) {
            Response::error('File not found', 404);
            return;
        }

        $mimeType = 'application/octet-stream';
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo) {
                $detected = finfo_file($finfo, $filePath);
                if (is_string($detected) && $detected !== '') {
                    $mimeType = $detected;
                }
                finfo_close($finfo);
            }
        }

        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . filesize($filePath));
        header('Cache-Control: public, max-age=31536000, immutable');
        readfile($filePath);
    }

    public function publicUrl(string $bucket, string $path = ''): string {
        $apiUrl = rtrim(env('API_URL', ''), '/');
        $baseUrl = $apiUrl ?: '/api.php';
        return rtrim($baseUrl, '/') . '?/storage/' . rawurlencode($bucket) . '/public/' . $this->encodePublicPath($path);
    }

    private function cleanPath(string $path): string {
        $path = str_replace('\\', '/', $path);
        $parts = [];
        foreach (explode('/', $path) as $part) {
            if ($part === '' || $part === '.' || $part === '..') {
                continue;
            }
            $parts[] = preg_replace('/[^A-Za-z0-9._-]/', '_', $part);
        }
        return implode('/', $parts);
    }

    private function encodePublicPath(string $path): string {
        return rtrim(strtr(base64_encode($path), '+/', '-_'), '=');
    }

    private function decodePublicPath(string $path): string {
        $padded = strtr($path, '-_', '+/');
        $padding = strlen($padded) % 4;
        if ($padding) {
            $padded .= str_repeat('=', 4 - $padding);
        }

        $decoded = base64_decode($padded, true);
        return is_string($decoded) ? $decoded : '';
    }
}
