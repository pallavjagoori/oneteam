<?php

/**
 * Unit tests for OneTeam\Contract\Client.
 */

declare(strict_types=1);

use GuzzleHttp\Psr7\Response;
use OneTeam\Contract\Client;

it('keeps the auth headers from a successful sign in and sends them afterwards', function () {
    $history = [];
    $auth = ['access-token' => 'tok', 'client' => 'cli', 'uid' => 'a@b.c', 'token-type' => 'Bearer'];
    $signIn = new Response(200, $auth);
    $responses = [$signIn, new Response(200), new Response(201), new Response(204), new Response(200)];
    $client = new Client(mockHandler($responses, $history));

    $client->signIn('a@b.c', 'secret');
    $client->get('/api/v1/profile', ['page' => 2]);
    $client->patch('/api/v1/profile', ['name' => 'A']);
    $client->delete('/auth/sign_out');
    $client->delete('/api/v1/accounts/1/inbox_members', ['inbox_id' => 2]);

    expect($client->authHeaders())->toBe($auth)
        ->and((string) $history[0]['request']->getBody())->toBe('{"email":"a@b.c","password":"secret"}')
        ->and($history[1]['request']->getUri()->getQuery())->toBe('page=2')
        ->and($history[1]['request']->getHeaderLine('access-token'))->toBe('tok')
        ->and($history[2]['request']->getMethod())->toBe('PATCH')
        ->and($history[3]['request']->getMethod())->toBe('DELETE')
        ->and((string) $history[3]['request']->getBody())->toBe('')
        ->and((string) $history[4]['request']->getBody())->toBe('{"inbox_id":2}');
});

it('drops auth headers after a failed sign in or a local sign out', function () {
    $ok = new Response(200, ['access-token' => 'tok']);
    $client = new Client(mockHandler([$ok, new Response(401), $ok]));

    $client->signIn('a@b.c', 'secret');
    $client->signIn('a@b.c', 'wrong');
    expect($client->authHeaders())->toBe([]);

    $client->signIn('a@b.c', 'secret');
    $client->signOutLocally();
    expect($client->authHeaders())->toBe([]);
});

it('returns error responses instead of throwing', function () {
    $client = new Client(mockHandler([new Response(500, [], 'boom')]));

    expect($client->post('/anything')->getStatusCode())->toBe(500);
});

it('works with the default handler', function () {
    expect(new Client())->toBeInstanceOf(Client::class);
});
