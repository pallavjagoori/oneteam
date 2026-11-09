<?php

declare(strict_types=1);

namespace OneTeam\Contract;

use GuzzleHttp\Client as HttpClient;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\RequestOptions;
use Psr\Http\Message\ResponseInterface;

/**
 * HTTP client for the app under test (Chatwoot or OneTeam).
 *
 * Wraps Guzzle with the settings every contract test needs: the base URL from
 * CONTRACT_BASE_URL, JSON bodies, no exceptions on 4xx/5xx (tests assert the
 * status themselves) and Devise Token Auth headers once signed in.
 */
final class Client
{
    /**
     * The underlying Guzzle client.
     *
     * @var HttpClient
     */
    private HttpClient $http;

    /**
     * Auth headers returned by the last sign in (access-token, client, uid, token-type).
     *
     * @var array<string, string>
     */
    private array $authHeaders = [];

    /**
     * Creates a client for the configured base URL.
     *
     * @param HandlerStack|null $handler Guzzle handler, set only by the harness's own unit tests.
     */
    public function __construct(?HandlerStack $handler = null)
    {
        $this->http = new HttpClient([
            'handler' => $handler ?? HandlerStack::create(),
            'base_uri' => Env::baseUrl(),
            RequestOptions::HTTP_ERRORS => false,
            RequestOptions::TIMEOUT => 30,
            RequestOptions::HEADERS => ['Accept' => 'application/json'],
        ]);
    }

    /**
     * Signs in with email and password and keeps the auth headers for later requests.
     *
     * @param string $email    The user's email.
     * @param string $password The user's password.
     *
     * @return ResponseInterface The sign in response.
     */
    public function signIn(string $email, string $password): ResponseInterface
    {
        $response = $this->post('/auth/sign_in', ['email' => $email, 'password' => $password]);
        $this->authHeaders = [];
        foreach (['access-token', 'client', 'uid', 'token-type'] as $name) {
            if ($response->hasHeader($name)) {
                $this->authHeaders[$name] = $response->getHeaderLine($name);
            }
        }

        return $response;
    }

    /**
     * Returns the auth headers from the last successful sign in.
     *
     * @return array<string, string>
     */
    public function authHeaders(): array
    {
        return $this->authHeaders;
    }

    /**
     * Forgets the stored auth headers, so later requests are anonymous.
     *
     * @return void
     */
    public function signOutLocally(): void
    {
        $this->authHeaders = [];
    }

    /**
     * Sends a GET request.
     *
     * @param string               $path  Path relative to the base URL.
     * @param array<string, mixed> $query Query string parameters.
     *
     * @return ResponseInterface
     */
    public function get(string $path, array $query = []): ResponseInterface
    {
        return $this->request('GET', $path, [RequestOptions::QUERY => $query]);
    }

    /**
     * Sends a POST request with a JSON body.
     *
     * @param string               $path Path relative to the base URL.
     * @param array<string, mixed> $body JSON body.
     *
     * @return ResponseInterface
     */
    public function post(string $path, array $body = []): ResponseInterface
    {
        return $this->request('POST', $path, [RequestOptions::JSON => (object) $body]);
    }

    /**
     * Sends a PATCH request with a JSON body.
     *
     * @param string               $path Path relative to the base URL.
     * @param array<string, mixed> $body JSON body.
     *
     * @return ResponseInterface
     */
    public function patch(string $path, array $body = []): ResponseInterface
    {
        return $this->request('PATCH', $path, [RequestOptions::JSON => (object) $body]);
    }

    /**
     * Sends a DELETE request.
     *
     * @param string $path Path relative to the base URL.
     *
     * @return ResponseInterface
     */
    public function delete(string $path): ResponseInterface
    {
        return $this->request('DELETE', $path);
    }

    /**
     * Sends a request with the stored auth headers added.
     *
     * @param string               $method  HTTP method.
     * @param string               $path    Path relative to the base URL.
     * @param array<string, mixed> $options Guzzle request options.
     *
     * @return ResponseInterface
     */
    private function request(string $method, string $path, array $options = []): ResponseInterface
    {
        $options[RequestOptions::HEADERS] = $this->authHeaders;

        return $this->http->request($method, $path, $options);
    }
}
