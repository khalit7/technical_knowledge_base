# 2026-11-23: tech news, source

`../index.html` is the whole page "2026-11-23: tech news" (child of Tech news). Build with `sh build.sh`; it has no child pages, databases or video.

Written by the `update-kb` skill's periodic run on 2026-11-23, so there is no `live.md`: **`issue.md` holds the issue's own words**. Later re-checks never overwrite it; corrections and follow-ups go in `data/annotations.json` boxes beside the text. The window (2026-11-16 to 2026-11-23, one week) came from the Notion Source freshness row "Technical KB".

## Layout
Ten tabs: **At a glance** (`t-read`, open by default: lead, theme, strip, one row per section), one tab per section (`t-top`, `t-models`, `t-research`, `t-industry`, `t-compute`, `t-dev`, `t-sec`, `t-talk`), each with its own lead and its items as cards, then **Further reading** (`t-more`).

## Machinery (copied from 2026_11_16_tech_news)
- `mk_items.py` parses `issue.md` into `data/items.json` (unchanged).
- `data/annotations.json`: window and strip axis (12 to 23 November), glance texts, section leads, per item dates, short label, feeds, Hacker News points and comments read on 2026-11-23 (thread links only where the id was read), notes (Checked, Unconfirmed, Related) and `viz_after` / `viz_with`. It starts with no follow-ups. It was generated once by a script in the run's scratchpad; only the JSON is kept.
- `mk_issue.py` renders the tabs and the splits (unchanged).
- `recompute.py` asserts every derived number in the text and the visuals.
- Visuals: `v_strip` + `12_js_strip.js` (At a glance); `v_cost` + `13_js_cost.js` (Models, beside the Gemini 4 Neon and board items via `viz_with`: Artificial Analysis Index v5.0.1 score against cost per index task, read 23 November, with the score-cost frontier); `v_pool` + `14_js_pool.js` (Research, beside the sampler item: top-p against top-nsigma as temperature doubles, on `RD.anim` with two static step lists, `sx-pl-topp` and `sx-pl-nsig`; the distribution is illustrative, the pool sizes are the paper's). `viz_ideas.md` records the choices.
- Checks (from the repo root): `node technical_knowledge_base/whats_new/tech_news/2026_11_23_tech_news/src/check_stages.mjs <shots dir>` (the animation in both modes at 1400 light, 920 light and 390 dark, temperature per step, three splits, reduced motion; it ignores only the AI buddy's own failed `kb_index.json` fetch, which fails for every page opened from `file://`), `sh html_utils/checkpage.sh technical_knowledge_base/whats_new/tech_news/2026_11_23_tech_news`, `node html_utils/verify_layout.mjs <issue> <shots>`.
- `99_js_tabs.js` from the templates, storage key `tn1123-tab`.

No 3D stage: the strip is a timeline, the cost chart a 2D scatter and the pool a bar chart; none has spatial structure.
