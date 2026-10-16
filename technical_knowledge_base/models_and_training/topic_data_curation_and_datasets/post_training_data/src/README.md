# Post-training data (source; prefix pd)

Child 7 of Topic: data-curation-and-datasets. Built 2026-10-15. `sh build.sh` writes `../index.html` from `parts/`,
`data/pd_data.json` (embedded as `window.PD`) and `data/facts.json` (prose numbers, written `@@key@@`).
`build_data.py` makes both from the recorded runs in `data/out/` and `inputs/hf_statistics/`.

## Layout
- `parts/`: `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` copied from the root (storage key
  `pd-tab`); `10_header.html`; Reading `20_read_a` (CSS, nav) to `20_read_z`; `22_pd_rd1.js`, `23_pd_rd2.js`, `24_pd_rd3.js` (Reading
  visuals: Self-Instruct filter animation, mixtures, lineage, generators, traces, token mask, binarization animation,
  length bias, extractor animation, pass rates, mutation testing, environments, trajectory animation, overlap and
  contamination); `31_*` Dataset atlas, `32_*` Pair inspector, `33_*` Checker lab, `39_tab_more.html`.
- `scripts/`: every measurement (below). `notes/`: `sources.md` (verified published facts with quotes and table
  checks), `judge_labels.md`, `code_survivors.md`, `contam_read.md` and `contam_labels.json` (hand labels).
- `inputs/`: `pd_manifest.jsonl` (every sample: repo, commit, files or row groups, sha256), `hf_statistics/` (full-set
  compositions), `seed_tasks.jsonl` (Self-Instruct's 175 seeds; three fictional example e-mail addresses rewritten to example.com).
- `check_page.mjs`: data and prose checks plus every control at 390 dark and 920 light.
- `coverage.md`: the old "Synthetic data and post-training data" page's post-training claims, verified or corrected.
  `viz_ideas.md`: visuals built and rejected.

## Runs (Apple M1 Pro CPU, 2026-10-15, nice 15, 2 to 4 threads; shared venv; large outputs outside the repo, under the shared setup folder dc/pd/)
| Script | What |
|---|---|
| `pd_get.py` | samples and whole files (manifest); `pd_stats_api.py`: HF statistics |
| `pd_selfinst.py` | ROUGE-L of every instruction against every other (Alpaca 52k, Dolly 15k, seeds) |
| `pd_sft.py` | lineage metrics, tulu-template masking, near duplicates, lid.176 |
| `pd_pref.py` | 8 preference sets; UltraFeedback raw binarization rules and rating-length correlation |
| `run_check.sh pd_check.py`, `pd_check_sum.py` | 6 extractors on 12,358 R1 answers, two views |
| `run_check.sh pd_rlcheck.py` | OLMo 3 RL rollouts re-checked (math extractors, open-instruct IFEvalVerifier) |
| `pd_code.py 300 50` | mutation testing in a sandbox-exec sandbox |
| `pd_env.py` | SWE task rows and trajectories |
| `pd_contam.py`, `pd_contam_pairs.py` | the Decontamination child's scanner on 8 sets; IFEval check |
| `pd_quality.py` | prompt reuse and exact overlap across sets |

Reused, not rebuilt: the root lab's `src/post/pt_common.py` (records, tokenizer, MinHash) and `pt_checkers.py`
(extractors); the Decontamination child's `dg_contam.py` and `dg_common.py`; open-instruct at commit 72f46040.

## GPU run (`scripts/run_pending.sh`, 2026-10-16)
Qwen3-4B (Q4_K_M GGUF, llama.cpp, M1 Pro GPU, 4 parallel requests, `-cram 0`) scores both answers of 300 UltraFeedback
H4 pairs, each pair in both orders (600 calls); `pd_pending_sum.py` writes `data/out/pending.json` (position bias,
consistency, agreement with GPT-4, length preference); Reading section 6 shows it. Dropped by Khalid's decision of
2026-10-15 (cost against what they teach): local answers to OpenR1 problems (the Checker lab uses R1's and OLMo 3's
real answers) and our own delta pairs (the Dolci DPO sample and Geng et al., arXiv 2507.06187, cover it). The page says
"not run here" for both. Scripts for them remain in `pd_generate.py` (modes `answers`, `delta`).

## Departures from the method
- Child-page shape (Part B). Three labs instead of one data tab, as the brief asked: a dataset atlas, a pair inspector
  and a checker lab. The root's lab already has a per-dataset browser and checkers on reference solutions; these labs
  add other datasets, other measurements and model answers, and link the root's lab instead of repeating it.
- Quoted dataset text keeps its wording except em dashes, shown as a spaced hyphen (house style).
- WildChat and other real-user rows are counted but not shown; examples are synthetic or public task rows.
