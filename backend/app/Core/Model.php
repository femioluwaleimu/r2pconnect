<?php
/**
 * Base Model Class
 */

namespace App\Core;

class Model {
    protected Database $db;
    protected string $table;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Find by ID
     */
    public function find(string $id): ?array {
        $sql = "SELECT * FROM {$this->table} WHERE id = ?";
        return $this->db->getOne($sql, [$id]);
    }

    /**
     * Get all
     */
    public function all(): array {
        $sql = "SELECT * FROM {$this->table}";
        return $this->db->getAll($sql);
    }

    /**
     * Create
     */
    public function create(array $data): ?array {
        $columns = array_keys($data);
        $placeholders = array_fill(0, count($columns), '?');
        $quotedColumns = array_map(fn($column) => "`{$column}`", $columns);
        
        $sql = "INSERT INTO {$this->table} (" . implode(',', $quotedColumns) . ") VALUES (" . implode(',', $placeholders) . ")";
        
        $this->db->execute($sql, array_values($data));
        
        return isset($data['id']) ? $this->find((string)$data['id']) : $this->find($this->db->lastInsertId());
    }

    /**
     * Update
     */
    public function update(string $id, array $data): bool {
        $sets = [];
        $values = [];
        
        foreach ($data as $key => $value) {
            $sets[] = "`{$key}` = ?";
            $values[] = $value;
        }
        
        $values[] = $id;
        $sql = "UPDATE {$this->table} SET " . implode(', ', $sets) . " WHERE id = ?";
        
        return $this->db->execute($sql, $values) > 0;
    }

    /**
     * Delete
     */
    public function delete(string $id): bool {
        $sql = "DELETE FROM {$this->table} WHERE id = ?";
        return $this->db->execute($sql, [$id]) > 0;
    }

    /**
     * Query
     */
    public function query(string $sql, array $params = []): ?array {
        return $this->db->getAll($sql, $params);
    }

    /**
     * Query one
     */
    public function queryOne(string $sql, array $params = []): ?array {
        return $this->db->getOne($sql, $params);
    }
}
