<?php
/**
 * API Router
 */

namespace App\Core;

class Router {
    private array $routes = [];
    private string $method;
    private string $path;

    public function __construct() {
        $this->method = $_SERVER['REQUEST_METHOD'];
        $requestUri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($requestUri, PHP_URL_PATH) ?: '/';
        $query = parse_url($requestUri, PHP_URL_QUERY);

        // Support /api.php?/auth/login on shared hosting and /auth/login with rewrites.
        if (($path === '/api.php' || str_ends_with($path, '/api.php')) && is_string($query) && str_starts_with($query, '/')) {
            $path = parse_url($query, PHP_URL_PATH) ?: '/';
        }

        $this->path = $path;
        $this->path = preg_replace('#^/(backend/)?api(?:\.php)?#', '', $this->path);
        if (empty($this->path)) {
            $this->path = '/';
        }
    }

    /**
     * Register GET route
     */
    public function get(string $path, string $handler): self {
        return $this->register('GET', $path, $handler);
    }

    /**
     * Register POST route
     */
    public function post(string $path, string $handler): self {
        return $this->register('POST', $path, $handler);
    }

    /**
     * Register PUT route
     */
    public function put(string $path, string $handler): self {
        return $this->register('PUT', $path, $handler);
    }

    /**
     * Register PATCH route
     */
    public function patch(string $path, string $handler): self {
        return $this->register('PATCH', $path, $handler);
    }

    /**
     * Register DELETE route
     */
    public function delete(string $path, string $handler): self {
        return $this->register('DELETE', $path, $handler);
    }

    /**
     * Register route
     */
    private function register(string $method, string $path, string $handler): self {
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler
        ];
        return $this;
    }

    /**
     * Match and dispatch route
     */
    public function dispatch(): void {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $this->method) {
                continue;
            }

            $pattern = $this->convertPathToPattern($route['path']);
            $params = [];

            if (preg_match($pattern, $this->path, $matches)) {
                // Extract parameters
                array_shift($matches);
                foreach ($matches as $match) {
                    $params[] = $match;
                }

                // Call handler
                $this->callHandler($route['handler'], $params);
                return;
            }
        }

        // Route not found
        http_response_code(404);
        echo json_encode(['error' => 'Route not found']);
    }

    /**
     * Convert path to regex pattern
     */
    private function convertPathToPattern(string $path): string {
        $path = preg_replace_callback(
            '/{(\w+)}/',
            fn($matches) => '([^/]+)',
            $path
        );
        return '#^' . $path . '$#';
    }

    /**
     * Call handler (namespace\class@method)
     */
    private function callHandler(string $handler, array $params): void {
        if (strpos($handler, '@') === false) {
            http_response_code(500);
            echo json_encode(['error' => 'Invalid handler format']);
            return;
        }

        list($class, $method) = explode('@', $handler);
        $classPath = 'App\\Controllers\\' . $class;

        if (!class_exists($classPath)) {
            http_response_code(500);
            echo json_encode(['error' => 'Handler class not found']);
            return;
        }

        $instance = new $classPath();
        if (!method_exists($instance, $method)) {
            http_response_code(500);
            echo json_encode(['error' => 'Handler method not found']);
            return;
        }

        call_user_func_array([$instance, $method], $params);
    }
}
