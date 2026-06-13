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

    public function publicUrl(string $bucket, string $path = ''): string {
        $apiUrl = rtrim(env('API_URL', ''), '/');
        $baseUrl = $apiUrl ? preg_replace('#/api\.php$#', '', $apiUrl) : '';
        $relativePath = $this->cleanPath($bucket . '/' . $path);
        return rtrim($baseUrl, '/') . '/storage/uploads/' . $relativePath;
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
}
