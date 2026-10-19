# MiniMax: HTML-only page (v3)

Replaces all text of https://app.notion.com/p/3c65c17b0d0d813ba1c0cb4ba00659b8 . No child pages, databases or video; the old embed "Interactive: MiniMax" is superseded.

- `./build.sh` assembles `visual.html` from `parts/` (each script in its own `<script>`, error box from `parts/05z_errbox.js.html`, tab wiring last; `{{text|@alias}}` links expanded; reading time and resource total filled in).
- Tabs: Reading (with the lightning stepper, layer strip, SWA ablation chart, claims table, kernel widget, the "one decoded token, three ways" animation, CISPO widget, MoE rebuild table, request-cost widget), Cost by context, Lineage, Further reading.
- `recompute.py` / `recompute.out`: every reproduced default. `mk_coverage.py` -> `coverage.json` (each live.md fact with a substring check against visual.html).
- Checks: `node tabshot.mjs <tab> <light|dark> <width> <out.png>`; `node check.mjs <light|dark> <width>` exercises every control (NaN/undefined/errors, error box hidden, no sideways scroll, link attributes). Sources in `src/`.
