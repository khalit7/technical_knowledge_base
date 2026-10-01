# Mistral AI, interactive page (v3)

`visual.html` replaces all the text of the Notion page "Mistral AI" (https://app.notion.com/p/3c65c17b0d0d814a9882e6ebc326fa56, child of Topic: llms). The page has no child pages, databases or video (only the old HTML embed), so one `replace_content` (embed first) is allowed. Old text: `live.md` (backup `live_before_delete.md`). `coverage.json` maps every fact to where the HTML carries it.

## Build
`./build.sh` concatenates `parts/` into `visual.html`: HTML `00_top`, `01_css`, `02_header`, `03_read_a` (intro, Mistral 7B, cache animation), `04_read_b` (Mixtral, MoE animation, routing chart, current line, lineage, Shieldstral/Robostral/Leanstral), `05_read_c` (training and GRPO calculator, licences and chooser, business, catalogue, AA position, which model, mistakes), `06_tabs` (Lineage, Weights and cache), `07_more`; then the jsErr box, `05z_errbox.js.html`, and one `<script>` per JS part: `10_js_common`, `11_js_swa`, `12_js_moe`, `13_js_read`, `14_js_line`, `15_js_fit`, `90_js_tabs`. Links are `{{text|@alias}}` or `{{text|n:<notion id>}}`; the build fails on unknown aliases and reports unexpanded links or em-dashes, and fills in reading time and resource time.

## Data and checks
- `recompute.py`: parameter counts and KV sizes from the configs in `src/` (`parts_params.json`).
- `factcheck.json`: every claim of the old text checked against sources (subagent); `src/` holds the fetched sources.
- `node tabshot.mjs <tab> <scheme> <width> <out>`, `node snap.mjs ...` (element shot after running JS); `shots/`.
- `node check.mjs` exercises every control in both themes and widths; `node check2.mjs` checks animation frames, reduced motion and the accounting table; `node render.mjs` writes `rendered.txt`; `python3 mk_coverage.py` writes and verifies `coverage.json`.
