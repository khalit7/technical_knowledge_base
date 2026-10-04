# Handoff to code_design (Code design: readable code, abstractions, review, library design)

From the old Notion page "API and Code Design" (3c65c17b0d0d8190ade6c34e8f653e79, fetched 2026-09-22; full text in `src/live.md` of building_a_backend_api). The API half is carried by building_a_backend_api; everything below now belongs to code_design (3ef5c17b0d0d817b99a0ff9701ff30cd). Copied verbatim by script; notes from the backend API builder follow.

## Resources (verbatim)
- [A Philosophy of Software Design](https://web.stanford.edu/~ouster/cgi-bin/book.php) (book, \~4h 45m): Ousterhout, 2nd ed.; deep modules, information hiding, complexity as the enemy, and the best short book on abstraction
- [Google Engineering Practices: Code Review](https://google.github.io/eng-practices/review/) (\~1h): both reviewer and author guides; calibrates "what to flag vs let go"
- [Pydantic documentation](https://docs.pydantic.dev/latest/) (docs, \~1h 30m for the core pages): the contract layer for modern Python services and libraries

The Pydantic resource is also kept by building_a_backend_api (validation at the API boundary); code_design may list it for library contracts.

## The code-design sections (verbatim)

## Library and package design in Python
The bar: a colleague can use the package correctly from the type signatures alone.
- **Typed interfaces everywhere.** Full annotations, `mypy --strict` (or pyright) in CI, `py.typed` marker shipped. Accept abstract types (`Sequence`, `Mapping`, `Iterable`), return concrete ones. Use `Protocol` for structural interfaces (anything with `.embed()`), `@overload` where return type depends on args (`stream: Literal[True] -> Iterator[Chunk]`), and `NewType`/`Literal` to stop string-typed chaos (`ModelId`, not `str`).
- **Pydantic contracts at boundaries.** Parse, don't validate by hand: request/response models, config objects (`pydantic-settings` for env), and LLM output schemas all as `BaseModel`s with validators. Inside the core, plain dataclasses or attrs are fine; pydantic earns its cost at IO boundaries, not in hot loops.
- **Design the API surface small**: explicit `__all__`, one obvious entry point, keyword-only arguments for anything with more than two params, no boolean positional flags. Deep modules (Ousterhout): simple interface, capable implementation; the opposite (shallow wrappers that re-expose complexity) is the most common library smell.
- **Errors as a hierarchy**: one package base exception, subclasses per failure category, retryability encoded in the type. Never raise bare `Exception`; never swallow one.
- Mechanics: `pyproject.toml` + `uv`, semver honestly (0.x means unstable and everyone knows it), deprecate with `DeprecationWarning` one minor version before removal, and remember Hyrum's Law: every observable behaviour will be depended on, so keep the observable surface minimal.
## Code review taste
- Google's standard is the right default: approve when the change **improves the codebase**, not when it is perfect. Perfect-is-the-enemy blocking trains people to batch huge PRs.
- Review priority order: correctness of the approach \> API/interface shape \> tests \> naming/clarity \> style. Style belongs to the formatter (ruff), not the reviewer; if a human is commenting on formatting, automation is missing.
- Distinguish blocking comments from preferences explicitly ("nit:" costs nothing). Ask questions instead of issuing verdicts when the author has more context.
- Small PRs are a systems property, not a virtue: reviewers find 90% of defects in the first few hundred lines. Stacked PRs / one-logical-change-per-PR keeps quality flat as the diff grows.
- ML-specific review habits: config and prompt diffs deserve the same scrutiny as code; check seeds and determinism in training changes; ask "what eval covers this?" the way you'd ask "what test covers this?"; be suspicious of notebook code migrating to prod without an interface.
- LLM-authored code raises the review bar, not lowers it: the failure mode is plausible-looking code with subtly wrong edge behaviour, so review tests first and demand the author (human or agent) explain the invariants.
## When abstraction earns its keep
The core economics: an abstraction is a loan; it pays interest (indirection, learning cost) against the principal it saves (duplication, blast radius). Rules of thumb:
- **Rule of three**: tolerate duplication twice; abstract on the third occurrence, when the real axis of variation is visible. Wrong abstractions cost more than duplication (Sandi Metz), because they get parameterised into pretzels.
- **Declarative config over code** when the variation is data-shaped: a YAML/JSON spec (validated by pydantic) for pipelines, eval suites, model routing tables. Same split as a DAG engine: the DAG definition is declarative, the operators are code. The trap is config that grows conditionals until it is a worse programming language; when config needs if/else, drop back to code (or a real DSL with review and tests).
- **Plugin architectures** when third parties (or other teams) must extend without forking: a small stable interface (`Protocol`), a registry or entry-points discovery, versioned hook contracts. This is the vLLM/pytest/Airflow-provider pattern. Cost: the plugin interface is forever (Hyrum again), so start private, promote to plugin API only under demonstrated demand.
- Premature platformisation is the ML-org failure mode: building the general "framework for all training jobs" before the second training job exists. Build the concrete thing, extract the platform from working examples.
- Cheap reversibility beats prediction: prefer abstractions you can inline away (a function, a Protocol) over ones you cannot (a service boundary, a published API, a database schema). Decide those last, with the most information.

## Notes and corrections from the backend API builder (2026-10-04)
- Split of "Pydantic contracts at boundaries": building_a_backend_api teaches request validation with pydantic at the HTTP edge (section 5, "parse, don't validate", citing Alexis King 2019) and says models belong at the boundary, linking Code design for the rest. code_design owns: pydantic-settings, LLM output schemas as BaseModels, dataclasses/attrs inside the core, cost in hot loops.
- Hyrum's law is quoted verbatim on building_a_backend_api from hyrumslaw.com ("With a sufficient number of users of an API, it does not matter what you promise in the contract: all observable behaviors of your system will be depended on by somebody."). code_design can link it rather than re-quote.
- "reviewers find 90% of defects in the first few hundred lines": not checked by this builder; the usual source is the SmartBear/Cisco code review study (about 200 to 400 lines per review); verify before carrying, or mark unconfirmed.
- "Never raise bare Exception; never swallow one" and the exception hierarchy advice: the API page's error contract (RFC 9457 types, retryability) is the HTTP-facing counterpart; code_design may link "Errors" (section 7) of building_a_backend_api.
- "deprecate with DeprecationWarning one minor version before removal": Python's own policy (PEP 387) asks for at least two releases of DeprecationWarning; check before carrying as stated.
- "Rule of three" is usually attributed to Don Roberts via Fowler's Refactoring; "duplication is far cheaper than the wrong abstraction" is Sandi Metz (sandimetz.com/blog/2016/1/20/the-wrong-abstraction, 2016). Not fetched by this builder.
- "vLLM/pytest/Airflow-provider pattern" for plugins: pytest uses pluggy and entry points; Airflow providers are separate packages discovered via entry points; vLLM has a general plugin system (vllm.general_plugins entry points). Not fetched by this builder; verify.
