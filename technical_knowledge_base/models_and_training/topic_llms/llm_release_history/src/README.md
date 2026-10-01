# LLM release history: HTML-only page (v3)

Replaces all text of https://app.notion.com/p/3ec5c17b0d0d810aae4ce659719997da. The page has no child pages, databases or video.

- `live.md` / `live_before_delete.md`: verbatim fetch of 2026-10-01T10:24:22Z (confirmed identical to a fresh fetch: same timestamp and last-edit time, 140 rows).
- `parse_live.py`: parses the 140 rows to `live_rows.json` and diffs them against `../../topic-llms/release_history.json`.
- `mk_data.py`: joins live rows with the JSON's kind tags and writes `parts/15a_data.js` (with the five sourced corrections, unescaped `$`).
- `recompute.py`: recomputes every count, first, median and ratio the page states.
- `viz_ideas.md`: methodology scoring, formulas, rejected ideas.
- `build.sh`: assembles `visual.html` (one `<script>` per JS part, error box, `{{text|url}}` link expansion, reading time).
- `check.mjs`: exercises every control (no NaN/undefined/errors, error box hidden, link attributes). `tabshot.mjs`: screenshots (`shots/`).
- `coverage.json`: every text fact and every row with where the HTML carries it.

Tabs: Reading and table (default), Sizes (time-lapse), Firsts, Cadence, Further reading.
