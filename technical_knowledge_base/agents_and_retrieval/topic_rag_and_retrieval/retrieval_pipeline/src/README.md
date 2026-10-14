# src: The retrieval pipeline: chunking, query rewriting, hybrid search, filtering

Build: `$RAG_SCRATCH/venv/bin/python -I -B exp/make_data.py && python3 build_facts.py && sh build.sh` writes `../index.html` from `parts/`. `make_data.py` turns `out/*.json` (and the root Pipeline lab's `src/pipe/out/*.json`) into `parts/22_rp_data.js` (what the JavaScript reads); `build_facts.py` writes `facts.json`, and numbers in the prose are written `@@key@@` and filled from it by `build.sh`, so prose and data cannot disagree.

Checks: `python3 check_data.py` (embedded data equal the recorded files; every fact filled and present; numbers shared with the root lab equal the root's files; root numbers quoted in prose present in its files; privacy and hygiene over the folder), `RAG_SCRATCH=... node check_js.mjs` (the JavaScript chunkers equal the root's Python `chunkers.py` on both workbench papers, 18 configurations), `node check_page.mjs ../index.html <shots dir>` (every control at 390 px dark and 920 px light; puppeteer from html_utils via createRequire; npm with `NPM_CONFIG_USERCONFIG` pointing at an empty file), and `sh html_utils/checkpage.sh <this page folder>` from the repo root.

Shape: a child page of Topic: rag-and-retrieval (method `html_utils/methods/topic_pages.md`, Part B): Reading in pipeline order (one screen, chunking, BM25, learned sparse, fusion, query understanding, filters, duplicates and diversity, prompt assembly, mistakes, interview questions, how measured), three labs (Chunking workbench, Fusion lab, Query-rewrite lab) and Further reading. Prefix `rp` for ids, classes and data keys; storage key `rp-tab`. It is the deep version of the root's Pipeline lab: it reuses that lab's scripts, chunk files, vectors, generator caches and extra reranker scores, and never re-measures a number the root owns (it reproduces the shared ones exactly; `check_data.py` enforces it). Reranking is left to the rerankers child; filtered vector search to the vector indexes child; access control to the production child.

## Parts
- `01_head.html` (root's CSS, own title), `05z_errbox.js.html`, `10_header.html`, `21_js_rd_common.js` (root's animation controller), `99_js_tabs.js` (storage key `rp-tab`).
- Reading: `20_read_a.html` (styles, nav, section 0) to `20_read_h.html` (9 to 11; closes the tab). JS: `23_rp_lib.js` (chunkers ported from the root's `chunkers.py`, a small BM25, fusion functions, helpers), `24_rp_rd1.js` to `24_rp_rd3.js` (every inline table, chart, drill and the fixed-vs-recursive animation).
- Labs: `31_tab_wb.html` + `31_rp_wb.js` (Chunking workbench); `32_tab_fu.html` + `32_rp_fu.js` (Fusion lab); `33_tab_qr.html` + `33_rp_qr.js` (Query-rewrite lab). Further reading: `39_tab_more.html`.
- `22_rp_data.js`: generated, do not edit.

## Experiments (`exp/`), run as `$RAG_SCRATCH/venv/bin/python -I -B exp/<name>.py`
`RAG_SCRATCH` is the shared setup folder of the parent page (its `src/data/README.md`); every script loads the running example through the parent's `src/data/load.py` and the root lab's `src/pipe/common.py` (via `rp.py`). Large outputs go to `$RAG_SCRATCH/rp/`.
- Deterministic, no lock: `bm25_sweep.py` (with `bm25lab.py`, a NumPy BM25/BM25F checked against bm25s), `bm25_example.py`, `score_ranges.py`, `fusion_deep.py` (eight fusion methods tuned on held-out splits; fusion then rerank), `router.py`, `parent_child.py`, `mmr.py`, `mixed.py`, `chunk_eval_rp.py` (scores the LangChain chunk files with the root's metric), `chunk_expect.py` (input to `check_js.mjs`).
- Own env `$RAG_SCRATCH/rp/venv` (langchain-text-splitters 1.1.3, pySBD, llama-index-core; no torch): `chunk_make.py` (the real LangChain splitters on all 281 papers, tokenizer and truncation statistics, chunk-count formula, sentence segmentation), `snippets/split_tokens.py` (the code shown in Reading 1.1, with its saved output).
- Under the bench lock (MPS or the generator): `qgen.py` then `qeval.py` (step-back, decomposition, self-query), `pa_gen.py` then `pa_eval.py` (prompt assembly), `chunk_eval_rp.py --embed` (bge-small on the LangChain chunks), `late.py` (late chunking with modernbert-embed-base), `sparse.py` (learned sparse). `rpgen.py` runs Qwen3-1.7B Q4_K_M in llama-server on port 8300 with the root lab's settings; answers are cached by exact prompt, and prompts identical to the root lab's reuse its cached answers (read only).

## Downloads (recorded in the shared SETUP notes)
nomic-ai/modernbert-embed-base (late chunking) and opensearch-project/opensearch-neural-sparse-encoding-doc-v3-distill (learned sparse), under the download lock, sha256 checked against the Hub; the Python packages of the own env.

## Notes
- `live.md` is the old Notion page saved verbatim (read only); `coverage.md` lists every claim with its verdict.
- `viz_ideas.md` lists the visuals built and rejected.
