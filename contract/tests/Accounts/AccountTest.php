<?php

/**
 * Contract: reading and updating an account, and signing up for a new one.
 */

declare(strict_types=1);

use OneTeam\Contract\Fixtures;
use OneTeam\Contract\Sink;

it('shows the account to its administrator', function () {
    $client = signedIn();

    $response = $client->get('/api/v1/accounts/' . accountId($client));

    expect($response->getStatusCode())->toBe(200)
        ->and(json($response)['name'])->toBe(Fixtures::ACCOUNT_NAME);
    expectSnapshot('accounts/show_admin', $response);
});

it('shows the account to an agent', function () {
    $client = signedIn(Fixtures::AGENT_EMAIL);

    $response = $client->get('/api/v1/accounts/' . accountId($client));

    expectSnapshot('accounts/show_agent', $response);
});

it('lets the administrator rename the account', function () {
    $client = signedIn();
    $path = '/api/v1/accounts/' . accountId($client);

    try {
        $response = $client->patch($path, ['name' => 'Contract Renamed']);

        expect($response->getStatusCode())->toBe(200)
            ->and(json($response)['name'])->toBe('Contract Renamed');
        expectSnapshot('accounts/update_name', $response);
    } finally {
        $client->patch($path, ['name' => Fixtures::ACCOUNT_NAME]);
    }
});

it('does not let an agent update the account', function () {
    $client = signedIn(Fixtures::AGENT_EMAIL);

    $response = $client->patch('/api/v1/accounts/' . accountId($client), ['name' => 'Agent Rename']);

    expect($response->getStatusCode())->toBe(401);
    expectSnapshot('accounts/update_by_agent', $response);
});

it('refuses another account to a user who is not a member', function () {
    $client = signedIn();

    $response = $client->get('/api/v1/accounts/999999');

    expectSnapshot('accounts/show_unknown', $response);
});

it('signs up a new account and emails a confirmation link', function () {
    $sink = new Sink();
    $email = uniqueEmail('founder');

    $response = client()->post('/api/v1/accounts', [
        'account_name' => 'Founder Co',
        'user_full_name' => 'Fay Founder',
        'email' => $email,
        'password' => 'Founder-Pass-1!',
    ]);

    expect($response->getStatusCode())->toBe(200)
        ->and(json($response)['email'])->toBe($email);
    expectSnapshot('accounts/signup', $response);
    $message = $sink->waitForMessageTo($email);
    expect($message['subject'])->toBe('Confirmation Instructions')
        ->and($message['body'])->toContain('confirmation_token=');
});

it('rejects a signup without an account name', function () {
    $response = client()->post('/api/v1/accounts', [
        'user_full_name' => 'No Name',
        'email' => uniqueEmail('noname'),
        'password' => 'Founder-Pass-1!',
    ]);

    expectSnapshot('accounts/signup_without_name', $response);
});
