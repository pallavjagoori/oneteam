<?php

/**
 * Contract: the signed in user's profile.
 */

declare(strict_types=1);

use OneTeam\Contract\Fixtures;

it('returns the profile of the signed in administrator', function () {
    $response = signedIn()->get('/api/v1/profile');

    expect($response->getStatusCode())->toBe(200)
        ->and(json($response)['email'])->toBe(Fixtures::ADMIN_EMAIL);
    expectSnapshot('auth/profile_admin', $response);
});

it('returns the profile of the signed in agent', function () {
    $response = signedIn(Fixtures::AGENT_EMAIL)->get('/api/v1/profile');

    expect($response->getStatusCode())->toBe(200)
        ->and(json($response)['accounts'][0]['role'])->toBe('agent');
    expectSnapshot('auth/profile_agent', $response);
});

it('refuses the profile without a token', function () {
    $response = client()->get('/api/v1/profile');

    expect($response->getStatusCode())->toBe(401);
    expectSnapshot('auth/profile_anonymous', $response);
});

it('updates the display name', function () {
    $client = signedIn(Fixtures::AGENT_EMAIL);

    try {
        $response = $client->patch('/api/v1/profile', ['profile' => ['display_name' => 'Al']]);

        expect($response->getStatusCode())->toBe(200)
            ->and(json($response)['display_name'])->toBe('Al');
        expectSnapshot('auth/profile_update_display_name', $response);
    } finally {
        // Other tests snapshot this agent's profile, so put the fixture back.
        $client->patch('/api/v1/profile', ['profile' => ['display_name' => null]]);
    }
});
