<?php

declare(strict_types=1);

namespace OneTeam\Contract;

use GuzzleHttp\Client as HttpClient;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\RequestOptions;
use RuntimeException;

/**
 * Reads the emails and webhooks caught by the sink (contract/support/sink.rb).
 */
final class Sink
{
    /**
     * Guzzle client pointed at the sink.
     *
     * @var HttpClient
     */
    private HttpClient $http;

    /**
     * Creates a reader for the configured sink URL.
     *
     * @param HandlerStack|null $handler Guzzle handler, set only by the harness's own unit tests.
     */
    public function __construct(?HandlerStack $handler = null)
    {
        $this->http = new HttpClient([
            'handler' => $handler ?? HandlerStack::create(),
            'base_uri' => Env::sinkUrl(),
            RequestOptions::TIMEOUT => 10,
        ]);
    }

    /**
     * Forgets every caught email and webhook.
     *
     * @return void
     */
    public function clear(): void
    {
        $this->http->delete('/messages');
        $this->http->delete('/hooks');
    }

    /**
     * Returns caught emails.
     *
     * @return list<array<string, mixed>>
     */
    public function messages(): array
    {
        return $this->list('/messages');
    }

    /**
     * Waits for an email to a recipient, since mail goes out from a background job.
     *
     * @param string $recipient Address the email is sent to.
     * @param int    $timeout   Seconds to wait.
     * @param int    $interval  Microseconds between polls.
     *
     * @return array<string, mixed> The first matching email.
     *
     * @throws RuntimeException When no matching email arrives in time.
     */
    public function waitForMessageTo(string $recipient, int $timeout = 30, int $interval = 250_000): array
    {
        $deadline = time() + $timeout;
        do {
            foreach ($this->messages() as $message) {
                if (in_array($recipient, $message['to'], true)) {
                    return $message;
                }
            }
            usleep($interval);
        } while (time() < $deadline);

        throw new RuntimeException("No email to {$recipient} within {$timeout} seconds");
    }

    /**
     * Fetches and decodes one of the sink's lists.
     *
     * @param string $path Either "/messages" or "/hooks".
     *
     * @return list<array<string, mixed>>
     */
    private function list(string $path): array
    {
        $body = (string) $this->http->get($path)->getBody();

        return json_decode($body, true, 512, JSON_THROW_ON_ERROR);
    }
}
