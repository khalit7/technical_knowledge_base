# JavaScript and TypeScript page, Part 1 "JavaScript and its runtime" (part key `ja`)

JavaScript from zero for a Python programmer, so that TypeScript (Part 2, `tb`) is types on top. Tabs (part bar "1 JavaScript and its runtime"): **Reading** (`t-ja-read`, sections `#ja-s0` to `#ja-s17`, about 50 minutes with the examples), **Event-loop stepper** (`t-ja-loop`), **JS playground** (`t-ja-play`). Further reading is the last Reading section (`#ja-s17`), so the part stays self-contained.

Section anchors other parts can link (tab `#t-ja-read`, then the section id): `ja-s2` values and types, `ja-s3` objects, `ja-s4` functions and `this`, `ja-s5` classes, `ja-s6` modules, `ja-s7` errors, `ja-s8` iteration, `ja-s9` event loop, `ja-s10` async toolbox, `ja-s11` async iterators and SSE streams, `ja-s12` Node essentials (fs, process, fetch, workers, the running program), `ja-s13` packages, `ja-s14` Bun and Deno, `ja-s15` V8, `ja-s16` traps.

## How it is built

- `code/`: every example on the page (`*.mjs`, `*.cjs`, `*.sh`, `f_mod/` for modules, `loop/` the stepper's six programs, `q/` the 22 drills). `run_all.sh` runs each with Node 24.21.0 and writes `outputs/` (text and JSON). Cleaning applied to outputs: paths to `code/` shortened to the file name, the scratch work folder shown as `<work>`, Node's internal stack frames (`at ... (node:...)`) dropped, a non-zero exit shown as `[exit code N]`, and for `n3_deopt` addresses and compile timings removed. Nothing else.
- `run_all.sh` also: runs each stepper program 20 times and records that the order never changed (`outputs/loop_det.txt`); reruns every deterministic example, stepper program and drill on Node 22.22.2 and Node 26.10.0 and lists any difference (`outputs/node_versions_diff.txt`: none); measures installs (npm, pnpm, bun), start-up (hyperfine) and memory (`/usr/bin/time -l`).
- `tpl/*.html`, `tpl/*.js`: the part sources. `gen.py` expands markers (`[[run:NAME]]`, `[[code:NAME]]`, `[[out:FILE|label]]`, `[[predict:NAME]]`, `[[json:KEY]]`) with the real code (coloured by a small regex tokenizer) and recorded outputs, and writes `../parts/30_tab_ja_read_*.html`, `31_tab_ja_loop.html`, `32_tab_ja_play.html`, `33..36_js_ja_*.js`. Never edit those parts by hand: edit `tpl/`, run `python3 gen.py`, then `sh ../build.sh`.
- `check_ui.mjs` (from the page folder: `node src/ja/check_ui.mjs`): at 390 px dark and 920 px light, steps every animation mode to its end, clicks every control, checks no errors, NaN or undefined outside code, no sideways scroll; checks that every embedded output equals its file in `outputs/` (50 boxes), that the stepper's printed lines equal the recorded Node output for all six programs, that the SSE replay's live parsers reproduce the recorded run, and runs all 22 drills live in headless Chrome and compares with Node's recorded output (all 22 identical); also checks that an infinite loop is stopped and a syntax error is shown.

Order: `sh run_all.sh && python3 gen.py && sh ../build.sh && node check_ui.mjs` (the last from the page folder).

## Toolchain (all in the session scratchpad `pl/`, never system-wide)

Node 24.21.0 and 26.10.0 (official darwin-arm64 tarballs in `pl/ja/`), Node 22.22.2 (nvm, already on the machine), Deno 2.9.7 (release zip), pnpm 12.9.1 (`npm i -g --prefix pl/ja/pnpm`), bun 1.4.2 and hyperfine 1.20.0 from `pl/bin`; npm's cache and config, pnpm's store, bun's and Deno's caches all point into `pl/ja/` (an empty npmrc replaces the user's). See `versions.txt` and `pl/ja.lock`. Machine: Apple M1 Pro, macOS 27.0.1, in normal use; load averages are printed by the timing scripts (35 to 39 during the first run of `run_all.sh`, about 4 for the start-up rerun shown on the page).

## Departures from the method

- Several agents build this one Notion page, so this part has no Further reading tab of its own (section 17 instead), its own section nav (`#ja-nav`) and its own render hooks (`TAB_RENDER['t-ja-*']`), because the shared `RD.onResize` and `#rd-nav` code assume a single `t-read` tab.
- The playground runs code live: in a Web Worker made from a Blob URL (stopped after 3 s), falling back to `new Function` on the page, and failing politely if the host blocks both. Whether Notion's sandboxed iframe allows workers or eval was not testable from here; the recorded Node output is always shown, so the drills still work if the live run is blocked.
- Size: this part is about 210 KB of the page, mostly real code and recorded outputs. Accepted, not cut.
- The stepper's intermediate steps (which queue holds what) are this page's explanation, not a trace: Node exposes no queue contents. Only the printed lines are checked against the real runs.
