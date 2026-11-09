<?php

declare(strict_types=1);

namespace OneTeam\Contract;

/**
 * Reads the contract test settings from the environment.
 */
final class Env
{
    /**
     * Base URL of the app under test, from CONTRACT_BASE_URL.
     *
     * @return string
     */
    public static function baseUrl(): string
    {
        return self::get('CONTRACT_BASE_URL', 'http://localhost:3000');
    }

    /**
     * Base URL of the email and webhook sink, from CONTRACT_SINK_URL.
     *
     * @return string
     */
    public static function sinkUrl(): string
    {
        return self::get('CONTRACT_SINK_URL', 'http://localhost:8025');
    }

    /**
     * Whether snapshots should be rewritten instead of compared (CONTRACT_RECORD=1).
     *
     * @return bool
     */
    public static function recording(): bool
    {
        return self::get('CONTRACT_RECORD', '') === '1';
    }

    /**
     * Reads one variable with a default.
     *
     * @param string $name    Variable name.
     * @param string $default Value used when it is unset or empty.
     *
     * @return string
     */
    private static function get(string $name, string $default): string
    {
        $value = getenv($name);

        return $value === false || $value === '' ? $default : $value;
    }
}
