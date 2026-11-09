<?php

/**
 * Contract: the account's label list, managed by administrators.
 */

declare(strict_types=1);

use OneTeam\Contract\Fixtures;

it('creates, shows, lists, updates and deletes a label', function () {
    $client = signedIn();
    $base = '/api/v1/accounts/' . accountId($client) . '/labels';
    $title = 'contract-' . bin2hex(random_bytes(3));

    $created = $client->post($base, [
        'title' => $title,
        'description' => 'Contract test label',
        'color' => '#1f93ff',
        'show_on_sidebar' => true,
    ]);
    expect($created->getStatusCode())->toBe(200)
        ->and(json($created)['title'])->toBe($title);
    $id = json($created)['id'];

    try {
        expect(json($client->get("{$base}/{$id}"))['color'])->toBe('#1f93ff');
        expect(array_column(json($client->get($base))['payload'], 'title'))->toContain($title);

        $updated = $client->patch("{$base}/{$id}", ['description' => 'Changed', 'show_on_sidebar' => false]);
        expect($updated->getStatusCode())->toBe(200)
            ->and(json($updated)['description'])->toBe('Changed')
            ->and(json($updated)['show_on_sidebar'])->toBeFalse();
        expect(array_keys(json($updated)))->toEqualCanonicalizing(
            ['id', 'title', 'description', 'color', 'show_on_sidebar']
        );
    } finally {
        $deleted = $client->delete("{$base}/{$id}");
    }

    expect($deleted->getStatusCode())->toBe(200);
    expect($client->get("{$base}/{$id}")->getStatusCode())->toBe(404);
});

it('rejects an invalid or duplicate label title', function () {
    $client = signedIn();
    $base = '/api/v1/accounts/' . accountId($client) . '/labels';
    $id = json($client->post($base, ['title' => 'contract-fixed']))['id'];

    try {
        $duplicate = $client->post($base, ['title' => 'contract-fixed']);
        expect($duplicate->getStatusCode())->toBe(422);
        expectSnapshot('labels/create_duplicate', $duplicate);

        $invalid = $client->post($base, ['title' => 'has spaces']);
        expect($invalid->getStatusCode())->toBe(422);
        expectSnapshot('labels/create_invalid', $invalid);
    } finally {
        $client->delete("{$base}/{$id}");
    }
});

it('lets an agent list labels but not create them', function () {
    $agent = signedIn(Fixtures::AGENT_EMAIL);
    $base = '/api/v1/accounts/' . accountId($agent) . '/labels';

    expect($agent->get($base)->getStatusCode())->toBe(200);

    $refused = $agent->post($base, ['title' => 'agent-label']);
    expect($refused->getStatusCode())->toBe(401);
    expectSnapshot('labels/create_agent', $refused);
});
