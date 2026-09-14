# API and Code Design

⏱ 11 min read · +9h 15m resources

Last updated: 2026-08-24

## Best resources

- [Stripe: Designing robust and predictable APIs with idempotency](https://stripe.com/blog/idempotency) (~15 min): Brandur Leach; idempotency keys, the canonical treatment
- [Stripe: APIs as infrastructure (versioning)](https://stripe.com/blog/api-versioning) (~15 min): rolling versions with compatibility transforms; the gold standard for API evolution
- [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/) (reference, ~1h 30m for the full guide): the most complete public API style guide; steal its error and pagination rules
- [A Philosophy of Software Design](https://web.stanford.edu/~ouster/cgi-bin/book.php) (book, ~4h 45m): Ousterhout, 2nd ed.; deep modules, information hiding, complexity as the enemy, and the best short book on abstraction
- [Google Engineering Practices: Code Review](https://google.github.io/eng-practices/review/) (~1h): both reviewer and author guides; calibrates "what to flag vs let go"
- [Pydantic documentation](https://docs.pydantic.dev/latest/) (docs, ~1h 30m for the core pages): the contract layer for modern Python services and libraries

## API design

**Versioning.** Version the contract, not the URL aesthetics. The Stripe model is the one to name in interviews: each breaking change becomes a dated version; the server stores transforms between adjacent versions and pins each consumer to the version they onboarded with, so the core codebase only ever speaks the latest. Cheaper variants: a major version in the path (`/v1/`) plus additive-only changes within it. Breaking = removing/renaming a field, tightening validation, changing semantics; adding optional fields is not breaking, and clients must ignore unknown fields (tolerant reader). LLM APIs add a twist: the **model** is part of the contract surface; pin model versions and announce deprecations with dates.

**Pagination.** Cursor-based (opaque token encoding the position) beats offset: stable under concurrent writes, O(1) on the DB, no page-drift. Offset survives only for small admin UIs. Return `next_cursor` (null when done), accept `limit` with a server cap, and document the sort order the cursor assumes. Keyset pagination is the SQL implementation (WHERE (created, id) > (:c, :i) ORDER BY created, id).

**Idempotency keys.** Every mutating endpoint that a client might retry (POST especially) accepts `Idempotency-Key`; the server atomically records key -> response and replays it for the retry window. Return a conflict if the same key arrives with a different payload. This is the piece that makes client retry policy safe; see [distributed-systems-basics.md](distributed-systems-basics.md).

**Error taxonomy.** Machine-readable, layered: HTTP status class (4xx yours, 5xx mine), a stable string `code` (`rate_limit_exceeded`, `context_length_exceeded`), a human `message`, a `param` pointer where relevant, and a `request_id` for support. RFC 9457 (`application/problem+json`) is the standards-track shape. Design rules: distinguish retryable from non-retryable explicitly (429/503 + Retry-After vs 400), never leak internals in messages, and keep codes append-only (clients switch on them). The OpenAI/Anthropic error shapes are the de-facto reference for LLM APIs.

**Webhooks.** The inverse API, so apply the inverse discipline: sign payloads (HMAC with timestamp to stop replays), deliver at-least-once so consumers must dedupe on event ID, retry with backoff to a dead-letter state, order is not guaranteed (ship a sequence number or let consumers re-fetch current state), and send **thin events** (IDs + type, consumer fetches the resource) when payload staleness or PII is a concern. Provide a redelivery UI; every serious consumer will ask for it. Details in topics/protocols.

## Library and package design in Python

The bar: a colleague can use the package correctly from the type signatures alone.

- **Typed interfaces everywhere.** Full annotations, `mypy --strict` (or pyright) in CI, `py.typed` marker shipped. Accept abstract types (`Sequence`, `Mapping`, `Iterable`), return concrete ones. Use `Protocol` for structural interfaces (anything with `.embed()`), `@overload` where return type depends on args (`stream: Literal[True] -> Iterator[Chunk]`), and `NewType`/`Literal` to stop string-typed chaos (`ModelId`, not `str`).
- **Pydantic contracts at boundaries.** Parse, don't validate by hand: request/response models, config objects (`pydantic-settings` for env), and LLM output schemas all as `BaseModel`s with validators. Inside the core, plain dataclasses or attrs are fine; pydantic earns its cost at IO boundaries, not in hot loops.
- **Design the API surface small**: explicit `__all__`, one obvious entry point, keyword-only arguments for anything with more than two params, no boolean positional flags. Deep modules (Ousterhout): simple interface, capable implementation; the opposite (shallow wrappers that re-expose complexity) is the most common library smell.
- **Errors as a hierarchy**: one package base exception, subclasses per failure category, retryability encoded in the type. Never raise bare `Exception`; never swallow one.
- Mechanics: `pyproject.toml` + `uv`, semver honestly (0.x means unstable and everyone knows it), deprecate with `DeprecationWarning` one minor version before removal, and remember Hyrum's Law: every observable behaviour will be depended on, so keep the observable surface minimal.

## Code review taste

- Google's standard is the right default: approve when the change **improves the codebase**, not when it is perfect. Perfect-is-the-enemy blocking trains people to batch huge PRs.
- Review priority order: correctness of the approach > API/interface shape > tests > naming/clarity > style. Style belongs to the formatter (ruff), not the reviewer; if a human is commenting on formatting, automation is missing.
- Distinguish blocking comments from preferences explicitly ("nit:" costs nothing). Ask questions instead of issuing verdicts when the author has more context.
- Small PRs are a systems property, not a virtue: reviewers find 90% of defects in the first few hundred lines. Stacked PRs / one-logical-change-per-PR keeps quality flat as the diff grows.
- ML-specific review habits: config and prompt diffs deserve the same scrutiny as code; check seeds and determinism in training changes; ask "what eval covers this?" the way you'd ask "what test covers this?"; be suspicious of notebook code migrating to prod without an interface.
- LLM-authored code raises the review bar, not lowers it: the failure mode is plausible-looking code with subtly wrong edge behaviour, so review tests first and demand the author (human or agent) explain the invariants.

## When abstraction earns its keep

The core economics: an abstraction is a loan; it pays interest (indirection, learning cost) against the principal it saves (duplication, blast radius). Rules of thumb:

- **Rule of three**: tolerate duplication twice; abstract on the third occurrence, when the real axis of variation is visible. Wrong abstractions cost more than duplication (Sandi Metz), because they get parameterised into pretzels.
- **Declarative config over code** when the variation is data-shaped: a YAML/JSON spec (validated by pydantic) for pipelines, eval suites, model routing tables. You already know this from DAG engines: the DAG definition is declarative, the operators are code. The trap is config that grows conditionals until it is a worse programming language; when config needs if/else, drop back to code (or a real DSL with review and tests).
- **Plugin architectures** when third parties (or other teams) must extend without forking: a small stable interface (`Protocol`), a registry or entry-points discovery, versioned hook contracts. This is the vLLM/pytest/Airflow-provider pattern. Cost: the plugin interface is forever (Hyrum again), so start private, promote to plugin API only under demonstrated demand.
- Premature platformisation is the ML-org failure mode: building the general "framework for all training jobs" before the second training job exists. Build the concrete thing, extract the platform from working examples.
- Cheap reversibility beats prediction: prefer abstractions you can inline away (a function, a Protocol) over ones you cannot (a service boundary, a published API, a database schema). Decide those last, with the most information.
