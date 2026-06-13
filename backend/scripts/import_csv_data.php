<?php
/**
 * CSV/ZIP Data Import Script
 * Imports Supabase table exports into the MySQL database.
 *
 * Usage:
 *   php backend/scripts/import_csv_data.php
 *   php backend/scripts/import_csv_data.php "C:\path\to\r2pconnect tables.zip"
 *   php backend/scripts/import_csv_data.php "C:\path\to\csv-folder"
 */

require_once __DIR__ . '/../bootstrap.php';

use App\Core\Database;

class CSVImporter {
    private Database $db;
    private string $sourcePath;
    private ?string $tempDirectory = null;
    private int $importedCount = 0;
    private int $errorCount = 0;

    public function __construct(string $sourcePath) {
        $this->db = Database::getInstance();
        $this->sourcePath = $sourcePath;
    }

    public function __destruct() {
        if ($this->tempDirectory && is_dir($this->tempDirectory)) {
            $this->deleteDirectory($this->tempDirectory);
        }
    }

    public function importAllCSVs(): bool {
        $csvPath = $this->prepareSourcePath($this->sourcePath);
        if (!$csvPath || !is_dir($csvPath)) {
            echo "Error: CSV source does not exist: {$this->sourcePath}\n";
            return false;
        }

        $files = glob($csvPath . '/*.csv') ?: [];
        if (!$files) {
            $files = glob($csvPath . '/*/*.csv') ?: [];
        }

        echo "=== Starting MySQL CSV Import ===\n";
        echo "Source: {$this->sourcePath}\n";
        echo "CSV Path: {$csvPath}\n";
        echo "Files: " . count($files) . "\n\n";

        if (!$files) {
            echo "Error: No CSV files found\n";
            return false;
        }

        $this->db->execute('SET FOREIGN_KEY_CHECKS = 0');

        try {
            foreach ($files as $file) {
                $this->importCSVFile($file);
            }
        } finally {
            $this->db->execute('SET FOREIGN_KEY_CHECKS = 1');
        }

        echo "\n=== Import Complete ===\n";
        echo "Imported Records: {$this->importedCount}\n";
        echo "Errors: {$this->errorCount}\n";

        return $this->errorCount === 0;
    }

    private function prepareSourcePath(string $sourcePath): ?string {
        if (is_dir($sourcePath)) {
            return $sourcePath;
        }

        if (!is_file($sourcePath)) {
            return null;
        }

        if (strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION)) !== 'zip') {
            return null;
        }

        if (!class_exists('ZipArchive')) {
            echo "Error: PHP ZipArchive extension is required to import a .zip file.\n";
            return null;
        }

        $this->tempDirectory = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'r2pconnect_import_' . uniqid();
        if (!mkdir($this->tempDirectory, 0777, true) && !is_dir($this->tempDirectory)) {
            return null;
        }

        $zip = new ZipArchive();
        if ($zip->open($sourcePath) !== true) {
            return null;
        }

        $zip->extractTo($this->tempDirectory);
        $zip->close();

        return $this->tempDirectory;
    }

    private function importCSVFile(string $filePath): void {
        $fileName = basename($filePath);
        preg_match('/^(.+?)-export-/', $fileName, $matches);
        if (!isset($matches[1])) {
            echo "[SKIP] {$fileName} - Could not extract table name\n";
            return;
        }

        $tableName = $this->normalizeIdentifier($matches[1]);
        if (!$tableName) {
            echo "[SKIP] {$fileName} - Invalid table name\n";
            return;
        }

        echo "Importing {$fileName} into {$tableName}... ";

        $handle = fopen($filePath, 'r');
        if (!$handle) {
            echo "FAILED (could not open file)\n";
            $this->errorCount++;
            return;
        }

        try {
            $headerLine = fgets($handle);
            if ($headerLine === false) {
                echo "FAILED (empty file)\n";
                $this->errorCount++;
                fclose($handle);
                return;
            }

            $delimiter = $this->detectDelimiter($headerLine);
            $headers = array_map(
                fn($header) => $this->normalizeIdentifier($header),
                str_getcsv(trim($headerLine), $delimiter)
            );
            $headers = array_values(array_filter($headers));

            if (!$headers) {
                echo "FAILED (no headers)\n";
                $this->errorCount++;
                fclose($handle);
                return;
            }

            $this->ensureTable($tableName, $headers);

            $rowCount = 0;
            $this->db->beginTransaction();

            while (($line = fgets($handle)) !== false) {
                if (trim($line) === '') {
                    continue;
                }

                $row = str_getcsv($line, $delimiter);
                if (count($row) < count($headers)) {
                    $row = array_pad($row, count($headers), null);
                }

                if (count($row) > count($headers)) {
                    $row = array_slice($row, 0, count($headers));
                }

                $data = array_combine($headers, $row);
                if (!$data) {
                    continue;
                }

                $this->insertRow($tableName, $data);
                $rowCount++;

                if ($rowCount > 0 && $rowCount % 100 === 0) {
                    $this->db->commit();
                    $this->db->beginTransaction();
                }
            }

            $this->db->commit();
            fclose($handle);

            echo "OK ({$rowCount} rows)\n";
            $this->importedCount += $rowCount;
        } catch (Throwable $e) {
            if ($this->db->connect()->inTransaction()) {
                $this->db->rollback();
            }
            fclose($handle);
            echo "FAILED ({$e->getMessage()})\n";
            $this->errorCount++;
        }
    }

    private function ensureTable(string $tableName, array $headers): void {
        if (!$this->tableExists($tableName)) {
            $columns = [];
            foreach ($headers as $header) {
                if ($header === 'id') {
                    $columns[] = "`id` VARCHAR(191) PRIMARY KEY";
                } else {
                    $columns[] = "`{$header}` LONGTEXT NULL";
                }
            }

            if (!in_array('id', $headers, true)) {
                array_unshift($columns, "`import_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY");
            }

            $sql = "CREATE TABLE IF NOT EXISTS `{$tableName}` (" . implode(', ', $columns) . ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
            $this->db->execute($sql);
            return;
        }

        $existingColumns = $this->getColumns($tableName);
        foreach ($headers as $header) {
            if (!in_array($header, $existingColumns, true)) {
                $this->db->execute("ALTER TABLE `{$tableName}` ADD COLUMN `{$header}` LONGTEXT NULL");
            }
        }
    }

    private function insertRow(string $tableName, array $data): void {
        $columns = [];
        $values = [];
        $placeholders = [];

        foreach ($data as $key => $value) {
            $value = is_string($value) ? trim($value) : $value;
            if ($value === '' || strtolower((string)$value) === 'null') {
                $value = null;
            }
            $value = $this->normalizeValue($key, $value);

            $columns[] = "`{$key}`";
            $values[] = $value;
            $placeholders[] = '?';
        }

        $sql = "INSERT IGNORE INTO `{$tableName}` (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $placeholders) . ")";
        $this->db->execute($sql, $values);
    }

    private function normalizeValue(string $key, mixed $value): mixed {
        if (!is_string($value) || $value === '') {
            return $value;
        }

        if (preg_match('/(^|_)at$/', $key) && preg_match('/^\d{4}-\d{2}-\d{2}T/', $value)) {
            $timestamp = strtotime($value);
            return $timestamp === false ? $value : gmdate('Y-m-d H:i:s', $timestamp);
        }

        if (in_array(strtolower($value), ['true', 'false'], true)) {
            return strtolower($value) === 'true' ? 1 : 0;
        }

        return $value;
    }

    private function tableExists(string $tableName): bool {
        $result = $this->db->getOne(
            'SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
            [$tableName]
        );

        return (int)($result['count'] ?? 0) > 0;
    }

    private function getColumns(string $tableName): array {
        $rows = $this->db->getAll(
            'SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?',
            [$tableName]
        );

        return array_map(fn($row) => $row['column_name'], $rows);
    }

    private function detectDelimiter(string $line): string {
        $semicolonCount = substr_count($line, ';');
        $commaCount = substr_count($line, ',');
        return $semicolonCount > $commaCount ? ';' : ',';
    }

    private function normalizeIdentifier(string $identifier): ?string {
        $identifier = trim($identifier);
        $identifier = preg_replace('/[^A-Za-z0-9_]/', '_', $identifier);
        $identifier = trim($identifier, '_');
        return $identifier === '' ? null : $identifier;
    }

    private function deleteDirectory(string $directory): void {
        $items = scandir($directory);
        if (!$items) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $path = $directory . DIRECTORY_SEPARATOR . $item;
            if (is_dir($path)) {
                $this->deleteDirectory($path);
            } else {
                unlink($path);
            }
        }

        rmdir($directory);
    }
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    $defaultSource = 'c:\\Users\\Femi Oluwaleimu\\Downloads\\r2pconnect tables.zip';
    $source = $argv[1] ?? $defaultSource;

    $importer = new CSVImporter($source);
    $success = $importer->importAllCSVs();

    exit($success ? 0 : 1);
}
