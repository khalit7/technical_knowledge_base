# Design space tab (t-design): sources, snippets and captured outputs

The tab is the topic's comparison core: 15 axes (rows) by Python, C++, Rust, JavaScript, TypeScript (columns; Python is the reference column), a founding-values strip quoted from primary sources, three views (by axis, by language, trace a value) and a False friends collection (30 pairs).

| Path | What |
|---|---|
| `content.py` | All prose: founding values with sources and dates, axes, the 75 cells (choice, buys, costs, founding value, why, snippets, llama.cpp excerpts), 30 false friends, trace notes, matrix tags |
| `code/<axis>/<lang>/` | Every snippet shown on the page (132 files). Comment lines starting `flags:`, `cmd:`, `check:`, `run:`, `edition:`, `pre:`, `post:` are runner directives, not shown; a file `x__lib.rs` is a helper copied next to `x` as `lib.rs` |
| `run_one.sh`, `run_all.sh` | Run one or every snippet in a scratch work dir and write `outputs/<axis>/<lang>/<name>.txt` (first lines are the commands as shown) and `versions.txt` |
| `outputs/`, `versions.txt` | The exact captures the page embeds |
| `llama/extract.py`, `llama/excerpts.json` | Short excerpts from llama.cpp / ggml at a pinned commit (shallow clone in the scratchpad `pl/llama.cpp`), with file and line ranges |
| `gen.py` | Writes `../parts/30_js_ds_data.js` (`window.DS_DATA`) |
| `check.py` | Confirms that `index.html` embeds exactly the code and outputs on disk and that the excerpts match the clone |
| `check/ds_check.mjs` | Puppeteer: clicks every control at 390 px dark and 920 px light (run from the repo root) |
| `sources/` | Text extracts of the founding-value sources (see `sources/README.md`) |

Reproduce: `bash run_all.sh && python3 gen.py && sh ../build.sh && python3 check.py`. The toolchains live in the session scratchpad (`pl/`); paths are at the top of `run_one.sh`.

Edits applied to captured output, all in `run_one.sh`: the temporary work-directory path and the scratch Python install path (shown as `<python>/`) are removed; Node's internal stack frames (`at ... node:...`) are dropped; the shell's "line N: PID Segmentation fault" prefix is shortened to "Segmentation fault: 11". Nothing else. Some outputs vary between runs by nature (data races, use-after-free, uninitialised reads, Rust thread ids, object addresses); the page shows the run on disk.

Notes:
- AddressSanitizer runs hang on this Mac (macOS 27, Apple clang 17), so the use-after-free and out-of-bounds cells show plain runs; Apple's /usr/bin/clang++ shim is clang 14 and lacks `<expected>`, so C++ uses the Command Line Tools clang 17 with the macOS 26 SDK.
- Departure from the methods: this tab is a matrix plus a collection, with no animation; the before/after here is the same task in five languages, with real output, which is what the Shrestha et al. findings argue for.
