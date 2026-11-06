# src: Vector indexes from the inside

Build: `python3 build_data.py && sh build.sh` writes `../index.html` from `parts/`. `build_data.py` turns `data/*.json` into `parts/22_vix_data.js` (what the JavaScript reads) and `facts.json`; numbers in the prose are written `@@key@@` and filled from `facts.json` by `build.sh`, so prose and data cannot disagree. Checks: `python3 check_data.py` (embedded data equal the recorded data, every fact present, a sample of facts recomputed independently, privacy with the login name looked up by getpass, case-sensitive), `node check_page.mjs ../index.html ../.shots` (every control at 390 px dark and 920 px light; puppeteer from html_utils via createRequire), `node check_stages.mjs` (the 2026-11-06 rollout check: every stage and the filter lab play when scrolled into view, step to the end, have one step-list item per step in every mode, never move under reduced motion, stop redrawing off screen; split layout at 1400 px), and `sh html_utils/checkpage.sh <this page folder>` from the repo root.

Shape: a child page of Topic: rag-and-retrieval (method `.claude/skills/explainer-page/page-kinds/topic-child.md`), rebuilt 2026-10-24 to the teaching contract. Tabs: Reading, Frontier, Further reading. Prefix `vix` for ids, classes, data keys and Docker containers; storage key `vix-tab`.

## Parts
- `01_head.html` (root's CSS, own title), `05z_errbox.js.html`, `10_header.html` (subtitle carries the measured reading time), `21_js_rd_common.js` and `99_js_tabs.js` (the skill templates: nothing animates until the reader presses play or steps).
- Reading: `20_read_a.html` (styles, nav, the idea in one screen: core sentence, hero, you need, new terms, labels; section 1) to `20_read_h.html` (section 13 with the one dated table of library defaults and versions, and the interview rehearsal), `20_read_z.html` (footer, closes the tab). The three former lab tabs are inline: IVF-PQ stepper in section 5 (`#vix-plab`), HNSW build and search in section 6 (`#vix-hlab`), filter sweep in section 9 (`#vix-llab`); their CSS is scoped under those ids.
- JS: `23_vix_hero.js` (the hero: four ways to read less on one illustrative point set with measured SciFact numbers; the DiskANN node-layout diagram, drawn to scale), `24_vix_rd.js` (every other inline chart and widget), `31_vix_hnsw.js`, `32_vix_pq.js`, `34_vix_filt.js` (the moved labs, now registered with `RD.onRender`), `33_tab_front.html` + `33_vix_front.js` (Frontier tab). Further reading: `39_tab_more.html`.
- `22_vix_data.js`: generated, do not edit.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence (exact search reads everything; an index reads less, by cells, by a walk, or by small codes plus a rescored shortlist, and pays in recall, memory, build and update cost), a new static hero (the four ways side by side on one query, true neighbours found and missed ringed, measured SciFact recall and work under each), "You need" with the owners of embeddings, the pipeline, database products and production linked, and the new terms. The six-idea "In one screen" grid was deleted: every idea restated a section.
- **Labs moved inline** (contract: a lab that explains one mechanism belongs beside the claim): IVF-PQ lab into section 5, HNSW lab into section 6, Filter lab into section 9. Frontier stays a tab: it is the one tool used across the whole page.
- **New visual**: the DiskANN node layout on SSD (section 7), a toggle between SIFT (768-byte nodes, five per sector, one read per hop) and Qwen3-Embedding (4,224 bytes, two reads), drawn to scale from the section's own arithmetic. Two predict-then-reveal drills: the IVF-PQ stepper's prompt and a new filter crossover drill in section 9.
- **Depth closed**: every FAISS and hnswlib code quote, the level table, the port check, the Tool map reproductions, IVF training and seeds, OPQ and the Hugging Face numbers, ADC against SDC, alpha and distance concentration, ScaNN's configurations and rules of thumb, ACORN's other weak spots and Qdrant's paths, the NeurIPS'23 filtered track, slot replacement, all build times, the scale sources, the dated defaults table, the two design interview questions.
- **Volatile**: library defaults, versions and products now sit in one dated table in section 13 (closed).
- **Deleted as fat**: the six-idea grid, the common-mistakes block (each repeated a section; the one new point, normalising for inner product, moved into section 1), eight interview answers that restated sections, tab-bar and pointer text for the removed tabs.
- **Autoplay removed**: `21_js_rd_common.js` is the template; a normal-motion check confirms the three steppers wait on step 0.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 43.5 min (10,012 words) | 33.8 min (7,773) |
| Reading, closed details | 2.9 min | 14.8 min |
| Other tabs, core | HNSW lab 2.8 + IVF-PQ lab 1.9 + Frontier 4.0 + Filter lab 1.5 = 10.2 min | Frontier 1.8 min |
| Core total, excluding Further reading | 53.7 min | 35.6 min |
| Visuals drawn in Reading | 9 | 17 |

Why about 34 minutes is right: the page owns ten mechanisms (exact search and its bandwidth limit, IVF, scalar, binary and RaBitQ codes, PQ and ADC, IVF-PQ with residuals, HNSW's layers, search and heuristic, Vamana and the SSD layout, anisotropic quantization, four filter strategies, tombstones) plus the memory formulas and how work scales, each with measured numbers and a picture; about 600 of the core words are the three steppers that used to sit in tabs. Every remaining core unit in the ledger is needed to understand one mechanism; what made the old page long (code, provenance, per-setting tables, mistakes and interview answers) is closed or deleted as restatement.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
375 units: core 251, depth 60, fat 57, volatile 7. 365 were drafted from the old page by `ledger.py init`; 10 were added by hand for the new hero and DiskANN visual, script-rendered charts and tables, and two dated facts. Volatile units stay on this page in the one dated table (section 13), as the brief asked. Fat units carry a `note` saying why.

## Images
None added. This is a mechanism page: the canonical figures (HNSW's layers, DiskANN's layout) are redrawn from real data and the papers' arithmetic, and the papers' own figures are on arXiv without an open licence; no photo of a physical object would teach here.

## Scripts (`scripts/`), run as `$RAG_SCRATCH/venv/bin/python -I -B scripts/<name>.py`
`RAG_SCRATCH` is the shared setup folder of the parent page (its `src/data/README.md`); large outputs go to `$RAG_SCRATCH/vix/out/`, then `collect.py` writes `data/results.json`.
- `vixlib.py`: loading the running example through the root's `src/data/load.py`; exact top k; recall; nDCG via the root's pytrec_eval helper.
- `pyhnsw.py`: line-by-line port of hnswlib 0.8.0 insert and search (with switches for closest-M selection and a single layer), hnswlib's filtered search, ACORN-1, and a reader for hnswlib's index file. `check_port.py` compares it with hnswlib (5,530 of 5,539 lists identical, all 300 top-10 identical at ef 10, 40, 100).
- `vamana.py`: Vamana from the DiskANN paper's Algorithms 1 to 3.
- Deterministic (no lock): `e_ivf.py`, `e_quant.py`, `e_hnsw.py`, `e_variants.py`, `e_vamana.py`, `e_updates.py`, `e_filter.py`, `e_acorn.py`, `e_scale.py`, `make_hnsw_anim.py`, `make_ivfpq_anim.py`.
- Containers: `e_scann.py` (ScaNN 1.4.2 in python:3.9-slim, Linux arm64; its cp312 and cp313 aarch64 wheels refuse to import), `e_qdrant.py`, `e_qdrant_common.py`, `e_qdrant_paths.py` (Qdrant v1.19.2 server, container `vix-qd`, port 8320).
- Timed, under the bench lock: `embed_quora.py` (BEIR Quora, all-MiniLM-L6-v2 on MPS, the same vectors as the Search and vector databases page), `e_bench.py <scifact|all4|quora>`.

## Downloads (under the download lock; recorded here because they are this page's own)
BEIR quora.zip (15.9 MB, sha256 56aacd9d...77531) from the UKP server; Docker images python:3.12-slim and python:3.9-slim; ScaNN 1.4.2 and NumPy wheels into `$RAG_SCRATCH/vix/scann/`.

## Topic close (2026-10-24)
New closed block at the end of Reading: the root's retired Vector search lab units this page did not carry (ANN recall against relevance at efSearch 8, 82.7% against 84.5%; PQ estimates; engine overhead; provenance). "Its Vector search lab and Tool map tabs" now reads "its Tool map tab". Header unchanged (34 + 15). Every quoted sibling time now matches its header (`html_utils/check_times.py`); the ledger keys that quoted old times or tab names were re-pointed to the current text (problems 0).

## The 2026-11-06 pass: split layout, four 3D stages (renderer v2), explained and autoplaying animations
- **Templates**: `02_split.html` (added to `build.sh` after `01_head.html`), `21_js_rd_common.js`, `99_js_tabs.js` (key `vix-tab`), `05z_errbox.js.html`; the renderer `25_js_s3.js` copied unchanged as `27_js_s3.js` (after the data and the 2D parts, before the scenes `28a` to `28d`). Removed: `23_vix_hero.js` (the DiskANN diagram it also drew is now `23_vix_disk.js`), `31_vix_hnsw.js`, `32_vix_pq.js` (replaced by scenes). The page CSS forces the stage bar onto one line (`#t-read .an-ctl` wrapped it).
- **Four 3D stages**, one scene each:
  - Fig. 1 (`28a_sc_hero.js`, 4 steps, replaces the four flat hero panels): the same seeded illustrative point set and the same algorithms (exact, k-means cells, a 4-NN graph walk, noisy codes with a rescored shortlist of 10), labelled illustrative; the step list carries the measured SciFact numbers (new facts `ivf72_np8_nd`, `m16_ef40_nd`, `m16_ef40_hops` in `build_data.py`).
  - Fig. 2 (`28b_sc_ivfpq.js`, 6 steps, replaces the 2D IVF-PQ stepper): the real FAISS IndexIVFPQ data (`VIX.pq`): the 72 cells as posts sorted by the claim's centroid similarity, probed lists rising to their real sizes, the 16 x 256 table as a glass plate, one candidate's 16 real bytes picking 16 table entries (signed bars) that stream into its PQ score beside the exact score, then the best 20 by the method's score with exact-score ticks, then the 10 returned. Claim, nprobe and method switches redraw; the stats, the candidate's bytes and the result table follow the step.
  - Fig. 3 (`28c_sc_hnsw.js`, 7 steps; 5 for "One layer", which swaps the list): the recorded 240-node graph (`VIX.hnsw`) on stacked glass layers (60 nodes on layer 1, 11 on layer 2), one real insert's kept and rejected links, the query pinned through the layers, the recorded greedy hops per layer, the layer-0 expansions in two stretches, the result against the exact top 4. Replaces the 2D lab, whose Build mode replayed all 240 inserts one per frame (the long-replay rule): the heuristic is now one explained insert, the layer selector is gone (the layers are drawn).
  - Fig. 4 (`28d_sc_filt.js`, 4 steps, new): layer 0 of the same graph cut by a filter, a seeded random attribute (about 10%) or one collection (QASPER): links that survive, pieces (connected components) when stepping on passing nodes only, a shortest path through failing nodes (hnswlib's in-graph walk), two-hop links that rejoin the pieces (ACORN's idea). All counts computed in the browser from the recorded links; the random filter falls into many pieces, the correlated one stays almost whole.
- **2D animation**: the filter lab (`34_vix_filt.js`) is `RD.anim` with a step list: nine items for the random-attribute sweep (one per selectivity, generated from the data; the old caption's numbers moved there) and one item for each other filter (`sx-l-one`, swapped by the scenario switch). The caption was removed.
- **Split layout**: top (Fig. 1 beside the core sentence and its steps; You need, terms and labels full width); 1 (recall against nDCG); 2 (bytes-read widget); 3 twice (cell ranks; recall curves); 4 (byte budgets beside the bullets; the family table and the PQ explanation full width); 5 (Fig. 2); 6 three times (Fig. 3 with Layers, Search, Build and the hnswlib reading; the knobs chart; the variants chart); 7 twice (the DiskANN node layout; Vamana against HNSW); 9 three times (Fig. 4 beside the in-graph explanation; the crossover chart beside the predict, table and bullets; the filter lab, chart right, notes and steps left); 10 (tombstones); 11 (memory widget beside the formula table); 12 (scaling). Full width: 8 (ScaNN, no visual), 13 (tables), the strategy table, closed blocks. Frontier tab: notes left, controls and chart right.
- **Kept 2D, and why**: every chart is a number on an axis, a curve, a log scatter or a table (recall against nDCG, bytes read, cell ranks, recall curves, byte budgets, knobs, variants, Vamana hops, the filter crossover and lab, tombstones, memory, scaling, the Frontier); the DiskANN node layout is a byte strip drawn to scale, which reads best flat.
- **Checks**: `check_stages.mjs` new (from Embedding models); `check_data.py` privacy uses getpass.

## Length judgement, 2026-11-06
| | Before (2026-11-06 audit) | After |
|---|---|---|
| Reading core (230 words a minute) | 7,798 words, 33.9 min | 9,040 words, 39.3 min (header 39) |
| Reading in closed blocks | 3,533 words | 3,527 words |
| Frontier core | 421 words | 421 words |
| Visuals inline in Reading (audit count) | 17 | 15 (the four hero panels are one stage; four stages in all) |

The core grew by about five minutes, all of it step lists: Fig. 1's four carry the measured work behind each recall, Fig. 2's six the old stepper's captions (now one list instead of a caption per step), Fig. 3's seven (and five for one layer) the build and search mechanics that the lab showed one frame at a time, Fig. 4's four a new point (why a selective, uncorrelated filter breaks a graph walk, on the real graph). No paragraph was cut: each still carries ledger units the steps do not.

## Ledger, 2026-11-06
375 units: core 251, depth 60, fat 57, volatile 7; problems 0. Seven keys re-pointed to the new text (units 90, 303, 304, 308, 311, 314, 329: the stepper pointer, the HNSW lab's text and controls, the IVF-PQ and filter lab intros).
