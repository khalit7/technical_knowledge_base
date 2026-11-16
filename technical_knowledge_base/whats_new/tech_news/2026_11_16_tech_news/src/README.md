# 2026-11-16: tech news, source

`../index.html` is the whole page "2026-11-16: tech news" (child of Tech news). Build with `sh build.sh`; it has no child pages, databases or video.

Written by the `update-kb` skill's periodic run on 2026-11-16, so there is no `live.md`: **`issue.md` holds the issue's own words**. Later re-checks never overwrite it; corrections and follow-ups go in `data/annotations.json` boxes beside the text. The window (2026-11-02 to 2026-11-16, two weeks) came from the Notion Source freshness row "Technical KB".

## Layout
Ten tabs: **At a glance** (`t-read`, open by default: lead, theme, strip, one row per section), one tab per section (`t-top`, `t-models`, `t-research`, `t-industry`, `t-compute`, `t-dev`, `t-sec`, `t-talk`), each with its own lead and its items as cards, then **Further reading** (`t-more`).

## Machinery (copied from 2026_11_02_tech_news)
- `mk_items.py` parses `issue.md` into `data/items.json` (unchanged).
- `data/annotations.json`: window and strip axis (29 October to 16 November), glance texts, section leads, per item dates, short label, feeds, Hacker News points and comments read on 2026-11-16 (thread links where the id was read), notes (Checked, Unconfirmed, Links, Related) and `viz_after` / `viz_with`. It starts with no follow-ups. It was generated once by a script in the run's scratchpad; only the JSON is kept.
- `mk_issue.py` renders the tabs and the splits; `mk_coverage.py` proves every item, number and link survived into the page (`coverage.json`, `all_found`).
- `recompute.py` asserts every derived number in the text and the visuals.
- Visuals: `v_strip` + `12_js_strip.js` (At a glance); `v_ix` + `13_js_ix.js` (Models, beside the Gemini 4 Carbon and Hydrogen items via `viz_with`: Artificial Analysis Index v5.0.1 scores read 16 November, open against closed, the fortnight's releases ringed); `v_budget` + `14_js_budget.js` (Research, beside the dense-rewards item: where one budget of generated tokens goes under GRPO and under a Monte-Carlo process reward, on `RD.anim` with two static step lists, `sx-bg-grpo` and `sx-bg-mc`). `viz_ideas.md` records the choices.
- Checks (from the repo root): `node technical_knowledge_base/whats_new/tech_news/2026_11_16_tech_news/src/check_stages.mjs <shots>` (the animation in both modes at 1400 light, 920 light and 390 dark, update counts per step, three splits, reduced motion), `sh html_utils/checkpage.sh technical_knowledge_base/whats_new/tech_news/2026_11_16_tech_news`, `node html_utils/verify_layout.mjs <issue> <shots>`.
- `99_js_tabs.js` from the templates, storage key `tn1116-tab`.

No 3D stage: the strip is a timeline, the index chart a one-dimensional scale and the budget a bar; none has spatial structure.
