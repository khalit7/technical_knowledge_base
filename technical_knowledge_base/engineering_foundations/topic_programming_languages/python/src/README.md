# Source of "Python: the essentials"

The essentials page of the Python language (page prefix `es`, storage key `pyes-tab`), section 1 "Essentials" of the 2026-10-26 language split plan. Rebuilt 2026-10-26 after its four children were built from its old parts.

## Build
`python3 es/gen.py && sh build.sh` writes `../index.html` from `parts/` (the skill template build: single-level tabs, Reading `t-read`, Further reading `t-more`).
- Generated, never edited by hand: `parts/20_read_a.html` (styles, nav, the idea, the hero) and `parts/20_read_b.html` (section 2), from `es/tpl/` by `es/gen.py` (trimmed from the data-model child's generator; markers `[[run:]]`, `[[runx:]]`, `[[predict:]]`, `[[drill:]]`, `[[out:]]`, `[[code:]]`), inlining `es/code/*.py` and `es/outputs/*`.
- Hand-written: `01_head.html`, `02_split.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `25_js_s3.js`, `99_js_tabs.js` (skill templates, the last with key `pyes-tab`; `21_js_rd_common.js` drives the section-nav highlight), `10_header.html`, `20_read_c.html` (traps, choosing), `20_read_e.html` (child cards), `20_read_z.html`, `30_js_sc_hero.js` (Fig. 1), `39_tab_more.html`.
- `es/gen.py` also embeds the hero run (`outputs/h1_hero.txt`) as JSON in `<script type="application/json" id="es-h1">` (marker `[[json:h1_hero]]`), which Fig. 1 parses.
- Checks: `node src/check_stages.mjs [shots dir]` (`ALL=1` also shoots every step at 1400 px).
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

## 2026-11-07: split layout, a 3D hero (renderer v2), the children's figures linked (layout rollout)
Method: `.claude/skills/explainer-page/orchestration/briefs/rebuild-page.md` with `layout-rollout.md`, after the four children were rebuilt in the same rollout. Copied unchanged from the templates: `build.sh` (it now includes `parts/02_split.html`), `parts/02_split.html`, `parts/25_js_s3.js` (renderer v2), `parts/21_js_rd_common.js`, `parts/05z_errbox.js.html`, `parts/99_js_tabs.js` (key `pyes-tab`). `01_head.html` kept (it carries the `kb-look` block).

**Sections** (Reading tab; Further reading unchanged):
| Section | Layout | Visual | Step list |
|---|---|---|---|
| The idea in one screen (`s0`) | split | 3D stage `stg-hero` (Fig. 1, new, `parts/30_js_sc_hero.js`) | yes, `sx-hero`, 7 steps |
| You need, new terms | full width | none | no |
| 1 Five things the runs showed (`s1`) | full width | table | no |
| 2 Names, objects and references (`s2`) | split | 2D static, Fig. 2 (the old hero: three lines, three frames) in `.s3side`, with its real run | no |
| 3 Traps, 4 Choosing, 5 Child pages | full width | tables and cards | no |

- **Fig. 1** follows one program (the three lines of Fig. 2 as `app.py`) from install to run: `pyproject.toml` and `uv.lock` resolving into `.venv`; `app.py` under the type checker's glass plate, with the hints stopping there; the bytecode as a glass plate of its 15 real instructions (from the hero's `dis` listing) with `STORE_NAME`, `LOAD_ATTR` and `BINARY_OP` marked as the cursor passes, flowing into the C evaluation loop; the namespace plate (x, y, z) streaming to the list objects, the reference count going 1 to 2 at `y = x` and the new list's 1 (the hero run's `sys.getrefcount`), the type object `list` answering `append` and `__add__` (the hero run's method reprs); three threads in front with the GIL token hopping between them. The step list's steps 3 to 7 are the old "five facts" cards, reordered along the journey (the old fact 5, "types are for tools, speed is for measurement", split into steps 3 and 4; fact 3, laziness and functions as objects, folded into step 6). Each step names its owner and links that child's own stage (`#stg-uv`, toolchain `#stg-hero`, `#stg-eval`, `#stg-obj`, `#stg-rc`, data model `#stg-hero` and `#stg-look`, concurrency `#stg-hero` and `#stg-loop`); nothing of a child's mechanism is redrawn (no stack values, no MRO, no event-loop trace, no lock files' contents).
- **Fig. 2** (the old hero) moved to section 2, beside the text it illustrates; the cut "five facts" cards live on as Fig. 1's steps.
- **Traps table**: the "Fact" column became "Step" (the stop of Fig. 1 where each trap starts); "the event-loop stepper" became the concurrency child's Fig. 3.
- **Child cards**: "Child page, about N min, plus M in closed details." from each child's header on 2026-11-07 (data model 29 + 21, concurrency 21 + 10, internals 24 + 6, toolchain 22 + 15), each naming the child's 3D figures. The internals card no longer quotes a Version explorer time (its header does not state one).
- **Kept 2D, and why**: Fig. 2 is three before/after frames of names and objects with code under each; a flat drawing reads them at once, and Fig. 1 steps 5 and 6 already put the same three lines in 3D. The tables stay text. No other stage: each mechanism with spatial structure has its stage on the child that owns it.

**Length.** Reading 10.3 core + 1.5 closed before (2,359 and 339 words), 12.4 + 1.5 after (2,849 and 339; 230 words a minute, `html_utils/audit_pages.mjs`). The two minutes added are Fig. 1's step list (about 560 words), the map of which child owns each stop with links to its figures; the five-facts cards it replaces were about 280 words. Header: 12 min, plus 1. Further reading 1.1, unchanged. Right for a page that is a map plus one concept.

**Ledger**: 624 units: core 41, depth 1, owned 531, fat 51; `ledger.py check` problems 0. The children's rebuild had broken 16 keys; 15 owned keys were re-pointed to the owner's current wording (for example "every step is a stretch of the lines g2_order.py printed, in order", "30 bits in each 4-byte digit", "one time.sleep in b held the thread for 200 ms", "pick a real file from pypi (fetched 2026-10-05)"), and unit 10006 (child cards) now keys on "Child page, about". No unit had to come back here. Added 10007 (Fig. 1), 10008 (uv sync is exact, step 2), 10009 (the traps' Step column), 10010 (the cards' 3D figures). Units 19 and 20 (the lost-update counts, 3 of 5 runs and 24k to 36k, and "A lock fixed both") stay core here: the concurrency child shows those numbers only in a script-drawn table.

**Checks (2026-11-07)**: `sh html_utils/checkpage.sh`: tabs 2, emdash 0, errbox 1, clipped 0, fail=0; `node src/check_stages.mjs` (copied from the C++ essentials page: the stage at 1400 light, 920 light and 390 dark plays once in view, reaches its last step, has one list item per step, stops redrawing off screen, never moves under reduced motion; splits are two columns at 1400; the step list's reference counts and instruction names equal the embedded run): 0 problems.
