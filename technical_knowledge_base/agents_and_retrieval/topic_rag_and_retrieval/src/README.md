# Source of "Topic: rag-and-retrieval"

Root of the topic (storage key `rag-tab`). Built 2026-10-13 to 2026-10-19 by a team of tab agents; closed on 2026-10-24 after its eight children were rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`): the Reading tab was rebuilt as a map and three lab tabs were retired, editing only, no new runs.

## Build and check
- `sh build.sh` writes `../index.html` from `parts/`.
- `sh html_utils/checkpage.sh <this page>` (from the repository root): `fail=0, emdash 0, errbox 1, clipped 0`.
- `node <this page>/src/read/check_tab.mjs <this page>/index.html <shots>`: Reading and Further reading at 390 px dark and 920 px light.
- `python3 <this page>/src/map/validate.py`: the Tool map embeds its data verbatim and its prose numbers match.
- `python3 html_utils/ledger.py check <this page>`: problems 0.

## Tabs and parts
| Tab | Parts | Decision on 2026-10-24, and why |
|---|---|---|
| Reading `t-read` | `20_read*.html`, `21_js_rd_common.js`, `22_js_rd_hero.js` (`read/README.md`) | Rebuilt as a map (below). |
| Pipeline lab `t-pipe` | moved to `retired/parts/31_*` | **Retired.** Chunking, BM25, fusion, filters and rewrites are taught with these runs on The retrieval pipeline (which also absorbed the old Reading section 6, A = r x p x g, as its section 9); rerank depth on Rerankers and late interaction; latency on RAG in production. Scripts and `pipe/out` stay: the children import and read them. |
| Vector search lab `t-vec` | moved to `retired/parts/32_*` | **Retired.** Similarity, contrastive training, Matryoshka and quantised embeddings are Embedding models' (its section 7 reads `vec/out/mrl_quant.json`, `models.json`, `metric.json` and `contrastive.json`, all kept); exact search, ANN and the speed and memory trade are Vector indexes'. The two recalls, the one idea of the tab that spans two children, stay on the Reading tab (section 4). |
| Agentic lab `t-agent` | moved to `retired/parts/33_*` | **Retired.** Every strategy, the token growth, lost in the middle, the router and the replay data are Agentic retrieval's; the small graph is GraphRAG and structured retrieval's (its build reads `agent/out/graphrag.json` and `strategies.json`, kept). |
| Tool map `t-map` | `34_*` (`map/README.md`) | **Kept**: the dated atlas of every tool across the children, the measured defaults, the store chooser, the timeline and reading MTEB and BEIR. Links to the retired tabs were rewritten; its step animations no longer start on their own (`34_js_map_1core.js`). |
| Further reading `t-more` | `39_tab_more.html` | Kept; the tab list, child titles and every quoted time now match the target pages' headers; the Agent memory layers entry is folded into Context engineering, whose alias it now is. |

`pipe/`, `vec/` and `agent/` keep their scripts and outputs (the children import `common.py`, `chunkers.py`, `chunk_eval.py`, `strategies.py`, `search.py`, `graphrag.py` and read `out/`); each folder's `make_data.py`, `check_numbers.py` and `check_tab.mjs` moved to `retired/<folder>/`, so rerunning a script there cannot write a stray part into `parts/`.

## What the Reading tab is now
- **Top**: the core idea in one sentence; the hero, a static SVG of one question's path (index time: parse, chunk, embed and count terms, index; query time: rewrite, first stage, rerank, prompt, generate), each box a link to the child that owns it with the stage's measured headline (186 of 188 in the top 30, 178 kept, 96 right), and three bands for the axes the other children cover (who decides, structure before the question, after launch); "You need"; twelve new terms; the running example and the number labels.
- **Comparisons only a root can make**: why retrieve (four things, measured, plus why fine-tuning is not the alternative); four scorers on one table (stored per abstract, work per candidate, SciFact nDCG@10, owner) with the three cross-child distinctions (words against vectors and when hybrid hurts, a reranker only when stronger, size is not a ranking); one lesson per stage with its owner; A = r x p x g and the two recalls; who decides what to read (engineer, model, router, nobody, index, database, memory) with the measured trade of each; after launch in seven lines; the tools; the child cards with each child's header time.
- **Re-teaching removed**: BM25 from zero, embeddings and InfoNCE, the index mechanisms, each pipeline stage's mechanism, the waffle of 188 answers and the lever calculator, the agent loop's token stepper and comparison chart, GraphRAG's mechanism, the production latency chart, the common-mistakes list and the interview answers. Each unit is `owned:` in the ledger with a key on the child that carries it.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 46.4 min (10,680 words) | 18.9 min (4,342) |
| Reading, closed details | 6.9 min | 0.5 min |
| Pipeline lab, Vector search lab, Agentic lab (core) | 34.1 + 24.3 + 29.2 min | retired |
| Tool map (core + closed) | 16.3 + 1.9 min | 16.4 + 1.9 min |
| Further reading | 5.5 min | 5.6 min |
| Visuals drawn in Reading | 3 | 1 (the hero map; the comparisons are tables) |

Why about 19 minutes is right: the core is the map plus the comparisons a reader can only get here (scorers across three children, stages across five, who decides across four, production across one) and the definitions those tables use; every mechanism is one line and a link. It is longer than an index because each comparison row carries its measured number and its owner, which no child shows side by side. The deleted 27 minutes were re-teaching, now owned by the children (keys checked), and the three lab tabs (88 minutes) are taught inline on the children.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
1,177 units drafted by `ledger.py init` from the page as built on 2026-10-19: core 443 (kept on this page, including the unchanged Tool map and Further reading), owned 549 (embedding_models, vector_indexes, retrieval_pipeline, rerankers_and_late_interaction, agentic_retrieval, graphrag_and_structured_retrieval, rag_in_production, and one at the Proactive Memory Agent paper page), fat 185 (each with a `note`: headings, wind-ups, widget instructions and legends, predict and interview question stems, tab navigation and pointers to retired tabs, the old child cards replaced by the current ones, chronicle). About 160 units no child carried were moved to the owning child first, as one closed block each ("Measured on the topic's shared runs", or "The root page's agentic runs in detail"), on Embedding models, Vector indexes, The retrieval pipeline, Rerankers and late interaction, Agentic retrieval, GraphRAG and structured retrieval and RAG in production; their keys are checked there. Keys were found by script (numbers first, then a phrase of at least three words found near the unit's content on the target page) and the rest set by hand.
