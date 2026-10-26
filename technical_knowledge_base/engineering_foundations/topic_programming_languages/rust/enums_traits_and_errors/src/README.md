# Source of "Rust: enums, traits, errors and iterators"

Child page 1 of Rust: the essentials (page prefix `ra`, storage key `rust-enums-tab`), section 3 child 1 of the language split plan. Built 2026-10-26 by splitting sections 7 to 12 and 14 of Part 1 ("For Python programmers") and nine of the twelve items of its Python to Rust drill tab out of the Rust language page; no new measurements were run.

## Build
`python3 ra/gen.py` expands `ra/tpl/` into `parts/20_read_a.html` to `parts/20_read_z.html` (the Reading tab) and `parts/34_js_ra_data.js`, inlining the real code and recorded outputs (see `ra/README.md` for the directives). Then `sh build.sh` writes `../index.html` (the skill template build: single-level tabs, Reading `t-read`, Further reading `t-more`).
Hand-written parts: `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` (skill templates; title and storage key set), `10_header.html` (title, subtitle, tab bar, the Reading tab's CSS), `35_js_ra_util.js` (copied unchanged from the language page: highlighting and output blocks), `36_js_ra_read.js` (hero, slice slider, states toggle, `?` stepper, benchmark bars, prompt clicks), `39_tab_more.html`.
Checks: `node ra/check.mjs` (below), `sh html_utils/checkpage.sh <page>`, `python3 html_utils/ledger.py check <page>`.

## Provenance (copied with `cp -R` from the language page's `src/`, which was left unchanged)
| Here | From the language page | What |
|---|---|---|
| `ra/code/lang`, `ra/code/errs`, `ra/code/tokstat`, `ra/code/drill`, `ra/out`, `ra/versions.txt` | `src/ra/` | unchanged, trimmed to the files this page shows (the borrow-checker scenarios, clippy project, unsafe example, ownership animation and the sections the essentials keep were removed from the copy; drill items d02, d03, d12 too) |
| `ra/lib.sh`, `ra/run_all.sh` | `src/ra/` | the path to the root's `chat.jsonl` (`$HERE/../../../src/rosetta/data`) now walks up to `topic_programming_languages`; scratch folder renamed `pl/ra_enums` so it cannot collide with the language page's |
| `ra/steps/20_lang.sh`, `40_drill.sh`, `30_timing.sh` | `src/ra/steps/` | 20 keeps only this page's examples; 40 keeps only the drill loop; 30 unchanged; 10 and the borrow-checker loop dropped |
| `ra/content.py` | `src/ra/content.py` | the DRILL notes for nine items, unchanged; the borrow-checker lab text dropped |
| `ra/gen.py` | `src/ra/gen.py` | new `[[drill:ID]]` directive (static prompt, recorded results in a closed block); data reduced to the benchmark, `errors.rs` and the strings run |
| `ra/check.mjs` | `src/ra/check.mjs` | rewritten for one Reading tab; finds the repository with `git rev-parse --show-toplevel` |
| `ra/tpl/20_read_a.html` to `20_read_d.html` | `src/ra/tpl/30_tab_ra_read_b.html` (section 7), `_c.html` (8 to 11), `_d.html` (12 and 14), `33_tab_ra_drill.html` | rewritten to the teaching contract (below) |
| `35_js_ra_util.js` | `src/parts/35_js_ra_util.js` | unchanged |
| `36_js_ra_read.js` | `src/parts/36_js_ra_read.js` (benchmark bars) and `39_js_ra_drill.js` (prompt reveal) | rewritten; hero, slider, toggle and stepper are new |

## Shape and departures from the topic-child shape
- Core idea, hero (four mistakes: where Rust and Python each find them), "You need" (Rust: the essentials; the lifetimes sibling for what this page only mentions), new terms, an "In one screen" table from Python to Rust, then seven sections in the order the old Part 1 taught them (strings first, because every later example uses `&str`).
- A visual beside each core idea: the slice slider (section 1), the 32-against-4 before/after (section 2), the `?` stepper (section 3), generic against trait object boxes (section 4), the measured bars (section 5), the crate tree (section 7). Section 6 is carried by its table and the recorded runs with three different orders.
- No lab tabs. The Python to Rust drill tab became nine inline prediction prompts, each beside the section it teaches; the recorded results sit in a closed block that opens when you pick. Items d02, d03 and d12 (moves, floor division, `2 ** 64`) teach the essentials' sections and stay there.
- On familiar ground the page skips to what is different: the iterator section leads with the cost measurement and keeps laziness to one recorded prompt; Python's own `assert_never`, `Protocol` and dunder methods are linked to the Python children rather than explained.
- Secondary code and full compiler errors moved into closed blocks, each replaced in the core by the sentence that says what it shows (the E0277 for `s[0]`, the whole `errors.rs`, the `?`-in-`main` error, `mono.rs`, the E0369 and E0277 trait errors, the benchmark code and raw recordings, the two test files).
- Owners linked instead of re-taught: what to test (Testing and quality), error handling design as a craft (Code design), Python's typing side (Python: typing, uv, packaging and the toolchain), Python's data model (Python: the data model and protocols), lifetimes, `Box`, threads and `move` closures on threads (the lifetimes sibling), errors as exceptions (the PyO3 sibling), `anyhow` in a CLI and service (the async sibling), modules and the tokstat layout (Rust: the essentials).

## Length judgement
| | Language page, the same sections (2026-10-26, 230 words a minute) | This page |
|---|---|---|
| Core | sections 7 to 12 and 14: 5,918 words, about 26 min, plus the drill tab (one item shown at a time) | 7,639 words, 33 min |
| Closed details | about 0.8 min | 13 min (full compiler errors, the whole `errors.rs`, `mono.rs`, the benchmark code and raw recordings, the test files, every prompt's recorded results) |
| Visuals inline | 1 (the bars) | 7 (hero, slider, toggle, stepper, boxes, bars, tree) plus 9 prediction prompts |
The plan estimated 22 min. About 3,000 of the core words (13 min at reading speed) are Rust code and recorded output, which are scanned rather than read; the prose is about 4,200 words (18 min). The page is longer than the old sections because it now carries what they lacked under the teaching contract (core idea, hero, terms, a one-screen map, a visual and caption for every core idea) and the nine prompts that were a separate tab, each with its Python and three candidates in the core. Every section is new ground for a Python programmer (byte-indexed text, sum types with exhaustive matching, errors as values, monomorphisation and vtables, zero-cost closures, the collection behaviours that differ), so cutting further would mean dropping recorded evidence or a prompt; the fat removed was the old navigation, the drill tab's instructions and the "Previous, Next" chrome.

## Ledgers
- `ledger.json`: this page, 262 units (core 207, depth 52, fat 3: the reading-time line, the section bar, a prompt lead-in), `python3 html_utils/ledger.py check` problems 0.
- `from_master.json`: the 148 units of the Rust language page's master ledger in sections 7 to 12 and 14 of `t-ra-read` and in `t-ra-drill`: 147 owned here, 1 fat (the drill tab's "Previous, Next" navigation line). The drill items themselves are rendered by script on the language page, so they have no master units.

## Checks
`sh html_utils/checkpage.sh <page>`: fail=0, emdash 0, errbox 1, clipped 0. `node src/ra/check.mjs`: 140 interactions at each size, nothing changes without input, 59 embedded outputs match their files, data and stepper match, 9 of 9 prompts have exactly one right answer. The Rust programs were not rerun (no toolchain on this machine at build time); `ra/run_all.sh` reruns them.
