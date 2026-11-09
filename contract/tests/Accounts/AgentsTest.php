<?php

/**
 * Contract: listing, inviting, updating and removing agents of an account.
 */

declare(strict_types=1);

use OneTeam\Contract\Fixtures;
use OneTeam\Contract\Sink;

it('lists the agents of the account', function () {
    $client = signedIn();

    $response = $client->get('/api/v1/accounts/' . accountId($client) . '/agents');

    expect($response->getStatusCode())->toBe(200)
        ->and(array_column(json($response), 'email'))->toContain(Fixtures::ADMIN_EMAIL, Fixtures::AGENT_EMAIL);
    expectSnapshot('accounts/agents_index', $response);
});

it('invites, updates and removes an agent', function () {
    $sink = new Sink();
    $client = signedIn();
    $base = '/api/v1/accounts/' . accountId($client) . '/agents';
    $email = uniqueEmail('invitee');

    $created = $client->post($base, ['name' => 'Ivy Invitee', 'email' => $email, 'role' => 'agent']);
    expect($created->getStatusCode())->toBe(200);
    expectSnapshot('accounts/agents_create', $created);
    $id = json($created)['id'];
    $invite = $sink->waitForMessageTo($email);
    expect($invite['subject'])->toBe('Confirmation Instructions')
        ->and($invite['body'])->toContain('invited to join Contract Co', 'reset_password_token=');

    $updated = $client->patch("{$base}/{$id}", ['role' => 'administrator']);
    expect(json($updated)['role'])->toBe('administrator');
    expectSnapshot('accounts/agents_update', $updated);

    $removed = $client->delete("{$base}/{$id}");
    expect($removed->getStatusCode())->toBe(200);
    expectSnapshot('accounts/agents_destroy', $removed);
});

it('rejects an agent invite with a malformed email', function () {
    $client = signedIn();

    $response = $client->post('/api/v1/accounts/' . accountId($client) . '/agents', [
        'name' => 'Bad Email',
        'email' => 'not-an-email',
        'role' => 'agent',
    ]);

    expectSnapshot('accounts/agents_create_invalid', $response);
});

it('does not let an agent invite agents', function () {
    $client = signedIn(Fixtures::AGENT_EMAIL);

    $response = $client->post('/api/v1/accounts/' . accountId($client) . '/agents', [
        'name' => 'Sneaky',
        'email' => uniqueEmail('sneaky'),
        'role' => 'agent',
    ]);

    expect($response->getStatusCode())->toBe(401);
    expectSnapshot('accounts/agents_create_by_agent', $response);
});
