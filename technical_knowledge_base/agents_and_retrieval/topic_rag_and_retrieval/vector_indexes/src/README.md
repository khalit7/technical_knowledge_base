# src: Vector indexes from the inside

Build: `python3 build_data.py && sh build.sh` writes `../index.html` from `parts/`. `build_data.py` turns `data/*.json` into `parts/22_vix_data.js` (what the JavaScript reads) and `facts.json`; numbers in the prose are written `@@key@@` and filled from `facts.json` by `build.sh`, so prose and data cannot disagree. Checks: `python3 check_data.py` (embedded data equal the recorded data, every fact present, a sample of facts recomputed independently, privacy), `node check_page.mjs ../index.html ../.shots` (every control at 390 px dark and 920 px light; puppeteer from html_utils via createRequire), and `sh html_utils/checkpage.sh <this page folder>` from the repo root.

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
