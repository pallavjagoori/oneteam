<?php

/**
 * Contract: agents working a conversation through the account API.
 */

declare(strict_types=1);

use OneTeam\Contract\Fixtures;

it('lets an agent read, reply to, assign, label and resolve a conversation', function () {
    $admin = signedIn();
    $ids = apiInboxWithContact($admin, 'Contract Agent Inbox');
    $public = "/public/api/v1/inboxes/{$ids['identifier']}/contacts/{$ids['contact']}/conversations";
    $displayId = json(client()->post($public, []))['id'];
    client()->post("{$public}/{$displayId}/messages", ['content' => 'Where is my order?']);

    $agent = signedIn(Fixtures::AGENT_EMAIL);
    $base = "/api/v1/accounts/{$ids['account']}/conversations";

    try {
        $list = $agent->get($base, ['inbox_id' => $ids['inbox'], 'status' => 'open', 'assignee_type' => 'all']);
        expect(array_column(json($list)['data']['payload'], 'id'))->toBe([$displayId]);
        expectSnapshot('conversations/agent_index', $list);

        expectSnapshot('conversations/agent_show', $agent->get("{$base}/{$displayId}"));

        $messages = $agent->get("{$base}/{$displayId}/messages");
        expect(array_column(json($messages)['payload'], 'content'))->toBe(['Where is my order?']);
        expectSnapshot('conversations/agent_messages_index', $messages);

        $reply = $agent->post("{$base}/{$displayId}/messages", ['content' => 'Let me check that for you.']);
        expect(json($reply)['message_type'])->toBe(1);
        expectSnapshot('conversations/agent_reply', $reply);

        $noteBody = ['content' => 'Internal: check warehouse', 'private' => true];
        $note = $agent->post("{$base}/{$displayId}/messages", $noteBody);
        expect(json($note)['private'])->toBeTrue();
        expectSnapshot('conversations/agent_private_note', $note);

        $customerView = client()->get("{$public}/{$displayId}/messages");
        expect(array_column(json($customerView), 'content'))
            ->toBe(['Where is my order?', 'Let me check that for you.']);

        $agentId = json($agent->get('/api/v1/profile'))['id'];
        $assigned = $agent->post("{$base}/{$displayId}/assignments", ['assignee_id' => $agentId]);
        expect(json($assigned)['id'])->toBe($agentId);
        expectSnapshot('conversations/agent_assign_self', $assigned);

        $labelled = $agent->post("{$base}/{$displayId}/labels", ['labels' => ['billing', 'urgent']]);
        expect(json($labelled)['payload'])->toBe(['billing', 'urgent']);
        expectSnapshot('conversations/agent_labels', $labelled);

        $resolved = $agent->post("{$base}/{$displayId}/toggle_status", ['status' => 'resolved']);
        expect(json($resolved)['payload']['current_status'])->toBe('resolved');
        expectSnapshot('conversations/agent_resolve', $resolved);

        $meta = $agent->get("{$base}/meta", ['inbox_id' => $ids['inbox'], 'status' => 'resolved']);
        expectSnapshot('conversations/agent_meta', $meta);
    } finally {
        $admin->delete("/api/v1/accounts/{$ids['account']}/inboxes/{$ids['inbox']}");
    }
});

it('hides conversations in inboxes the agent is not a member of', function () {
    $admin = signedIn();
    $ids = apiInboxWithContact($admin, 'Contract Private Inbox');
    $public = "/public/api/v1/inboxes/{$ids['identifier']}/contacts/{$ids['contact']}/conversations";
    $displayId = json(client()->post($public, []))['id'];
    $agent = signedIn(Fixtures::AGENT_EMAIL);
    $agentId = json($agent->get('/api/v1/profile'))['id'];
    $members = ['inbox_id' => $ids['inbox'], 'user_ids' => [$agentId]];
    $admin->delete("/api/v1/accounts/{$ids['account']}/inbox_members", $members);

    try {
        $response = $agent->get("/api/v1/accounts/{$ids['account']}/conversations/{$displayId}");

        expect($response->getStatusCode())->toBe(401);
        expectSnapshot('conversations/agent_show_not_member', $response);
    } finally {
        $admin->delete("/api/v1/accounts/{$ids['account']}/inboxes/{$ids['inbox']}");
    }
});
