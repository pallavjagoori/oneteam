# OneTeam

An open PHP version of [Chatwoot](https://github.com/chatwoot/chatwoot): Chatwoot's Vue frontend on a Laravel
backend.

- [Conversion plan](docs/plan.md): goals, ground rules and the four steps.
- [Feature inventory](docs/inventory/README.md): every part of Chatwoot, grouped by feature.
- [Running Chatwoot's own tests](docs/upstream-tests.md): Docker setup, results and known failures.
- [Coverage by feature](docs/coverage/README.md): how much of each feature Chatwoot's tests cover today.
- [`CHATWOOT_VERSION`](CHATWOOT_VERSION): the Chatwoot release being converted.

## Rebuilding the feature inventory

```sh
tools/inventory/update.sh v4.19.1
```

This needs git, Docker and PHP 8.3+. The feature rules live in
[`tools/inventory/features.json`](tools/inventory/features.json); each feature lists case-insensitive regular
expressions for file paths, table names and feature flags, and the first feature that matches wins. The script fails
and lists anything that no feature matches, so a new Chatwoot release can't add code that goes unnoticed.

Notes on what the inventory can't see:

- The WebSocket endpoint (`/cable`) is mounted outside the Rails router, so it has no route row. It belongs to
  *Real-time updates and events*.
- Translation files under `app/javascript/**/i18n` are counted but not assigned, since they are reused as they are.
