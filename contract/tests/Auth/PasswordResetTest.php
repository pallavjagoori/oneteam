<?php

/**
 * Contract: asking for a password reset email.
 */

declare(strict_types=1);

use OneTeam\Contract\Fixtures;
use OneTeam\Contract\Sink;

it('emails reset instructions to a known user', function () {
    $sink = new Sink();
    $sink->clear();

    $response = client()->post('/auth/password', ['email' => Fixtures::AGENT_EMAIL]);

    expect($response->getStatusCode())->toBe(200);
    expectSnapshot('auth/password_reset_request', $response);
    $email = $sink->waitForMessageTo(Fixtures::AGENT_EMAIL);
    expect($email['subject'])->toBe('Reset password instructions')
        ->and($email['body'])->toContain('reset_password_token=');
});

it('answers the same way for an unknown email', function () {
    $response = client()->post('/auth/password', ['email' => 'nobody@contract.test']);

    expectSnapshot('auth/password_reset_unknown_email', $response);
});
