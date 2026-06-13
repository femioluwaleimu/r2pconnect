<?php
/**
 * Database Setup Script
 * Creates the MySQL database, imports schema, and optionally imports CSV data.
 *
 * Usage: php setup_database.php [csv_directory]
 */

$startTime = microtime(true);

$envFile = __DIR__ . '/.env';
if (!file_exists($envFile)) {
    $envFile = dirname(__DIR__) . '/.env';
}

if (!file_exists($envFile)) {
    die("Error: .env file not found. Expected backend/.env or project .env\n");
}

$env = parse_ini_file($envFile);
$dbHost = $env['DB_HOST'] ?? 'localhost';
$dbUser = $env['DB_USERNAME'] ?? $env['DB_USER'] ?? 'root';
$dbPass = $env['DB_PASSWORD'] ?? '';
$dbName = $env['DB_DATABASE'] ?? $env['DB_NAME'] ?? 'r2pconnect';
$dbPort = (int)($env['DB_PORT'] ?? 3306);

echo "\n========================================\n";
echo "  R2PConnect Database Setup Script\n";
echo "========================================\n\n";

echo "Configuration:\n";
echo "  Host: {$dbHost}\n";
echo "  Port: {$dbPort}\n";
echo "  User: {$dbUser}\n";
echo "  Database: {$dbName}\n\n";

echo "Step 1/5: Connecting to MySQL server...\n";
try {
    $pdo = new PDO(
        "mysql:host={$dbHost};port={$dbPort};charset=utf8mb4",
        $dbUser,
        $dbPass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    echo "  OK Connected successfully\n\n";
} catch (PDOException $e) {
    die("  FAILED Connection failed: " . $e->getMessage() . "\n");
}

echo "Step 2/5: Creating database '{$dbName}'...\n";
try {
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `{$dbName}`");
    echo "  OK Database ready\n\n";
} catch (PDOException $e) {
    die("  FAILED Database creation failed: " . $e->getMessage() . "\n");
}

echo "Step 3/5: Importing database schema...\n";
$schemaFile = __DIR__ . '/database/schema.sql';
if (!file_exists($schemaFile)) {
    die("  FAILED Schema file not found: {$schemaFile}\n");
}

try {
    $schema = file_get_contents($schemaFile);
    $schema = preg_replace('/^\s*--.*$/m', '', $schema);
    $statements = preg_split('/;(?=(?:[^\'"]|\'[^\']*\'|"[^"]*")*$)/', $schema);

    $count = 0;
    foreach ($statements as $statement) {
        $statement = trim($statement);
        if ($statement === '' || str_starts_with($statement, '--')) {
            continue;
        }

        $pdo->exec($statement);
        $count++;
    }

    echo "  OK Schema imported ({$count} statements)\n\n";
} catch (Throwable $e) {
    die("  FAILED Schema import failed: " . $e->getMessage() . "\n");
}

echo "Step 4/5: Verifying schema...\n";
try {
    $stmt = $pdo->prepare('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = ?');
    $stmt->execute([$dbName]);
    $tableCount = (int)$stmt->fetch()['table_count'];
    echo "  OK Found {$tableCount} tables\n\n";
} catch (Throwable $e) {
    die("  FAILED Verification failed: " . $e->getMessage() . "\n");
}

echo "Step 5/5: Importing CSV data...\n";
$csvPath = $argv[1] ?? 'c:\\Users\\Femi Oluwaleimu\\Downloads\\r2pconnect tables.zip';

if (!file_exists($csvPath) && !is_dir($csvPath)) {
    echo "  Warning: CSV source not found: {$csvPath}\n";
    echo "  To import CSV data later, run:\n";
    echo "    php backend/scripts/import_csv_data.php \"{$csvPath}\"\n\n";
} else {
    require_once __DIR__ . '/scripts/import_csv_data.php';
    $importer = new CSVImporter($csvPath);
    $importer->importAllCSVs();
}

$duration = round(microtime(true) - $startTime, 2);

echo "========================================\n";
echo "  Setup Complete!\n";
echo "========================================\n\n";

echo "Summary:\n";
echo "  Database: {$dbName}\n";
echo "  Tables: {$tableCount}\n";
echo "  Time: {$duration}s\n\n";

echo "Next steps:\n";
echo "  1. Start server: php -S localhost:8000 api.php\n";
echo "  2. Test endpoint: curl http://localhost:8000/api.php?/auth/login\n";
echo "  3. Check logs: tail -f logs/error.log\n\n";
