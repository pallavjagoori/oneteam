<?php

/**
 * Shared helpers for the contract tests.
 *
 * Each test talks to the running app (Chatwoot or OneTeam) over HTTP only, so
 * the same files prove both apps behave the same.
 */

declare(strict_types=1);

use OneTeam\Contract\Client;
use OneTeam\Contract\Fixtures;
use OneTeam\Contract\Snapshot;
use Psr\Http\Message\ResponseInterface;

/**
 * Returns a new anonymous client.
 *
 * @return Client
 */
function client(): Client
{
    return new Client();
}

/**
 * Returns a client signed in as a fixture user.
 *
 * @param string $email Fixture user email, Fixtures::ADMIN_EMAIL by default.
 *
 * @return Client
 */
function signedIn(string $email = Fixtures::ADMIN_EMAIL): Client
{
    $client = new Client();
    $response = $client->signIn($email, Fixtures::PASSWORD);
    expect($response->getStatusCode())->toBe(200);

    return $client;
}

/**
 * Decodes a JSON response body.
 *
 * @param ResponseInterface $response The response.
 *
 * @return mixed
 */
function json(ResponseInterface $response): mixed
{
    return json_decode((string) $response->getBody(), true);
}

/**
 * Asserts that a response matches its recorded snapshot.
 *
 * @param string            $name     Snapshot name under contract/snapshots.
 * @param ResponseInterface $response The response to check.
 *
 * @return void
 */
function expectSnapshot(string $name, ResponseInterface $response): void
{
    $sides = Snapshot::match($name, $response);
    expect($sides['actual'])->toEqual($sides['expected']);
}

/**
 * Returns an email address no other test uses.
 *
 * @param string $prefix Readable start of the local part.
 *
 * @return string
 */
function uniqueEmail(string $prefix): string
{
    return $prefix . '+' . bin2hex(random_bytes(4)) . '@contract.test';
}

/**
 * Returns the id of the fixture account, read from the signed in user's profile.
 *
 * @param Client $client A signed in client.
 *
 * @return int
 */
function accountId(Client $client): int
{
    return (int) json($client->get('/api/v1/profile'))['account_id'];
}

/**
 * Creates an API inbox and returns its response.
 *
 * @param Client $client A signed in administrator.
 * @param string $name   Inbox name.
 *
 * @return ResponseInterface
 */
function createApiInbox(Client $client, string $name): ResponseInterface
{
    return $client->post('/api/v1/accounts/' . accountId($client) . '/inboxes', [
        'name' => $name,
        'channel' => ['type' => 'api', 'webhook_url' => ''],
    ]);
}
