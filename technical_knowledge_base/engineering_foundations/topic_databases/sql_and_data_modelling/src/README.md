# Source of SQL and data modelling

Child of Topic: databases. `sh build.sh` writes `../index.html`. The page reuses the root's in-page engine (`../../src/parts/31_js_sql_a_engine.js`, sql.js 1.14.2 with its WebAssembly inlined) and the root's chat dataset (`../../src/sql/data.json`), adding one column, `messages.parent_id`.

Shape (rebuilt 2026-10-24 to the teaching contract, below): Reading (the idea in one screen, 12 numbered sections and a closed review checklist, 38 runnable boxes, 15 inline visuals), Exercises lab, ALTER TABLE measured, Further reading. Follows `.claude/skills/explainer-page/page-kinds/topic-child.md`; departs in that many concrete examples are live queries, because the subject is a language.

## Files
- `parts/`: page parts; `31_js_run.js` is a copy of the root's loader and runner with a fix (write statements starting with a comment reported 0 changed rows); `32_js_data.js` is generated.
- `examples.py`: every Reading example (SQLite text, Postgres text where different). `ex/exercises.py`, `ex/check.py`: the lab.
- `pg/`: PostgreSQL 16.2 measurements (pgserver wheel): `run_examples.py`, `measure_alter.py`, `measure_queue.py`, `measure_keys.py`, `measure_n1.py` (+ `delay_proxy.py`), `alembic_demo.py`; helpers in `pgc.py`. Outputs in `inputs/`.
- `parts/22_js_vis.js`: small drawing helpers (`window.SV`: word wrap for SVG, mini schema diagrams). New figure parts 47 to 55 (below).
- `check_noautoplay.mjs`: scrolls every animation into view, presses its mode buttons and confirms no step slider moves.
- `gen_js.py` builds the data part; `recompute.py` checks 54 claims independently and writes `recompute_out.json`; `check_page.mjs` clicks every control at 390 dark and 920 light, grades all 28 solutions in the page and compares the page's JavaScript with recompute; `shot_cards.mjs` screenshots each visual.

## Reproduce (from a scratch directory; never `uv run` inside the repo without --no-project)
```
UV="uv run --no-project --python 3.12 --with pgserver --with psycopg[binary] --with sqlalchemy>=2"
$UV python <src>/pg/measure_alter.py      # builds the 2M-row table (database bench), about 3 min
$UV python <src>/pg/measure_queue.py      # needs bench
$UV python <src>/pg/run_examples.py
$UV --with alembic python <src>/pg/alembic_demo.py
$UV python <src>/pg/measure_n1.py
$UV python <src>/pg/measure_keys.py       # about 15 min (10M rows x 3 key types)
python3 ex/check.py && python3 gen_js.py && sh build.sh && python3 recompute.py && node check_page.mjs
```
Data directory: `SQLM_DATA` (default `./sqlm_pgdata`), several GB, outside the repo.

## The 2026-10-24 rebuild: what changed and why
Rebuilt to `.claude/skills/explainer-page/teaching/teaching-contract.md` (editing and new static figures only; no new measurements).
- **Top**: the core idea in one sentence, the schema as the hero figure (annotated with which section works on which table), "You need" (root, planning, transactions, storage, analytics), new terms. The "what each section gives you" cards and "three ideas to keep" box were deleted as restatements.
- **New inline visuals, chosen by the kind of concept**: evaluation order with what each step may refer to (static, `47_js_pipe.js`); three-valued logic truth tables (static HTML); the join explorer now draws the grid of pairs with TRUE, false and unknown cells and what each join keeps (`35_js_join.js`), the "draw joins, not Venn diagrams" picture; fan-out on user 1's real 5 chats and 65 messages (`48_js_fan.js`); GROUP BY against a window on chat 11's 16 rows (before/after, `49_js_grp.js`); WITH RECURSIVE as a stepper over chat 11's real thread (`50_js_rec.js`); read-then-write against ON CONFLICT on two requests (before/after, illustrative timing, `51_js_ups.js`); eight modelling shapes as mini schemas (many-to-many, three tree layouts, time series with range partitions, soft delete, JSON column, many tenants; `52_js_shape.js`); bad writes and the constraint and Postgres error that refuses each (`53_js_con.js`); expand and contract as a stepper (`54_js_ec.js`); where checks on ORM or LLM SQL sit (`55_js_chk.js`).
- **New content the ownership asked for**: modelling common shapes (trees by adjacency list, materialised path or closure table; time series with declarative partitioning), and a section on checking SQL that an ORM or LLM writes (the N+1 and injection material moved into it, plus the review and boundary checks).
- **Removed**: the illustrative B-tree page-split animation (`38_js_btree.js`), because Storage engines and indexes owns that mechanism (its section 5 and B-tree and LSM lab); this page keeps the measured key-type bars and the key choice. `check_page.mjs` no longer compares the B-tree model (recompute.py still checks it; harmless).
- **Runnable boxes**: when Python's SQLite and Postgres agree offline, the Postgres result is folded into a closed block, so a box shows one result instead of two; where they disagree both stay side by side (`33_js_rq.js`). Secondary boxes (ROLLUP, set operations, MERGE, time zones, enums, lookups, naming, extra joins and windows, RLS) moved into closed blocks.
- **Moved to closed blocks**: ROLLUP and AVG types, extra examples, time zone examples, enums and lookup tables, naming, tenancy patterns and pools, normal-form history and 4NF/5NF, the key measurement's explanation, Alembic's real output, the dated migration tools table, the ORM's benefits, the review checklist (the old section 14, one line per mistake with its section).
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `sqlm-tab`); mode buttons no longer start animations; `check_noautoplay.mjs` passes.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `audit_pages.mjs`) | 61.4 min | 42.3 min |
| Reading, closed details | 4.6 min | 23.8 min |
| Other tabs, core | Exercises 1.0, ALTER 4.6, Further reading 3.9 | unchanged |
| Visuals drawn in Reading at load | 4 | 13 (svg counted by the audit; the 3VL tables, constraint refusals and bars are HTML) |

Why about 42 minutes is right: the page owns a whole language plus schema design and migrations (twelve concepts in the ownership list), and the ledger shows the remaining core is needed for one of them; about a fifth of the core words are visual captions and the visible results of the runnable boxes, which are the concrete examples. What made the old page long (duplicate engine results, secondary examples, dated tool versions, restated mistakes, history) is now closed or deleted.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
523 units: core 404, depth 73, fat 43, owned 3 (the B-tree page-split animation, now owned by Storage engines and indexes). 518 drafted by `ledger.py init`; keys were picked as the longest unique word sequence of each unit still on the page and reviewed by hand for the 73 that had none; 5 units added by hand for script-drawn visuals. Fat units carry a `note`.

## Tabs kept and why
Exercises lab (a tool used across the whole page) and ALTER TABLE, measured (a 21-row dataset with a row-count slider, referenced from sections 7 and 11) stay as tabs; neither explains one mechanism.

## The 2026-11-06 pass: split layout, six 3D stages (renderer v2), explained and autoplaying animations
- **Templates**: `02_split.html` (in `build.sh` after `01_head.html`), `21_js_rd_common.js`, `99_js_tabs.js` (key `sqlm-tab`) and `05z_errbox.js.html` from the skill; the renderer `25_js_s3.js` copied unchanged as `56_js_s3.js` (after the data and 2D figures, before the scenes 57 to 62). `RD.t` now defaults to 12 px; the lock queue's 9.5 px labels became 11 px.
- **Six 3D stages**, every number from the page's data (`SM_DATA`, the root's chat data) and checked in `check_stages.mjs` (via `window.CHK`) and `recompute.py`:
  - Fig. 1 (`57_js_sc_hero.js`, 5 steps, new hero): `SELECT u.plan, COUNT(*) ... WHERE c.model = 'mini' GROUP BY u.plan`: 50 users by 200 chats as 10,000 cells of a glass plate, the 200 true pairs, 90 kept, folded into free 47, pro 37, team 6; then a chat for user 7 passes the foreign key and one for user 999 is refused. The 2D schema figure stays beside "You need" and the terms.
  - Fig. 2 (`58_js_sc_join.js`, 9 steps): the join grid of pairs (illustrative five users and three markets) for CROSS, INNER, LEFT, RIGHT, FULL, semi, anti, NOT IN and NOT IN with a NULL market; the SQL and the result table on the left follow the step. Replaces `35_js_join.js` and its eight mode buttons and checkbox; the old bullet list became the step list.
  - Fig. 3 (`59_js_sc_grp.js`, 5 steps): chat 11's 16 rows at one scale, split by role, folded into two stacks (477 and 3,826 tokens), kept with the partition total, then the running total. Replaces `49_js_grp.js`.
  - Fig. 4 (`60_js_sc_win.js`, 7 steps): the frame as a glass box over the 16 rows, one step per function (SUM, AVG of 3, LAG, RANK, LAST_VALUE twice), the current row sweeping across during its step. Replaces `37_js_win.js` (16 frames, six mode buttons; the long-replay rule). Exposes `RD_WIN` as before.
  - Fig. 5 (`61_js_sc_norm.js`, 7 steps): user 7's 59 message rows with her name as a cap on each; the correct rename (59), the buggy one (5), two answers, then the caps lifted into one users row; the rename writes 1; the 6 users with no chat. Replaces `42_js_norm.js` (two modes of five steps). Exposes `RD_NORM`.
  - Fig. 6 (`62_js_sc_ec.js`, 7 steps): chats.title and chats.name as two columns of cells, the running code versions in front, reads and writes as flows, the backfill in batches. Schematic. Replaces `54_js_ec.js`.
- **2D animations, now explained stretches with step lists** (`RD.anim` with `list`): the recursion stepper (17 frames became 5 stretches, the third replaying iterations 2 to 14) and the lock queue (46 frames became 4, 5 and 3 stretches per run, each replaying its part of the measured timeline; the mode buttons swap the lists). Their generated captions were deleted; the counters stay.
- **Split layout** (Reading): the top twice (hero; schema beside You need and terms); 1 twice (evaluation order, three-valued logic); 2 twice (Fig. 2, fan-out); 3, 4 (stages); 5 (recursion); 6 (upsert race); 7 (key bars beside the key choice); 8 (shapes beside the list of shapes); 9 (Fig. 5); 10 (constraint refusals beside the list of constraints); 11 three times (lock queue, Fig. 6; the ALTER stats stay full width); 12 three times (N+1, injection, checks). Full width: the runnable boxes, the normal-forms table, callouts and closed blocks. Exercises lab and ALTER TABLE, measured stay full width (a grading card and a wide table); Further reading unchanged.
- **Kept 2D, and why**: see `viz_ideas.md` (tables, timelines, bars on an axis, mini schemas and SQL read best flat).
- **Checks**: `check_noautoplay.mjs` deleted (the rule is inverted); `check_stages.mjs` (from Query planning and performance) checks autoplay on view, last step, one list item per step, reduced motion, no redraw off screen, two columns at 1400 px, and the scenes' and lists' numbers. `check_page.mjs` unchanged and passing. `recompute.py` gained 6 checks for the scenes (60 of 60).
- **No real images**: a language and modelling page; nothing physical to show.

## Length judgement, 2026-11-06
| | Before (audit 2026-11-06) | After |
|---|---|---|
| Reading core | 9,742 words, 42.4 min | 11,127 words, 48.4 min (header 48) |
| Reading in closed blocks | 5,482 words, 23.8 min | 5,482 words, 23.8 min |
| Exercises lab, ALTER TABLE, Further reading | 1.0, 4.7, 3.9 min | unchanged |
| Visuals inline in Reading (audit count) | 13 | 14 (six stages replace four 2D visuals; the hero added) |

The core grew by six minutes, all of it step lists: five lists carry what the old generated captions and mode-button captions said (now static, so the audit counts them), and the hero's five steps and the lock queue's twelve stretches are new explanation. Nothing was cut; the per-step captions that the lists now carry were deleted rather than kept twice.

## Ledger, 2026-11-06
523 units: core 396, depth 73, fat 51, owned 3; `python3 html_utils/ledger.py check` problems 0. 17 keys re-pointed to the step lists that now carry their sentences; 4 units became fat (the join and window mode buttons, the normalisation buttons and legend, and "computed from the real rows", restated by Fig. 4's first step).
