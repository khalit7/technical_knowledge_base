# Moonshot AI: Kimi, HTML-only page (v3)

Replaces all the text of https://app.notion.com/p/3c65c17b0d0d81f5abf5dbdbac821a12 with one self-contained interactive page.

- `live.md`, `live_before_delete.md`: the page as fetched on 1 Oct 2026 (no child pages, databases or video; one existing embed).
- `parts/`: source. `build.sh` assembles `visual.html` (each script in its own `<script>`, error box, link aliases `{{text|@alias}}` / `{{text|n:<notion id>}}`, reading time and resource total).
- `recompute.py`: every default recomputed from `src/` (configs, HF safetensors counts, papers).
- `viz_ideas.md`: ranked ideas, data, formulas, rejected ideas.
- `coverage.json` (`mk_coverage.py`): every fact of live.md and where the HTML carries it.
- `check.mjs`: exercises every control at 920/390 px in both themes, checks NaN/undefined, sideways scroll, error box, animation frames and reduced motion. `shots.mjs`, `sec.mjs`, `tabshot.mjs`: screenshots into `shots/`.

Tabs: Reading (with the KDA against full-attention animation, Newton-Schulz stepper, QK-Clip, delta-rule sandbox, hybrid-ratio chart, Quantile Balancing, AttnRes), Parameters and memory, Lineage, Further reading.
