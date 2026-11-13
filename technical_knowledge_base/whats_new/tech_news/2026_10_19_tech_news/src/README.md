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
- Visuals: `v_strip` + `12_js_strip.js`, `v_cost` + `13_js_cost.js` (Top stories, beside the open-weight story), `v_arc` + `14_js_arc.js` (Top stories, beside the ARC-AGI-3 story; on `RD.anim` since 2026-11-13, below). `viz_ideas.md` records the choices.
- `inputs/`: short source extracts saved on 2026-10-19 (long dashes replaced by `--`).
- Checks: `sh html_utils/checkpage.sh technical_knowledge_base/whats_new/tech_news/2026_10_19_tech_news` from the repo root.

## The 2026-11-13 layout rollout (split layout, autoplay, step lists)

The issue's words (`issue.md`), checks and notes are unchanged; only the layout, the visual boxes and their motion changed.
- **Split in `mk_issue.py`, never in the generated part** (the marker scheme of the 2026-08-24 issue, added to this issue's `mk_issue.py`, which keeps `relink()`, the 150-character strip lines and the omitted "What happened next" list while there are no follow-ups). An item with a visual (`viz_after`) becomes `.s3sp`: the item card in `.s3L`, the visual in `.s3R`. Markers in a visual part: `<!--L-->` the visual's explanation for the left column, `<!--R-->` the right column, `<!--A-->` anything after the split, `<!--RFIRST-->` to put the right column first (the animation, so on a phone it sits at the top of its item). `"viz_with": [n]` would group earlier items of a section beside one visual; this issue does not need it.
- **Splits (three)**: At a glance (lead, theme and the strip's explanation | week strip); Top stories (the open-weight item and the chart's explanation | score against cost per task; the ARC-AGI-3 item, the animation's explanation and its two step lists | the animation). Each visual's lede moved into the left column as `.vz-l`; the right column is wrapped in `.s3side`. Every other item, Models, Research, Industry, Compute, Dev tools, Talk of the town and Further reading stay full width (no visual).
- **The ARC-AGI-3 animation now runs on `RD.anim`** (template `21_js_rd_common.js`; `10b_js_anim.js` and its `makeAnim` were removed, nothing else used them): it plays by itself once half in view, pauses off screen, stops for good on any control or at its last step, never moves by itself under reduced motion. Two step lists (`sx-ar-std`, `sx-ar-ada`, four steps each, one model per step) carry the old per-step captions; one is shown per harness, and switching harness swaps the list and replays. A step reached by moving forward grows its bar over about a second.
- **No 3D stage.** None of the three visuals has spatial structure that depth would show better: the strip is a timeline, score against cost is a log-scale scatter, and the ARC-AGI-3 scores are paired bars on one axis. No other item has a mechanism with published numbers that would earn a new visual (the issue's own rule: most items need none).
- **Visual-box fixes**: the strip's explanation said the first column holds items dated before Sep 15 (copied from an earlier issue); the axis starts on Sep 26, so it now says Sep 26. Two annotations that pointed to visuals "under" an item now say "beside". In the score-cost chart the GPT-6 Astra and Muse Wonder labels touched and are nudged apart.
- `02_split.html`, `05z_errbox.js.html`, `21_js_rd_common.js` copied from the templates; `99_js_tabs.js` (template, storage key `tn1019-tab`) replaces `90_js_tabs.js`. `build.sh` finds the repo root by walking up to `.venv` or `html_utils` (no git).
- `check_stages.mjs` (from the repo root): the animation in both modes at 1400 light, 920 light and 390 dark (autoplay on view, paused off screen, one list item per step, each step's percentage drawn, last step reached, stops after a control, a list click jumps and stops), three splits two columns at 1400, no errors, NaN or sideways scroll, reduced motion.

Length: "N min to read all tabs" went from 36 to 37 (8,546 words): the two step lists. Nothing was cut; a tech-news issue has no ledger.
