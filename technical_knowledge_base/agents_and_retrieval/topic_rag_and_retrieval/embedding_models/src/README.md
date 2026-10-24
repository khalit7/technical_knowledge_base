# src: Embedding models: training, choosing and fine-tuning

Build: `python3 build_data.py && sh build.sh` writes `../index.html` from `parts/`. `build_data.py` turns `data/*.json` (plus two committed outputs of the parent's Vector search lab, `../../src/vec/out/contrastive.json` and `models.json`) into `parts/22_emb_data.js` and `facts.json`; numbers in the prose are written `@@key@@` and filled from `facts.json` by `build.sh`, so prose and data cannot disagree. A result whose GPU run has not been made shows a visible "pending run" marker (listed in `facts.json` under `_pending`).

Checks: `$RAG_SCRATCH/venv/bin/python -I -B check_data.py` (embedded data equal the recorded data, no development data, every fact present, literal numbers from the parent and siblings recomputed from their committed outputs, one value recomputed from the shared artefacts, privacy, size); `node check_page.mjs ../index.html <shots dir>` (every control at 390 px dark and 920 px light; puppeteer from html_utils via createRequire; npm with `NPM_CONFIG_USERCONFIG` pointing at an empty file); `sh html_utils/checkpage.sh <this page folder>` from the repo root.

Shape: a child page of Topic: rag-and-retrieval (`.claude/skills/explainer-page/page-kinds/topic-child.md`), rebuilt on 2026-10-24 to the teaching contract (`teaching/teaching-contract.md`). Prefix `emb` for ids, classes and data keys; storage key `emb-tab`. Tabs: Reading and Further reading.

## Parts
- `01_head.html` (the root's CSS, own title), `05z_errbox.js.html`, `10_header.html` (subtitle with the measured reading time), `21_js_rd_common.js` and `99_js_tabs.js` (the explainer-page skill templates: nothing moves before the reader acts).
- Reading: `20_read_a.html` (styles, nav, the idea in one screen: core sentence, hero, you need, new terms; section 1), `20_read_b.html` (2 to 4), `20_read_c.html` (5, with the training view), `20_read_d.html` (6 to 9), `20_read_e.html` (10 to 12 and the closed depth block), `20_read_z.html` (footer, closes the tab).
- JS: `22_emb_data.js` (generated, do not edit), `23_emb_lib.js` (charts, bars, intervals), `24_emb_rd.js` (pooling stepper, code quotes, false negatives, predict boxes), `25_emb_rd2.js` (fine-tune results, prompts, lengths, domains, MTEB, subsampling), `26_emb_rd3.js` (hero, similarity figure, batch matrix, smaller-vectors slider), `31_emb_tl.js` (the training view, section 5; was the Training lab tab), `32_emb_ch.js` (the chooser, section 11; was the Model chooser tab). Further reading: `39_tab_more.html`.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core sentence, a static hero (query and document through the same model separately, meeting at the cosine, each part labelled with its section), "You need", nine new terms. The seven "bets" cards were deleted as restatements of their sections (ledger: fat, each pointing to the section that keeps the number).
- **Every core idea has its visual inline**: pooling (existing stepper), bi- against cross-encoder (cost table), similarity (new 2-D figure of the worked example), the loss (new batch-matrix diagram, then the formula), false negatives (existing bars and one example; two more in a closed block), the fine-tune (existing seed chart), what training does to the vectors (the Training lab, moved inline), prompts (existing interval chart), smaller vectors (new slider over the parent's `mrl_quant.json`, see below), long inputs, domain shift, MTEB, choosing (the Model chooser, moved inline), subsampling.
- **Ownership** (OWNERS.md: this page owns Matryoshka truncation and quantised embeddings): section 7 now draws truncation x precision x rescoring from the parent's committed output (`../../src/vec/out/mrl_quant.json`, read by `build_data.py` into `EMB.mq`), where it used to defer to the parent's Vector search lab. InfoNCE in general links to Contrastive and self-supervised learning (its tab "One real batch" is now inline there, so the link names the section), CLIP-style encoders to Vision encoders, indexes to Vector indexes, rerankers and ColBERT to the rerankers page.
- **Added**: multilingual models (Qwen3-Embedding card: 100+ languages; BGE-M3, arXiv 2402.03216; MMTEB's 250+ languages), read 2026-10-24; three remedies for false negatives and the "setup" reason for leaderboard gaps (both from the old interview answers).
- **Depth in closed blocks**: pooling code and the five-model table, the library's loss and gradient caching, the fine-tune setup and result table, every run, e5's document prefix, the per-limit truncation table, SciFact's train/test shift, MTEB scoring per task type, the chooser's full table, the training-loop code, the dated roster table (volatile; one table, built by `build_data.py` as `roster_table`), two system-design questions.
- **Deleted as fat**: the bets, the common-mistakes block (each restated a section), six interview questions whose answers restated sections, tab pointers and wind-ups. `tr_reading` (in `build_data.py`) became a numbered list with the same numbers.
- **No autoplay**: both animation controllers are `RD.anim` from the template; `check_page.mjs` steps every control.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 34 min | 27 min |
| Reading, closed details | 3 min | 10 min |
| Other tabs, core (Training lab, Model chooser) | 4.7 min | none (moved inline) |
| Further reading | 2.3 min | 2.2 min |
| Visuals drawn in Reading | 10 (2 more in tabs) | 16 |

Why 27 minutes is right: the page owns a wide subject (architecture and pooling, the loss, negatives, a measured fine-tune, prompts, Matryoshka and quantisation, length, domains and languages, MTEB, choosing, fine-tuning) and nearly every remaining core unit is a measured number with its interval or a rule the measurements justify; about a fifth of the core words are captions and readouts of the visuals. Core reading over the whole page fell from about 39 to 27 minutes while the labs moved inline and section 7 gained its explorer; the closed time grew because code, tables, the run list and the setup now sit in closed blocks instead of the core.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
338 units: core 235, depth 31, fat 67, owned 2 (InfoNCE's temperature, at Contrastive and self-supervised learning), volatile 3 (the hosted-model roster, EmbeddingGemma 2, the dated roster table: kept in the one closed dated table). 325 drafted by `ledger.py init` from the 2026-10-19 page; 13 added by hand for script-drawn visuals, the new section 7 numbers, the multilingual facts and the roster table (`added`). Fat units carry a `note`.

## Checks (2026-10-24)
`sh html_utils/checkpage.sh` fail=0, emdash 0, errbox 1, clipped 0; `node check_page.mjs ../index.html <shots>` OK (tabs now Reading and Further reading); `check_data.py` ALL OK (the independent recompute is skipped without `RAG_SCRATCH`); ledger problems 0.

## Scripts (`scripts/`), run as `$RAG_SCRATCH/venv/bin/python -I -B scripts/<name>.py`
`RAG_SCRATCH` is the shared setup folder of the parent page; every script loads the running example through the parent's `src/data/load.py` (via `emblib.py`). Large outputs go to `$RAG_SCRATCH/emb/`.
- Deterministic, CPU, no lock (done): `e_pooling.py` (pooling and normalisation rebuilt by hand for five models; code quotes), `e_anim.py` (one claim through three models), `e_mine.py` (hard-negative pools for the fine-tune, false-negative rates, examples), `e_losscheck.py` (our loss against sentence-transformers' MNRL; gradient cache against plain back-propagation), `e_prefix.py queries` (query-side prefixes and instructions, CPU float32), `e_long.py stats` (token lengths, evidence positions), `e_choose.py` (bootstrap intervals, paired comparisons, subsampling, choose-on-train), `e_mteb.py` (run with `$RAG_SCRATCH/mapenv/bin/python`, which has mteb 2.24.13).
- GPU, bench lock: `e_prefix.py e5` and `e_long.py embed` were run on 2026-10-15 00:50 to 00:59 (MPS, load average 31 to 61 from another topic's niced CPU jobs; the relevance numbers are deterministic, the seconds per corpus in data/ are distorted). The fine-tune (`e_train.py`, 18 runs) was run on 2026-10-15 07:36 to 09:04 (MPS, load average 4 to 21, browser and light jobs; one run per process after an MPS out-of-memory in a long multi-run process), then `e_ftstats.py` and `e_lab.py`. An earlier attempt (2026-10-15 00:59 to 01:59) was stopped: the machine was swapping (27.5 GB of swap used, 20% memory free) and another process kept the GPU about 48% busy, so a single forward and backward pass of 16 abstracts did not finish in 5 minutes; the base evaluation (inference only) did reproduce 0.7127 / 0.343. Exact sequence in `scripts/run_pending.sh`. `e_train.py --smoke` runs end to end on CPU at toy size (used to build the Training lab with `EMB_DEV=$RAG_SCRATCH/emb/lab_dev.json`; `check_data.py` fails if development data is embedded).

## Pending runs
None. `scripts/run_pending.sh` records the sequence used.

## Downloads
- intfloat/e5-small-v2 at revision ffb93f3b (safetensors sha256 checked), under the download lock, recorded in the shared SETUP.md.
- The MTEB results repository (github.com/embeddings-benchmark/results), blobless sparse clone of 45 file patterns (41 MTEB(eng, v2) tasks, SciFact, NFCorpus, HotpotQA, model_meta) at commit 34a44096 (2026-10-14), in `$RAG_SCRATCH/emb/dl/`, under the download lock.

## Inputs read from other agents' scratch outputs
- `$RAG_SCRATCH/pipe/scifact_orig/` (the original SciFact release extracted by the parent's Pipeline lab): evidence sentence positions and claim kinds.
