<?php

/**
 * Chatwoot coverage report, grouped by feature.
 *
 * Reads the coverage that upstream/run-tests.sh collects (Vitest's lcov.info
 * and SimpleCov's .resultset.json), assigns each covered file to a feature
 * with the same rules as the feature inventory, and writes a summary plus one
 * page per feature listing every file below 100% line coverage.
 *
 * Usage:
 *   php tools/coverage/coverage-by-feature.php \
 *       [--frontend=upstream/results/frontend/lcov.info] \
 *       [--backend=upstream/results/backend/.resultset.json] \
 *       [--rules=tools/inventory/features.json] \
 *       [--out=docs/coverage]
 */

declare(strict_types=1);

require __DIR__ . '/../inventory/inventory-functions.php';
require __DIR__ . '/coverage-functions.php';

$root = dirname(__DIR__, 2);
$options = getopt('', ['frontend::', 'backend::', 'rules::', 'out::']);
$frontendFile = $options['frontend'] ?? $root . '/upstream/results/frontend/lcov.info';
$backendFile = $options['backend'] ?? $root . '/upstream/results/backend/.resultset.json';
$rulesFile = $options['rules'] ?? $root . '/tools/inventory/features.json';
$outDir = rtrim($options['out'] ?? $root . '/docs/coverage', '/');

$features = json_decode((string) file_get_contents($rulesFile), true, 512, JSON_THROW_ON_ERROR)['features'];

$suites = [];
if (is_file($frontendFile)) {
    $suites['frontend'] = parseLcov($frontendFile);
}
if (is_file($backendFile)) {
    $suites['backend'] = parseSimpleCov($backendFile);
}
if ($suites === []) {
    fwrite(STDERR, "No coverage files found. Run upstream/run-tests.sh first.\n");
    exit(2);
}

// $byFeature[feature][suite] = list of [path, covered, total].
$byFeature = [];
foreach ($suites as $suite => $files) {
    foreach ($files as $path => [$covered, $total]) {
        $id = classify($path, $features) ?? 'unassigned';
        $byFeature[$id][$suite][] = [$path, $covered, $total];
    }
}

writeCoverageReport($outDir, $features, $byFeature, array_keys($suites), $suites);
fwrite(STDOUT, "Coverage report written to {$outDir}.\n");
