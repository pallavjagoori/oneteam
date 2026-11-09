<?php

/**
 * Contract: the contacts API as agents use it from the dashboard: create,
 * show, update, search, notes, labels and delete.
 */

declare(strict_types=1);

use OneTeam\Contract\Fixtures;
use Psr\Http\Message\ResponseInterface;

/**
 * Reads the new contact's id from a create response.
 *
 * @param ResponseInterface $response Response to POST /contacts.
 *
 * @return int
 */
function contactId(ResponseInterface $response): int
{
    return (int) json($response)['payload']['contact']['id'];
}

it('creates, shows, updates, searches and deletes a contact', function () {
    $client = signedIn();
    $base = '/api/v1/accounts/' . accountId($client) . '/contacts';
    $email = uniqueEmail('dana');

    $created = $client->post($base, [
        'name' => 'Dana Contact',
        'email' => $email,
        'phone_number' => '+15550001111',
        'additional_attributes' => ['city' => 'Pune', 'description' => 'Met at a trade show'],
    ]);
    expect($created->getStatusCode())->toBe(200)
        ->and(json($created)['payload']['contact']['email'])->toBe($email);
    expectSnapshot('contacts/create', $created);
    $id = contactId($created);

    try {
        expectSnapshot('contacts/show', $client->get("{$base}/{$id}"));

        $changes = ['name' => 'Dana Renamed', 'custom_attributes' => ['tier' => 'gold']];
        $updated = $client->patch("{$base}/{$id}", $changes);
        expect($updated->getStatusCode())->toBe(200)
            ->and(json($updated)['payload']['name'])->toBe('Dana Renamed')
            ->and(json($updated)['payload']['custom_attributes'])->toBe(['tier' => 'gold']);
        expectSnapshot('contacts/update', $updated);

        $found = $client->get("{$base}/search", ['q' => $email]);
        expect($found->getStatusCode())->toBe(200)
            ->and(array_column(json($found)['payload'], 'id'))->toBe([$id]);
        expectSnapshot('contacts/search', $found);

        $listed = $client->get($base, ['sort' => '-created_at']);
        expect(array_column(json($listed)['payload'], 'id'))->toContain($id);
    } finally {
        $deleted = $client->delete("{$base}/{$id}");
    }

    expect($deleted->getStatusCode())->toBe(200);
    expectSnapshot('contacts/destroy', $deleted);
    expect($client->get("{$base}/{$id}")->getStatusCode())->toBe(404);
});

it('rejects a contact with a duplicate or invalid email', function () {
    $client = signedIn();
    $base = '/api/v1/accounts/' . accountId($client) . '/contacts';
    $email = uniqueEmail('dup');
    $id = contactId($client->post($base, ['name' => 'First', 'email' => $email]));

    try {
        $duplicate = $client->post($base, ['name' => 'Second', 'email' => $email]);
        expect($duplicate->getStatusCode())->toBe(422);
        expectSnapshot('contacts/create_duplicate', $duplicate);

        $invalid = $client->post($base, ['name' => 'Bad', 'email' => 'not-an-email']);
        expect($invalid->getStatusCode())->toBe(422);
        expectSnapshot('contacts/create_invalid', $invalid);
    } finally {
        $client->delete("{$base}/{$id}");
    }
});

it('adds notes and labels to a contact', function () {
    $client = signedIn();
    $account = accountId($client);
    $base = "/api/v1/accounts/{$account}/contacts";
    $id = contactId($client->post($base, ['name' => 'Noted Contact', 'email' => uniqueEmail('noted')]));

    try {
        $note = $client->post("{$base}/{$id}/notes", ['content' => 'Prefers email over phone.']);
        expect($note->getStatusCode())->toBe(200)
            ->and(json($note)['content'])->toBe('Prefers email over phone.');
        expectSnapshot('contacts/note_create', $note);

        $notes = $client->get("{$base}/{$id}/notes");
        expect(array_column(json($notes), 'content'))->toBe(['Prefers email over phone.']);
        expectSnapshot('contacts/note_index', $notes);

        $noteId = json($note)['id'];
        $edited = $client->patch("{$base}/{$id}/notes/{$noteId}", ['content' => 'Prefers email.']);
        expect(json($edited)['content'])->toBe('Prefers email.');

        expect($client->delete("{$base}/{$id}/notes/{$noteId}")->getStatusCode())->toBe(200);
        expect(json($client->get("{$base}/{$id}/notes")))->toBe([]);

        $labelled = $client->post("{$base}/{$id}/labels", ['labels' => ['vip', 'lead']]);
        expect($labelled->getStatusCode())->toBe(200)
            ->and(json($labelled)['payload'])->toEqualCanonicalizing(['vip', 'lead']);

        $labels = $client->get("{$base}/{$id}/labels");
        expect(json($labels)['payload'])->toEqualCanonicalizing(['vip', 'lead']);
    } finally {
        $client->delete("{$base}/{$id}");
    }
});

it('lets an agent read contacts but not delete them', function () {
    $admin = signedIn();
    $base = '/api/v1/accounts/' . accountId($admin) . '/contacts';
    $id = contactId($admin->post($base, ['name' => 'Shared Contact', 'email' => uniqueEmail('shared')]));

    try {
        $agent = signedIn(Fixtures::AGENT_EMAIL);
        expect($agent->get("{$base}/{$id}")->getStatusCode())->toBe(200);

        $refused = $agent->delete("{$base}/{$id}");
        expect($refused->getStatusCode())->toBe(401);
        expectSnapshot('contacts/destroy_agent', $refused);
    } finally {
        $admin->delete("{$base}/{$id}");
    }
});
