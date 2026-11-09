<?php

/**
 * Helpers for the contract harness's own unit tests.
 *
 * These tests need no running app: HTTP calls go to Guzzle mock handlers.
 */

declare(strict_types=1);

use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;

/**
 * Builds a Guzzle handler that answers with the given responses and records requests.
 *
 * @param list<mixed>                $responses Queued responses or exceptions.
 * @param array<int, array<string, mixed>> $history   Filled with the sent requests.
 *
 * @return HandlerStack
 */
function mockHandler(array $responses, array &$history = []): HandlerStack
{
    $stack = HandlerStack::create(new MockHandler($responses));
    $stack->push(Middleware::history($history));

    return $stack;
}

/**
 * Sets an environment variable for the rest of the test, or clears it with null.
 *
 * @param string      $name  Variable name.
 * @param string|null $value New value, or null to unset it.
 *
 * @return void
 */
function setEnv(string $name, ?string $value): void
{
    putenv($value === null ? $name : "{$name}={$value}");
}
