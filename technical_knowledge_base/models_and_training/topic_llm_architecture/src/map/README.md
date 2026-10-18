# Architecture map tab (t-map, prefix am)

Root: Topic: llm-architecture. Built 2026-10-18 by the map agent. No GPU, no training: configs, papers and model cards only.

## Files
- `inputs/facts.yml`: one entry per model (46): date and its source, licence, published total and active parameters with their source, published context, norm placement, QK-norm, FFN activation, the "what changed" line. Every field links a paper, model card, announcement, or Sebastian Raschka's LLM Architecture Gallery (`models.yml`, Apache 2.0, a third-party list; used for 2025 to 2026 dates and some norm notes, marked "gallery").
- `inputs/configs/`: `config.json` copies (Hugging Face, fetched 2026-10-18; some copied from the gallery child page's inputs, which fetched them 2026-10-01). Gated Meta and Google repos come from public mirrors (unsloth, NousResearch, huggyllama) with the same shapes. GPT-3 and PaLM have no config: their shapes are in `facts.yml` (`arch`) from the papers' tables.
- `build_map.py` -> `out/map.json`, `out/report.txt`, `../parts/35_js_am_0data.js` (`window.AMD`). Per-layer mixer, FFN and position codes use the gallery's convention so the two pages agree.
- `shifts.py` -> `out/shifts.json`, `../parts/35_js_am_0shift.js` (`window.AMS`): the "Same model, two eras" stepper (5 targets, counters derived from configs) and the text of each shift (problem, how, cost, check, sources).
- `check_data.py`: page embeds exactly the data; 19 prose claims match the data; KV per token equals the gallery child page's figure for all 25 shared models.
- `check_controls.mjs`: clicks every control at 390 px dark (motion allowed) and 920 px light (reduced motion); fails on errors, NaN/undefined/null/Infinity text, sideways scroll, or SVG text past its box.

Rebuild: `python3 src/map/build_map.py && python3 src/map/shifts.py && sh src/build.sh && python3 src/map/check_data.py` (repo `.venv`), then `node src/map/check_controls.mjs index.html` from the repo root.

## Conventions and caveats
- KV per token: bf16, every cache-growing layer at full cost (the gallery's convention). "At 128K" credits sliding windows (a windowed layer keeps min(T, W) entries). Linear-attention state is fixed and reported apart.
- Context: the published value where a source states one; otherwise the config's `max_position_embeddings`, labelled "config".
- Dates: the first public weights or announcement, with the source named; arXiv v1 dates and Hugging Face repo-creation dates were used as cross-checks (repo creation precedes release).
- Not verified here: whether Nemotron 3 Super's few attention layers apply RoPE (config lists rope_theta; marked unconfirmed); Nemotron-H's NoPE rests on its config having no RoPE fields.
- DeepSeek-V4-Pro's compressed caches are not computed (link to the DeepSeek page).

## Departures from the map-tab shape
No "status" (maintained, deprecated) column: models are checkpoints, not tools. The "which one for which job" picker is by constraint and ranks models by the number that binds, rather than recommending one model.
