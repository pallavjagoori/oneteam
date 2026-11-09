<?php

/**
 * Contract: teams and their members.
 */

declare(strict_types=1);

use OneTeam\Contract\Fixtures;

it('creates, shows, updates and deletes a team', function () {
    $client = signedIn();
    $base = '/api/v1/accounts/' . accountId($client) . '/teams';
    $name = 'contract team ' . bin2hex(random_bytes(3));

    $created = $client->post($base, [
        'name' => $name,
        'description' => 'Handles contract tests',
        'allow_auto_assign' => true,
    ]);
    expect($created->getStatusCode())->toBe(200)
        ->and(json($created)['name'])->toBe($name);
    $id = json($created)['id'];

    try {
        expect(array_keys(json($created)))->toEqualCanonicalizing(
            ['id', 'name', 'description', 'allow_auto_assign', 'account_id', 'is_member', 'icon', 'icon_color']
        );
        expect(json($client->get("{$base}/{$id}"))['description'])->toBe('Handles contract tests');
        expect(array_column(json($client->get($base)), 'id'))->toContain($id);

        $updated = $client->patch("{$base}/{$id}", ['allow_auto_assign' => false]);
        expect($updated->getStatusCode())->toBe(200)
            ->and(json($updated)['allow_auto_assign'])->toBeFalse();
    } finally {
        $deleted = $client->delete("{$base}/{$id}");
    }

    expect($deleted->getStatusCode())->toBe(200);
    expect($client->get("{$base}/{$id}")->getStatusCode())->toBe(404);
});

it('adds, lists and removes team members', function () {
    $client = signedIn();
    $base = '/api/v1/accounts/' . accountId($client) . '/teams';
    $id = json($client->post($base, ['name' => 'contract members ' . bin2hex(random_bytes(3))]))['id'];
    $agentId = json(signedIn(Fixtures::AGENT_EMAIL)->get('/api/v1/profile'))['id'];

    try {
        $added = $client->post("{$base}/{$id}/team_members", ['user_ids' => [$agentId]]);
        expect($added->getStatusCode())->toBe(200)
            ->and(array_column(json($added), 'id'))->toBe([$agentId]);
        expectSnapshot('teams/members_create', $added);

        $listed = $client->get("{$base}/{$id}/team_members");
        expect(array_column(json($listed), 'id'))->toBe([$agentId]);

        $removed = $client->delete("{$base}/{$id}/team_members", ['user_ids' => [$agentId]]);
        expect($removed->getStatusCode())->toBe(200);
        expect(json($client->get("{$base}/{$id}/team_members")))->toBe([]);
    } finally {
        $client->delete("{$base}/{$id}");
    }
});

it('does not let an agent create a team', function () {
    $agent = signedIn(Fixtures::AGENT_EMAIL);
    $refused = $agent->post('/api/v1/accounts/' . accountId($agent) . '/teams', ['name' => 'agent team']);

    expect($refused->getStatusCode())->toBe(401);
    expectSnapshot('teams/create_agent', $refused);
});
