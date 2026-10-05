# Benchmark tab: visual ideas, built and rejected

Central question of the tab: how much faster is each language on the same real job, and why, so the reader knows what a rewrite (or a Python extension) would buy.

| # | Idea | Score (quantity changes with a control / defaults reproduce a source / computed from data / says more than a sentence / corrects a misconception) | Status |
|---|---|---|---|
| B1 | One switchable bar chart (time, memory, startup, lines of code, compile time) with group chips, log toggle, whiskers min to max and a dot per run; click a bar for its exact command | 2/2/2/2/1 = 9 | built (main card) |
| B2 | Interpreter vs compiled, animated on the same 9-character input: the bytecodes CPython really executed per character (sys.settrace with f_trace_opcodes) against the ARM64 loop clang emitted, counters per lane, toggle both / one lane, play/step/scrub/speed, `é` shown as 1 character vs 2 bytes | 1/2/2/2/2 = 9 | built (box 1) |
| B3 | Stage breakdown of the Python program (read, json.loads, token loop, dict) for 3.13, 3.14 and the regex version, as stacked bars | 1/2/2/2/2 = 9 | built (box 2); explains why per-message Rust calls stop helping |
| B4 | Crossing cost: empty call per binding, and per-message cost per call vs batched, log scale | 1/2/2/2/2 = 9 | built (box 5) |
| B5 | Token loop alone under Apple clang 14, a rewrite, rustc; plus LLVM clang 23 and a simdjson variant for the whole program | 1/2/2/2/2 = 9 | built (box 4): corrects "C++ is slower than Rust" into "this parser, this compiler" |
| B6 | Thread scaling, GIL vs free-threaded, bars | 1/1/2/1/2 = 7 | built (box 6) |
| B7 | External numbers (What's New 3.14, nanobind docs, TypeScript native port, Node 22.18) in a dashed, labelled box, never on the charts | n/a | built |
| B8 | Full results table with every command | n/a | built (details) |
| R1 | Speedup "race" animation (bars growing in real time) | adds motion without information; the bar chart already scales | rejected |
| R2 | Instructions-per-bytecode estimate for the interpreter lane | needs hardware counters (not available without root on macOS); would be invented | rejected; time per character shown instead |
| R3 | Cold-disk runs | `purge` needs root | not measured, said on the tab |
| R4 | Scatter of time vs lines of code | two weakly related axes, invites a false trade-off reading | rejected |
| R5 | Rust/C++ via WebAssembly or napi-rs from Node | out of the 20-minute budget; belongs to the Reading's interop section if anywhere | not built |

What the methodology lacked: for a measured (not published) benchmark there is no source figure to reproduce, so "defaults reproduce a source" was scored on whether every number regenerates from raw files by script (check_numbers.py).
