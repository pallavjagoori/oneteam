<?php

/**
 * Helper functions for build-inventory.php.
 *
 * Kept apart from the runner so this file only declares symbols (PSR-1).
 */

declare(strict_types=1);

const BACKEND_ROOTS = ['app', 'enterprise/app', 'lib', 'enterprise/lib'];
const SPEC_ROOTS = ['spec'];
const FRONTEND_ROOT = 'app/javascript';

/**
 * Lists files under $root (relative to $source), as relative paths.
 *
 * @param string $source Path to the Chatwoot checkout.
 * @param string $root   Directory inside the checkout, e.g. "app".
 *
 * @return list<string> Sorted paths relative to $source; empty when $root is missing.
 */
function listFiles(string $source, string $root): array
{
    $base = $source . '/' . $root;
    if (!is_dir($base)) {
        return [];
    }
    $files = [];
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS));
    foreach ($iterator as $file) {
        if ($file->isFile()) {
            $files[] = substr($file->getPathname(), strlen($source) + 1);
        }
    }
    sort($files);

    return $files;
}

/**
 * Returns the id of the first feature whose patterns match $subject, or null.
 *
 * Patterns are case-insensitive regular expressions without delimiters.
 * Features are tried in file order, so specific features must come first.
 *
 * @param string                     $subject    Path, route subject, table or flag to classify.
 * @param list<array<string, mixed>> $features   Features from features.json.
 * @param string                     $patternKey Which pattern list to use, e.g. "paths" or "tables".
 *
 * @return string|null The matching feature id, or null when none matches.
 */
function classify(string $subject, array $features, string $patternKey = 'paths'): ?string
{
    foreach ($features as $feature) {
        foreach ($feature[$patternKey] ?? [] as $pattern) {
            if (preg_match('#' . $pattern . '#i', $subject) === 1) {
                return $feature['id'];
            }
        }
    }

    return null;
}

/**
 * Tells whether $path matches any of the ignore patterns.
 *
 * @param string       $path     Path relative to the Chatwoot checkout.
 * @param list<string> $patterns Case-insensitive regular expressions without delimiters.
 *
 * @return bool True when the path should be left out of the inventory.
 */
function isIgnored(string $path, array $patterns): bool
{
    foreach ($patterns as $pattern) {
        if (preg_match('#' . $pattern . '#i', $path) === 1) {
            return true;
        }
    }

    return false;
}

/**
 * Parses `rails routes` output into verb, path and controller#action rows.
 *
 * @param string $file Path to the saved `rails routes` output.
 *
 * @return list<array{verb: string, path: string, target: string}> One row per route.
 */
function parseRoutes(string $file): array
{
    $routes = [];
    foreach (file($file, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
        if (str_contains($line, 'Controller#Action')) {
            continue;
        }
        if (preg_match('#\s([A-Z|]+)\s+(/\S*)\s+(\S+)#', $line, $m) === 1) {
            $routes[] = ['verb' => $m[1], 'path' => $m[2], 'target' => $m[3]];
        } elseif (preg_match('#^\s*\S+\s+(/\S*)\s+([A-Z]\w*(?:::\w+)+)\s*$#', $line, $m) === 1) {
            // Mounted Rack apps (e.g. the Facebook webhook server) have no verb.
            $routes[] = ['verb' => 'MOUNT', 'path' => $m[1], 'target' => $m[2]];
        }
    }

    return $routes;
}

/**
 * Builds the text a route is classified by: the controller file path it lives
 * in, so routes match the same path patterns as files, followed by its URL,
 * which names the feature when one controller serves several.
 *
 * @param array{verb: string, path: string, target: string} $route A row from parseRoutes().
 *
 * @return string For example "app/controllers/api/v1/accounts_controller.rb /api/v1/accounts".
 */
function routeSubject(array $route): string
{
    $controller = $route['verb'] === 'MOUNT'
        ? 'mount/' . strtolower(str_replace('::', '/', $route['target']))
        : 'app/controllers/' . explode('#', $route['target'])[0] . '_controller.rb';

    return $controller . ' ' . $route['path'];
}

/**
 * Reads table names from db/schema.rb.
 *
 * @param string $source Path to the Chatwoot checkout.
 *
 * @return list<string> Table names in schema order.
 */
function parseTables(string $source): array
{
    preg_match_all('#create_table "([a-z0-9_]+)"#', (string) file_get_contents($source . '/db/schema.rb'), $m);

    return $m[1];
}

/**
 * Reads feature flag names from config/features.yml.
 *
 * @param string $source Path to the Chatwoot checkout.
 *
 * @return list<string> Feature flag names in file order.
 */
function parseFlags(string $source): array
{
    preg_match_all('#^- name: ([a-z0-9_]+)#m', (string) file_get_contents($source . '/config/features.yml'), $m);

    return $m[1];
}

/**
 * Names the kind of a backend file from its directory, e.g. "controllers".
 *
 * @param string $path Path relative to the Chatwoot checkout.
 *
 * @return string The app/ subdirectory name, or "lib" for anything else.
 */
function fileKind(string $path): string
{
    if (preg_match('#^(?:enterprise/)?app/([^/]+)/#', $path, $m) === 1) {
        return $m[1];
    }

    return 'lib';
}

/**
 * Marks a path as part of Chatwoot's enterprise edition.
 *
 * @param string $path Path relative to the Chatwoot checkout.
 *
 * @return bool True for enterprise code and enterprise specs.
 */
function isEnterprise(string $path): bool
{
    return str_starts_with($path, 'enterprise/') || str_starts_with($path, 'spec/enterprise/');
}

/**
 * Renders one feature's page.
 *
 * @param array<string, mixed>       $feature The feature from features.json.
 * @param array<string, list<mixed>> $data    Its flags, routes, tables, files and specs.
 *
 * @return string The page as Markdown.
 */
function renderFeature(array $feature, array $data): string
{
    $out = ['# ' . $feature['name'], '', '**Area:** ' . $feature['area'], '', $feature['description'], ''];

    if ($data['flags'] !== []) {
        $out[] = '**Feature flags:** `' . implode('`, `', $data['flags']) . '`';
        $out[] = '';
    }

    $out[] = '## HTTP routes (' . count($data['routes']) . ')';
    $out[] = '';
    if ($data['routes'] === []) {
        $out[] = 'None.';
    } else {
        $out[] = '| Verb | Path | Controller#action |';
        $out[] = '| --- | --- | --- |';
        foreach ($data['routes'] as $route) {
            $out[] = sprintf('| %s | `%s` | `%s` |', $route['verb'], $route['path'], $route['target']);
        }
    }
    $out[] = '';

    $out[] = '## Database tables (' . count($data['tables']) . ')';
    $out[] = '';
    $out[] = $data['tables'] === [] ? 'None.' : '`' . implode('`, `', $data['tables']) . '`';
    $out[] = '';

    $out[] = '## Backend files (' . count($data['backend']) . ')';
    $out[] = '';
    $grouped = [];
    foreach ($data['backend'] as $path) {
        $grouped[fileKind($path)][] = $path;
    }
    ksort($grouped);
    foreach ($grouped as $kind => $paths) {
        $out[] = '### ' . $kind . ' (' . count($paths) . ')';
        $out[] = '';
        foreach ($paths as $path) {
            $out[] = '- `' . $path . '`' . (isEnterprise($path) ? ' (EE)' : '');
        }
        $out[] = '';
    }

    $out[] = '## Ruby specs (' . count($data['specs']) . ')';
    $out[] = '';
    foreach ($data['specs'] as $path) {
        $out[] = '- `' . $path . '`';
    }
    $out[] = '';

    $out[] = '## Frontend files (' . count($data['frontend']) . ')';
    $out[] = '';
    foreach ($data['frontend'] as $path) {
        $out[] = '- `' . $path . '`';
    }

    return implode("\n", $out) . "\n";
}
