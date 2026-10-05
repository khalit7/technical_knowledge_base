# Reading and Further reading tabs: sources and how to rebuild

Parts owned: `parts/20_read.html` (CSS, nav), `parts/20_read_a.html` .. `20_read_i.html` (sections), `parts/22_js_rd_data.js` (generated), `23_js_rd_util.js` (highlighter, four-language code panels, glossary, reading time), `24_js_rd_run.js` (how code runs), `25_js_rd_mem.js` (memory layout and llama.cpp excerpts), `26_js_rd_own.js` (dangling reference), `27_js_rd_conc.js` (shared counter), `28_js_rd_repos.js` (repository language chart), `parts/39_tab_more.html`. `21_js_rd_common.js` is shared and unchanged.

Shape: the root is organised as a design space, philosophy first (coordinator's UPDATE of 2026-10-05): one screen, four founding values, then one short section per axis with Python as the reference column and a false-friends box, then choosing and the learning path, ending with a table tracing each axis to each founding value. Departs from methods/topic_pages.md Part A only in having fourteen short axis sections instead of three or four long ones, because a language comparison has more axes than a model comparison.

## Rebuild

1. `sh read/code/run_all.sh` reruns every snippet (toolchains in `read/code/env.sh`, all in the session scratchpad: Python 3.14.8 and 3.14.8t via uv, rustc 1.99.0 via rustup, TypeScript 7.0.2, Node 22.22.2, Apple clang 17 from the Command Line Tools with the macOS 26 SDK, LLVM clang 23.1.2 release build for ASan/TSan/UBSan because Apple's sanitizer runtimes hang or fail on macOS 27). Outputs land in each folder's `out/`; `versions.txt` records the toolchains.
2. `python3 read/build_data.py` copies the code and outputs into `parts/22_js_rd_data.js` (and reads the Benchmark tab's medians from `src/bench/results/summary.json`). Display edits are mechanical: absolute paths shortened, sanitizer library frames collapsed.
3. `sh build.sh`, then from the repo root `node .../src/read/check_read.mjs` (every control at 390 dark and 920 light) and `node .../src/read/secshots.mjs <dir> rd-one,rd-s1` for section screenshots.

## Notes

- `old/`: the old root and seven children, plus Topic: cuda-and-gpu-programming, saved verbatim from read-only Notion fetches by `save_old.py`.
- `coverage.md`: every checkable old claim marked verified, corrected, unconfirmed or child.
- `cuda_overlap.md`: what C++ material belongs here versus the CUDA topic.
- `sources/`: text extracts of every primary source cited (fetched 2026-10-05 by `fetch_src.py`; large pages trimmed to the lines used).
- `code/repo_langs/`: GitHub linguist byte counts for 24 repositories.
- `code/llama/`: pinned llama.cpp excerpts (commit 8e1642198dcd, shallow clone in the scratchpad) and feature counts.
- `viz_ideas.md`, `todo.md`.
