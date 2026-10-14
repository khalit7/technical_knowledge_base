# src: Vector indexes from the inside

Build: `python3 build_data.py && sh build.sh` writes `../index.html` from `parts/`. `build_data.py` turns `data/*.json` into `parts/22_vix_data.js` (what the JavaScript reads) and `facts.json`; numbers in the prose are written `@@key@@` and filled from `facts.json` by `build.sh`, so prose and data cannot disagree. Checks: `python3 check_data.py` (embedded data equal the recorded data, every fact present, a sample of facts recomputed independently, privacy), `node check_page.mjs ../index.html ../.shots` (every control at 390 px dark and 920 px light; puppeteer from html_utils via createRequire), and `sh html_utils/checkpage.sh <this page folder>` from the repo root.

Shape: a child page of Topic: rag-and-retrieval (method `html_utils/methods/topic_pages.md`, Part B). Reading tab in the subject's own order (scorecard, exact, IVF, quantization, IVF-PQ, HNSW, DiskANN, ScaNN, filters, updates, memory, scale, choosing, mistakes, interview), then four labs (HNSW lab, IVF-PQ lab, Frontier, Filter lab) and Further reading. Prefix `vix` for ids, classes, data keys and Docker containers. Departure from the method: no "in production now" configs section of its own; library defaults sit in a table in section 6 and production patterns in sections 9 and 12, because for indexes the production facts are defaults and planners.

## Parts
- `01_head.html` (root's CSS, own title), `05z_errbox.js.html`, `10_header.html`, `21_js_rd_common.js` (root's animation controller), `99_js_tabs.js` (storage key `vix-tab`).
- Reading: `20_read_a.html` (styles, nav, sections 0 and 1) to `20_read_h.html` (13 to 15), `20_read_z.html` (footer, closes the tab). JS: `24_vix_rd.js` (every inline chart and widget).
- Labs: `31_tab_hnsw.html` + `31_vix_hnsw.js`; `32_tab_pq.html` + `32_vix_pq.js`; `33_tab_front.html` + `33_vix_front.js`; `34_tab_filt.html` + `34_vix_filt.js`. Further reading: `39_tab_more.html`.
- `22_vix_data.js`: generated, do not edit.

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
