<?php

/**
 * Unit tests for OneTeam\Contract\Sink.
 */

declare(strict_types=1);

use GuzzleHttp\Psr7\Response;
use OneTeam\Contract\Sink;

it('clears both caught lists', function () {
    $history = [];
    $sink = new Sink(mockHandler([new Response(200), new Response(200)], $history));

    $sink->clear();

    $sent = array_map(
        fn ($entry) => $entry['request']->getMethod() . ' ' . $entry['request']->getUri()->getPath(),
        $history
    );

    expect($sent)->toBe(['DELETE /messages', 'DELETE /hooks']);
});

it('waits until an email to the recipient arrives', function () {
    $other = json_encode([['to' => ['someone@else.test'], 'subject' => 'Other']]);
    $match = json_encode([['to' => ['agent@contract.test'], 'subject' => 'Reset password instructions']]);
    $responses = [new Response(200, [], '[]'), new Response(200, [], $other), new Response(200, [], $match)];
    $sink = new Sink(mockHandler($responses));

    expect($sink->waitForMessageTo('agent@contract.test', 5, 1)['subject'])->toBe('Reset password instructions');
});

it('gives up when no email arrives in time', function () {
    $sink = new Sink(mockHandler(array_fill(0, 50, new Response(200, [], '[]'))));

    expect(fn () => $sink->waitForMessageTo('agent@contract.test', 0, 1))
        ->toThrow(RuntimeException::class, 'No email to agent@contract.test within 0 seconds');
});

it('works with the default handler', function () {
    expect(new Sink())->toBeInstanceOf(Sink::class);
});
