# 2026-10-19: tech news, source

`../index.html` is the whole Notion page "2026-10-19: tech news" (child of Tech news). Build with `sh build.sh`; it has no child pages, databases or video.

This issue was written by the `update-kb` skill's periodic run on 2026-10-19 rather than fetched from Notion, so there is no `live.md`: **`issue.md` holds the issue's own words** and plays the role `live.md` plays for an older issue. Later re-checks never overwrite it; corrections and follow-ups go in `data/annotations.json` boxes beside the text. The window (2026-09-28 to 2026-10-19) came from the Notion Source freshness row "Technical KB" and covers three weeks.

## Layout
Nine tabs: **At a glance** (`t-read`, open by default: lead, theme, week strip, one row per section), one tab per section (`t-top`, `t-models`, `t-research`, `t-industry`, `t-compute`, `t-dev`, `t-talk`), each with its own lead and its items as cards, then **Further reading** (`t-more`).

## Machinery (copied from 2026_09_28_tech_news)
- `mk_items.py` parses `issue.md` into `data/items.json` (changed only to read `issue.md`).
- `data/annotations.json`: window and strip axis, glance texts, section leads, per item dates, short label, feeds, Hacker News points and comments read on 2026-10-19 (with thread links), notes (Checked, Unconfirmed, Related) and `viz_after`. It starts with no follow-ups; `mk_issue.py` now omits the "What happened next" list when there are none.
- `mk_issue.py` renders the tabs; `mk_coverage.py` proves every item, number and link survived into the page (`coverage.json`, `all_found`).
- `recompute.py` asserts every derived number in the text and the visuals.
- Visuals: `v_strip` + `12_js_strip.js`, `v_cost` + `13_js_cost.js` (Top stories, under the open-weight story), `v_arc` + `14_js_arc.js` (Top stories, under the ARC-AGI-3 story; uses the shared `10b_js_anim.js` controller). `viz_ideas.md` records the choices.
- `inputs/`: short source extracts saved on 2026-10-19 (long dashes replaced by `--`).
- Checks: `sh html_utils/checkpage.sh technical_knowledge_base/reference/tech_news/2026_10_19_tech_news` from the repo root.
