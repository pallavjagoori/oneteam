<?php

/**
 * Unit tests for OneTeam\Contract\Snapshot.
 */

declare(strict_types=1);

use GuzzleHttp\Psr7\Response;
use OneTeam\Contract\Snapshot;

beforeEach(function () {
    $this->folder = Snapshot::directory() . '/_harness_test';
});

afterEach(function () {
    array_map('unlink', glob($this->folder . '/*.json') ?: []);
    if (is_dir($this->folder)) {
        rmdir($this->folder);
    }
    setEnv('CONTRACT_RECORD', null);
});

it('hides volatile values behind type placeholders', function () {
    $normalized = Snapshot::normalize([
        'id' => 7,
        'account_id' => 3,
        'created_at' => 1_700_000_000,
        'score' => 1.5,
        'pubsub_token' => 'abc',
        'uuid' => '',
        'ratio' => ['id' => 2.5],
        'name' => 'Ada',
        'seen' => '2026-11-09T18:00:00Z',
        'link' => 'http://localhost:3000/app',
        'flags' => [true, null],
        'count' => 4,
    ]);

    expect($normalized)->toBe([
        'account_id' => '<int>',
        'count' => 4,
        'created_at' => '<int>',
        'flags' => [true, null],
        'id' => '<int>',
        'link' => '<base-url>/app',
        'name' => 'Ada',
        'pubsub_token' => '<string>',
        'ratio' => ['id' => '<float>'],
        'score' => 1.5,
        'seen' => '<timestamp>',
        'uuid' => '<empty-string>',
    ]);
});

it('captures JSON, empty and non-JSON bodies', function () {
    expect(Snapshot::capture(new Response(204)))->toBe(['status' => 204, 'body' => null])
        ->and(Snapshot::capture(new Response(500, [], '<html><b>Oops</b></html>')))
        ->toBe(['status' => 500, 'body' => ['<non-json>' => '<text>']])
        ->and(Snapshot::capture(new Response(500, [], '<html></html>')))
        ->toBe(['status' => 500, 'body' => ['<non-json>' => '<empty>']]);
});

it('records a missing snapshot and then compares against it', function () {
    $first = Snapshot::match('_harness_test/sample', new Response(200, [], '{"name":"Ada"}'));
    $second = Snapshot::match('_harness_test/sample', new Response(200, [], '{"name":"Bob"}'));

    expect($first['expected'])->toBe($first['actual'])
        ->and($second['expected'])->toBe(['status' => 200, 'body' => ['name' => 'Ada']])
        ->and($second['actual'])->toBe(['status' => 200, 'body' => ['name' => 'Bob']]);
});

it('rewrites snapshots in record mode', function () {
    Snapshot::match('_harness_test/sample', new Response(200, [], '{"name":"Ada"}'));
    setEnv('CONTRACT_RECORD', '1');

    $sides = Snapshot::match('_harness_test/sample', new Response(200, [], '{"name":"Bob"}'));

    expect($sides['expected'])->toBe($sides['actual']);
});

it('fails clearly when the snapshot folder cannot be created', function () {
    is_dir($this->folder) || mkdir($this->folder, 0775, true);
    touch($this->folder . '/blocker.json');

    expect(fn () => Snapshot::match('_harness_test/blocker.json/nested', new Response(200)))
        ->toThrow(RuntimeException::class, 'Cannot create snapshot folder');
});
