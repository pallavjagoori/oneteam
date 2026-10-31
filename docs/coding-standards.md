# Coding standards

OneTeam is driven by a product manager without a dedicated developer, QA or architect, so the code has to explain
itself. These rules apply to all PHP that OneTeam writes: the Laravel app and the tools in `tools/`. Chatwoot's own
code under `upstream/` is left as it is.

## PHP

- **PSR-12** formatting, plus standard Laravel conventions (naming, folder layout, Eloquent, form requests, policies).
- **`declare(strict_types=1);`** at the top of every file.
- **A PHPDoc block on everything:** every file, class, interface, trait, enum, property, constant, method and
  function.

### What a PHPDoc block contains

| Element | Required |
| --- | --- |
| File | A summary of what the file is for. Scripts also show their usage. |
| Class, interface, trait, enum | A summary of its job and, where it helps, which Chatwoot behaviour it ports. |
| Property, constant | A summary and `@var` with the type, including array shapes (`array<string, int>`). |
| Method, function | A summary, `@param` for every parameter (type, name and what it means), `@return` (also `void`), and `@throws` for each exception it lets escape. |

Write the summary as one sentence that says what the code does, in plain words. Add a second paragraph when the
reason is not obvious from the code: a Chatwoot quirk being reproduced, an edge case, a decision. Use the most
precise type the code allows (`list<string>`, `array{int, int}`, `Collection<int, Conversation>`), because these
types are also read by static analysis.

```php
/**
 * Assigns a conversation to the least busy online agent of its inbox.
 *
 * Ports Chatwoot's round robin (AutoAssignment::AgentAssignmentService): agents
 * at their max-conversation limit are skipped, and ties go to whoever has
 * waited longest since their last assignment.
 *
 * @param Conversation $conversation The unassigned conversation.
 * @param list<int>    $allowedIds   Agent ids allowed to receive it; empty means everyone in the inbox.
 *
 * @return User|null The agent it was assigned to, or null when nobody is available.
 *
 * @throws InboxNotFoundException When the conversation's inbox was deleted.
 */
public function assign(Conversation $conversation, array $allowedIds = []): ?User
```

Inline comments (`//`) explain *why* inside a method body: a non-obvious step, a workaround, a Chatwoot behaviour that
looks wrong but is kept on purpose. They don't repeat what the code says.

### Checking it

`phpcs.xml` encodes PSR-12 and the PHPDoc rules above, and fails on any class, property, method or function whose
docblock is missing or incomplete. File and constant docblocks are not machine-checked, so code review checks them.

```sh
composer install
composer lint      # report problems
composer lint:fix  # fix what can be fixed automatically (formatting, docblock spacing)
```

`composer lint` must pass before any OneTeam PR is merged, alongside 100% test coverage. When the Laravel app is
added, add its directories (`app`, `database`, `routes`, `tests`, …) to the `<file>` list in `phpcs.xml`.

## Vue and JavaScript

OneTeam reuses Chatwoot's Vue frontend unchanged. New Vue and JavaScript code (tests included) follows Chatwoot's
ESLint configuration and starts with a comment block saying what it covers or does; exported functions get JSDoc in the
same shape as the PHPDoc above (`@param`, `@returns`).
