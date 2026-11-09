<?php

declare(strict_types=1);

namespace OneTeam\Contract;

use Psr\Http\Message\ResponseInterface;
use RuntimeException;

/**
 * Records a response from Chatwoot and checks later responses against it.
 *
 * A snapshot keeps the status code and the JSON body with volatile values
 * (ids, timestamps, tokens) replaced by type placeholders such as "<int>", so
 * a response from OneTeam matches when it has the same shape and the same
 * stable values. Snapshots live in contract/snapshots/<name>.json and are
 * rewritten when CONTRACT_RECORD=1 or when the file does not exist yet.
 */
final class Snapshot
{
    /**
     * Keys whose values change from run to run, matched against the whole key.
     *
     * @var list<string>
     */
    private const VOLATILE_KEY_PATTERNS = [
        '/^id$/',
        '/_id$/',
        '/_at$/',
        '/^(access_token|pubsub_token|hmac_token|token|timestamp|expiry|uuid|identifier_hash|uid|client)$/',
    ];

    /**
     * Placeholder for ISO 8601 date-time strings found under any key.
     */
    private const TIMESTAMP_PATTERN = '/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/';

    /**
     * The random part that uniqueEmail() adds to test email addresses.
     */
    private const UNIQUE_EMAIL_PATTERN = '/\+[0-9a-f]{8}@/';

    /**
     * Folder that holds the snapshot files.
     *
     * @return string
     */
    public static function directory(): string
    {
        return dirname(__DIR__, 2) . '/snapshots';
    }

    /**
     * Checks a response against its snapshot, recording it first if needed.
     *
     * @param string            $name     Snapshot name, e.g. "auth/sign_in_success".
     * @param ResponseInterface $response The response to check.
     *
     * @return array{expected: array<string, mixed>, actual: array<string, mixed>}
     *         Both sides, ready for an equality assertion.
     */
    public static function match(string $name, ResponseInterface $response): array
    {
        $actual = self::capture($response);
        $path = self::directory() . '/' . $name . '.json';
        if (Env::recording() || !is_file($path)) {
            self::write($path, $actual);
        }

        $expected = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);

        return ['expected' => $expected, 'actual' => $actual];
    }

    /**
     * Turns a response into the normalised form that snapshots store.
     *
     * @param ResponseInterface $response The response to capture.
     *
     * @return array<string, mixed>
     */
    public static function capture(ResponseInterface $response): array
    {
        $raw = (string) $response->getBody();
        $body = $raw === '' ? null : json_decode($raw, true);
        if ($raw !== '' && json_last_error() !== JSON_ERROR_NONE) {
            $body = ['<non-json>' => trim(strip_tags($raw)) === '' ? '<empty>' : '<text>'];
        }

        return ['status' => $response->getStatusCode(), 'body' => self::normalize($body)];
    }

    /**
     * Replaces volatile values with placeholders, recursively.
     *
     * @param mixed       $value The decoded JSON value.
     * @param string|null $key   The key the value sits under, if any.
     *
     * @return mixed
     */
    public static function normalize(mixed $value, ?string $key = null): mixed
    {
        if (is_array($value)) {
            $normalized = [];
            foreach ($value as $childKey => $child) {
                $normalized[$childKey] = self::normalize($child, is_string($childKey) ? $childKey : $key);
            }
            if (!array_is_list($normalized)) {
                ksort($normalized);
            }

            return $normalized;
        }
        if ($value === null || is_bool($value)) {
            return $value;
        }
        if ($key !== null && self::volatile($key)) {
            return self::placeholder($value);
        }
        if (is_string($value) && preg_match(self::TIMESTAMP_PATTERN, $value) === 1) {
            return '<timestamp>';
        }
        if (is_string($value)) {
            $value = preg_replace(self::UNIQUE_EMAIL_PATTERN, '+<unique>@', $value);

            return str_replace(rtrim(Env::baseUrl(), '/'), '<base-url>', (string) $value);
        }

        return $value;
    }

    /**
     * Whether values under this key change from run to run.
     *
     * @param string $key The JSON key.
     *
     * @return bool
     */
    private static function volatile(string $key): bool
    {
        foreach (self::VOLATILE_KEY_PATTERNS as $pattern) {
            if (preg_match($pattern, $key) === 1) {
                return true;
            }
        }

        return false;
    }

    /**
     * Placeholder naming the type of a volatile value.
     *
     * @param mixed $value The value being hidden.
     *
     * @return string
     */
    private static function placeholder(mixed $value): string
    {
        return match (true) {
            is_int($value) => '<int>',
            is_float($value) => '<float>',
            is_string($value) && $value === '' => '<empty-string>',
            default => '<string>',
        };
    }

    /**
     * Writes a snapshot file, creating its folder when needed.
     *
     * @param string               $path     Target file.
     * @param array<string, mixed> $snapshot Normalised response.
     *
     * @return void
     *
     * @throws RuntimeException When the snapshot folder cannot be created.
     */
    private static function write(string $path, array $snapshot): void
    {
        $directory = dirname($path);
        if (!is_dir($directory) && (file_exists($directory) || !mkdir($directory, 0775, true))) {
            throw new RuntimeException("Cannot create snapshot folder {$directory}");
        }
        $flags = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR;
        $json = json_encode($snapshot, $flags);
        file_put_contents($path, $json . "\n");
    }
}
