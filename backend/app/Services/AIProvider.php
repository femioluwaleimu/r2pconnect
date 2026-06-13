<?php

namespace App\Services;

use App\Core\Database;

class AIProvider {
    private Database $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function chat(array $messages, array $options = []): array {
        $providers = $this->providerOrder();
        $errors = [];

        foreach ($providers as $provider) {
            $config = $this->providerConfig($provider, $options);
            if (!$this->isConfiguredKey($config['api_key'])) {
                $errors[] = "{$provider}: missing API key";
                continue;
            }

            try {
                $result = $this->request($config, $messages, $options);
                $result['provider'] = $provider;
                return $result;
            } catch (\Throwable $e) {
                $errors[] = "{$provider}: " . $e->getMessage();
                error_log("AI provider {$provider} failed: " . $e->getMessage());
            }
        }

        throw new \RuntimeException('AI request failed. ' . implode('; ', $errors));
    }

    private function providerOrder(): array {
        $settings = $this->settings(['ai_primary_provider', 'ai_fallback_provider']);
        $primary = $this->normalizeProvider($settings['ai_primary_provider'] ?? env('AI_PRIMARY_PROVIDER', 'openai'));
        $fallback = $this->normalizeProvider($settings['ai_fallback_provider'] ?? env('AI_FALLBACK_PROVIDER', 'deepseek'));

        return array_values(array_unique(array_filter([$primary, $fallback])));
    }

    private function normalizeProvider(?string $provider): ?string {
        $provider = strtolower(trim((string)$provider));
        return in_array($provider, ['openai', 'deepseek'], true) ? $provider : null;
    }

    private function settings(array $keys): array {
        if (!$keys) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($keys), '?'));
        $rows = $this->db->getAll("SELECT `key`, `value` FROM platform_settings WHERE `key` IN ({$placeholders})", $keys);
        $settings = [];
        foreach ($rows as $row) {
            $settings[$row['key']] = $row['value'];
        }

        return $settings;
    }

    private function providerConfig(string $provider, array $options): array {
        if ($provider === 'deepseek') {
            return [
                'provider' => 'deepseek',
                'api_key' => env('DEEPSEEK_API_KEY', ''),
                'url' => env('DEEPSEEK_API_URL', 'https://api.deepseek.com/chat/completions'),
                'model' => $options['deepseek_model'] ?? env('DEEPSEEK_MODEL', 'deepseek-chat'),
            ];
        }

        return [
            'provider' => 'openai',
            'api_key' => env('OPENAI_API_KEY', ''),
            'url' => env('OPENAI_API_URL', 'https://api.openai.com/v1/chat/completions'),
            'model' => $options['openai_model'] ?? env('OPENAI_MODEL', 'gpt-4o-mini'),
        ];
    }

    private function isConfiguredKey(?string $apiKey): bool {
        $apiKey = trim((string)$apiKey);
        if ($apiKey === '') {
            return false;
        }

        return !str_starts_with($apiKey, 'your_') && !str_contains($apiKey, 'xxxxxxxx');
    }

    private function request(array $config, array $messages, array $options): array {
        $payload = [
            'model' => $config['model'],
            'messages' => $messages,
            'temperature' => $options['temperature'] ?? 0.4,
        ];

        if (!empty($options['max_tokens'])) {
            $payload['max_tokens'] = (int)$options['max_tokens'];
        }

        $headers = [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $config['api_key'],
        ];

        $response = $this->postJson($config['url'], $headers, $payload);
        $status = $response['status'];
        $body = $response['body'];

        if ($status < 200 || $status >= 300) {
            throw new \RuntimeException("HTTP {$status}: " . substr($body, 0, 500));
        }

        $data = json_decode($body, true);
        if (!is_array($data)) {
            throw new \RuntimeException('Invalid JSON response from AI provider');
        }

        $content = $data['choices'][0]['message']['content'] ?? null;
        if (!is_string($content) || trim($content) === '') {
            throw new \RuntimeException('AI provider returned an empty response');
        }

        return [
            'content' => $content,
            'model' => $config['model'],
            'usage' => $data['usage'] ?? null,
        ];
    }

    private function postJson(string $url, array $headers, array $payload): array {
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES);

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_POSTFIELDS => $body,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 45,
            ]);

            $responseBody = curl_exec($ch);
            if ($responseBody === false) {
                $error = curl_error($ch);
                curl_close($ch);
                throw new \RuntimeException($error ?: 'cURL request failed');
            }

            $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            return ['status' => $status, 'body' => $responseBody];
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $headers),
                'content' => $body,
                'timeout' => 45,
                'ignore_errors' => true,
            ],
        ]);

        $responseBody = file_get_contents($url, false, $context);
        if ($responseBody === false) {
            throw new \RuntimeException('HTTP request failed');
        }

        $status = 0;
        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $matches)) {
            $status = (int)$matches[1];
        }

        return ['status' => $status, 'body' => $responseBody];
    }
}
