# Source of "C++: the essentials"

The essentials page of the C++ language (prefix `es` for sections, `ca` for code and widgets, storage key `cpp-es-tab`), section 2 "Essentials" of the 2026-10-26 language split plan. Rebuilt 2026-10-26 after its four children were built from its old parts.

## Build
`python3 ca/gen.py && sh build.sh` writes `../index.html` from `parts/` (the skill template build: single-level tabs, Reading `t-read`, Further reading `t-more`).
- Generated, never edited by hand: `parts/20_read_a.html` to `20_read_e.html` and `parts/32_js_ca_data.js`, from `ca/tpl/`, `ca/code/` and `ca/out/` (see `ca/README.md`, which also lists the section and gallery anchors other pages can link).
- Hand-written: `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` (skill templates; title and storage key set), `10_header.html`, `33_js_ca_util.js`, `37_js_ca_build.js` (the stepper; it never plays by itself and a scenario switch resets to step 1), `38_js_ca_ub.js` (the gallery; static case buttons with ids, a URL anchor selects a case), `39_tab_more.html`.
- Runs: on 2026-10-26 only the hero was recorded (`ONLY=hero sh ca/run_all.sh`: Apple clang 17, CPython 3.14.8, M1 Pro). Everything else is the 2026-10-05 recording (LLVM clang 23, which the gallery and sanitizers need, was not present in this session).
- Checks: `node ca/check.mjs`, `sh html_utils/checkpage.sh <page>`, `python3 html_utils/ledger.py check <page>`.
- `merge_ledger.py`: how `ledger.json` was made from the master ledger (below).

## What was removed
With plain `rm` on 2026-10-26: `src/cb/` (Part 2, now `the_machine_underneath/src/cb/`) and `src/cl/` (Part 3, now `reading_llama_cpp/src/cl/`), whole; every old file in `src/parts/` (the part bar, Start here, the three parts' tabs and scripts, the two-level tab script); from `src/ca/`, the language examples and their outputs (`code/lang/` except `features.cpp`, the `l_*`, `lt_*` and `t_*` recordings, `steps/30_timing.sh`) and the old templates. The ownership and classes children hold trimmed copies of `ca/`. Nothing inside this language folder read the removed paths. Outside it, `systems_and_performance/topic_hardware/src/roof/README.md` (and a comment in its `roof/code/gen_data.py`) name `cpp/src/cb/out/roof_*.txt` as the source of the CPU roof numbers (copied into the script, not read at run time); the same files are now in `the_machine_underneath/src/cb/out/`. The root's `src/read/coverage.md` mentions `cpp/src/cb` in text. Both are reported for the lead.

## Shape and departures
- Top: the core sentence (the plan's), a static hero (one `std::vector<float>` as a 24-byte owner on the stack and a 12-byte heap buffer freed at the brace, beside Python's 88-byte list with its reference count and three float objects; numbers from the new run, which is in a closed block), "You need" (everyday Python), new terms.
- "Six ideas" merges the old Start here tab and Part 1's "In one screen": the Python to C++ table (each row now names the section here or the child that teaches it) and the six measured findings, each pointing at the child section that measures it.
- Section 1 is the old Part 1 section 1 with the Build pipeline tab inline as a stepper; the recorded commands and the step-by-step outputs are closed blocks. The Stage 0 gate's answer (GNU ld says "multiple definition") is now a sentence.
- Section 2 is the old section 12 with the UB gallery tab inline. The overflow drill became the predict-then-reveal; the Stage 3 gate's signed-counter answer is a sentence; sanitizer reports are closed blocks inside each case; the defences' flags and slowdowns are a closed block. The gallery opens on the double free (the overflow case is the worked example just above it).
- Section 3 is the old section 13; the five ways to get a dependency moved to a closed table.
- Section 4 keeps the core rule (ask for a standard; the measured defaults) and puts the October 2026 status, the feature macros and the old page's corrections in a dated closed block, as the plan asks.
- Section 5 is the old section 15 as one table, each mistake pointing at the gallery case or the child section that shows it (use after move, `shared_ptr` by reflex and the rule of zero go to the ownership child); four explanations in a closed block; the hygiene checklist, with the rule of zero spelled out.
- Section 6: child cards with each child's core idea and measured header minutes. The best-resources list moved to Further reading.
- Fat: the part bar and Start here cards, the three routes, the learning path with its gates (quiz-like, plan: fat), pointers to removed tabs, the drill tab's chrome.

## Length judgement
Before (2026-10-26, the three-part page, 230 words a minute): Start here 3.2 min; Part 1 Reading 56 min plus 3.6 closed, its four tabs 10.6; Part 2 46.6 plus 5.5 in tabs; Part 3 60.9 plus 8.5 in tabs. After: Reading 17 min core, 9 in closed details; Further reading 1.5 (`node html_utils/audit_pages.mjs`). The plan estimated about 14. About 330 of the 3,950 core words are recorded code and output (the token counter, the overflow program and its UBSan report, `otool`), about 170 are the stepper's and the gallery's current state, and about 720 are the two map tables (six ideas, six findings) and the mistakes table; the prose alone is about 12 minutes. What remains is the ground every child assumes (the build, UB and its tools, libraries, which standard) plus the map; cutting further would mean dropping one of the two inline widgets, which are how this page teaches its two subjects.

## Ledger
`ledger.json` is the master ledger drafted from the three-part page before the split (994 units), merged with the four children's `from_master.json` by `merge_ledger.py`, plus 8 new units for this page's new text: 1002 units. Owned 746 (the machine child 285, llama.cpp child 256, ownership child 115, classes child 74, Local and on-device inference 5, Performance math 4, the hardware root 4, Virtual memory 2, Concurrency 1), core 133 and depth 31 here, fat 92 (49 labelled fat by the children: navigation, tab descriptions, drill questions whose answers they carry; 43 here, listed in `merge_ledger.py`). No unit was claimed by two children. `python3 html_utils/ledger.py check` reports problems 0.

## Duplicates
None found: the only recording present on two children (`l_sizes`) is shown on the ownership child only; no gallery case, drill or prediction appears on a child and here.

## Checks
`sh html_utils/checkpage.sh <page>`: fail=0, emdash 0, errbox 1, clipped 0. `node src/ca/check.mjs`: all checks passed (135 interactions per width, no autoplay, the case anchor works, 19 embedded outputs equal their files). Every Notion id linked is in `pages.json`.
