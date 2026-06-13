<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;

class DataController extends Controller {
    public function query(): void {
        try {
            $table = $this->identifier($this->input('table', ''));
            if (!$table) {
                Response::error('Invalid table name', 422);
                return;
            }

            $filters = $this->input('filters', []);
            $select = $this->buildSelect((string)$this->input('select', '*'));
            $where = $this->buildWhere(is_array($filters) ? $filters : []);
            $order = $this->buildOrder($this->input('order', []));
            $limit = $this->input('limit');
            $offset = $this->input('offset', 0);
            $single = (bool)$this->input('single', false);
            $countOnly = (bool)$this->input('countOnly', false);

            if ($countOnly) {
                $sql = "SELECT COUNT(*) AS count FROM `{$table}`{$where['sql']}";
                $row = $this->db->getOne($sql, $where['params']);
                Response::json(['data' => [], 'error' => null, 'count' => (int)($row['count'] ?? 0)]);
                return;
            }

            $sql = "SELECT {$select} FROM `{$table}`{$where['sql']}{$order}";
            $params = $where['params'];

            if ($limit !== null) {
                $sql .= ' LIMIT ?';
                $params[] = (int)$limit;

                if ((int)$offset > 0) {
                    $sql .= ' OFFSET ?';
                    $params[] = (int)$offset;
                }
            }

            $rows = $this->db->getAll($sql, $params);
            Response::json([
                'data' => $single ? ($rows[0] ?? null) : $rows,
                'error' => null,
                'count' => count($rows),
            ]);
        } catch (\Throwable $e) {
            error_log('Data query error: ' . $e->getMessage());
            Response::error('Database query failed', 500);
        }
    }

    public function insert(): void {
        $this->writeRows('insert');
    }

    public function update(): void {
        $this->writeRows('update');
    }

    public function upsert(): void {
        $this->writeRows('upsert');
    }

    public function delete(): void {
        try {
            $table = $this->identifier($this->input('table', ''));
            if (!$table) {
                Response::error('Invalid table name', 422);
                return;
            }

            $where = $this->buildWhere($this->input('filters', []));
            if ($where['sql'] === '') {
                Response::error('Delete requires at least one filter', 422);
                return;
            }

            $affected = $this->db->execute("DELETE FROM `{$table}`{$where['sql']}", $where['params']);
            Response::json(['data' => ['affected' => $affected], 'error' => null]);
        } catch (\Throwable $e) {
            error_log('Data delete error: ' . $e->getMessage());
            Response::error('Database delete failed', 500);
        }
    }

    private function writeRows(string $mode): void {
        try {
            $table = $this->identifier($this->input('table', ''));
            $rows = $this->input('values', []);
            $filters = $this->input('filters', []);
            $returning = (bool)$this->input('returning', false);

            if (!$table) {
                Response::error('Invalid table name', 422);
                return;
            }

            if ($mode === 'update') {
                $values = is_array($rows) ? $rows : [];
                if (!$values) {
                    Response::error('Update values are required', 422);
                    return;
                }

                $sets = [];
                $params = [];
                foreach ($values as $column => $value) {
                    $column = $this->identifier((string)$column);
                    if (!$column) {
                        continue;
                    }
                    $sets[] = "`{$column}` = ?";
                    $params[] = $value;
                }

                $where = $this->buildWhere(is_array($filters) ? $filters : []);
                if (!$sets || $where['sql'] === '') {
                    Response::error('Update requires values and filters', 422);
                    return;
                }

                $affected = $this->db->execute("UPDATE `{$table}` SET " . implode(', ', $sets) . $where['sql'], array_merge($params, $where['params']));
                Response::json(['data' => ['affected' => $affected], 'error' => null]);
                return;
            }

            $payloadRows = $this->normalizeRows($rows);
            $inserted = [];
            foreach ($payloadRows as $row) {
                $row = $this->sanitizeRow($row);
                if (!$row) {
                    continue;
                }

                $columns = array_keys($row);
                $quoted = array_map(fn($column) => "`{$column}`", $columns);
                $placeholders = implode(', ', array_fill(0, count($columns), '?'));
                $values = array_values($row);

                if ($mode === 'upsert') {
                    $updates = array_map(fn($column) => "`{$column}` = VALUES(`{$column}`)", $columns);
                    $sql = "INSERT INTO `{$table}` (" . implode(', ', $quoted) . ") VALUES ({$placeholders}) ON DUPLICATE KEY UPDATE " . implode(', ', $updates);
                } else {
                    $sql = "INSERT INTO `{$table}` (" . implode(', ', $quoted) . ") VALUES ({$placeholders})";
                }

                $this->db->execute($sql, $values);
                $inserted[] = $row;
            }

            Response::json(['data' => $returning ? $inserted : null, 'error' => null], $mode === 'insert' ? 201 : 200);
        } catch (\Throwable $e) {
            error_log("Data {$mode} error: " . $e->getMessage());
            Response::error("Database {$mode} failed", 500);
        }
    }

    private function buildSelect(string $select): string {
        if (trim($select) === '' || str_contains($select, '*')) {
            return '*';
        }

        $columns = [];
        foreach (explode(',', $select) as $part) {
            $part = trim($part);
            if ($part === '' || str_contains($part, '(')) {
                continue;
            }
            $column = $this->identifier($part);
            if ($column) {
                $columns[] = "`{$column}`";
            }
        }

        return $columns ? implode(', ', $columns) : '*';
    }

    private function buildWhere(array $filters): array {
        $clauses = [];
        $params = [];

        foreach ($filters as $filter) {
            if (!is_array($filter)) {
                continue;
            }

            $column = $this->identifier((string)($filter['column'] ?? ''));
            $operator = (string)($filter['operator'] ?? 'eq');
            $value = $filter['value'] ?? null;

            if (!$column) {
                continue;
            }

            switch ($operator) {
                case 'neq':
                    $clauses[] = "`{$column}` != ?";
                    $params[] = $value;
                    break;
                case 'gt':
                case 'gte':
                case 'lt':
                case 'lte':
                    $map = ['gt' => '>', 'gte' => '>=', 'lt' => '<', 'lte' => '<='];
                    $clauses[] = "`{$column}` {$map[$operator]} ?";
                    $params[] = $value;
                    break;
                case 'like':
                case 'ilike':
                    $clauses[] = "`{$column}` LIKE ?";
                    $params[] = $value;
                    break;
                case 'in':
                    $values = is_array($value) ? $value : [];
                    if ($values) {
                        $clauses[] = "`{$column}` IN (" . implode(', ', array_fill(0, count($values), '?')) . ")";
                        array_push($params, ...$values);
                    }
                    break;
                case 'is':
                    if ($value === null || strtolower((string)$value) === 'null') {
                        $clauses[] = "`{$column}` IS NULL";
                    } else {
                        $clauses[] = "`{$column}` IS NOT NULL";
                    }
                    break;
                case 'is_not':
                    if ($value === null || strtolower((string)$value) === 'null') {
                        $clauses[] = "`{$column}` IS NOT NULL";
                    } else {
                        $clauses[] = "`{$column}` IS NULL";
                    }
                    break;
                default:
                    $clauses[] = "`{$column}` = ?";
                    $params[] = $value;
                    break;
            }
        }

        return [
            'sql' => $clauses ? ' WHERE ' . implode(' AND ', $clauses) : '',
            'params' => $params,
        ];
    }

    private function buildOrder($order): string {
        if (!is_array($order) || empty($order['column'])) {
            return '';
        }

        $column = $this->identifier((string)$order['column']);
        if (!$column) {
            return '';
        }

        $direction = !empty($order['ascending']) ? 'ASC' : 'DESC';
        return " ORDER BY `{$column}` {$direction}";
    }

    private function normalizeRows($rows): array {
        if (!is_array($rows)) {
            return [];
        }

        $isList = array_keys($rows) === range(0, count($rows) - 1);
        return $isList ? $rows : [$rows];
    }

    private function sanitizeRow(array $row): array {
        $clean = [];
        foreach ($row as $column => $value) {
            $column = $this->identifier((string)$column);
            if ($column) {
                $clean[$column] = $value;
            }
        }
        return $clean;
    }

    private function identifier(string $identifier): ?string {
        $identifier = trim($identifier);
        return preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $identifier) ? $identifier : null;
    }
}
