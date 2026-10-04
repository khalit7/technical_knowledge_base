# Source of the Eval harnesses page

`sh build.sh` writes `../index.html` from `parts/`. Shape: topic-page child (Part B of `html_utils/methods/topic_pages.md`): Reading (in one screen, unit of work with the animation, scoring, each harness, app-level tools, reproducibility, sandboxes, which one, contributing, mistakes), two tabs (One task, every harness; Inside a run log), Further reading. Departure: the tabs show real files and real logs rather than a comparison of scores, because the parent's tab "Same model, many harnesses" owns the score spreads.

## Pipeline
1. `save_inputs.py <clones dir> <web dir>`: copies the exact lines shown from shallow clones of each repository (inspect_evals and promptfoo fetched from raw.githubusercontent.com at a pinned commit, recorded in a PIN file) into `inputs/`, with `sources.json` (repo, commit, date, path, lines, permalink). `inputs/versions.json`: PyPI and npm versions checked 4 Oct 2026.
2. `run_harnesses.sh <venv> <out> 10`: Qwen2.5-0.5B-Instruct on the first 10 GSM8K test problems under lm-eval 0.4.13 (`gsm8k` as shipped) and inspect-ai 0.3.276 + inspect_evals 0.23.0 (`gsm8k` as shipped, plus `do_sample=False`, fp32, 512 max tokens). CPU, 2 threads: 132 s and 763 s. Venv: Python 3.12 (uv-managed; Homebrew 3.11 has a broken ssl module on this machine), `lm-eval[hf]==0.4.13 inspect-ai==0.3.276 inspect-evals==0.23.0 torch transformers accelerate`, and for the bench lighteval from commit c2af9e5 installed `--no-deps` with `sympy latex2sympy2_extended==1.0.6`.
3. In that venv: `mk_runs.py <out> data` (runs.json, trimmed logs, real token counts), `compute_extract.py <out> data/extract.json` (seven extraction rules on 20 outputs), `gsm8k_checks.py data/gsm8k_checks.json` (dataset revisions identical; 18 answers above 99,999).
4. `python3 mk_data.py` writes `parts/22_js_data.js`; `python3 recompute.py` checks 62 facts and the page's JavaScript extractors against the harnesses' code.
5. Checks: `node src/check_ui.mjs` from the repo root (every control at 390 dark and 920 light) and `sh html_utils/checkpage.sh`.

`live.md` is the old Notion page (fetched 22 Sep 2026, saved by `save_live.py` from the session transcript); `coverage.json` maps each of its facts.
