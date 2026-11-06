# RAG in production: source

Child page of Topic: rag-and-retrieval. `sh build.sh` writes `../index.html` from `parts/`; numbers in the prose are written `@@key@@` and filled from `facts.json`, which `build_data.py` makes from `data/` (measured here) and `inputs/` (published prices, the constructed corpus), together with `parts/22_prd_data.js` (the data the page's JavaScript reads).

## Parts
- `01_head.html` (shared CSS, copied from the root), `02_split.html` (the split layout, skill template), `10_header.html` (title, subtitle with reading time, tabs), `20_read_a.html` (Reading styles, nav, the idea in one screen: core sentence, hero, You need, new terms; section 1) to `20_read_g.html` (section 13, the rehearsal block, the footnote) and `20_read_z.html` (closes the tab).
- Reading JS: `24_prd_rd.js` (predict widgets, freshness calculator and its lag bar, backfill animation, purge table, stage-timing table, similarity histogram, drift and power charts, the section 9 cost bar), `26_js_s3.js` (the 3D renderer v2, skill template, unchanged), the scenes `27a_sc_hero.js` (Fig. 1), `27b_sc_fresh.js` (Fig. 2), `27c_sc_acl.js` (Fig. 3, with its question, generator and claim controls and the answer readout), `27d_sc_rls.js` (Fig. 4), `31_prd_lat.js` (latency waterfall and TTFT chart, section 7), `33_prd_acl.js` (leak tables, RLS matrix and plans, planted-instruction tables, sections 5 and 11), `34_prd_cache.js` (semantic-cache replay, section 8).
- Tabs: `32_tab_cost.html` + `32_prd_cost.js` (Cost calculator), `39_tab_more.html` (Further reading).
- `05z_errbox.js.html`, `21_js_rd_common.js` and `99_js_tabs.js` are the explainer-page skill templates (storage key `prd-tab`; animations and stages play once in view, never under reduced motion). Ids and classes carry the prefixes `prd-`, `pla-`, `pco-`, `pac-`, `prc-`.

## How to rerun
```sh
export RAG_SCRATCH=<the shared rag setup folder>
P="$RAG_SCRATCH/venv/bin/python -I -B"
cd scripts
# deterministic, no lock (pgvector in Docker: docker run -d --rm --name prd-pg -e POSTGRES_PASSWORD=prdlocal -p 127.0.0.1:8380:5432 pgvector/pgvector:pg17)
$P cache_scifact.py; $P backfill.py; $P encode_noprefix.py; $P monitor.py
$P acl_pg.py; $P purge_pg.py; $P acl_llm.py retrieve; $P pip_gen_summary.py
# generator and timing runs: hold the bench lock ($RAG_SCRATCH/../inf/lock.sh acquire bench prd)
$P acl_llm.py generate; $P ttft.py; $P e2e_latency.py
cd ..; python3 build_data.py; sh build.sh; python3 check_data.py
node check_page.mjs ../index.html <screenshot folder>   # every control incl. sliders, 390 dark and 920 light, plus the autoplay rule under normal and reduced motion
node check_stages.mjs [shots dir]   # the four stages and the backfill animation: autoplay in view, step lists, last step, reduced motion, split at 1400
```
Large intermediates (retrieval contexts, the no-prefix query vectors, llama-server logs) go to `$RAG_SCRATCH/prd/`.

## Inputs
- `inputs/prices.json`: list prices read on 2026-10-14 from the vendors' pages (URLs per row).
- `inputs/acl_corpus.json`: a constructed corpus (fictional company) for the prompt-rule and planted-instruction tests.
- The running example (root `src/data/`), the setup's precomputed embeddings, and the original SciFact release downloaded by the root's Pipeline lab (`$RAG_SCRATCH/pipe/scifact_orig/`, for the SUPPORT / CONTRADICT labels).
- Facts read from siblings: `../../vector_indexes/src/facts.json` (tombstone work), the root's Pipeline lab generator records (`pip_gen_summary.py`).

## Departures from the child-page method
No old page existed, so there is no `live.md` or `coverage.json` (see `coverage.md`). Operational failures have no published figure to reproduce; the waterfall's defaults reproduce this page's own end-to-end run and the cost calculator's defaults the Reading's worked example. See `viz_ideas.md`.

## The 2026-10-24 rebuild to the teaching contract
- **Top:** the core sentence (after launch a RAG system is judged on freshness, leaks, latency and cost, and the fixes that hold live in the index and the search, not the prompt), a new static hero (`25_prd_hero.js`: the write path and the read path sharing one index, the access filter highlighted inside the search, one request's measured end-to-end time and its worked-example cost drawn to scale), You need, new terms. The six "ideas that carry the page" cards and the "two paths" prose became the hero and its caption (labelled fat in the ledger).
- **Labs moved inline** (each explained one mechanism): the Access lab's stepper and its predict prompt are in section 5, its RLS matrix, plans and per-question table in a closed block, its planted-instruction table in section 11; the Latency waterfall and TTFT chart are in section 7 with their sources closed; the Cache lab's threshold replay, result-cache figures and wrong-hit examples (closed) are in section 8. The Cost calculator stays a tab: a tool for the reader's own system that sections 7 and 9 both use; section 9 gains an inline cost bar and the one compact dated price table the brief asks for.
- **New visuals:** hero; the freshness lag as a stacked bar of its terms; every copy of a passage a deletion must reach (static grid, forgotten copies marked); the worked example's cost by stage. Inline visuals (svg 120 x 80 or larger) went from 4 to 8, plus four HTML bars and grids.
- **Owned topics made explicit:** null-retrieval rate as a monitor (section 10), injection as an operational risk (section 11, security topic linked to Agent security), failures that recur as one table with the check that catches each (section 13, replacing the checklist and the common-mistakes list, which restated their sections), semantic caching at the gateway linked to Gateways and routing.
- **No autoplay:** the template controller never starts on its own, and the backfill and access animations no longer start on a mode or question switch; `check_page.mjs` now asserts both steppers stay on step 0 after 4 s on screen, under normal and reduced motion.
- **Correction while rebuilding:** the Cache lab's explanation implied a stricter threshold removes loosely related hits first; the data say the same-verdict hits fall fastest (Qwen3-Embedding, 0.90 to 0.95: same-verdict 27 to 9, opposite 168 to 144, unrelated 9 to 6). The predict answer in section 8 now says so.
- **Deleted as fat:** wind-ups and "The problem." lead-ins, the definition of RAG, the one-screen cards, the launch checklist, eleven common-mistake entries and nineteen interview sentences that restated their sections (streaming the answer, the one new idea among them, moved to section 7; the chunk metadata list from the checklist opens section 13). Two design questions stay, closed.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 7,437 words, 32 min | 7,852 words, 34 min |
| Reading, closed details | 759 words, 3 min | 2,370 words, 10 min |
| Lab tabs, core | Latency 604, Access 909 (+900 closed), Cache 678: 9.5 min | 0 (inline) |
| Cost calculator, core | 784 words, 3.4 min | 784 words, 3.4 min |
| Further reading | 618 words | 555 words |
| Core total excluding Further reading | 45.3 min | 37.5 min |
| Inline visuals in Reading | 4 | 8 (plus HTML bars and grids) |

About 34 minutes is right for this page: it owns nine operational subjects (freshness, upgrades, deletes, access, tenancy, latency, caching, cost, monitoring and evals, injection), each carried by a measured result and its visual, and roughly 1.7 minutes of the count is text the widgets display (18 questions in a select, stepper captions, predict answers). The labs' intros mostly repeated the Reading prose, so folding them in cost two minutes of Reading while removing about ten from the tabs. What could still go: the section 13 table (2 minutes) is the one consolidated view of failures, which this page owns, so it stays.

## Ledger
`src/ledger.json`: 375 units (351 drafted by `html_utils/ledger.py init` from the page as built on 2026-10-19, 20 added for script-rendered visuals and tables, 4 for the dated price rows): core 232, depth 31, volatile 9 (the dated prices, kept in one table here as the brief asks), fat 103 (each with a note), problems 0. Keys were proposed by searching each unit's longest phrase containing its numbers in the rebuilt page, then checked by hand; weak or missing ones were set manually.

## Topic close (2026-10-24)
New closed block at the end of Reading: each stage's time on its own and generation time from the root's retired Pipeline lab. References to the Pipeline lab, the ingestion page's Re-indexing lab and Vector indexes' Filter lab now name what exists. Header remeasured: 34 min, plus 11 in closed details. Every quoted sibling time now matches its header (`html_utils/check_times.py`); the ledger keys that quoted old times or tab names were re-pointed to the current text (problems 0).

## The 2026-11-06 pass: split layout, 3D stages (renderer v2), explained and autoplaying animations
- **Templates**: `02_split.html` (added to `build.sh` after `01_head.html`), `21_js_rd_common.js`, `99_js_tabs.js` (key `prd-tab`) and `05z_errbox.js.html` from the skill; the renderer `25_js_s3.js` copied unchanged as `26_js_s3.js` (after the data and `24_prd_rd.js`, before the scenes `27a` to `27d`).
- **Split layout** (Reading): top (Fig. 1 beside the core sentence, its five steps, You need and terms); 2 (Fig. 2 beside the formula, the freshness calculator, which drives it, and five steps); 3 (the backfill animation beside the predict block and one step list per mode); 4 (the every-copy grid beside the text and the purge table); 5 twice (Fig. 3 beside the leak counts, its controls, five steps and the real answer; Fig. 4 beside the RLS policy and four steps); 7 twice (the latency waterfall; the TTFT chart); 8 twice (similarity histogram; the threshold replay, its kinds and result-cache text now on the left); 9 (cost bar); 10 twice (drift; power). Full width: the scorecard, tenancy and caching tables, the price table and self-host paragraph, 11 (a table), 12 (text), 13 (a table). Cost calculator tab: the controls on the left, the sticky result card on the right, twice (cost per query; break-even).
- **Four 3D stages**, one scene each, every number from `window.PRD`:
  - Fig. 1 (`27a_sc_hero.js`, 5 steps): the write lane and the read lane sharing one index, the access filter as glass around the search, then towers of the end-to-end p50 per stage (`e2e.summary`) and of cost per query per stage (`costdef`, the formulas of `cost_model.py`). Replaces the static SVG hero (`25_prd_hero.js`, deleted); its caption became the step list.
  - Fig. 2 (`27b_sc_fresh.js`, 5 steps): one edit through detect (a glass plate), the queue (one slab per 500 documents), the embedding plate and the index, the reader served v1 until the last step, then the lag's four terms stacked to scale. Driven live by the calculator's four controls.
  - Fig. 3 (`27c_sc_acl.js`, 5 steps): the constructed corpus's 12 documents, the real top 4 with and without the filter (`aclctx`) for the chosen question, flows into a glass prompt tray, the model and the real answer (`aclllm`), with the leak counts per condition. Replaces the HTML access stepper and its caption carousel; the "I am authorized" condition is a checkbox.
  - Fig. 4 (`27d_sc_rls.js`, 4 steps): the hr user (110 of 5,183 rows): the table's group bands to scale, a fresh plan's exact sort, then a reused HNSW plan's 40 candidates, the policy as a glass filter after the scan and the iterative scan's walk, with the measured rows, empty claims and recalls (`aclpg`). The candidates' groups are illustrative (one hr row in every 47, the measured share; groups were hashed, so independent of the claim), said in the step text.
- **Kept 2D, and why**: the backfill animation (a grid plus an nDCG curve over the backfill: a number on an axis), now `RD.anim` with one `ol.sx` per mode and four (in place) or three (dual) explained steps instead of eleven captioned frames; the latency waterfall (a calculator over bars), the TTFT, similarity, threshold, drift and power charts (curves, histograms), the cost bar (a share of one number), the every-copy grid (structure without depth). Section 12 (shards) stays text: a sharding stage would rest on assumed latencies (viz_ideas R3).
- **Removed**: the hero SVG, the access stepper (`pac-card`) with its mode buttons and captions, the backfill caption. **Reworded**: the RLS list's item 1 now points at Fig. 4, whose steps carry its numbers; the backfill intro ("measured at every 10%"). Chart tick labels raised from 10 to 11 px and legends to 11.5 px.
- **Checks**: `check_stages.mjs` new (from Agentic retrieval); `check_page.mjs`'s never-autoplay assertion inverted (the backfill animation must play in view and stay put under reduced motion); `check_data.py`'s login-name scan uses `getpass` (case-sensitive substring). Further reading's quoted time for Embedding models updated to 30 min.

## Length judgement, 2026-11-06
| | Before (2026-11-06 audit) | After |
|---|---|---|
| Reading core | 7,873 words, 34.2 min | 8,554 words, 37.2 min (header 37) |
| Reading in closed blocks | 2,471 words, 10.7 min | 2,471 words, 10.7 min |
| Cost calculator | 784 | 794 (two card titles) |
| Further reading | 550 | 550 |
| Visuals inline in Reading (audit count) | 8 | 11 (four stages; the hero SVG and the access stepper replaced) |

The core grew by about three minutes, all of it step lists: Fig. 1's five steps carry the hero caption's numbers, Fig. 2's five the lag terms, Fig. 3's five the access comparison the old stepper's captions showed one at a time, Fig. 4's four the HNSW-and-policy numbers (moved out of the RLS list's first item), and the backfill's two lists the numbers at 0, 10, 50 and 100%. The paragraphs they explain stay because each still carries ledger units the steps do not (the batch and streaming designs, the store visibility facts, the leak counts per user).

## Ledger, 2026-11-06
375 units: core 232, depth 31, volatile 9, fat 103; `python3 html_utils/ledger.py check` problems 0. Five keys re-pointed to the new wording (units 52, 106, 299, 303, 356); no unit relabelled.
