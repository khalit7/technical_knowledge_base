# Coverage of the old pages (unverified notes) by the new Reading

The old root and its seven children were fetched read only on 2026-10-05 and saved verbatim by `save_old.py` in `old/`. They were treated as unverified notes. This file lists their checkable claims with a status and where the new page carries them.

Status: **verified** (checked against the primary source named, saved in `sources/` unless said otherwise), **corrected** (the old claim was wrong or stale; the correction is on the page), **unconfirmed** (not checked; not stated on the page as fact), **child** (correct or plausible, but depth that belongs to a future child page; kept here so the children can pick it up). A root page is an overview (methods/topic_pages.md, lesson of 2026-10-04), so most of the old pages' ladders, idiom lists and trap lists are marked child.

## Old root (Topic: programming-languages)

| Claim | Status | Source / where now |
|---|---|---|
| Five tracks with a shared five-stage ladder and gates | child (structure replaced) | Reading 14: learning path in four steps with milestones; children proposed per language |
| Python: dunder protocols, descriptors, asyncio, PEP 659 specialising interpreter | PEP 659 verified (dis output, adaptive=True); rest child | Reading 2 animation; 14 step 4 |
| JIT "shipped but experimental and off by default" | verified for 3.14 | `py314_whatsnew.txt`; Reading 2 false friends; dis shows JUMP_BACKWARD_NO_JIT |
| Free-threading officially supported | verified (PEP 779, 3.14) | Reading 9 |
| uv, ruff, ty "one to two orders of magnitude faster" | unconfirmed (vendor claim) | not stated |
| C++: lifetime, RAII, undefined behaviour as organising ideas | verified as language facts (ran the UB examples) | Reading 5, 10 |
| C++20/23/26 feature lists | C++26 completion verified (Sutter, 2026-03-28); features: reflection, contracts, std::execution verified in the trip report | Reading 11 (completion date); features child |
| Rust: ownership proves memory and data-race safety at compile time | verified (rust-lang.org wording; E0502 and E0499 reproduced) | Reading 1, 5, 9 |
| Rust is the language of uv, ruff, ty, tokenizers, polars, pydantic-core | verified by GitHub linguist bytes (ty's Rust lives in the ruff repo, per ty's README) | Reading 1 chart |
| unsafe, Miri, PyO3 | verified (Miri repo, PyO3 guide 0.29.3) | Reading 10, 13; Further reading |
| cutile-rs, cuda-oxide shipped September 2026; Grout, mistral.rs; nightly for cuda-oxide | verified (NVIDIA blog, `nvidia_cuda_rust.txt`) | one sentence in Reading 1; detail owned by Topic: cuda-and-gpu-programming |
| "968 points on Hacker News" | unconfirmed | dropped (CUDA topic carries it) |
| JavaScript: closures, this, prototypes, event loop, V8 hidden classes | event loop verified (ran); V8 tiers verified (v8.dev Maglev post); rest child | Reading 2, 9 |
| TypeScript erased, never validates data | verified (tsc output; node runs the wrong call to 0) | Reading 2, 3 |
| TS 7.0 on 2026-07-08, native Go port, about 10x faster, no stable API | verified (TypeScript blog: "10x faster native port", 8x to 12x on full builds, "does not ship with an API", 7.1 expected) | Reading 11 |
| Mojo open source at 1.0, Apache 2.0 with LLVM exceptions, 2026-08-18 | verified (Modular blog dated 18 Aug 2026; 1.0 "last week") | Reading 1 "Go deeper" |
| Modular acquired by Qualcomm, closed late July 2026 | unconfirmed | not stated |
| Reading times of children | dropped (children to be rewritten) | |

## Python: zero to expert

| Claim | Status | Where |
|---|---|---|
| Compiled to bytecode, then interpreted; dis shows it | verified (ran dis on 3.14.8) | Reading 2 |
| "What object is this, who else references it, when does it die" | kept as idea | Reading 4, 5 |
| Packaging layers (interpreter, isolation, resolve, build backend), pip, venv, Poetry, conda, uv | child (Toolchain atlas tab owns tools) | Reading 12 short list |
| int arbitrary precision, float IEEE 754, str code points | verified (ran) | Reading 7 |
| Reference counting plus cycle GC | verified (gc module docs; __del__ timing shown) | Reading 5 |
| GIL: threads help I/O, not CPU, in the default build | verified (Benchmark tab: 4 threads no faster with GIL) | Reading 9 |
| `i = i + 1` not atomic | verified (Python FAQ) | Reading 9 |
| Stage lists, gates, traps (mutable defaults, late binding...) | child | |
| NumPy avoids the interpreter | verified as mechanism (contiguous buffer) | Reading 5 callout |
| Best resources list (Fluent Python etc.) | partly kept (official docs only, per brief) | Further reading |

## Python: staying current (3.12 to 3.15)

| Claim | Status | Where |
|---|---|---|
| 3.15 due 2026-10-01 | **corrected**: 3.15.0 rc3 on 2026-10-02, final planned 2026-10-09 (PEP 790, modified 2026-10-02); current stable 3.14.8 (30 Sep 2026, python.org) | Reading 11 |
| Free-threaded single-thread overhead "5-10%" (3.14) | **both official**: What's New 3.14 says "roughly 5-10%"; the 3.14 HOWTO says about 1% on macOS aarch64 to 8% on x86-64 Linux (pyperformance average) | Reading 9 |
| "~40% overhead in 3.13" | unconfirmed | not stated |
| "~3x speedups on 4-core thread pools" | unconfirmed as a general figure; Benchmark tab measured 1.33 s to 0.625 s (2.1x) with 4 threads for the running program | Reading 9 cost box (links Benchmark) |
| 3.14: PEP 734 subinterpreters, PEP 750 t-strings, PEP 649/749 annotations, zstd | verified (What's New 3.14) | child |
| JIT in official macOS/Windows binaries, PYTHON_JIT=1 | verified | Reading 2 |
| 3.15: PEP 810 lazy imports, PEP 803 abi3t | unconfirmed here | child |
| Astral joined OpenAI (March 2026) | verified: astral.sh/blog "Astral to join OpenAI", 2026-03-19 (agreement announced) | not stated |
| ty "hit beta in 2026" | **corrected** per the Toolchain atlas agent's check: beta since 2025-12-16; ty 0.0.84 on PyPI (2026-09-24) used here | Reading 12 ("in beta"); Reading 3 output |
| mypy "legacy-maintenance only" | **corrected**: mypy is active (2.4.0 released 2026-10-01 on PyPI, used on this page) | Reading 3 |
| pydantic v2, polars, httpx, FastAPI | child | |

## C++: zero to expert

| Claim | Status | Where |
|---|---|---|
| Lifetime and UB as the mental model; optimiser assumes no UB | verified (data race hidden at -O2; signed overflow UBSan) | Reading 9, 7, 10 |
| Compilation model (TUs, linker, ODR) | child | |
| No official package manager; vcpkg, Conan, FetchContent | child / Toolchain atlas | Reading 12 one line |
| Signed overflow UB, unsigned wraps | verified (UBSan report) | Reading 7 |
| vector contiguous, beats list | verified (layout and scan measured) | Reading 5 |
| Dangling references, iterator invalidation after push_back | verified (ASan heap-use-after-free) | Reading 5 animation |
| std::move is a cast | verified (cppreference wording known; not re-fetched) | Reading 4 "Go deeper" |
| Concepts make errors legible | verified (ran: "does not satisfy HasTokens") | Reading 8 |
| std::expected | verified (ran with Apple clang 17 + macOS 26 SDK) | Reading 6 |
| Data races are UB, not "sometimes wrong" | verified (TSan; -O0 vs -O2) | Reading 9 |
| AoS vs SoA "an order of magnitude" | unconfirmed as stated; related measurement: contiguous vs shuffled pointers about 14x | Reading 5 |
| Stage lists, traps | child | |

## C++: modern practice and standards status

| Claim | Status | Where |
|---|---|---|
| C++26 finalized March 2026 (London) | verified: technical work completed Saturday 2026-03-28 (Sutter, 2026-03-29); ISO publication not confirmed | Reading 11 |
| Reflection P2996, contracts P2900, std::execution P2300 in C++26 | verified (trip report sections 1, 3, 4) | child |
| "pattern matching did NOT make it" | unconfirmed (not in the extract read) | not stated |
| C++23 std::expected, mdspan, print, generator, flat_map | expected verified (ran); rest child | |
| MSVC /std:c++23 with Build Tools 14.52 | unconfirmed | not stated |
| nanobind "~4x faster compile, smaller binaries, faster calls" | unconfirmed as stated; Benchmark tab measures nanobind 17 ns vs pybind11 38 ns per empty call | Reading 13 (links Benchmark) |
| C++ in ML infra: llama.cpp, TensorRT-LLM, ONNX Runtime, vLLM/SGLang, PyTorch ATen | verified by repository language bytes (GitHub API, 2026-10-05) and the llama.cpp clone | Reading 1 |
| Hygiene checklist (RAII, unique_ptr, sanitizers in CI) | child | |

## Rust: zero to expert

| Claim | Status | Where |
|---|---|---|
| Every value has one owner; borrow checker | verified (E0382, E0502, E0499) | Reading 4, 5, 9 |
| Gate: `let first = &v[0]; v.push(2)` fails | verified (the same shape, E0502) | Reading 5 animation |
| Option instead of null, Result instead of exceptions, ? | verified (ran) | Reading 6 |
| Cargo features, semver 0.x rule, workspaces | child / Toolchain atlas | |
| Generics monomorphise; dyn for dynamic dispatch | verified (ran; E0277) | Reading 8 |
| Send and Sync make data races compile errors | verified (E0499 example) | Reading 9 |
| PyO3 0.28, free-threaded support since 0.23 | **corrected**: current PyO3 0.29.3 (PyO3 guide, Benchmark env) | Further reading |
| rustc stable 1.98 (2026-08-20), 6-week releases, edition 2024 | verified and updated: 1.99.0 released 2026-10-01; 2024 edition stable since 1.85.0 (2025-02-20) | Reading 11 |
| Rust Book is the canonical intro; chapter 4 | verified (Book targets Rust 1.97.0 or later, 2024 edition) | Further reading |
| candle, burn, ort, mistral.rs, lance, qdrant | unconfirmed here | child |
| C++ translation appendix (Box = unique_ptr, Rc/Arc = shared_ptr) | child | |

## JavaScript: zero to expert

| Claim | Status | Where |
|---|---|---|
| Single-threaded with an event loop | verified (ran the async counter) | Reading 9 |
| number is IEEE 754 double; integers exact to 2^53; 0.1 + 0.2 | verified (ran) | Reading 7 |
| Node 24 Active LTS, 26 becomes LTS in Oct 2026 | per the Toolchain atlas agent: Node 26 LTS on 2026-10-28 | not stated here (atlas owns) |
| Worker threads, SharedArrayBuffer, Atomics | verified (ran: lost updates, then exact) | Reading 9 |
| V8: Ignition, TurboFan/Maglev, deopts; hidden classes | tiers verified (v8.dev); deopt observed in our trace | Reading 2 |
| Bun "reported to be acquired by Anthropic in early 2026" | corrected: bun.com/blog/bun-joins-anthropic, 2025-12-02 | not stated |
| Temporal enabled by default in Node 26 | verified by the Toolchain atlas (Node 26.0.0 release notes) | not stated |
| typeof null, coercion, this, prototypes, traps | child | |

## TypeScript: zero to expert

| Claim | Status | Where |
|---|---|---|
| Types erased; no runtime type information | verified (tsc output; node strips) | Reading 2, 3 |
| TS 7.0 2026-07-08; VS Code 125.7 s to 10.6 s; 8 to 12x | verified (TypeScript blog) | Reading 11 (date, Go port); numbers child |
| 7.0 ships without a stable API, expected in 7.1 | verified | Reading 11 |
| 7.0 adopts strict defaults | verified ("strict is true by default") | not stated (child) |
| Node 24+ type stripping | **corrected**: enabled by default since Node 23.6.0 and 22.18.0 (Node docs history table) | Reading 2, 12 |
| strict, noUncheckedIndexedAccess | verified (ran TS2322 with the flag) | Reading 10 |
| Narrowing, unknown, zod at the boundary | verified as mechanism (TS18048, Rosetta's isMessage guard) | Reading 3, 6 |
| Deliberate unsoundness | verified (Design Goals non-goal quoted) | Reading 1, 3 |
| Conditional/mapped types, variance, package management | child | |
