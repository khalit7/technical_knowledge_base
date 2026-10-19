# Other notable providers (v3, HTML only)

Build: `./build.sh` assembles `visual.html` from `parts/` (each JS part in its own `<script>`, tab wiring last, hidden error box). Links are written `{{text|url}}` or `{{text|n:<notion id>}}`.

- `live.md`, `live_before_delete.md`: verbatim fetch of the live page, re-verified 2026-10-01.
- `parts/03-05_read_*.html`: Reading tab; `06_tabs.html`: Compare labs and Scale and sparsity; `07_more.html`: Further reading.
- `parts/15a_cmp_data.js`, `parts/16a_size_data.js`, `parts/14a_aa_data.js`: data, each value from a linked source.
- `recompute.py` / `recompute.out`: every default recomputed (KV caches from `cfg/`, Mamba state, crossover, weight memory, sparsity, prices, AA cost frontier, INTELLECT-1 utilisation, SOLAR layers).
- `check.mjs`: exercises every control at 920 and 390 px in both themes; `tabshot.mjs`: screenshots (in `shots/`).
- `mk_coverage.py` -> `coverage.json`: every fact in live.md mapped to where the HTML carries it, plus stale claims corrected and items left unconfirmed.
- `viz_ideas.md`: ranked visual ideas, formulas, rejected ideas.
- `src/`: fetched sources.
