# src: Rerankers and late interaction

Build: `python3 build_data.py && sh build.sh` writes `../index.html` from `parts/`. `build_data.py` turns `data/*.json` into `parts/22_rr_data.js` (what the JavaScript reads) and `facts.json`; numbers in the prose are written `@@key@@` and filled from `facts.json` by `build.sh`, so prose and data cannot disagree. Checks: `$RAG_SCRATCH/venv/bin/python -I -B check_data.py` (embedded data equal the recorded data, no unfilled or pending fact, every fact present in the text, a sample recomputed independently from the shared artefacts, privacy over the whole folder), `node check_page.mjs ../index.html <shots dir>` (every control at 390 px dark and 920 px light; puppeteer from html_utils via createRequire; npm with `NPM_CONFIG_USERCONFIG` pointing at an empty file), and `sh html_utils/checkpage.sh <this page folder>` from the repo root.

Shape: a child page of Topic: rag-and-retrieval (method `html_utils/methods/topic_pages.md`, Part B). Reading tab in the subject's order (one screen, why a second stage, cross-encoders in the code, training, depth, scores, LLM rerankers, distillation, late interaction, PLAID, choosing, mistakes, interview), three labs (Before/after lab, MaxSim lab, Depth chooser) and Further reading. Prefix `rr` for ids, classes and data keys; storage key `rr-tab`. Departure from the method: the "in production now" part is short (section 10) because production rerankers are mostly hosted APIs that the topic does not run (local models only).

## Parts
- `01_head.html` (root's CSS, own title, `.seg` wrapping), `05z_errbox.js.html`, `10_header.html`, `21_js_rd_common.js` (root's animation controller), `99_js_tabs.js` (storage key `rr-tab`).
- Reading: `20_read_a.html` (styles, nav, sections 0 and 1) to `20_read_f.html` (10 to 12), `20_read_z.html` (footer, closes the tab). JS: `23_rr_lib.js` (chart and legend helpers), `24_rr_rd.js` and `25_rr_rd2.js` (every inline chart, widget and animation).
- Labs: `31_tab_ba.html` + `31_rr_ba.js`; `32_tab_max.html` + `32_rr_mx.js`; `33_tab_depth.html` + `33_rr_dc.js`. Further reading: `39_tab_more.html`.
- `22_rr_data.js`: generated, do not edit.

## Scripts (`scripts/`), run as `$RAG_SCRATCH/venv/bin/python -I -B scripts/<name>.py` (ColBERT ones with `$RAG_SCRATCH/colenv/bin/python`)
`RAG_SCRATCH` is the shared setup folder of the parent page (its `src/data/README.md`); every script loads the running example through the parent's `src/data/load.py` (via `rrlib.py`). Large outputs go to `$RAG_SCRATCH/rr/`.
- Deterministic, no lock: `e_depth.py` (K sweeps; checks the 60 cells it shares with the root's `src/pipe/out/rerank.json`), `e_scores.py` (scales, calibration, abstention, NFCorpus transfer), `e_examples.py` (candidate lists for the Before/after lab), `e_tokens.py` (tokens and parameters per pair, FLOPs model), `e_ce_manual.py` (a cross-encoder by hand on CPU, attention for the animation), colenv: `e_colbert.py` (storage, exhaustive MaxSim, query-augmentation ablation, ColBERT as reranker), `e_maxsim_pair.py` (token strings and similarity matrices), `e_plaid.py` (fast-plaid indexes at 2 and 4 bits, search-knob grid; CPU, limited to 2 threads), `e_llm_eval.py` (scores the LLM runs).
- Under the bench lock (MPS, generator or timing): `e_time.py` (per-claim rerank latency against K), `e_rerank_deep.py` (bge-reranker-v2-m3 and Qwen3-Reranker on the hybrid top 100), `e_train.py` (tiny fine-tuning run), `e_llm.py` (Qwen3-4B Q4_K_M in llama-server on port 8340: pointwise, listwise, pairwise).
- Score files shared with the root: `rrlib.rerank_scores` reads the setup's recorded scores, the root Pipeline lab's extra hybrid pairs (`$RAG_SCRATCH/pipe/rerank_extra`) and this page's (`$RAG_SCRATCH/rr/rerank_extra`), same models and settings, so every agent reads one score per pair.

## Downloads
None: every model and dataset came from the shared setup and the inference topic's model store.
