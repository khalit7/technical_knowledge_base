# src: Embedding models: training, choosing and fine-tuning

Build: `python3 build_data.py && sh build.sh` writes `../index.html` from `parts/`. `build_data.py` turns `data/*.json` (plus two committed outputs of the parent's Vector search lab, `../../src/vec/out/contrastive.json` and `models.json`) into `parts/22_emb_data.js` and `facts.json`; numbers in the prose are written `@@key@@` and filled from `facts.json` by `build.sh`, so prose and data cannot disagree. A result whose GPU run has not been made shows a visible "pending run" marker (listed in `facts.json` under `_pending`).

Checks: `$RAG_SCRATCH/venv/bin/python -I -B check_data.py` (embedded data equal the recorded data, no development data, every fact present, literal numbers from the parent and siblings recomputed from their committed outputs, one value recomputed from the shared artefacts, privacy, size); `node check_page.mjs ../index.html <shots dir>` (every control at 390 px dark and 920 px light; puppeteer from html_utils via createRequire; npm with `NPM_CONFIG_USERCONFIG` pointing at an empty file); `sh html_utils/checkpage.sh <this page folder>` from the repo root.

Shape: a child page of Topic: rag-and-retrieval (method `html_utils/methods/topic_pages.md`, Part B). Reading tab in the subject's order (one screen, what the model is, bi vs cross, similarity, the loss, hard and false negatives, the tiny fine-tune, instructions, smaller vectors, long inputs, domain shift, MTEB, choosing, fine-tuning for real, mistakes, interview), two labs (Training lab, Model chooser) and Further reading. Prefix `emb` for ids, classes and data keys; storage key `emb-tab`. Departure from the brief: no truncation and quantization explorer (the parent's Vector search lab has one on the same vectors; linked).

## Parts
- `01_head.html` (the root's CSS, own title), `05z_errbox.js.html`, `10_header.html`, `21_js_rd_common.js` (root's animation controller), `99_js_tabs.js` (storage key `emb-tab`).
- Reading: `20_read_a.html` (styles, nav, sections 0 and 1) to `20_read_d.html` (10 to 15), `20_read_z.html` (footer, closes the tab). JS: `23_emb_lib.js` (charts, bars, intervals), `24_emb_rd.js` (pooling animation, code quotes, push widget, false negatives, predict boxes), `25_emb_rd2.js` (fine-tune results, prefixes, lengths, domain shift, MTEB, subsampling).
- Labs: `31_tab_train.html` + `31_emb_tl.js` (Training lab); `32_tab_choose.html` + `32_emb_ch.js` (Model chooser). Further reading: `39_tab_more.html`.
- `22_emb_data.js`: generated, do not edit.

## Scripts (`scripts/`), run as `$RAG_SCRATCH/venv/bin/python -I -B scripts/<name>.py`
`RAG_SCRATCH` is the shared setup folder of the parent page; every script loads the running example through the parent's `src/data/load.py` (via `emblib.py`). Large outputs go to `$RAG_SCRATCH/emb/`.
- Deterministic, CPU, no lock (done): `e_pooling.py` (pooling and normalisation rebuilt by hand for five models; code quotes), `e_anim.py` (one claim through three models), `e_mine.py` (hard-negative pools for the fine-tune, false-negative rates, examples), `e_losscheck.py` (our loss against sentence-transformers' MNRL; gradient cache against plain back-propagation), `e_prefix.py queries` (query-side prefixes and instructions, CPU float32), `e_long.py stats` (token lengths, evidence positions), `e_choose.py` (bootstrap intervals, paired comparisons, subsampling, choose-on-train), `e_mteb.py` (run with `$RAG_SCRATCH/mapenv/bin/python`, which has mteb 2.24.13).
- GPU, bench lock (PENDING, waiting for a slot): `e_prefix.py e5`, `e_long.py embed`, `e_train.py` (all arms and seeds), then on CPU `e_ftstats.py` and `e_lab.py`. Exact sequence in `scripts/run_pending.sh`. `e_train.py --smoke` runs end to end on CPU at toy size (used to build the Training lab with `EMB_DEV=$RAG_SCRATCH/emb/lab_dev.json`; `check_data.py` fails if development data is embedded).

## Pending runs
| what | command | needs | about |
|---|---|---|---|
| e5-small-v2 with and without "query: " / "passage: " on SciFact and NFCorpus | `e_prefix.py e5` | MPS, corpus re-embedded 4 times | 4 min |
| truncation sweep (bge-small and MiniLM at 64 to 512 tokens) and wrong-pooling retrieval | `e_long.py embed` | MPS | 6 min |
| tiny fine-tune: 6 arms x 3 seeds, bge-small on SciFact train | `e_train.py inbatch bm25 dense dense_f --seeds 0,1,2 --epochs 2` then `e_train.py inbatch8 inbatch128 --seeds 0,1,2 --epochs 2` | MPS | 60 to 90 min |
| statistics and lab data | `e_ftstats.py`, `e_lab.py`, then `python3 build_data.py && sh build.sh` | CPU | 1 min |

## Downloads
- intfloat/e5-small-v2 at revision ffb93f3b (safetensors sha256 checked), under the download lock, recorded in the shared SETUP.md.
- The MTEB results repository (github.com/embeddings-benchmark/results), blobless sparse clone of 45 file patterns (41 MTEB(eng, v2) tasks, SciFact, NFCorpus, HotpotQA, model_meta) at commit 34a44096 (2026-10-14), in `$RAG_SCRATCH/emb/dl/`, under the download lock.

## Inputs read from other agents' scratch outputs
- `$RAG_SCRATCH/pipe/scifact_orig/` (the original SciFact release extracted by the parent's Pipeline lab): evidence sentence positions and claim kinds.
