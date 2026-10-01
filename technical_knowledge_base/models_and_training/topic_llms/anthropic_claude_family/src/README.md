# Anthropic: Claude family, interactive page (v3)

`visual.html` replaces all the text of the Notion page "Anthropic: Claude family" (https://app.notion.com/p/3c65c17b0d0d814cb979d0eabca59a45, child of Topic: llms). It is meant to be the only source of information on the page. The page has no child pages, databases or video, so one `replace_content` (embed first) is allowed. `coverage.json` shows where the HTML carries each fact of the old text (`live.md`, backup `live_before_delete.md`); every specific figure links inline to its source.

## Build

`./build.sh` concatenates `parts/` into `visual.html`:

- HTML: `00_top`, `01_css`, `02_header`, `03_read_a` (intro, terms, lineage, benchmark grid), `04_read_b` (lineup, rankings, thinking, request checker, preserved thinking, append-only simulator), `05_read_c` (training and CAI stepper, worked example and session animation, which model, mistakes), `06_tabs` (Lineage, Session cost, Effort and cost per task, Task length), `07_more` (Further reading).
- Scripts: `10_js_common`, `11_js_read` (price list, ladder, grid, checker, CAI, worked table), `12_js_sim` (simulator, session animation), `13_js_line`, `14_js_cost`, `15a_aa_data` + `15_js_aa`, `16a_metr_data` + `16_js_metr`, `90_js_tabs`.
- Links: `{{text|url}}` with aliases in `build.sh` (`@pricing`, `@op55`, ...) or `n:<notion id>`; expanded with `target="_blank" rel="noopener noreferrer"`. The build fails loudly on an unknown alias, an unexpanded link or an em-dash, and fills in the Reading time (230 words a minute) and the resources total.

## Data and checks

- `recompute.py` recomputes every default the page reproduces (worked example, growing context, AA split, METR fits).
- `src/`: raw sources saved for checking (docs as markdown, Anthropic posts as text, the CAI paper text, METR's YAML).
- `node tabshot.mjs <tab> <light|dark> <920|390> <out.png>` screenshots a tab (`SEL='#id'` for one element); `shots/` holds them.
- `node check.mjs` exercises every select, button, range, checkbox, ledger cell and lineage dot in both themes and widths, and plays the animation; it reports errors, NaN/undefined in visible text and sideways scroll.
- `python3 mk_coverage.py` writes `coverage.json` and verifies each item's check strings against the built HTML and its rendered text (`rendered.txt`).
