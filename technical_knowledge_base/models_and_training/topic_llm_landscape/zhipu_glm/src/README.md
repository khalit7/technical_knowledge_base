# Zhipu: GLM, HTML-only page (v3)

- `live.md`, `live_before_delete.md`: the Notion page as fetched on 2026-10-01 (no child pages, databases or video).
- `parts/`: source. `build.sh` assembles `visual.html` (each script in its own `<script>`, error box, tabs wiring last; `{{text|@alias}}` links expand to external links, `n:<id>` to Notion pages).
- Tabs: Reading (with the hybrid-attention and slime animations and small inline visuals), Long-context cost, Lineage, Further reading.
- `recompute.py`: every derived number, from `src/cfg_*.json` (config.json files from Hugging Face) and published prices.
- `check.mjs`: exercises every control on every tab at 920/390 px, light/dark; `tabshot.mjs`, `shot.mjs`: screenshots (`shots/`).
- `coverage.json` (built by `mk_coverage.py`): every fact in live.md and where the HTML carries it, or why it was corrected or dropped.
- `viz_ideas.md`: scored ideas, data, formulas, rejections.

## 2026-10-23 pilot: KV-cache sizing has one owner
Whole-model KV-cache sizing now lives only on [Long context](n:3fd5c17b0d0d81059ee1ce20c0326dc5) (KV-cache calculator, tab t-kv, 45 presets); this page keeps a one-line conclusion and a link. The "Long-context cost" tab became "Attention work": the cache chart, cache columns, cache budget slider, precision select, cache stats and the 368 KiB and 4.59x reproductions moved to the calculator (GLM-4.5, GLM-5/5.1, GLM-5.2/5.3 and GLM-5.3-Flash are presets there, with the 4.59x against 4.44x check). Kept, because the owner does not carry it: attention work per decoded token (chart, table, stats), the IndexShare 2.9x reproduction and the not-reproduced 3.01x. One summary sentence gives the cache per design. Core reading 32 min, unchanged. Removed units and where the owner carries them: `src/ledger.json` (`python3 html_utils/ledger.py check`). Also: animations no longer autoplay (they wait on step 0), a tab named in the URL hash opens, and the header reading time uses the "Reading: N min, plus M in closed details." format.
