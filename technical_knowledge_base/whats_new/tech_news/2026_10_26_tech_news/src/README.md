# 2026-10-26: tech news, source

`../index.html` is the whole page "2026-10-26: tech news" (child of Tech news). Build with `sh build.sh`; it has no child pages, databases or video.

This issue was written by the `update-kb` skill's periodic run on 2026-10-26, so there is no `live.md`: **`issue.md` holds the issue's own words**. Later re-checks never overwrite it; corrections and follow-ups go in `data/annotations.json` boxes beside the text. The window (2026-10-19 to 2026-10-26) came from the Notion Source freshness row "Technical KB".

## Layout
Ten tabs: **At a glance** (`t-read`, open by default: lead, theme, week strip, one row per section), one tab per section (`t-top`, `t-models`, `t-research`, `t-industry`, `t-compute`, `t-dev`, `t-sec`, `t-talk`), each with its own lead and its items as cards, then **Further reading** (`t-more`). Security is a section of its own this week (colour `c8`, added to `01_css.html`).

## Machinery (copied from 2026_10_19_tech_news)
- `mk_items.py` parses `issue.md` into `data/items.json` (unchanged).
- `data/annotations.json`: window and strip axis, glance texts, section leads, per item dates, short label, feeds, Hacker News points and comments read on 2026-10-26 (with thread links), notes (Checked, Correction, Unconfirmed, Related) and `viz_after`. It starts with no follow-ups.
- `mk_issue.py` renders the tabs; `mk_coverage.py` proves every item, number and link survived into the page (`coverage.json`, `all_found`).
- `recompute.py` asserts every derived number in the text and the visuals.
- Visuals: `v_strip` + `12_js_strip.js`, `v_cost` + `13_js_cost.js` (Top stories, under the Kimi story), `v_graft` + `14_js_graft.js` (Research, under GRAFT; uses the shared `10b_js_anim.js` controller). `viz_ideas.md` records the choices.
- Checks: `sh html_utils/checkpage.sh technical_knowledge_base/whats_new/tech_news/2026_10_26_tech_news` from the repo root.
