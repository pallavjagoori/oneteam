<?php

/**
 * Contract: a customer talking to an API channel inbox through the public API.
 */

declare(strict_types=1);

it('creates a contact, opens a conversation and sends messages', function () {
    $admin = signedIn();
    $ids = apiInboxWithContact($admin, 'Contract Public API Inbox');
    $base = "/public/api/v1/inboxes/{$ids['identifier']}/contacts/{$ids['contact']}";

    try {
        expectSnapshot('conversations/public_contact_show', client()->get($base));

        $conversation = client()->post("{$base}/conversations", []);
        expect($conversation->getStatusCode())->toBe(200);
        expectSnapshot('conversations/public_conversation_create', $conversation);
        $conversationId = json($conversation)['id'];

        $messagesPath = "{$base}/conversations/{$conversationId}/messages";
        $message = client()->post($messagesPath, ['content' => 'Hello, I need help']);
        expect($message->getStatusCode())->toBe(200)
            ->and(json($message)['content'])->toBe('Hello, I need help')
            ->and(json($message)['message_type'])->toBe(0);
        expectSnapshot('conversations/public_message_create', $message);

        $messages = client()->get($messagesPath);
        expect(array_column(json($messages), 'content'))->toBe(['Hello, I need help']);
        expectSnapshot('conversations/public_message_index', $messages);

        expectSnapshot('conversations/public_conversation_index', client()->get("{$base}/conversations"));

        $resolved = client()->post("{$base}/conversations/{$conversationId}/toggle_status", []);
        expect(json($resolved)['status'])->toBe('resolved');
        expectSnapshot('conversations/public_conversation_resolve', $resolved);
    } finally {
        $admin->delete("/api/v1/accounts/{$ids['account']}/inboxes/{$ids['inbox']}");
    }
});

it('rejects an unknown inbox identifier', function () {
    $response = client()->post('/public/api/v1/inboxes/not-a-real-inbox/contacts', ['name' => 'Nobody']);

    expectSnapshot('conversations/public_unknown_inbox', $response);
});
