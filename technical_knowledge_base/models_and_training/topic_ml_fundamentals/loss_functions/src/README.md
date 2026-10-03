Source of the interactive HTML on the Notion page "Loss functions" (child of Topic: ml-fundamentals).

Build: `python3 mk_data.py` (only when `inputs/` change), then `sh build.sh` writes `../index.html`.

Shape: Part B of `html_utils/methods/topic_pages.md` (a child page). Reading follows the subject's own logic: in one screen (target and noise to loss table), terms and reductions, regression (losses as noise models, which number each loss picks, the outlier animation, leverage), MAPE / quantiles / counts / variances, the cross-entropy family, margins, losses on the logits (z-loss, soft-capping), between distributions (links), the adversarial loss, common mistakes. Tabs: Fit a line, Loss shapes, Further reading. The parent's loss explorer, entropy + KL bars, Training lab and imbalance runs are linked by tab name, not rebuilt.

Files:
- `parts/`: HTML and one JS part per visual; `21_js_core.js` holds every formula, fit and minimiser (pure functions).
- `inputs/`: `anscombe.csv`, `starsCYG.csv`, `rivers.csv` (Rdatasets mirrors of R's datasets and robustbase), `real_logits.json` (from `real_logits.py`), `torch_docstrings.txt` (PyTorch 2.14 loss docstrings), `source_extracts.txt` (verbatim quotes used on the page).
- `real_logits.py`: float32 logits of GPT-2, SmolLM2-135M and Qwen2.5-0.5B on one sentence; log Z, cross entropy, and bf16 damage at shifts of the logit level. `OMP_NUM_THREADS=2 HF_HUB_OFFLINE=1 uv run --with torch --with transformers python real_logits.py`.
- `check_core.mjs` + `recompute.py`: runs the page's JS on the page's data, then recomputes everything with PyTorch losses and autograd and SciPy (linprog, BFGS, bounded search). `node check_core.mjs && OMP_NUM_THREADS=2 uv run --with torch --with scipy --with numpy python recompute.py` (99 checks, 0 failures; results in `check/`).
- `check_page.mjs`: drives every control and animation step in headless Chrome and fails on script errors, NaN, undefined or Infinity.
- `coverage.json`: every fact of `live.md` and where the page carries it. `viz_ideas.md`: ranked ideas.
