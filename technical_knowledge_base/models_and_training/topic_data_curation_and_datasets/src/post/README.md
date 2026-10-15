# Post-training data lab (root tab `t-post`, prefix `pt-`)

Parts: `parts/35_tab_post_a.html` to `_e.html` (HTML and scoped CSS), `parts/35_js_pt_0data.js` (generated data,
`window.PTD`), `35_js_pt_1core.js` (helpers, every number quoted in prose), `_2browse.js` (example browser),
`_3filter.js` (filter animation), `_4check.js` (answer checkers, contamination checker), `_5reph.js` (rephrasing
before/after). Built 2026-10-15.

## Pipeline (all CPU; run with the shared venv, `DC_SCRATCH` set, `nice -n 15`, 4 threads)

| Step | Script | Output | Time (rough, shared machine at load 20 to 37) |
|---|---|---|---|
| 1 | `pt_stats.py` | `out/stats.json`, `$DC_SCRATCH/post/stats_rows.jsonl.gz` | 5 min |
| 2 | `run_checkers.sh` (runs `pt_checkers.py` with `$DC_SCRATCH/post/pylib` and the open-instruct clone on `PYTHONPATH`) | `out/checkers.json`, `$DC_SCRATCH/post/checkers_ref.jsonl.gz` | 8 min |
| 3 | `pt_filter.py` (same `PYTHONPATH`) | `out/filter.json` | 9 min |
| 4 | `pt_rephrase.py` | `out/rephrase.json` | 3 min |
| 5 | `pt_make_data.py` | `../parts/35_js_pt_0data.js` | 1 min |
| 6 | `node src/post/check_pt.mjs index.html` (from the repo root, with the page path) | data and prose checks, page clicks | 2 min |

Pending GPU work: `run_pending.sh` (Qwen3-1.7B answers 1,500 RLVR prompts for the checker comparison on model
output, about 1 to 1.5 hours on the M1 Pro GPU, then steps 2 to 5 again). The rephrasing job belongs to the Synthetic
data child (`synthetic_data/src/scripts/run_pending.sh`); step 4 picks up its output automatically.
A CPU smoke test of the generation was tried and stopped: 0.2 tokens per second on the loaded machine.

## Reuse (for the post_training_data child page)
- `pt_common.py`: `records(key)` gives every sample as one record shape; `ntok`, `near_dup_clusters`, `quantiles`.
- Contamination is never recomputed here: `pt_make_data.py` imports the Decontamination child's `dg_common.py` and
  `dg_contam.py`, re-scores the shown pairs and asserts equality with that page's recorded `cov8` and 13-gram counts.
- `pt_checkers.py` and `pt_filter.py` call Ai2's code from open-instruct commit 72f46040 (clone in
  `$DC_SCRATCH/src/open-instruct`), so their verdicts are Tulu 3's, not reimplementations.

## Extra packages (not in the shared venv)
`$DC_SCRATCH/post/pylib`, installed with `uv pip install --target` (versions in SETUP.md, pt section):
antlr4-python3-runtime 4.11.0 (sympy's LaTeX parser, needed by open-instruct's `is_equiv`), math-verify 0.8.0,
latex2sympy2_extended 1.11.0, langdetect 1.0.9 (open-instruct's `if_functions.py`).

## Choices and departures
- Example rows are chosen by reading (`SHOW` and `pick_rows` in `pt_make_data.py`): each kind of row and each rule
  that fires; rows from WildChat and the adversarial safety subsets only where the prompt is harmless.
- The "simple quality filter" uses Ai2's own post-hoc filters for the Tulu 3 SFT mixture, not rules invented here;
  the extra rules (ties, identical texts, unrewardable labels, contamination) are named as defined here.
- Sample shares are not mixture shares (the SFT sample is 1,000 rows from each of five subsets); the page says so.
