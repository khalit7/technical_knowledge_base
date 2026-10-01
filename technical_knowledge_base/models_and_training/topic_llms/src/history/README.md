# Release history data (Topic: llms, tab `t-time`)

Formerly the child page "LLM release history" (https://app.notion.com/p/3ec5c17b0d0d810aae4ce659719997da), folded into the Release history tab.

- `../data/release_history.json`: the one dataset, 140 rows (also read by other pages). The five sourced corrections are applied in it; each corrected row carries `fix` and `fix_url`.
- `mk_data.py`: applies the corrections (idempotent) and writes `../parts/30_js_time_a_data.js`, the rows every view draws from. Run it after editing the JSON.
- `recompute.py`: recomputes every count, first, median and ratio stated in the tab and in the Reading section "How we got here".
- `parse_live.py` and `live_rows.json`: the old Notion table (fetched 2026-10-01) diffed against the dataset; the only differences are the five corrections.
- `viz_ideas.md`: the child page's visualisation scoring and rejected ideas (it refers to the old tabs: Sizes, Firsts, Cadence).

Run from the repo root: `python3 <P>/src/history/mk_data.py`, then `sh <P>/src/build.sh`.
