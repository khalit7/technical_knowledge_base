# LLM Architecture Gallery (rasbt) and the architectural deltas that matter: HTML-only page

Page: https://app.notion.com/p/3c65c17b0d0d81be8a07f2562fa2030a. `visual.html` replaces all of the page's text.

- `live.md`, `live_before_delete.md`: verbatim fetch of the live page (re-fetched 1 Oct 2026 and compared by script: identical apart from the signed embed URL). No child pages, databases or video; one `<embed>` (the old visual).
- `gen_data.py`: reads `src/models.yml` (gallery, Apache 2.0) and `src/configs/*.json` (Hugging Face config.json; unsloth mirrors for gated repos), writes `parts/15a_gal_data.js` and `src/recompute_report.txt` (84 of 86 gallery KV figures matched; MiMo-V2-Flash and V2.5 differ).
- `recompute.py`: every number the page states and every default the HTML reproduces (`src/recompute_page.txt`).
- `parts/`: HTML and one JS file per `<script>`; `build.sh` assembles `visual.html` (links `{{text|url}}`, aliases `@name`, `n:<notion id>`), fails on em-dashes or unexpanded links, fills reading time.
- `tabshot.mjs`, `clip.mjs`, `anim.mjs` (screenshots), `check.mjs` (exercises every control, both widths), `render.mjs` + `mk_coverage.py` -> `coverage.json`.
- `viz_ideas.md`: ranked ideas, data, formulas, rejections.

Rebuild: `python3 gen_data.py && sh build.sh && node check.mjs`.
