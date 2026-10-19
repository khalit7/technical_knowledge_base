# Zhipu: GLM, HTML-only page (v3)

- `live.md`, `live_before_delete.md`: the Notion page as fetched on 2026-10-01 (no child pages, databases or video).
- `parts/`: source. `build.sh` assembles `visual.html` (each script in its own `<script>`, error box, tabs wiring last; `{{text|@alias}}` links expand to external links, `n:<id>` to Notion pages).
- Tabs: Reading (with the hybrid-attention and slime animations and small inline visuals), Long-context cost, Lineage, Further reading.
- `recompute.py`: every derived number, from `src/cfg_*.json` (config.json files from Hugging Face) and published prices.
- `check.mjs`: exercises every control on every tab at 920/390 px, light/dark; `tabshot.mjs`, `shot.mjs`: screenshots (`shots/`).
- `coverage.json` (built by `mk_coverage.py`): every fact in live.md and where the HTML carries it, or why it was corrected or dropped.
- `viz_ideas.md`: scored ideas, data, formulas, rejections.
