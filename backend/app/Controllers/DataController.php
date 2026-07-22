<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;

class DataController extends Controller {
    private const RESEARCHER_FREE_MONTHLY_CREDITS = 3;

    public function query(): void {
        try {
            $table = $this->identifier($this->input('table', ''));
            if (!$table) {
                Response::error('Invalid table name', 422);
                return;
            }

            $filters = $this->input('filters', []);
            if ($table === 'subscriptions') {
                $this->renewResearcherFreeCreditsIfDue();
            }

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

    private function renewResearcherFreeCreditsIfDue(): void {
        try {
            $now = date('Y-m-d H:i:s');
            $end = date('Y-m-d H:i:s', strtotime('+1 month'));
            $this->db->execute(
                "INSERT INTO subscriptions (id, user_id, tier, amount, currency, current_period_start, current_period_end, ai_credits_remaining, ai_matchers_remaining, max_challenges_per_month, ai_matches_per_challenge, is_active, created_at, updated_at)
                 SELECT UUID(), ur.user_id, 'free', 0, 'NGN', ?, ?, ?, 0, 0, 0, 1, ?, ?
                 FROM user_roles ur
                 LEFT JOIN subscriptions s ON s.user_id = ur.user_id
                 LEFT JOIN ai_credits ac ON ac.user_id = ur.user_id
                 WHERE ur.role = 'researcher'
                   AND s.id IS NULL
                   AND COALESCE(ac.credits_used, 0) = 0",
                [$now, $end, self::RESEARCHER_FREE_MONTHLY_CREDITS, $now, $now]
            );

            $this->db->execute(
                "UPDATE subscriptions s
                 INNER JOIN user_roles ur ON ur.user_id = s.user_id
                 SET s.current_period_start = ?,
                     s.current_period_end = ?,
                     s.ai_credits_remaining = ?,
                     s.is_active = 1,
                     s.updated_at = ?
                 WHERE s.tier = 'free'
                   AND ur.role = 'researcher'
                   AND (s.current_period_end IS NULL OR s.current_period_end < ?)",
                [$now, $end, self::RESEARCHER_FREE_MONTHLY_CREDITS, $now, $now]
            );

            $this->db->execute(
                "UPDATE subscriptions s
                 INNER JOIN user_roles ur ON ur.user_id = s.user_id
                 LEFT JOIN ai_credits ac ON ac.user_id = s.user_id
                 SET s.current_period_start = COALESCE(s.current_period_start, ?),
                     s.current_period_end = COALESCE(s.current_period_end, ?),
                     s.ai_credits_remaining = ?,
                     s.is_active = 1,
                     s.updated_at = ?
                 WHERE s.tier = 'free'
                   AND ur.role = 'researcher'
                   AND COALESCE(s.ai_credits_remaining, 0) < ?
                   AND COALESCE(ac.credits_used, 0) = 0",
                [$now, $end, self::RESEARCHER_FREE_MONTHLY_CREDITS, $now, self::RESEARCHER_FREE_MONTHLY_CREDITS]
            );
        } catch (\Throwable $e) {
            error_log('Free subscription renewal failed: ' . $e->getMessage());
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
                    $params[] = $this->normalizeValue($value);
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
                $row = $this->prepareInsertRow($table, $this->sanitizeRow($row));
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
                $clean[$column] = $this->normalizeValue($value);
            }
        }
        return $clean;
    }

    private function prepareInsertRow(string $table, array $row): array {
        $columns = $this->tableColumns($table);
        if (!$columns) {
            return $row;
        }

        $row = array_intersect_key($row, $columns);
        $now = date('Y-m-d H:i:s');

        if (
            isset($columns['id']) &&
            (!array_key_exists('id', $row) || $row['id'] === null || $row['id'] === '') &&
            stripos((string)($columns['id']['Type'] ?? ''), 'char(36)') !== false
        ) {
            $row['id'] = generateUUID();
        }

        if (isset($columns['created_at']) && (!array_key_exists('created_at', $row) || $row['created_at'] === null || $row['created_at'] === '')) {
            $row['created_at'] = $now;
        }

        if (isset($columns['updated_at']) && (!array_key_exists('updated_at', $row) || $row['updated_at'] === null || $row['updated_at'] === '')) {
            $row['updated_at'] = $now;
        }

        return $row;
    }

    private function tableColumns(string $table): array {
        static $cache = [];
        $table = $this->identifier($table);
        if (!$table) {
            return [];
        }

        if (isset($cache[$table])) {
            return $cache[$table];
        }

        try {
            $rows = $this->db->getAll("SHOW COLUMNS FROM `{$table}`");
            $cache[$table] = [];
            foreach ($rows as $row) {
                if (!empty($row['Field'])) {
                    $cache[$table][(string)$row['Field']] = $row;
                }
            }
        } catch (\Throwable $e) {
            error_log("Column lookup failed for {$table}: " . $e->getMessage());
            $cache[$table] = [];
        }

        return $cache[$table];
    }

    private function normalizeValue(mixed $value): mixed {
        if (is_array($value) || is_object($value)) {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }

        return $value;
    }

    private function identifier(string $identifier): ?string {
        $identifier = trim($identifier);
        return preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $identifier) ? $identifier : null;
    }
}
