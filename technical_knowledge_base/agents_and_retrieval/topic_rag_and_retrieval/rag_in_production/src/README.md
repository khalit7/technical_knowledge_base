# RAG in production: source

Child page of Topic: rag-and-retrieval. `sh build.sh` writes `../index.html` from `parts/`; numbers in the prose are written `@@key@@` and filled from `facts.json`, which `build_data.py` makes from `data/` (measured here) and `inputs/` (published prices, the constructed corpus), together with `parts/22_prd_data.js` (the data the page's JavaScript reads).

## Parts
- `01_head.html` (shared CSS, copied from the root), `10_header.html` (title, subtitle with reading time, tabs), `20_read_a.html` (Reading styles, nav, the idea in one screen: core sentence, hero, You need, new terms; section 1) to `20_read_g.html` (section 13, the rehearsal block, the footnote) and `20_read_z.html` (closes the tab).
- Reading JS: `24_prd_rd.js` (predict widgets, freshness calculator and its lag bar, backfill animation, purge table, stage-timing table, similarity histogram, drift and power charts, the section 9 cost bar), `25_prd_hero.js` (hero), `31_prd_lat.js` (latency waterfall and TTFT chart, section 7), `33_prd_acl.js` (access stepper, leak tables, RLS matrix and plans, planted-instruction tables, sections 5 and 11), `34_prd_cache.js` (semantic-cache replay, section 8).
- Tabs: `32_tab_cost.html` + `32_prd_cost.js` (Cost calculator), `39_tab_more.html` (Further reading).
- `05z_errbox.js.html`; `21_js_rd_common.js` and `99_js_tabs.js` are the explainer-page skill templates (storage key `prd-tab`; nothing animates before the reader acts). Ids and classes carry the prefixes `prd-`, `pla-`, `pco-`, `pac-`, `prc-`.

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
node check_page.mjs ../index.html <screenshot folder>   # every control incl. sliders, 390 dark and 920 light, plus a no-autoplay check under normal and reduced motion
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
