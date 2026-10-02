# 2026-09-14: tech news, source

`../index.html` is the whole Notion page "2026-09-14: tech news" (https://app.notion.com/p/3db5c17b0d0d8135a34af60966c5ecc1, child of Tech news). The page has no child pages, databases or video. Build with `sh build.sh`.

## Layout
Nine tabs, as in the 2026-08-24 template: **At a glance** (`t-read`: lead, theme, week strip, one row per section, one-line follow-ups), one tab per section (`t-top`, `t-models`, `t-research`, `t-industry`, `t-compute`, `t-dev`, `t-talk`) with its own lead, items as cards (verbatim text, Checked / Correction / Unconfirmed / Links / Related boxes, follow-ups under the item) and its visual, then **Further reading** (`t-more`).

Visuals: `v_ced` + `14_js_ced.js` (one agent turn through DeepSeek V4-Flash and V4.1-Flash, animated, plus the cache waterfall), `v_rswe` + `15_js_rswe.js` with `data/realswe.json` (Real-SWE's three readings), `v_rlt` + `16_js_rlt.js` (Transformer against the Recurrent Looped Transformer, animated), `v_econ` + `17_js_econ.js` (labour share x GDP), `v_sol` + `18_js_sol.js` (decode speed-of-light), and the week strip (`12_js_strip.js`, generalised here: day labels from the axis, an "earlier" column, crowded cells in two rows).

## The issue is data
- `live.md`: the verbatim Notion fetch, saved by script from the fetch result.
- `mk_items.py` parses it into `data/items.json` (changed from the template: Notion's bold-inside-link and adjacent bold runs are normalised, `\^` is unescaped, each item gets an `html` field keeping bold and code marks, and links inside the text are kept as sources).
- `mk_annotations.py` writes `data/annotations.json` (sections, leads, dates, feeds, notes, follow-ups, visual placement) and merges `data/factcheck_notes.json`, written by `mk_factcheck.py` from a separate search for the items the issue gives no source for (raw results in `inputs/factcheck_raw.json`).
- `mk_issue.py` renders `parts/03_issue.html` and `parts/11_data.js` (the strip data now carries a short excerpt of each item, not its full text).
- `mk_coverage.py` writes `coverage.json` after the build.
- Order: `python3 mk_factcheck.py && python3 mk_annotations.py && sh build.sh && python3 mk_coverage.py`.

## Files
- `recompute.py`: every derived number (DeepSeek cache bytes from the configs, 437x, layer passes; all three Real-SWE readings and their correlations; 3.44x, 3.24x; speed-of-light 472 tok/s, 62%, 39%, 1.58x; Table 3 shortcut; RLT chain lengths), with asserts.
- `viz_ideas.md`: candidates, scores, data, rejections, and what the methodology lacked.
- `inputs/`: sources saved on 2026-10-02 (`i<n>_*` the issue's own links, `wb_*` Wayback captures nearest the issue date, `x_*` other primary sources, `fu_*` follow-up sources, `fc_*` spot checks of the search results).
- Checks: `sh html_utils/checkpage.sh technical_knowledge_base/reference/tech_news/2026_09_14_tech_news` from the repo root.
