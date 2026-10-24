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
