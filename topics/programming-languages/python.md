# Python: zero to expert

⏱ 18 min read · +66h resources

*Created 2026-08-31.* A zero-to-expert path. Companion page [python-staying-current.md](python-staying-current.md) tracks what changed in 3.12-3.15 and the current tooling stack; this page is the ladder, and it stays valid across releases.

**If you already write Python daily**, skip to the Stage 3 gate and try to answer it cold. Whatever you cannot answer, drop back a stage for. The fastest refresh path for a working engineer is Stage 2's idiom list plus all of Stage 3.

## Best resources (2 min)

- [The official tutorial](https://docs.python.org/3/tutorial/) (docs, ~2h end to end) then [the Language Reference](https://docs.python.org/3/reference/) (docs, ~2h for the data model chapter): most people skip the reference forever; the data model chapter is the single highest-value document in Python.
- **Fluent Python** (Ramalho) (book, ~25h): the book that turns a working programmer into an idiomatic one. Data model, sequences, functions as objects, metaprogramming.
- **Python Distilled** (Beazley) (book, ~8h 45m): short, precise, best on the object and execution model.
- **Effective Python** (Slatkin) (book, ~12h): item-per-idiom, the fastest way to fix specific bad habits; individual items stand alone at ~5 min each.
- [Raymond Hettinger, Transforming Code into Beautiful, Idiomatic Python](https://www.youtube.com/watch?v=OSGv2VnC0go) (video, ~1h) and [Beyond PEP 8](https://www.youtube.com/watch?v=wf-BqAjZb8M) (video, ~50 min).
- [David Beazley, Python Concurrency From the Ground Up](https://www.youtube.com/watch?v=MCs5OvhV9S4) (video, ~55 min): builds an event loop live; the clearest concurrency explanation in the language.
- **CPython Internals** (Anthony Shaw) (book, ~10h) plus the [CPython source](https://github.com/python/cpython) (repo, ~3h for the core object files) for Stage 4.
- [PEP 8](https://peps.python.org/pep-0008/) (~30 min) for style, [PEP 20](https://peps.python.org/pep-0020/) (~2 min) for taste, the [PEP index](https://peps.python.org/) (index, browse as needed) for where the language is going.

## Stage 0: setup and mental model (1 min)

Do this once, properly, because a bad environment causes problems that look like language problems.

- Install nothing system-wide. `uv` manages interpreters and environments: `uv python install 3.13`, `uv init myproj`, `uv add requests`, `uv run main.py`.
- Understand that Python is **compiled to bytecode then interpreted**: source becomes a code object (`dis.dis(f)` shows it), executed by a stack machine (the eval loop). Nothing is "just interpreted line by line".
- The three-question model to hold from day one: **what object is this, who else references it, when does it die**. Almost every Python bug is one of those three misunderstood.

**Gate**: you can create a project, add a dependency, run tests, and explain what `uv run` does that bare `python` does not.

## Package management (read now, revisit at Stage 2) (4 min)

Python's packaging story is famously confusing because the job is split across four layers that different tools bundle differently.

| Layer | Job | Tools |
|---|---|---|
| Interpreter versions | Install and pin Python itself | pyenv, conda, **uv python**, system packages |
| Isolation | Give each project its own site-packages | **venv** (stdlib), virtualenv, conda envs |
| Resolve + install | Pick versions, download, install | **pip**, **uv**, poetry, pdm, conda |
| Build backend | Turn your source into a wheel | setuptools, hatchling, flit, uv_build, maturin (Rust), scikit-build-core (C++) |

**PyPI** is the registry everything downloads from. A **wheel** (`.whl`) is a prebuilt archive that installs by unzipping; an **sdist** is source that must be built. Installing a package with C extensions is fast when a wheel exists for your platform and slow (or broken) when it does not.

**The tools, and why each exists:**

- **pip**: the default installer, ships with Python. Installs into whatever environment is active, which is why forgetting to activate a venv is the classic beginner disaster. It resolves dependencies but does not lock them; `pip freeze > requirements.txt` snapshots what you happen to have installed, which is not the same as a real lock file. `requirements.txt` is a list of installs, not a project definition.
- **venv**: stdlib module that creates an isolated directory of packages. `python -m venv .venv && source .venv/bin/activate`. Understand it even if a tool hides it from you.
- **pipx**: installs command-line applications (black, ruff) each into their own environment so they do not pollute or conflict with project dependencies.
- **Poetry** (2018): the first popular all-in-one. One `pyproject.toml` declares dependencies, dependency groups, and metadata; `poetry.lock` pins the full resolved tree; `poetry add/install/build/publish` cover the workflow. It made lock files and a single project file normal in Python. Its drawbacks are a slow resolver on large trees and a history of diverging from the PEP standards (its own `[tool.poetry]` tables predate PEP 621, and Poetry 2.x only recently adopted the standard `[project]` table). **You will meet it constantly in existing codebases, so learn to read `pyproject.toml` and `poetry.lock` even though new projects should not start here.**
- **PDM** and **Hatch**: standards-first alternatives to Poetry. Hatch's build backend, hatchling, is widely used even by projects that do not use Hatch itself.
- **conda / mamba / micromamba**: a different ecosystem, not a Python-only package manager. It ships binary non-Python dependencies (CUDA toolkits, MKL, compilers) from channels such as conda-forge, which is why scientific and GPU stacks still use it. Mixing `pip install` into a conda environment carelessly is a well-known way to break it; if you must, install conda packages first and pip last.
- **uv** (Astral, Rust): the current standard, and what you should default to. It collapses pyenv, venv, pip, pipx, and Poetry into one fast tool with a universal `uv.lock`. `uv init`, `uv add`, `uv run`, `uv sync`. It also supports PEP 723 inline script dependencies, so a single-file script can declare its own dependencies in a header comment and `uv run script.py` just works.

**Concepts that outlive the tools**: a lock file pins the exact resolved tree for reproducibility, while a version range expresses what you actually support. Applications commit a lock file; libraries specify ranges and test against their lower bounds. An editable install (`pip install -e .`, `uv pip install -e .`) points at your source so changes take effect without reinstalling. Extras (`package[dev]`) are optional dependency sets. Transitive dependency conflicts are resolved by the resolver, and when it fails, the error is telling you two of your dependencies disagree about a third.

**What to actually do**: use uv for anything new; know pip and venv because they are everywhere and every CI example uses them; recognise Poetry and conda well enough to work in a repo that already uses them.

## Stage 1: foundations (2 min)

What to learn:

- Types and literals; `int` is arbitrary precision, `float` is IEEE 754 double, `str` is Unicode code points, `bytes` is not `str`.
- Control flow, comprehensions (list/dict/set/generator), truthiness rules, `is` versus `==`.
- Functions: positional/keyword/default/`*args`/`**kwargs`, and the mutable-default trap (`def f(x=[])` binds one list forever).
- Data structures and their costs: `list` (dynamic array, O(1) append and index, O(n) insert-at-front), `dict` (hash table, ordered by insertion since 3.7, O(1) average), `set`, `tuple`, `collections.deque/Counter/defaultdict`.
- Strings: f-strings, `join` over `+=` in loops, encode/decode boundaries.
- Exceptions: `try/except/else/finally`, catching specific types, never bare `except:`, raise-from for chaining.
- Modules, packages, `if __name__ == "__main__"`, and how imports resolve.
- Files and context managers (`with`), pathlib over `os.path`.

What to build: a CLI that reads a messy CSV, validates and transforms rows, writes JSON, with a `--dry-run` flag. No libraries beyond the stdlib.

**Gate**: you can explain why `a = [1,2]; b = a; b.append(3)` changes `a`, and why the same is not true for integers.

## Stage 2: working proficiency (2 min)

This is where most professional Python lives. The theme is **the object model**.

- **Everything is an object with a type**, including functions, classes, and modules. Names are bindings, not boxes. Assignment never copies.
- **Dunder protocols**: `__len__`, `__iter__`, `__next__`, `__getitem__`, `__contains__`, `__eq__`/`__hash__` (together, always), `__repr__` (for you) versus `__str__` (for users), `__enter__`/`__exit__`. Python's polymorphism is protocol-based, not inheritance-based.
- **Iterators and generators**: `yield`, generator expressions, laziness, `itertools`. Generators are the idiom for streaming data without materialising it.
- **Closures and decorators**: functions as values, `functools.wraps`, decorators with arguments, `functools.lru_cache`.
- **Classes done properly**: `@dataclass`, `__slots__` for memory, properties over getters, classmethods as alternative constructors, composition over inheritance, MRO and cooperative `super()`.
- **Typing**: annotate everything at API boundaries. `list[int]`, `Optional`/`|`, `Protocol` (structural typing, the right tool most of the time), `TypeVar` and PEP 695 `def f[T](x: T) -> T`, `Literal`, `TypedDict`. Types are checked by pyright/ty, never at runtime.
- **Testing**: pytest, fixtures, parametrize, `monkeypatch`, and the discipline of testing behaviour rather than implementation.
- **Errors and logging**: custom exception hierarchies, `logging` over `print`, structured context.
- Idioms worth internalising: unpacking and starred assignment, `enumerate`/`zip`, `dict.get`/`setdefault`, EAFP over LBYL, `pathlib`, `contextlib.contextmanager`, comprehension over `map`/`filter` plus lambda.

What to build: a small library with a clean public API, full type annotations, a pytest suite, and a `pyproject.toml` that installs. Publish it to TestPyPI.

**Gate**: you can write a context manager and a decorator from scratch without looking anything up, and explain what `__hash__` must guarantee for a dict key.

## Stage 3: advanced (3 min)

- **Execution model**: reference counting plus a cycle-collecting GC (`gc` module), `sys.getrefcount`, why `__del__` is unreliable, weak references, when memory is actually returned.
- **The GIL, precisely**: one lock around the interpreter state, released around IO and by some C extensions. Threads therefore help IO-bound work and not CPU-bound work in the default build. Free-threaded builds (3.14+) change this; see the companion page.
- **The three concurrency models and when each applies**: `threading` for IO with blocking libraries, `asyncio` for high-concurrency IO with async libraries, `multiprocessing`/`concurrent.futures.ProcessPoolExecutor` for CPU work. Know the cost of each (thread stacks, pickling across processes, event-loop starvation from a blocking call).
- **asyncio in depth**: coroutines are objects, not threads; the event loop; `await` yields control; `TaskGroup` and `asyncio.timeout` for structured concurrency; cancellation semantics; never block the loop (`run_in_executor` for CPU or blocking IO); `async for`/`async with`.
- **Descriptors and the attribute lookup chain**: `__getattribute__` order, `__get__`/`__set__`, how `property`, `classmethod`, and methods themselves are descriptors. This explains most "magic" in frameworks.
- **Metaclasses and `__init_subclass__`**: what happens at class creation. Reach for `__init_subclass__` first; metaclasses only when building a framework.
- **Performance work**: profile before optimising (`cProfile`, `py-spy` for live processes, `timeit` for microbenchmarks, `memray`/`tracemalloc` for memory). Then: better algorithm, then vectorise (NumPy), then move the loop to C/Rust. Know why attribute lookup and function calls are expensive, and why `str` concatenation in a loop is quadratic.
- **The C boundary**: how NumPy avoids the interpreter, the buffer protocol, why a NumPy operation on a 10-element array is slower than a Python loop but faster on 10 million.
- **Packaging for real**: source distributions versus wheels, editable installs, entry points, extras, lock files versus ranges for libraries.

What to build: take a genuinely slow script of your own, profile it, and make it 10x faster. Write down which change bought which speedup.

**Gate**: given a program that is slow, you can say within a few minutes whether it is IO-bound, CPU-bound, or allocation-bound, and name the right fix for each.

## Stage 4: expert (2 min)

Expert means you can answer "why does the interpreter do that" and change the ecosystem rather than only consume it.

- **Read CPython**: `Objects/dictobject.c`, `Objects/listobject.c`, `Python/ceval.c`. Understand PyObject headers, refcount fields, and how `dict` handles collisions and resizing.
- **The modern interpreter**: the specialising adaptive interpreter (PEP 659) rewrites bytecode into type-specialised forms at runtime; understand quickening, inline caches, and why hot loops with stable types get faster. Then the tier-2 JIT (copy-and-patch, PEP 744) and what it can and cannot do.
- **Write a C or Rust extension**: nanobind or PyO3, the buffer protocol for zero-copy, GIL acquisition and release rules, and what changes under free-threading (no implicit GIL protection for your own state).
- **Import system internals**: finders, loaders, `sys.meta_path`, and how tools like lazy imports and hot reloaders hook it.
- **Contribute**: a typeshed stub, a bug fix to a library you use, or a CPython issue. Reading the discussion on a rejected PEP teaches more about the language than the accepted ones.
- **Teach it**: explain descriptors or the GIL to another engineer without a slide. If you cannot, you have a gap.

**Gate**: you can predict, before running, whether a change makes a hot loop faster, and explain the answer in terms of the interpreter's actual behaviour.

## Traps that catch experienced people (1 min)

- Mutable default arguments; mutable class attributes shared across instances.
- Late binding in closures (`[lambda: i for i in range(3)]` all return 2).
- `is` on small ints and interned strings appearing to work, then failing.
- Modifying a list while iterating it.
- Shadowing a stdlib module by naming a file after it.
- Catching `Exception` around a block that includes a `KeyboardInterrupt`-sensitive call.
- Assuming `dict` ordering is a language guarantee everywhere (it is, since 3.7, but not for `set`).
- Threads for CPU work in the default build; blocking calls inside an event loop.

## Cross-links (1 min)

- Current releases, free-threading, JIT, tooling: [python-staying-current.md](python-staying-current.md)
- Writing the extension in Rust: [rust.md](rust.md); in C++: [cpp.md](cpp.md)
- PyTorch-specific Python (autograd, `torch.compile`): ../pytorch-ecosystem/
