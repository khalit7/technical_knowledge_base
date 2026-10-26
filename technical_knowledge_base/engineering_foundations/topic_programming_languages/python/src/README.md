# Source of "Python: the essentials"

The essentials page of the Python language (page prefix `es`, storage key `pyes-tab`), section 1 "Essentials" of the 2026-10-26 language split plan. Rebuilt 2026-10-26 after its four children were built from its old parts.

## Build
`python3 es/gen.py && sh build.sh` writes `../index.html` from `parts/` (the skill template build: single-level tabs, Reading `t-read`, Further reading `t-more`).
- Generated, never edited by hand: `parts/20_read_a.html` (styles, nav, the idea, the hero) and `parts/20_read_b.html` (section 2), from `es/tpl/` by `es/gen.py` (trimmed from the data-model child's generator; markers `[[run:]]`, `[[runx:]]`, `[[predict:]]`, `[[drill:]]`, `[[out:]]`, `[[code:]]`), inlining `es/code/*.py` and `es/outputs/*`.
- Hand-written: `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` (skill templates; `21_js_rd_common.js` only drives the section-nav highlight, nothing animates), `10_header.html`, `20_read_c.html` (traps, choosing), `20_read_e.html` (child cards), `20_read_z.html`, `39_tab_more.html`.
- Runs: `PY=python3.14 sh es/run_all.sh` (seconds). `n1_alias` and `n2_identity` are the language page's scripts (recorded 2026-10-05); `h1_hero.py` (new) and `q_drills.py` (the three "names" drills of the old Predict tab) were run on CPython 3.14.8, Apple M1 Pro, 2026-10-26 (`es/versions.txt`); the rerun of n1 and n2 matched the 2026-10-05 outputs byte for byte.
- `merge_ledger.py`: how `ledger.json` was made from the master ledger (below).

## What was removed
With plain `rm` on 2026-10-26: `src/pa/` (Part 1: code, outputs, templates, generator, checks), `src/pb/` (Part 2: runs, data, checks) and every old file in `src/parts/` (part bar, Start here, both parts' tabs and scripts). Each child holds a trimmed copy of what it uses (see its `src/README.md`). Kept: `old_pages/coverage_part1.json` and `coverage_part2.json`, the checks of the two old Notion pages (the concurrency child has trimmed copies). Outside this folder, `rust/src/rs/run_all.sh` still reads `python/src/pa/code/a2_trace.py` and `a3_fanout.py`; those scripts now live in `concurrency_asyncio_and_the_gil/src/pa/code/` (reported for the Rust page's agent; not edited here).

## Shape and departures
- Top: the core sentence, a static hero (three frames, one per line of `y = x; y.append(3); z = x + [4]`: names, the object with its type and reference count, the special method looked up on the type, with the bytecode instruction; the real run in a closed block), "You need" (only everyday Python), new terms.
- Section 1 merges the old Start here tab and Part 1's "In one screen": the five facts, each pointing at its child, and the five measured findings, each pointing at the child section that measures it.
- Section 2 is the old Part 1 section 1 core only: names, aliasing, `is` against `==`, the mutable default, each with a prediction (three recorded drills and `n2_identity`). Copies, argument passing and `+=` are on the data-model child.
- Sections 3 and 4: the old traps table (now with a "fact" column and the child page and section that shows each trap; two toolchain traps added) and the old Part 2 "Choosing" table (now with a "Go deeper" column and a toolchain row).
- No lab tabs and no Predict tab: the old drills sit inline on the child that teaches each. Removed as quiz material: the old self-check (teaching contract: no quizzes).
- The page is a map plus one concept (names and objects), like a topic root: it never re-teaches a child.

## Length judgement
Before (2026-10-26, the two-part page): Start here 2.4 min, Part 1 Reading 66 min, Part 2 Reading 43 min, plus 16 min across six lab and drill tabs. After: 10.3 min core Reading, 1.5 min in closed details, 1.1 min Further reading (`node html_utils/audit_pages.mjs`, 230 words a minute). The plan estimated about 9; the extra minute is the predictions' code, which stays in the core because predicting is how this section teaches. Everything else moved to the children (23, 17, 19 and 19 min core).

## Ledger
`ledger.json` is the master ledger drafted from the two-part page before the split (614 units), merged with the four children's `from_master.json` by `merge_ledger.py`, plus 6 new units for this page's new text: 620 units, owned 531 (by the four children, plus 1 by `topic_operating_systems/concurrency`), core 37 and depth 1 here, fat 51 (24 labelled fat by the children: navs, part intros, pointers; 27 here: the old part bar, Start here routes, pointers to removed tabs, the self-check). `python3 html_utils/ledger.py check` reports problems 0. Unit 361 (3.15's UTF-8 default, `encoding=`) was claimed by both the internals and the toolchain children; both name the internals child as owner, kept.

## Duplicates resolved
The "Integer caching" drill (and Float arithmetic, the two async drills and the three names drills) were still in the data-model child's `q_drills.py` and `q_drills.json` though that page does not show them; trimmed there so each drill lives on one page (internals, concurrency, this page). That child was rebuilt (byte-identical page) and rechecked.

## Checks
`sh html_utils/checkpage.sh <page>`: fail=0, emdash 0, errbox 1, clipped 0. `python3 html_utils/ledger.py check <page>`: problems 0. Every Notion id linked is in `pages.json`.
