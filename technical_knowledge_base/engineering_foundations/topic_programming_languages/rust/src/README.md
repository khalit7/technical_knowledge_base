# Source of "Rust: the essentials"

The essentials page of the Rust language (page prefix `ra`, storage key `rust-es-tab`), section 3 "Essentials" of the 2026-10-26 language split plan. Rebuilt 2026-10-26 after its four children were built from its old parts.

## Build
`python3 ra/gen.py && sh build.sh` writes `../index.html` from `parts/` (the skill template build: single-level tabs, Reading `t-read`, Further reading `t-more`).
- Generated, never edited by hand: `parts/20_read_a.html` to `20_read_d.html`, `20_read_z.html` and `parts/34_js_ra_data.js`, from `ra/tpl/`, `ra/code/`, `ra/out/` and `ra/content.py` (see `ra/README.md`; `ra/gen.py` is the enums child's generator, with its `[[drill:]]` directive, and this page's data).
- Hand-written: `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` (skill templates; title and storage key set), `10_header.html` (title, subtitle, tab bar, the Reading tab's CSS), `35_js_ra_util.js`, `36_js_ra_read.js` (borrow timeline, prediction prompts), `37_js_ra_own.js` (the hero), `38_js_ra_bc.js` (the lab), `39_tab_more.html`.
- Checks: `node ra/check.mjs`, `sh html_utils/checkpage.sh <page>`, `python3 html_utils/ledger.py check <page>`.
- `merge_ledger.py`: how `ledger.json` was made from the master ledger (below).
- Nothing was rerun for this page: every output is the 2026-10-05 recording (no Rust toolchain on this machine on 2026-10-26). `ra/run_all.sh` reruns them.

## What was removed
With plain `rm` on 2026-10-26: `src/rb/` (Part 2) and `src/rs/` (Part 3), whole; every old file in `src/parts/` (part bar, Start here, the three parts' tabs and scripts); from `src/ra/`, the code and outputs the children show (lifetimes, strings, enums, errors, traits, iterators, collections, testing, smart pointers, threads, unsafe and Miri, the iterator benchmark, nine drill items, the `ub` and `errs` crates, `steps/30_timing.sh`). The PyO3 child holds `rb/`, the async child `rs/`, the enums and lifetimes children their parts of `ra/` (each `src/README.md` says what). Nothing outside this language folder read the removed paths (checked with grep over the repository); the Python essentials README's note about `rust/src/rs/run_all.sh` is now moot (the async child already reads the Python concurrency child's scripts).

## Shape and departures
- Top: the core sentence; the hero is the old Ownership tab inline (one `Vec` borrowed, grown, moved, cloned and dropped at the addresses a run printed, with Python's model behind a toggle), with a prediction before stepping; "You need" (everyday Python only); new terms.
- Section 1 merges the old Start here tab and Part 1's "In one screen": the Python to Rust table (now pointing at sections here or the children) and the five measured findings, each with the child section that measures it.
- Sections 2 to 6 are the old Part 1 sections 1 to 5 and 13, with secondary compiler errors, the clippy listing, the dependency rules and the recorded numbers table in closed blocks, each replaced in the core by the sentence that says what it shows.
- Section 5 carries the borrow timeline and the Borrow-checker lab inline (the old lab tab). The lab's "Anatomy of a borrow error" merged into "How to read a borrow error".
- Three drill items stayed here as inline predictions, beside the section each teaches: d12 (`2 ** 64`) and d03 (floor division) in section 3, d02 (two names for one list) at the end of section 4. The other nine are on the enums child; no item is on two pages.
- Section 7 is the old "Common mistakes" as one table with the page and section that teaches each mechanism (the `Rc<RefCell>` and lifetimes-in-structs rows link the lifetimes child). Section 8 (C++) is a closed table. Section 9 the child cards with measured times and three routes.
- Fat: the part bar and cards, the staged path with its "gates" (quiz-like), pointers to removed tabs. The resources list moved to Further reading.
- Modes switch without playing: the hero and the timeline reset to step 1 on a toggle (the old page played on a toggle).

## Length judgement
Before (2026-10-26, the three-part page, 230 words a minute): Start here 2.9 min; Part 1 Reading 65 min plus 4.3 closed, Ownership tab 2.6, Borrow-checker tab 1.3, drill 1.1; Part 2 48 min; Part 3 46 min. After: Reading 26 min core, 11 in closed details; Further reading 1.6 (`node html_utils/audit_pages.mjs`). The plan estimated about 16. About 1,300 of the 6,000 core words are recorded code and output (the hero's code panel, the lab's current scenario, three predictions with three Rust candidates each), scanned rather than read, so the prose is about 20 minutes. The rest is ground that is new for a Python programmer and that every child assumes (cargo, fixed-width numbers, ownership, borrowing, reading a borrow error, modules); the findings table and the traps table are the map onto the children. Further cuts would mean dropping the predictions or the lab, which are how this page teaches.

## Ledger
`ledger.json` is the master ledger drafted from the three-part page before the split (991 units), merged with the four children's `from_master.json` by `merge_ledger.py`, plus 7 new units for this page's new text: 998 units. Owned 735 (enums child 147, lifetimes child 79, PyO3 child 230, async child 274 including unit 354 from the lifetimes child's claim, Python internals 1, Python toolchain 1, Python concurrency 1, the topic root 1, `topic_operating_systems/containers_and_isolation` 1), core 151 and depth 42 here, fat 70 (40 labelled fat by the children; 30 here: the part bar and cards, the staged path and gates, pointers to removed tabs, the lab's score line). No unit was claimed by two children. Unit 727's key from the async child (`( vec<pathbuf> takes one`) cannot match because `ledger.py` strips a `<...>` in a key as a tag; `merge_ledger.py` uses the shorter key "its type decides parsing", which is on that page. `python3 html_utils/ledger.py check` reports problems 0.

## Verified on 2026-10-26
The Python side of the enums child's hero (four mistakes plain Python catches only while running) was rerun on CPython 3.14.8: a `match` with no arm for `Role.TOOL` returns `None` and the program carries on; `config.get("max_output").strip()` raises `AttributeError: 'NoneType' object has no attribute 'strip'`; `int("8k")` raises `ValueError: invalid literal for int() with base 10: '8k'`; `total(Whitespace(), ["a b"])` raises `AttributeError: 'Whitespace' object has no attribute 'count'` only when called. All four claims hold; the child was not changed.

## Checks
`sh html_utils/checkpage.sh <page>`: fail=0, emdash 0, errbox 1, clipped 0. `node src/ra/check.mjs`: 160 interactions at each size, nothing changes without input, 34 embedded outputs match, data and lab match, 3 of 3 predictions have exactly one right answer. `python3 html_utils/ledger.py check <page>`: problems 0. Every Notion id linked is in `pages.json`.
