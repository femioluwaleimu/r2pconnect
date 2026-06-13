<?php
/**
 * Database Connection Class
 */

namespace App\Core;

use PDO;
use PDOException;

class Database {
    private static ?PDO $connection = null;
    private static ?self $instance = null;
    private string $host;
    private string $database;
    private string $username;
    private string $password;
    private int $port;

    public function __construct() {
        $this->host = env('DB_HOST', 'localhost');
        $this->database = env('DB_DATABASE', 'r2pconnect');
        $this->username = env('DB_USERNAME', 'root');
        $this->password = env('DB_PASSWORD', '');
        $this->port = (int)env('DB_PORT', 3306);
    }

    /**
     * Get database connection (singleton pattern)
     */
    public function connect(): PDO {
        if (self::$connection === null) {
            try {
                $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->database};charset=utf8mb4";
                
                self::$connection = new PDO(
                    $dsn,
                    $this->username,
                    $this->password,
                    [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false,
                    ]
                );
            } catch (PDOException $e) {
                error_log("Database Connection Error: " . $e->getMessage());
                http_response_code(500);
                echo json_encode([
                    'error' => 'Database connection failed',
                    'message' => env('APP_DEBUG') === 'true' ? $e->getMessage() : null
                ]);
                exit;
            }
        }

        return self::$connection;
    }

    /**
     * Get database connection instance
     */
    public static function getInstance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    /**
     * Execute raw query
     */
    public function query(string $sql, array $params = []): \PDOStatement {
        $conn = $this->connect();
        $stmt = $conn->prepare($sql);

        foreach (array_values($params) as $index => $value) {
            $type = PDO::PARAM_STR;
            if (is_int($value)) {
                $type = PDO::PARAM_INT;
            } elseif (is_bool($value)) {
                $type = PDO::PARAM_BOOL;
            } elseif ($value === null) {
                $type = PDO::PARAM_NULL;
            }

            $stmt->bindValue($index + 1, $value, $type);
        }

        $stmt->execute();
        return $stmt;
    }

    /**
     * Get all results
     */
    public function getAll(string $sql, array $params = []): array {
        return $this->query($sql, $params)->fetchAll();
    }

    /**
     * Get single result
     */
    public function getOne(string $sql, array $params = []): ?array {
        $row = $this->query($sql, $params)->fetch();
        return $row === false ? null : $row;
    }

    /**
     * Execute insert/update/delete
     */
    public function execute(string $sql, array $params = []): int {
        return $this->query($sql, $params)->rowCount();
    }

    /**
     * Get last inserted ID
     */
    public function lastInsertId(): string {
        return $this->connect()->lastInsertId();
    }

    /**
     * Start transaction
     */
    public function beginTransaction(): void {
        $this->connect()->beginTransaction();
    }

    /**
     * Commit transaction
     */
    public function commit(): void {
        $this->connect()->commit();
    }

    /**
     * Rollback transaction
     */
    public function rollback(): void {
        $this->connect()->rollBack();
    }
}
