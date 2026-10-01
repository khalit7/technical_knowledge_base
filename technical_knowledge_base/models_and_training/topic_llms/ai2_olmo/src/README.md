# Ai2: OLMo (fully open models), HTML-only page

Replaces all text of https://app.notion.com/p/3c65c17b0d0d81e08697df661f83c3ac. No child pages, databases or video on the live page.

- `./build.sh` assembles `visual.html` from `parts/` (one `<script>` per JS part, tab wiring last, hidden error box). Links are written `{{text|@alias}}` or `{{text|n:<notion id>}}`; aliases are in build.sh.
- `python3 mk_data.py` regenerates `parts/13a_tl_data.js` from the raw pulls in `src/` (W&B project ai2-llm sampled history and Hugging Face refs, pulled 1 Oct 2026; pull scripts `src/pull.py`, `src/pull2.py`).
- `python3 recompute.py` recomputes every derived number shown (6x ratio, GPU-hours, log wall clock, step-rate ratio, sampling factors, souping deltas).
- `python3 mk_coverage.py` writes `coverage.json` (every fact in `live.md` and where the HTML carries it; each probe is checked against visual.html).
- Checks: `node tabshot.mjs <tab> <light|dark> <width> out.png`, `node shot.mjs ...` (one element after clicks), `node check.mjs` (exercises every control at 920 px and at 390 px with reduced motion; reports errors, NaN/undefined text, error-box state).

Tabs: Reading (with the model-flow animation, question explorer, stage-score chart, Think 32B against Qwen 3 table), Training log (Olmo 3 32B/7B pretraining logs, post-training stages, OLMo 1.7 against OLMo 2 stability), Data mix (five stages, pool against mix), Further reading.
