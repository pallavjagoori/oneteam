# Contract tests

Contract tests check Chatwoot from the outside, the way the Vue frontend, API users and mail recipients see it. They
send HTTP requests, read the JSON that comes back, and check the emails and webhooks the app sends. The tests never
look inside the app, so the same files later run against OneTeam. If OneTeam passes them, it behaves the same as the
Chatwoot release it ports. This is step 5 of the [plan](../docs/plan.md).

## How it works

```
contract/
├── docker-compose.yml   Chatwoot web + Sidekiq worker + Postgres + Redis + sink
├── run.sh               start the stack, run the tests, stop the stack
├── fixtures/seed.rb     known starting data (one account, an admin and an agent)
├── snapshots/           recorded Chatwoot responses, one JSON file per check
├── support/
│   ├── sink.rb          catches outgoing email (SMTP) and webhooks (HTTP)
│   ├── src/             PHP harness: Client, Snapshot, Sink, Env, Fixtures
│   └── tests/           unit tests for the harness itself (100% line coverage)
└── tests/               the contract tests, one folder per feature
```

- **The app under test** runs as a real server from the `oneteam-chatwoot-tests` image that
  [`upstream/run-tests.sh`](../upstream/run-tests.sh) builds. The Chatwoot source is mounted from `upstream/chatwoot`.
  It boots like a production install: it loads the schema and the installation config, then adds the fixtures.
  It does not load Chatwoot's development demo data.
- **Fixtures.** Every run starts from the same data: the account "Contract Co" with `admin@contract.test`
  (administrator) and `agent@contract.test` (agent). Both use the password `Contract-Pass-1!`. OneTeam will ship a
  seeder that creates the same data. [`Fixtures.php`](support/src/Fixtures.php) holds the same values for the tests.
- **Snapshots.** [`Snapshot`](support/src/Snapshot.php) stores each response's status and JSON body.
  - Values that change from run to run are replaced by placeholders such as `<int>`, `<string>` and `<timestamp>`.
    That covers ids, `*_id`, `*_at`, tokens and ISO timestamps.
  - The app's base URL becomes `<base-url>`.
  - Everything else must match exactly, so OneTeam has to return the same keys, the same types and the same stable
    values.
  - A missing snapshot is recorded on the first run. `CONTRACT_RECORD=1` re-records all of them, which is the step to
    take after moving to a new Chatwoot release.
- **Email and webhooks.** Chatwoot's SMTP settings point at the sink.
  - [`Sink`](support/src/Sink.php) reads what it caught.
  - `waitForMessageTo()` polls for an email, because mail goes out from a Sidekiq job.
  - Webhooks posted to `http://sink:8025/hooks/...` are stored the same way, ready for the webhook suite.

## Running them

You need Docker, PHP 8.3 with Composer, and the test image. If the image is missing, `upstream/run-tests.sh` builds it.

```bash
composer install
contract/run.sh                     # start Chatwoot, run every contract test, stop Chatwoot
contract/run.sh --keep              # leave the stack running (http://localhost:3000)
contract/run.sh --filter='signs in' # extra arguments go to Pest
CONTRACT_RECORD=1 contract/run.sh   # re-record the snapshots
composer test:harness               # unit tests for the harness, with coverage (needs PCOV or Xdebug)
```

A cold start takes about a minute, while Rails boots in development mode. After that the tests take a few seconds.

To run the suite against another app, start that app on port 3000 and the sink on port 8025. Then run Pest the same
way `run.sh` does, setting `CONTRACT_BASE_URL` and `CONTRACT_SINK_URL`.

## Writing a contract test

- Put it under `tests/<Feature>/`, using the feature names from the [inventory](../docs/inventory/README.md).
- Use `client()` for anonymous requests and `signedIn()` or `signedIn(Fixtures::AGENT_EMAIL)` for authenticated ones.
- Assert the status and the values the test is about, then call
  `expectSnapshot('<feature>/<case>', $response)` to lock down the rest of the response.
- Leave the fixtures as you found them. Create your own records with `uniqueEmail()` and unique names, or undo your
  change in a `finally` block.
- Keep each test independent of the others: the suite must pass in any order and on a fresh start.

## Coverage so far

| Feature | Tests | What they check |
| --- | ---: | --- |
| Accounts and sign-in | 12 | API index, sign in (success, wrong password, unknown email), token validation, sign out, profile (admin, agent, anonymous, update) and password reset email |
