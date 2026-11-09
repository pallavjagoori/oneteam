<?php

/**
 * Unit tests for OneTeam\Contract\Env.
 */

declare(strict_types=1);

use OneTeam\Contract\Env;

afterEach(function () {
    setEnv('CONTRACT_BASE_URL', null);
    setEnv('CONTRACT_SINK_URL', null);
    setEnv('CONTRACT_RECORD', null);
});

it('falls back to the local defaults', function () {
    setEnv('CONTRACT_BASE_URL', null);
    setEnv('CONTRACT_SINK_URL', '');

    expect(Env::baseUrl())->toBe('http://localhost:3000')
        ->and(Env::sinkUrl())->toBe('http://localhost:8025')
        ->and(Env::recording())->toBeFalse();
});

it('reads the configured values', function () {
    setEnv('CONTRACT_BASE_URL', 'http://oneteam:8000');
    setEnv('CONTRACT_SINK_URL', 'http://sink:8025');
    setEnv('CONTRACT_RECORD', '1');

    expect(Env::baseUrl())->toBe('http://oneteam:8000')
        ->and(Env::sinkUrl())->toBe('http://sink:8025')
        ->and(Env::recording())->toBeTrue();
});
