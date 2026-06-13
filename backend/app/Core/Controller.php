<?php
/**
 * Base Controller
 */

namespace App\Core;

class Controller {
    protected Database $db;
    protected array $requestData = [];

    public function __construct() {
        $this->db = Database::getInstance();
        $this->requestData = $this->getRequestData();
    }

    /**
     * Get request data (GET, POST, JSON)
     */
    protected function getRequestData(): array {
        $data = [];

        // GET parameters
        $data = array_merge($data, $_GET ?? []);

        // POST/PUT/PATCH parameters
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            
            if (strpos($contentType, 'application/json') !== false) {
                $json = file_get_contents('php://input');
                if ($json) {
                    $jsonData = json_decode($json, true);
                    if (is_array($jsonData)) {
                        $data = array_merge($data, $jsonData);
                    }
                }
            } else {
                $data = array_merge($data, $_POST ?? []);
            }
        }

        return $data;
    }

    /**
     * Get input
     */
    protected function input(string $key, $default = null) {
        return $this->requestData[$key] ?? $default;
    }

    /**
     * Get all input
     */
    protected function all(): array {
        return $this->requestData;
    }

    /**
     * Validate input
     */
    protected function validate(array $rules): bool {
        $errors = [];

        foreach ($rules as $field => $fieldRules) {
            $fieldRules = explode('|', $fieldRules);
            $value = $this->input($field);

            foreach ($fieldRules as $rule) {
                $ruleName = $rule;
                $ruleParams = null;

                if (strpos($rule, ':') !== false) {
                    list($ruleName, $ruleParams) = explode(':', $rule, 2);
                }

                switch ($ruleName) {
                    case 'required':
                        if (empty($value)) {
                            $errors[$field][] = "$field is required";
                        }
                        break;

                    case 'email':
                        if ($value && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                            $errors[$field][] = "$field must be a valid email";
                        }
                        break;

                    case 'min':
                        if ($value && strlen($value) < (int)$ruleParams) {
                            $errors[$field][] = "$field must be at least $ruleParams characters";
                        }
                        break;

                    case 'max':
                        if ($value && strlen($value) > (int)$ruleParams) {
                            $errors[$field][] = "$field must not exceed $ruleParams characters";
                        }
                        break;

                    case 'unique':
                        list($table, $column) = explode(',', $ruleParams);
                        $sql = "SELECT COUNT(*) as count FROM $table WHERE $column = ?";
                        $result = $this->db->getOne($sql, [$value]);
                        if ($result && $result['count'] > 0) {
                            $errors[$field][] = "$field must be unique";
                        }
                        break;
                }
            }
        }

        if (!empty($errors)) {
            Response::validationError($errors);
            return false;
        }

        return true;
    }

    /**
     * Get current authenticated user
     */
    protected function getUser(): ?array {
        return JWT::getCurrentUser();
    }

    /**
     * Check if user is authenticated
     */
    protected function requireAuth(): void {
        if (!$this->getUser()) {
            Response::unauthorized();
            exit;
        }
    }

    /**
     * Check if user has specific role
     */
    protected function requireRole(string ...$roles): void {
        $this->requireAuth();
        
        $user = $this->getUser();
        $sql = "SELECT role FROM user_roles WHERE user_id = ?";
        $roleData = $this->db->getOne($sql, [$user['sub']]);

        if (!$roleData || !in_array($roleData['role'], $roles)) {
            Response::forbidden();
            exit;
        }
    }
}
