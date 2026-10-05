# Reading tab: visual ideas, built and rejected (2026-10-05)

The question the page keeps returning to: **at what moment does each language catch (or fail to catch) a given mistake, and what does that choice cost in speed and effort?** Visuals were scored 0 to 2 on the methodology's questions (moves with a parameter, reproduces a published or measured figure, computable from public data, shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, animatable as before/after), build cost subtracted.

## Built

| # | Visual | Where | Data | Score | Why it earns its place |
|---|---|---|---|---|---|
| R1 | **One line through four routes to machine code** (required visual a): `if tok and not inside: n += 1` through CPython bytecode, specialised bytecode after 1,000 calls, clang and rustc assembly (scalar loop and vectorised loop), V8 Ignition bytecode, trace-opt, TurboFan machine code and a deopt, and TS erasure; 5 modes, 3 to 5 steps each, counters computed from the real listings | Reading 2 | `code/howrun/` (dis, `-S`, `--emit asm`, `--print-bytecode`, `--trace-opt`, `--print-opt-code`, tsc) | 12 | Turns "interpreted vs compiled vs JIT" into instruction counts on the reader's own loop (29 bytecodes per character vs 16 or 17 instructions per byte, then SIMD); corrects "TS is compiled so it is fast" and "3.14 has a JIT". |
| R2 | **Same four records at their real addresses** (required visual b): one row per 128-byte cache line, Python list header, pointer array, tuples and ints read through ctypes headers, against C++ and Rust contiguous structs with padding; counters for bytes per record, cache lines touched, measured ns per record | Reading 5 | `code/memory/` (layout.py/.cpp/.rs, scan.cpp/.py; 10M-record scan) | 13 | Drawn to scale from real addresses; the C++ "same loop, Python's layout" measurement (0.28 vs 4.02 ns per record) separates layout from interpreter, which prose cannot. |
| R3 | **The same dangling reference** (required visual c): C++ (plain run prints an empty name; ASan heap-use-after-free report), Rust (E0502 at the push), Python (refcount keeps the object; `__del__` shows the exact free) | Reading 5 | `code/ownership/` (ASan via LLVM clang 23) | 12 | Before/after on one input; real outputs at each end. |
| R4 | **Shared counter from four threads** (required visual d): Python with GIL, free-threaded 3.14t, JS event loop, JS workers with SharedArrayBuffer (plain vs Atomics), C++ at -O0, -O2, TSan, atomic; Rust E0499 then Arc<Mutex> and AtomicU64 | Reading 9 | `code/concurrency/` (three runs each) | 12 | Interleaving labelled illustrative; every total measured. Shows the -O2 "hidden race", a misconception worth correcting. |
| R5 | **Four-language code panels** (`.quad`): code, exact command, real output, verdict pill, for types, values, nothingness, errors, numbers and text, abstraction, out-of-bounds | Reading 3, 4, 6, 7, 8, 10 | `code/types`, `values`, `errors`, `numtext`, `abstraction`, `safety` | 9 | Python as the reference column (the research behind the false-friends boxes); real compiler messages instead of paraphrase. |
| R6 | **Language share of ML-stack repositories** (24 repos, GitHub linguist bytes, filter by layer) | Reading 1 | `code/repo_langs/fetch.py`, GitHub REST API, 2026-10-05 | 9 | Dated evidence for "what each language is for" instead of assertion. Caveats (bytes are not importance; ty's Rust lives in ruff) on the chart. |
| R7 | **llama.cpp excerpts** (block_q4_0 with compiled sizeof, ggml_tensor, mmap + RAII destructor) and feature counts for the learning path | Reading 5, 14 | `code/llama/excerpts.sh` at commit 8e1642198dcd | 8 | Khalid's goal (read inference engines): real code that uses exactly the section's ideas. |
| R8 | Founding value traced to each axis (table) and the one-screen table | Reading 0, 14 | prose | 7 | The spine's "philosophy first" decision, as two tables. |

## Rejected or deferred

- **Animated CPython eval loop in C** (show ceval's dispatch): too deep for a root; child page on Python.
- **LLVM IR stage in R1**: adds a fifth pane per compiled mode; the assembly already shows the point. Child.
- **Rust mode for the 10M-record scan**: Rust's layout is identical and printed; measuring it again would repeat C++. Said on the page.
- **JS mode in R2** (V8 object layout via `%DebugPrint`): needs `--allow-natives-syntax` output that is hard to read and not stable across Node versions; one sentence with the V8 Smi source instead.
- **PyO3 build in this tab**: the Benchmark tab built and timed PyO3, pybind11 and nanobind; the Reading quotes its numbers by id (`RDD.bench`, read from `src/bench/results/summary.json` at build time) so the two tabs cannot disagree.
- **Timeline of language releases**: belongs to the Toolchain atlas and Design space tabs; section 11 is a short table.
- **Interactive "predict the output" quizzes**: considered for numbers and text; the four-panel viewer already makes the comparison and the Design space tab owns per-cell snippets.

## What the methodology lacked for this page

A language page has few published figures to reproduce; the equivalent rule used here is "every output shown is produced by a script in `read/code/` and copied into the page by `build_data.py`, never typed". Sanitizer reports are shortened mechanically (library frames collapsed), and the page says so.
