<?php

/**
 * Contract: signing in and out with email and password (Devise Token Auth).
 */

declare(strict_types=1);

use OneTeam\Contract\Fixtures;

it('reports the installation version and service health', function () {
    $response = client()->get('/api');

    expect($response->getStatusCode())->toBe(200)
        ->and(json($response))->toHaveKeys(['version', 'timestamp', 'queue_services', 'data_services']);
    expectSnapshot('auth/api_index', $response);
});

it('signs in with valid credentials and returns auth headers', function () {
    $client = client();
    $response = $client->signIn(Fixtures::ADMIN_EMAIL, Fixtures::PASSWORD);

    expect($response->getStatusCode())->toBe(200)
        ->and($client->authHeaders())->toHaveKeys(['access-token', 'client', 'uid', 'token-type'])
        ->and($client->authHeaders()['uid'])->toBe(Fixtures::ADMIN_EMAIL)
        ->and($client->authHeaders()['token-type'])->toBe('Bearer');
    expectSnapshot('auth/sign_in_success', $response);
});

it('rejects a wrong password', function () {
    $response = client()->signIn(Fixtures::ADMIN_EMAIL, 'wrong-password');

    expect($response->getStatusCode())->toBe(401)
        ->and($response->hasHeader('access-token'))->toBeFalse();
    expectSnapshot('auth/sign_in_wrong_password', $response);
});

it('rejects an unknown email', function () {
    $response = client()->signIn('nobody@contract.test', Fixtures::PASSWORD);

    expect($response->getStatusCode())->toBe(401);
    expectSnapshot('auth/sign_in_unknown_email', $response);
});

it('validates the token of a signed in user', function () {
    $response = signedIn()->get('/auth/validate_token');

    expect($response->getStatusCode())->toBe(200);
    expectSnapshot('auth/validate_token', $response);
});

it('signs out and invalidates the token', function () {
    $client = signedIn();
    $headers = $client->authHeaders();

    $response = $client->delete('/auth/sign_out');
    expect($response->getStatusCode())->toBe(200);
    expectSnapshot('auth/sign_out', $response);

    $after = $client->get('/api/v1/profile');
    expect($after->getStatusCode())->toBe(401)
        ->and($headers)->not->toBeEmpty();
});
