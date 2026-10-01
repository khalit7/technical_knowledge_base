# Meta: Llama and Meta Superintelligence Labs, interactive page (v3)

`visual.html` replaces all the text of the Notion page "Meta: Llama and Meta Superintelligence Labs" (https://app.notion.com/p/3c65c17b0d0d81949ad8e17bcb3567f1, child of Topic: llms). It is meant to be the only source of information on the page. The page has no child pages, databases or video (only the old HTML embed), so one `replace_content` (embed first) is allowed. `live.md` / `live_before_delete.md` hold the fetched text (signed S3 query string of the old embed omitted).

## Build
`./build.sh` concatenates `parts/` into `visual.html`; every JS part is its own `<script>`, tab wiring last, with the hidden `#jsErr` box and global error handler.
- HTML: `00_top`, `01_css` (shared), `01b_css` (page additions), `02_header`, `03_read_a` (two eras, terms, lineage), `04_read_b` (overtraining + animation, training reports, 4D mesh, interruptions, Inside Llama 4), `05_read_c` (scores, agent security + animation, lineup, which model, mistakes), `06_tabs` (Lineage, Run it yourself, Overtraining explorer), `07_more`.
- Scripts: `10_js_common`, `11a_data` (AA v4.3 rows, model configs, params(), lineage events), `11_js_read`, `12_js_ot`, `13_js_agent`, `14_js_line`, `15_js_fit`, `16_js_explore`, `90_js_tabs`.
- Links `{{text|url}}` with aliases in build.sh or `n:<notion id>`.

## Checks
- `python3 recompute.py`: every reproduced default.
- `node check.mjs > check.json`: every control, both themes and widths, animations, reduced motion, error box.
- `node tabshot.mjs <tab> <scheme> <width> <out>`, `node cardshot.mjs <scheme> <width>`; images in `shots/`.
- `python3 mk_coverage.py` writes `coverage.json` and verifies each check string against the built HTML.
- `src/`: saved sources (Llama 1/2/3 papers, Sardana, Besiroglu, configs, Glimmer card, modeling_llama4.py).
