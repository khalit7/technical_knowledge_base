# Mixture-of-Experts (MoE) models: HTML-only page

Replaces all text of https://app.notion.com/p/3c65c17b0d0d810080cce6648ac8f2f2. The page has no child pages, databases or video.

- `sh build.sh` assembles `visual.html` from `parts/` (each JS part in its own `<script>`, tabs last, hidden error box) and expands `{{text|@alias}}` links.
- `python3 recompute.py` recomputes every reproduced default from `src/` configs.
- `node render.mjs` writes `rendered.txt`; `python3 mk_coverage.py` writes `coverage.json` against `live.md`.
- `node tabshot.mjs <tab> <light|dark> <width> <out.png>` screenshots; `node check.mjs <scheme> <width>` exercises every control and checks for errors and NaN.

Tabs: Reading, Total and active, The MoE landscape, Further reading.
