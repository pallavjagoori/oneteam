<?php

/**
 * Contract: creating, reading, updating and deleting an API channel inbox,
 * and managing who works in it.
 */

declare(strict_types=1);

use OneTeam\Contract\Fixtures;

it('creates, shows, lists, renames and deletes an API inbox', function () {
    $client = signedIn();
    $base = '/api/v1/accounts/' . accountId($client) . '/inboxes';

    $created = createApiInbox($client, 'Contract API Inbox');
    expect($created->getStatusCode())->toBe(200)
        ->and(json($created)['channel_type'])->toBe('Channel::Api');
    expectSnapshot('inboxes/api_create', $created);
    $id = json($created)['id'];

    try {
        expectSnapshot('inboxes/api_show', $client->get("{$base}/{$id}"));

        $list = $client->get($base);
        expect(array_column(json($list)['payload'], 'id'))->toContain($id);

        $changes = ['name' => 'Contract API Renamed', 'enable_auto_assignment' => false];
        $renamed = $client->patch("{$base}/{$id}", $changes);
        expect(json($renamed)['name'])->toBe('Contract API Renamed')
            ->and(json($renamed)['enable_auto_assignment'])->toBeFalse();
        expectSnapshot('inboxes/api_update', $renamed);
    } finally {
        $deleted = $client->delete("{$base}/{$id}");
    }

    expect($deleted->getStatusCode())->toBe(200);
    expectSnapshot('inboxes/api_destroy', $deleted);
});

it('adds and removes inbox members', function () {
    $client = signedIn();
    $account = accountId($client);
    $id = json(createApiInbox($client, 'Contract Members Inbox'))['id'];
    $agentId = json(signedIn(Fixtures::AGENT_EMAIL)->get('/api/v1/profile'))['id'];

    try {
        $members = ['inbox_id' => $id, 'user_ids' => [$agentId]];
        $added = $client->post("/api/v1/accounts/{$account}/inbox_members", $members);
        expect($added->getStatusCode())->toBe(200);
        expectSnapshot('inboxes/members_create', $added);

        $listed = $client->get("/api/v1/accounts/{$account}/inbox_members/{$id}");
        expect(array_column(json($listed)['payload'], 'id'))->toBe([$agentId]);
        expectSnapshot('inboxes/members_show', $listed);

        $removed = $client->delete("/api/v1/accounts/{$account}/inbox_members", $members);
        expect($removed->getStatusCode())->toBe(200);
        expectSnapshot('inboxes/members_destroy', $removed);
    } finally {
        $client->delete("/api/v1/accounts/{$account}/inboxes/{$id}");
    }
});

it('hides inboxes the agent is not a member of', function () {
    $admin = signedIn();
    $id = json(createApiInbox($admin, 'Contract Hidden Inbox'))['id'];

    try {
        $agent = signedIn(Fixtures::AGENT_EMAIL);
        $response = $agent->get('/api/v1/accounts/' . accountId($agent) . "/inboxes/{$id}");

        expect($response->getStatusCode())->toBe(401);
        expectSnapshot('inboxes/show_not_member', $response);
    } finally {
        $admin->delete('/api/v1/accounts/' . accountId($admin) . "/inboxes/{$id}");
    }
});

it('does not let an agent create an inbox', function () {
    $agent = signedIn(Fixtures::AGENT_EMAIL);

    $response = createApiInbox($agent, 'Agent Inbox');

    expect($response->getStatusCode())->toBe(401);
    expectSnapshot('inboxes/create_by_agent', $response);
});
