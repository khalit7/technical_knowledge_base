# xAI / SpaceXAI: Grok (v3, HTML-only page)

Build: `./build.sh` assembles `visual.html` from `parts/` (one `<script>` per JS part, tab wiring last, hidden `#jsErr` box and global error handler). Links in parts are `{{text|@alias}}` or `{{text|n:<notion id>}}`; aliases are in build.sh.

- `live.md`, `live_before_delete.md`: verbatim fetch of the live page (re-fetched and confirmed identical on 1 Oct 2026).
- `viz_ideas.md`: ranked visualisations, data, formulas, rejections, methodology gaps.
- `recompute.py`: recomputes every reproduced default (Grok-1/2 parameter counts, KV cache, Terminal-Bench gaps, index gaps, blended prices, Colossus rates, the 200K price cliff, the disclosure window).
- `coverage.json` (from `mk_coverage.py`): every fact in live.md, where the HTML carries it, kept or corrected, with a probe string checked against visual.html.
- `check.mjs`: exercises every control in both themes at 920 and 390 px; `tabshot.mjs <tab> <scheme> <width> <out> [click]` screenshots a tab (or `SEL=#id`).
- `src/`: saved sources (S-1 text, xAI docs, Wayback captures of xAI posts, Artificial Analysis, Adversa, The Hacker News, news articles).

Tabs: Reading (What xAI is, Owner and name, Colossus, Grok-1, Grok 1.5 to 4.5, Heavy, Training, Grok 4.6, Grok 4.7, Current models, Posture and security, Mistakes), Lineage, Price and position, Further reading.
