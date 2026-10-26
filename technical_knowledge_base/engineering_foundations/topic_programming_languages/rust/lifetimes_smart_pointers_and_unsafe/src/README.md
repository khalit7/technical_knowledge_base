# Source of "Rust: lifetimes, smart pointers, threads and unsafe"

Child page 2 of Rust: the essentials (page prefix `lsp`, storage key `lsp-tab`), section 3 child 2 of the language split plan. Built 2026-10-26 by splitting sections 6 (lifetimes, in depth), 15 (smart pointers), 16 (threads) and 17 (unsafe and Miri) out of the Rust page's Part 1.

## Build and checks
`python3 ra/gen.py` (writes `parts/20_read_a..e,z.html` from `ra/tpl/`, `ra/code/`, `ra/out/`), then `sh build.sh` (the skill template: single-level tabs, Reading `t-read`, Further reading `t-more`).
Hand-written parts: `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` (skill templates), `10_header.html`, `22_js_lsp.js` (the lifetime toggle and the Rc stepper), `39_tab_more.html`.
Checks: `sh html_utils/checkpage.sh <page>`; `node <page>/src/check_controls.mjs` (every control at 390 px dark with reduced motion and 920 px light; nothing moves before a click); `python3 html_utils/ledger.py check <page>`. gen.py itself fails if the Send and Sync table disagrees with the two recordings.

## Provenance
`ra/` was copied with `cp -R` from the Rust page's `src/ra` (left unchanged) and trimmed to these sections; `ra/README.md` lists what came from where. New on this page, recorded 2026-10-26 with the same rustc 1.99.0 on the same Apple M1 Pro: the `'static` bound pair, the elision rule 3 pair, and the Send and Sync programs (25 positive assertions that compile, 9 refusals). Miri was not rerun (no nightly toolchain here); its one recorded run is from 2026-10-05, and the README list of what Miri detects is quoted and marked not run here.

## Departures from the topic-child shape, and why
- No lab tab: each visual explains one claim and sits beside it. The Borrow-checker lab stays on the essentials page (its lifetime, thread and RefCell scenarios are linked).
- Section 6 "in depth": added the elision table with rule 3's surprise (a real error), `T: 'static` as a bound (the misconception, with a run), and a closed block on `'_`, `T: 'a` and variance (sourced, not run).
- Section 16's async paragraph is one sentence linking the async child, which owns it; the OS concurrency page owns races, atomics and memory order; the sanitizers stay on C++: the essentials.
- Most source listings and long compiler outputs are closed blocks; the errors and outputs that carry the argument stay in the core.

## Length judgement
| | Rust page, sections 6 and 15 to 17 (2026-10-26) | This page |
|---|---|---|
| Core reading (230 words a minute, `audit_pages.mjs`) | about 13 min (plan estimate) | 16 min |
| Closed details | (listings were inline) | 14 min |
The core grew by about three minutes because the page now owns Send and Sync and Miri and takes lifetimes in depth: the Send and Sync table, the `'static` bound and elision rule 3 are things a Python-fluent engineer meets in the first week of threaded or async Rust and does not already know. Familiar ground (what a race, a lock and an atomic are) is one sentence and a link.

## Ledger
`ledger.json`: 134 units (core 93, depth 40, fat 1: the header time line), `ledger.py check` problems 0.
`from_master.json`: the 81 master units of sections 6 and 15 to 17 (ids 137 to 151 and 307 to 372): 79 owned here, 1 by `rust/async_services_and_clis` (futures are lazy and the runtime is a library, id 354), 1 fat (the pointer to Part 3, id 355, now a link).
