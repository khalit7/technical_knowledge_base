# Python: staying current (3.12 to 3.15)

⏱ 10 min read · +5h 50m resources

### Best resources

- [What's new in Python 3.14 (official)](https://docs.python.org/3/whatsnew/3.14.html) (docs, ~45 min): canonical changelog, read the "free-threading" and "t-strings" sections.
- [Python free-threading guide](https://py-free-threading.github.io/) (site, ~30 min for the porting pages): community site tracking nogil ecosystem readiness and how to port extensions.
- [Python support for free threading (official howto)](https://docs.python.org/3/howto/free-threading-python.html) (docs, ~20 min)
- [uv docs](https://docs.astral.sh/uv/) (docs, ~1h for the core pages) and [Astral blog](https://astral.sh/blog) (blog, ~30 min for the current posts): the tooling that replaced pip/poetry/pyenv.
- [PEP index](https://peps.python.org/) (PEPs, ~2h 45m for the six listed): PEP 703 (nogil), 779 (supported free-threading), 734 (subinterpreters), 750 (t-strings), 810 (lazy imports), 803 (abi3t).

### The one-paragraph state of Python

The GIL is now optional and officially supported (3.14, PEP 779): free-threaded builds run true multi-threaded CPU-bound code with single-digit-percent single-thread overhead (down from ~40% in 3.13). The JIT ships in official installers but stays experimental and off by default. Astral's Rust tools (uv, ruff, ty) have effectively won the tooling war; Astral itself announced an agreement to join OpenAI (Codex team) in March 2026. Python 3.15 is due 2026-10-01: lazy imports (PEP 810) and a stable ABI for free-threaded builds (abi3t, PEP 803) are its headline items.

### Language changes by release

#### Python 3.12 (Oct 2023): the typing and error-message release

- `type X = list[int]` statement (PEP 695): generic syntax `def f[T](x: T) -> T` without importing TypeVar; class-level generics `class C[T]: ...`.
- Per-interpreter GIL at the C-API level (PEP 684): the groundwork for 3.14's stdlib subinterpreters; each subinterpreter gets its own GIL.
- f-strings formalized (PEP 701): arbitrary nesting, reuse of quotes inside.
- Much better error messages (suggestions for typos, clearer NameError/ImportError).
- `itertools.batched`, `pathlib.Path.walk`, buffer protocol via `__buffer__`.

#### Python 3.13 (Oct 2024): first taste of nogil and JIT

- Free-threaded build (PEP 703) as an *experimental* separate binary (`python3.13t`); ~40% single-thread overhead, most C extensions unsupported.
- Experimental copy-and-patch JIT (PEP 744), off by default, modest gains.
- New interactive REPL (colors, multiline editing, paste mode): from PyPy.
- `typing.TypeIs` (smarter narrowing than TypeGuard), `ReadOnly` for TypedDict fields, TypeVar defaults (PEP 696).
- Dead batteries removed (PEP 594): cgi, telnetlib, etc.

#### Python 3.14 (Oct 2025): the release that matters

- **Free-threading officially supported** (PEP 779, "phase II"): no longer experimental; single-thread overhead down to roughly 5-10% on common platforms; ~3x speedups on 4-core CPU-bound thread pools. Still a separate build (`python3.14t`, `uv python install 3.14t`); the default build keeps the GIL.
- **Subinterpreters in the stdlib** (PEP 734): `concurrent.interpreters` plus `InterpreterPoolExecutor`; isolated interpreters in one process, each with its own GIL, cheaper than processes for share-nothing parallelism.
- **T-strings** (PEP 750): `t'Hello {name}'` returns a Template object exposing static and interpolated parts instead of a str; enables safe SQL/HTML templating and is showing up in LLM prompt-templating libraries.
- **Deferred evaluation of annotations** (PEP 649/749): annotations are lazily evaluated by default; `from __future__ import annotations` is finally obsolete; introspect via `annotationlib`.
- JIT: still experimental but now shipped in official macOS/Windows installers (enable with `PYTHON_JIT=1`); broader bytecode coverage, wins on tight loops.
- Zstandard in the stdlib (`compression.zstd`), improved error messages again.

#### Python 3.15 (due 2026-10-01): what is coming

- **Lazy imports** (PEP 810): explicit `lazy import foo`; big startup-time wins for CLIs and serverless.
- **Stable ABI for free-threaded builds** (abi3t, PEP 803): lets NumPy-class extensions ship one wheel per platform for nogil Python; the last structural blocker to free-threading becoming the default over the next few releases.

#### Practical guidance

- Target 3.12+ syntax (type statement, PEP 695 generics) in new code; run 3.13/3.14 in production. Try `3.14t` for CPU-bound threaded workloads (data loading, tokenization); check extension compatibility at py-free-threading.github.io (site, already counted above) first.
- The GIL-removal endgame: PEP 703 acceptance was conditional; with PEP 779 done and abi3t landing in 3.15, expect free-threaded to become the default build around 3.16-3.17 if ecosystem support holds.

### Tooling: the 2026 standard stack

| Concern | Standard | Replaces | Notes |
| --- | --- | --- | --- |
| Env + deps + Python installs | **uv** | pip, venv, poetry, pipx, pyenv | Rust; 10-100x faster resolves; `uv init`, `uv add`, `uv run`, `uv sync`; universal `uv.lock` |
| Lint + format | **ruff** | flake8, isort, black, pyupgrade | Rust; `ruff check --fix`  • `ruff format` |
| Type check | **pyright** now, **ty** rising | mypy | ty (Astral, Rust) hit beta in 2026, 10-100x faster cold checks, doubles as LSP; pyright still the correctness reference; mypy is legacy-maintenance only |
| Tests | **pytest** | unittest | unchanged king; `pytest-xdist` for parallelism |
| Validation | **pydantic v2** | v1, dataclasses for IO | Rust core (pydantic-core); v2.12+ current; v3 signalled by deprecation warnings but not yet released |
| DataFrames | **polars** for new work, pandas for interop |  | polars 1.x (Rust, lazy, multi-threaded, Arrow-native); 2.0 roadmap open (issue #26148); pandas 2.x with Arrow dtypes still fine for glue |
| Packaging | `pyproject.toml`  • uv | `setup.py` | see below |

- Astral joined OpenAI (announced 2026-03): tools remain open source (MIT); watch governance, plus their **pyx** registry/build service.
- One-liner project bootstrap: `uv init --package myproj && uv add ruff pytest && uv run pytest`.
- Inline script deps (PEP 723): `# /// script` header + `uv run script.py` replaced ad-hoc virtualenvs for one-off scripts.

### Async state of the art

- `asyncio` improved steadily: 3.14 ships better `asyncio` introspection (`python -m asyncio ps <pid>` style task inspection) and TaskGroup refinements. Structured concurrency via `asyncio.TaskGroup` (3.11+) + `asyncio.timeout` is the idiom; stop using `gather` for new fan-out code.
- Free-threading does not replace async: async remains right for high-concurrency IO; free-threading covers CPU-bound parallelism without multiprocessing serialization.
- Libraries: httpx (async HTTP client), FastAPI + uvicorn still standard for services; Trio's ideas (nurseries, cancellation scopes) absorbed into asyncio; AnyIO if you need to span both.

### Packaging best practice

- Single `pyproject.toml`; build backend `uv_build` (fast, zero-config) or `hatchling`. `setup.py` only for compiled extensions that need it (and even then, prefer scikit-build-core, meson-python, or maturin for Rust).
- Lock with `uv.lock` (applications) and test against lower bounds (libraries).
- Publish: `uv build && uv publish` (trusted publishing via OIDC on GitHub Actions, no API tokens).
- Wheels: cibuildwheel for compiled projects; add `cp314t` (free-threaded) wheels now that PyO3/nanobind/Cython support them.
