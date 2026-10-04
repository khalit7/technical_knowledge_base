# ML system design: LLM and ML services (source)

- `build.sh` writes `../index.html` from `parts/` (same scheme as the parent root; Reading CSS in `02_read_css.html`, Reading parts `20_read_a.html` to `20_read_f.html`).
- `models.py`: Python copy of the page's three models (autoscaling burst, Gateway lab, prefix-cache turns) and the section 1 and section 14 arithmetic. `recompute.py` writes `recompute_out.json` and prints the figures quoted in the Reading; `node check_js.mjs` (run from `src/`) compares the page JS with it.
- `check/check_ui.mjs` (run from the repo root): clicks every control at 390 dark and 920 light, checks for errors, NaN, undefined and sideways scroll, saves card screenshots to `../.shots/`.
- `litellm_fallback.py`: the local LiteLLM 1.104.0 Router run (mocked providers, no network); output in `inputs/litellm_fallback_run.json`. Run with `LITELLM_LOCAL_MODEL_COST_MAP=True uv run --no-project --with litellm==1.104.0 python litellm_fallback.py` from a scratch directory.
- `inputs/`: research notes with verbatim quotes, URLs and versions (`research_*.md`, gathered 2026-10-04), the MLPerf latency rows, the LiteLLM run.
- `live.md`: the old Notion page verbatim; `coverage.json` maps every old fact to where it is carried, with verdicts.
- `viz_ideas.md`: visuals built and rejected.
- Shape: Part B of the topic method (child page). Departure: the Reading is organised as fourteen standalone sections following one request through the model layer, because the reader asked to be taught from zero and the subject is a set of building blocks rather than one mechanism; the length (about 50 minutes, 12,000 words with listings) is the child-page allowance.
- Shared figures with the parent: 2,209 tokens/s per H100 (Llama 3.3 70B FP8, TP2, TensorRT-LLM 8a9c66c), $3.99 per GPU-hour, derate 0.5, peak factor 2, m7i.xlarge $0.2016/h, 1M daily users x 10 messages, 1,000 input / 400 output tokens (the Scale simulator's defaults). Prices from `models_and_training/topic_llms/src/data/aa_snapshot.json` (2026-10-01).
