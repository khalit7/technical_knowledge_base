# Source of "Rust: speeding up Python with PyO3 and maturin"

Child page 3 of Rust: the essentials (page prefix `rb`, storage key `pyo3-tab`), section 3 child 3 of the language split plan. Built 2026-10-26 by splitting Part 2 ("Speeding up Python") out of the Rust language page; no new measurements were run.

## Build
`python3 rb/gen.py` expands `rb/tpl/` into `parts/20_read_a.html` to `parts/20_read_h.html` (the Reading tab) and `parts/40_js_rb_0data.js` to `parts/44_js_rb_cross.js`, inlining the real code (`[[rs:ANCHOR]]` regions of `rb/ext/src/lib.rs`, `[[file:...]]`) and recorded outputs (`[[out:...]]`, `[[predict:...]]`), and `window.RB` (every JSON result plus the root's benchmark numbers). Then `sh build.sh` writes `../index.html` (the skill template build: single-level tabs, Reading `t-read`, Further reading `t-more`).
Hand-written parts: `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` (skill templates; title and storage key set), `10_header.html`, `39_tab_more.html`.
Checks: `node rb/check_ui.mjs` (every control at 390 px dark with reduced motion and 920 px light; nothing autoplays), `python3 rb/check_outputs.py` (the page embeds exactly the recorded outputs and data). `rb/run_all.sh` reruns every measurement (about 10 minutes; needs the toolchains named in its header).

## Provenance (copied with `cp -R` from the language page's `src/`, which was left unchanged)
| Here | From the language page | What |
|---|---|---|
| `rb/code`, `rb/ext`, `rb/outputs`, `rb/versions.txt`, `rb/coverage.json` | `src/rb/` | unchanged, except `ext/tests/test_tokrs.py`, whose path to the root's `chat.jsonl` now walks up to `topic_programming_languages` |
| `rb/gen.py`, `rb/run_all.sh` | `src/rb/` | the root lookup (`ROOT = HERE.parents[2]` and `$HERE/../../..`) now walks up to `topic_programming_languages`; shared data stays in the root's `src/` (`bench/results`, `rosetta/data`), read-only |
| `rb/check_outputs.py` | `src/rb/` | unchanged (the depth to `index.html` is the same) |
| `rb/check_ui.mjs` | `src/rb/` | rewritten for one Reading tab; finds the repository with `git rev-parse --show-toplevel` |
| `rb/tpl/20_read_a.html` to `20_read_h.html` | `src/rb/tpl/40_tab_rb_read_a.html` to `_h.html`, `43_tab_rb_ladder.html`, `44_tab_rb_cross.html` | rewritten to the teaching contract (below) |
| `rb/tpl/40_js_*` to `44_js_*` | the same files | retargeted from the three Part 2 tabs to `t-read`; the hero replaces the section 1 phase chart; mode switches no longer play |
| `viz_ideas.md` | `src/rb/viz_ideas.md` | updated with what moved |
Recorded files that still say "Part 2" (`rb/ext/pyproject.toml`'s description, `rb/code/common.py`'s docstring) are left as recorded, because the page shows them as the real files.

## Shape and departures from the topic-child shape
- Core idea, hero (the token counter's phases for four steps on one scale: the loop moved, then the parsing, then threads), "You need" (the Rust essentials and its two language siblings, plus the three Python children that own profiling, the GIL and wheel tags), new terms, an "In one screen" table, then thirteen sections in the order a port happens.
- No lab tabs. The Crossing the boundary tab (one call, copy against view) is a stepper inline in section 4 beside the conversion table it explains; the Optimisation ladder tab is the step explorer of section 10, with each step's code in a closed block inside it. Both explained one mechanism, so the contract puts them beside the claim.
- Owners linked instead of re-taught: profiling and the cheap wins (Python internals), what the GIL and the free-threaded build are (Python concurrency), wheel and platform tags, `manylinux`, cibuildwheel and trusted publishing as concepts (Python toolchain), what to test (Testing and quality), floating-point reordering (Numerical computing). Kept here because they are what an extension must do: PyO3's `gil_used` declaration, the `Already borrowed` failure and the frozen-plus-Mutex fix, abi3 and abi3t from the extension's side (the feature flags, the real installs on five interpreters), and the maturin-generated CI workflow.
- The old "Common mistakes" section (eleven items) restated a section each; each mistake now sits in its section and in the In one screen table. The old "Who ships" table is a closed block in section 13 (dated build-file reads, not needed to understand).
- Predictions: every recorded script is "predict, then reveal"; the nine-call type-check script is in a closed block, with its four lessons in the core. Two "predict before you step" prompts were added to the step widgets.
- Correction: the language page said a clean build took "about 16 s"; the recorded output (`outputs/b1_develop.txt`) shows 9.25 s to compile and 10.32 s real, so this page says about 10 s.

## Length judgement
| | Language page, Part 2 (audit 2026-10-26) | This page |
|---|---|---|
| Core reading (230 words a minute, `html_utils/audit_pages.mjs`) | Reading 43.5 min (plus 0.9 closed), Optimisation ladder tab 3.6, Crossing tab 1.1: 48.2 min | Reading 33.8 min |
| Closed details | 0.9 min | 12.6 min (configuration files, compile error, failure modes, checker outputs, generated stubs, tests, CI workflow, abi3 costs, who ships) |
| Visuals inline in the Reading | 3 (phase bars, GIL timeline, alternatives) | 5 (hero, crossing stepper, GIL timeline, ladder explorer, alternatives), 31 controls |
The plan estimated 25 min. The core counts about 1,700 words (7.5 min) of Rust code and recorded output that are scanned rather than read, plus the hidden reveal answers; the core prose alone is about 26 minutes. Every section is new ground for an ML engineer who knows Python well (PyO3's types and macros, crossing costs, the GIL from the extension side, free-threaded safety, stable ABIs), and each carries a measurement no other page holds, so cutting further would mean dropping measured results; on familiar ground (profiling, what the GIL is, wheel tags) the page links the owners instead.

## Ledgers
- `ledger.json`: this page, 216 units (core 191, depth 24, fat 1, the reading-time line), `python3 html_utils/ledger.py check` problems 0.
- `from_master.json`: the 248 units of the Rust language page's master ledger in the old Part 2 tabs (`t-rb-read`, `t-rb-ladder`, `t-rb-cross`): 230 owned here, 1 owned by Python: CPython internals and performance (the profiling order, key `py-spy`), 1 owned by Python: typing, uv, packaging and the toolchain (the manylinux platform tag, key `glibc 2.28 or newer`), 16 fat (navigation, the part lead, "Decide before you click" prompts, pointers to the removed lab tabs, the chart-legend sentence, "Read it as a story", the old Further reading's on-page lab list).

## Checks
`sh html_utils/checkpage.sh <page>`: fail=0, emdash 0, errbox 1, clipped 0. `node src/rb/check_ui.mjs`: all controls ok, nothing autoplays. `python3 src/rb/check_outputs.py`: 21 output blocks and all data ok. The pytest suite in `rb/ext/tests/` needs the built extension and was not rerun here (its recorded runs are on the page).
