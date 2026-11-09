<?php

/**
 * Contract: canned responses, the saved replies agents insert with a short code.
 */

declare(strict_types=1);

use OneTeam\Contract\Fixtures;

it('creates, searches, updates and deletes a canned response', function () {
    $client = signedIn();
    $base = '/api/v1/accounts/' . accountId($client) . '/canned_responses';
    $code = 'contract' . bin2hex(random_bytes(3));

    $created = $client->post($base, ['short_code' => $code, 'content' => 'Thanks for reaching out!']);
    expect($created->getStatusCode())->toBe(200)
        ->and(json($created)['short_code'])->toBe($code);
    $id = json($created)['id'];

    try {
        expect(array_keys(json($created)))->toEqualCanonicalizing(
            ['id', 'account_id', 'short_code', 'content', 'created_at', 'updated_at']
        );

        $found = $client->get($base, ['search' => $code]);
        expect(array_column(json($found), 'id'))->toBe([$id]);

        $updated = $client->patch("{$base}/{$id}", ['content' => 'Thanks, we will reply soon.']);
        expect($updated->getStatusCode())->toBe(200)
            ->and(json($updated)['content'])->toBe('Thanks, we will reply soon.');
    } finally {
        $deleted = $client->delete("{$base}/{$id}");
    }

    expect($deleted->getStatusCode())->toBe(200);
    expect(json($client->get($base, ['search' => $code])))->toBe([]);
});

it('rejects a canned response without a short code', function () {
    $client = signedIn();
    $response = $client->post('/api/v1/accounts/' . accountId($client) . '/canned_responses', ['content' => 'Hello']);

    expect($response->getStatusCode())->toBe(422);
    expectSnapshot('canned_responses/create_invalid', $response);
});

it('lets an agent manage canned responses too', function () {
    // Chatwoot has no policy on canned responses: any account member can change them.
    $agent = signedIn(Fixtures::AGENT_EMAIL);
    $base = '/api/v1/accounts/' . accountId($agent) . '/canned_responses';

    $created = $agent->post($base, ['short_code' => 'contract' . bin2hex(random_bytes(3)), 'content' => 'Hi']);
    expect($created->getStatusCode())->toBe(200);
    $id = json($created)['id'];

    try {
        expect(json($agent->patch("{$base}/{$id}", ['content' => 'Hello']))['content'])->toBe('Hello');
    } finally {
        $deleted = $agent->delete("{$base}/{$id}");
    }

    expect($deleted->getStatusCode())->toBe(200);
});
