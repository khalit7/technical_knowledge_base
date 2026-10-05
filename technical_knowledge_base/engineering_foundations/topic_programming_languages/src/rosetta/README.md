# Rosetta tab: sources and captured outputs

- `PROGRAM.md`: the running example (spec, input, exact expected output), shared with the Reading and Benchmark tabs.
- `data/gen_chat.py`, `data/chat.jsonl`: seeded input generator and the committed 2,000-line input.
- `code/<lang>/`: every snippet shown on the tab. `count_tokens.*` is the program; `errors`, `message`, `closure`, `generic`, `threads`, `memory` are the focused tasks; `mistakes/` holds the deliberate bugs. `code/cpp/json_lite.hpp` is the small JSON parser C++ needs; `code/rust` is a cargo project (tasks are `examples/`, mistakes compile alone with `rustc`); `code/ts` compiles with `tsc -p .` (ESM, `strict`).
- `outputs/<lang>/<name>.txt`: the exact capture of each run (first line is the command shown on the page, last line the exit code); `outputs/versions.txt`: toolchains.
- `content_program.py`, `content_tasks.py`, `content_mistakes.py`: the line notes, Python-habit notes, axis tags and verdicts. Each note is anchored to a line of code by a substring, checked by `make_data.py`.
- `make_data.py` writes `../parts/31_js_data.js` (`window.RO_DATA`); `run_all.sh` rebuilds and reruns everything, asserts the four programs match `PROGRAM.md`, then calls `make_data.py`.
- `check/ro_check.mjs`: clicks every control at 390 px dark and 920 px light (run from the repo root).

Reproduce: `bash run_all.sh` with the toolchains in the environment (see the header of `run_all.sh`: `PY`, `PYT`, `CXX`, `CXX23` plus `CXX23_FLAGS`, `CARGO`, `RUSTC`, `NODE`, `TSC`, `UV`, `UVX`). `code/ts` needs `npm ci`-style installs of the versions in its `package.json`. Two C++ compilers are used on purpose: Apple clang 14 (what this Mac ships) for everything, and LLVM clang 23 for C++23 `std::expected` and for AddressSanitizer / ThreadSanitizer, whose runtimes do not start under Apple clang 14 on macOS 27 ("Interceptors are not working").

Axis tags used (for the Design space tab to link to): execution, types, values, memory, nothingness, errors, text, abstraction, concurrency, tooling. Task ids: program, errors, message, closure, generic, threads, memory. Mistake ids: typo, missing, dangling, moved, race, order.
