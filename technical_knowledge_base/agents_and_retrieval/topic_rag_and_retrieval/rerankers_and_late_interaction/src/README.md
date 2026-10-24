# src: Rerankers and late interaction

Build: `python3 build_data.py && sh build.sh` writes `../index.html` from `parts/`. `build_data.py` turns `data/*.json` into `parts/22_rr_data.js` (what the JavaScript reads) and `facts.json`; numbers in the prose are written `@@key@@` and filled from `facts.json` by `build.sh`, so prose and data cannot disagree. Checks: `$RAG_SCRATCH/venv/bin/python -I -B check_data.py` (embedded data equal the recorded data, no unfilled or pending fact, every fact present in the text, a sample recomputed independently from the shared artefacts, privacy over the whole folder), `node check_page.mjs ../index.html <shots dir>` (every control at 390 px dark and 920 px light; puppeteer from html_utils via createRequire; npm with `NPM_CONFIG_USERCONFIG` pointing at an empty file), and `sh html_utils/checkpage.sh <this page folder>` from the repo root.

Shape: a child page of Topic: rag-and-retrieval (method `.claude/skills/explainer-page/page-kinds/topic-child.md`, governed by `teaching/teaching-contract.md`). Reading tab in the subject's order: the idea in one screen (core sentence, hero, you need, new terms), 1 why a second stage, 2 cross-encoders, 3 training and distillation, 4 where and how deep (with the reranked-list widget), 5 evaluating and timing, 6 scores and abstaining, 7 LLM rerankers, 8 late interaction (with the MaxSim stepper), 9 PLAID, 10 learned sparse (SPLADE), 11 choosing. Tabs: Reading, Depth chooser (a tool used across sections 1, 4, 5 and 11), Further reading. Prefix `rr` for ids, classes and data keys; storage key `rr-tab`.

## Parts
- `01_head.html` (root's CSS, own title, `.seg` wrapping), `05z_errbox.js.html`, `10_header.html` (subtitle carries the measured reading time), `21_js_rd_common.js` and `99_js_tabs.js` (the explainer-page skill templates: nothing animates until the reader acts; storage key `rr-tab`).
- Reading: `20_read_a.html` (styles, nav, the idea, section 1) to `20_read_f.html` (section 11 and the closed hosted-rerankers and design-question blocks), `20_read_z.html` (footer, closes the tab). `20_read_c.html` and `20_read_e.html` carry the CSS of the two widgets moved in from lab tabs, scoped under `#rr-ba-box` and `#rr-mx-box`.
- JS: `23_rr_lib.js` (chart and legend helpers), `24_rr_rd.js` and `25_rr_rd2.js` (inline charts, widgets and steppers), `26_rr_ba.js` (section 4's reranked list, formerly the Before/after lab), `27_rr_mx.js` (section 8's MaxSim stepper, formerly the MaxSim lab), `28_rr_hero.js` (hero glyphs and section 10's sparse-vector chart).
- Depth chooser: `33_tab_depth.html` + `33_rr_dc.js`. Further reading: `39_tab_more.html`.
- `22_rr_data.js`: generated, do not edit.
- `inputs/sparse_rp.json`: the learned-sparse run of the sibling Retrieval pipeline page (its `src/out/sparse.json`, script `src/exp/sparse.py`, 2026-10-14), copied with its source named; `build_data.py` embeds the example vector and writes the `sp_*` facts; `check_data.py` checks the embedded copy.
- `ledger.json`: the knowledge ledger (`python3 html_utils/ledger.py check <page>`).

## Scripts (`scripts/`), run as `$RAG_SCRATCH/venv/bin/python -I -B scripts/<name>.py` (ColBERT ones with `$RAG_SCRATCH/colenv/bin/python`)
`RAG_SCRATCH` is the shared setup folder of the parent page (its `src/data/README.md`); every script loads the running example through the parent's `src/data/load.py` (via `rrlib.py`). Large outputs go to `$RAG_SCRATCH/rr/`.
- Deterministic, no lock: `e_depth.py` (K sweeps; checks the 60 cells it shares with the root's `src/pipe/out/rerank.json`), `e_scores.py` (scales, calibration, abstention, NFCorpus transfer), `e_examples.py` (candidate lists for the Before/after lab), `e_tokens.py` (tokens and parameters per pair, FLOPs model), `e_ce_manual.py` (a cross-encoder by hand on CPU, attention for the animation), colenv: `e_colbert.py` (storage, exhaustive MaxSim, query-augmentation ablation, ColBERT as reranker), `e_maxsim_pair.py` (token strings and similarity matrices), `e_plaid.py` (fast-plaid indexes at 2 and 4 bits, search-knob grid; CPU, limited to 2 threads), `e_llm_eval.py` (scores the LLM runs).
- Under the bench lock (MPS, generator or timing): `e_time.py` (per-claim rerank latency against K), `e_rerank_deep.py` (bge-reranker-v2-m3 and Qwen3-Reranker on the hybrid top 100), `e_train.py` (tiny fine-tuning run), `e_llm.py` (Qwen3-4B Q4_K_M in llama-server on port 8340: pointwise, listwise, pairwise).
- Score files shared with the root: `rrlib.rerank_scores` reads the setup's recorded scores, the root Pipeline lab's extra hybrid pairs (`$RAG_SCRATCH/pipe/rerank_extra`) and this page's (`$RAG_SCRATCH/rr/rerank_extra`), same models and settings, so every agent reads one score per pair.

## Downloads
None: every model and dataset came from the shared setup and the inference topic's model store.

## The 2026-10-24 rebuild to the teaching contract (editing, no new runs)
- **Top**: the core idea in one sentence; a hero (static annotated figure) placing bi-encoder, learned sparse, late interaction and cross-encoder by what each stores per abstract, what it pays per candidate and its SciFact nDCG@10 (ColBERT paper Figure 2's idea, redrawn with this page's numbers); "You need"; new terms. The old "six ideas" cards were deleted as restatements (their numbers live in the sections).
- **Labs moved inline**: the Before/after lab became section 4's reranked-list widget (it explains "averages hide losses"); the MaxSim lab became section 8's stepper beside the MaxSim formula. Neither moves until the reader acts: the Before/after list no longer flips to After by itself, and mode switches reset steppers without playing. The Depth chooser stays a tab (a tool used across sections).
- **New section 5, evaluating a reranker**, built from units that were scattered across the old mistakes list and section 4. The mistakes and interview sections were folded: each mistake now sits in the section it belongs to (truncation in 2, hard negatives in 3, recall ceiling in 4, timing in 5, thresholds in 6, template and listwise parsing in 7, uncompressed vectors in 9); interview answers that restated sections were deleted as fat; the system-design question is a closed block.
- **New section 10, learned sparse retrieval (SPLADE)**, which this page owns per the 2026-10-23 ownership plan: mechanism and formula from SPLADE v1 and v2 (pdf text checked 2026-10-24), the FLOPS regulariser, a real sparse document vector from the Retrieval pipeline page's run on SciFact (chart), its measured scores with the in-domain caveat, and published MS MARCO and BEIR numbers. Note: SPLADE v1 sums over positions; max pooling is v2's.
- **Distillation merged into training** (section 3) with Margin-MSE's formula; the per-paper distillation table, MS MARCO counts and the model-card table are in a closed block. Code quotes (sections 2, 7, 8), ECE and Platt scaling, published PRP/Setwise/FIRST numbers, run details of the LLM experiment, the root's agreement timing and the claim-selection rules are closed blocks.
- **Volatile**: hosted rerankers (Cohere, Voyage, Jina) are one compact dated table in a closed block.
- **Not done**: no real image; this is a mechanism page and the one canonical figure (ColBERT's paradigm figure) is redrawn as the hero rather than embedded.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 30.8 min | 31.6 min |
| Reading, closed details | 2.9 min | 7.0 min |
| Lab tabs, core | Before/after 2.8 + MaxSim 1.9 + Depth chooser 1.2 = 5.9 min | Depth chooser 1.2 min |
| Core total, excluding Further reading | 36.7 min | 32.8 min |
| Visuals counted in Reading (svg or canvas at least 120 x 80) | 5 | 6, plus the two moved widgets (HTML) and four hero glyphs |

Why about 32 minutes is right: the page now holds what three tabs held, plus a whole new owned subject (learned sparse, about 3 minutes) and an evaluation section, and still reads four minutes shorter in total. About 1.5 minutes of the core count are the 30 abstract titles of the reranked-list widget and its claim menu, which a reader scans rather than reads. Every remaining core unit in the ledger is needed to understand one of the four scorers, where a reranker goes, or what its numbers mean; provenance, code and per-paper tables moved to closed blocks (closed time grew from 2.9 to 7.0 minutes).

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
302 units: core 197, depth 63, fat 42. 288 were drafted from the old page by `ledger.py init`; 14 were added by hand (the new SPLADE section, the hero, and the two script-rendered tables whose summaries are written statically). Fat units carry a `note` (headings, restated "six ideas" cards, interview answers restating sections, tab cards for removed tabs). The hosted-rerankers row is kept here as a dated closed table rather than labelled volatile, because the brief asks for one compact dated table on the page.

## Topic close (2026-10-24)
New closed block at the end of Reading: the root's retired Pipeline lab units this page did not carry (0.765 dense and 0.778 hybrid at K 30, the 40-times cost ratio, the pairs scored for K 50 and why K 100 was not run). References to the root's Pipeline lab now name its shared runs or its sections 2 to 4. Header remeasured: 32 min, plus 8 in closed details. Every quoted sibling time now matches its header (`html_utils/check_times.py`); the ledger keys that quoted old times or tab names were re-pointed to the current text (problems 0).
