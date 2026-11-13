# 2026-11-02: tech news, source

`../index.html` is the whole page "2026-11-02: tech news" (child of Tech news). Build with `sh build.sh`; it has no child pages, databases or video.

This issue was written by the `update-kb` skill's periodic run on 2026-11-02, so there is no `live.md`: **`issue.md` holds the issue's own words**. Later re-checks never overwrite it; corrections and follow-ups go in `data/annotations.json` boxes beside the text. The window (2026-10-26 to 2026-11-02) came from the Notion Source freshness row "Technical KB".

## Layout
Ten tabs: **At a glance** (`t-read`, open by default: lead, theme, week strip, one row per section), one tab per section (`t-top`, `t-models`, `t-research`, `t-industry`, `t-compute`, `t-dev`, `t-sec`, `t-talk`), each with its own lead and its items as cards, then **Further reading** (`t-more`).

## Machinery (copied from 2026_10_26_tech_news)
- `mk_items.py` parses `issue.md` into `data/items.json` (unchanged).
- `data/annotations.json`: window and strip axis (21 October to 2 November), glance texts, section leads, per item dates, short label, feeds, Hacker News points and comments read on 2026-11-02 (thread links where the id was read), notes (Checked, Unconfirmed, Links, Related) and `viz_after`. It starts with no follow-ups. It was generated once by a script in the run's scratchpad; only the JSON is kept.
- `mk_issue.py` renders the tabs; `mk_coverage.py` proves every item, number and link survived into the page (`coverage.json`, `all_found`).
- `recompute.py` asserts every derived number in the text and the visuals.
- Visuals: `v_strip` + `12_js_strip.js`; `v_index` + `13_js_index.js` (Top stories, beside the Carbon story); `v_round` + `14_js_round.js` (Research, beside Fair Cast; on `RD.anim` since 2026-11-13, below). `viz_ideas.md` records the choices.
- Checks: `node technical_knowledge_base/whats_new/tech_news/2026_11_02_tech_news/src/check_stages.mjs` and `sh html_utils/checkpage.sh technical_knowledge_base/whats_new/tech_news/2026_11_02_tech_news` from the repo root.

## The 2026-11-13 layout rollout (split layout, autoplay, step lists)

The issue's words (`issue.md`), checks and notes are unchanged; only the layout, the visual boxes and their motion changed.
- **Split in `mk_issue.py`, never in the generated part**: `mk_issue.py` is now the 2026-10-19 issue's (which differed from this one only in the split code), with the 2026-08-24 marker scheme. An item with a visual (`viz_after`) becomes `.s3sp`: the item card in `.s3L`, the visual in `.s3R`. Markers in a visual part: `<!--L-->` the visual's explanation for the left column, `<!--R-->` the right column, `<!--A-->` anything after the split, `<!--RFIRST-->` to put the right column first (the animation, so on a phone it sits at the top of its item). `"viz_with": [n]` would group earlier items of a section beside one visual; this issue does not need it.
- **Splits (three)**: At a glance (lead, theme and the strip's explanation | week strip); Top stories (the Carbon item and the bump chart's explanation | index rank v4.3.2 against v5); Research (the Fair Cast item, the animation's explanation and its two step lists | the rounding animation, first in the DOM). Each visual's lede moved into the left column as `.vz-l`; the right column is wrapped in `.s3side`. Every other item, Models, Industry, Compute, Dev tools, Security, Talk of the town and Further reading stay full width (no visual).
- **The rounding animation now runs on `RD.anim`** (template `21_js_rd_common.js`; `10b_js_anim.js` with its `makeAnim` and `animCtl` was removed, nothing else used it): it plays by itself once half in view, pauses off screen, stops for good on any control or at its last step, never moves by itself under reduced motion. Two step lists (`sx-rd-rtn`, `sx-rd-sr`, four steps each, written as static HTML) carry the old per-step captions, with the computed step numbers written out (62, asserted by `recompute.py`, and the step before it, 61); one is shown per export mode, and switching mode swaps the list and replays. A step reached by moving forward draws the curves on from the previous stop over about 1.4 s; the per-step caption box was dropped (the list carries it).
- **No 3D stage.** None of the three visuals has spatial structure that depth would show better: the strip is a timeline, the index chart a bump chart of two orders, the rounding picture a value against time on a one-dimensional grid. The one candidate, the Models section's hybrid layer stacks (LFM3 and Ling-3.1-flash), is left as a proposal: the issue gives layer counts by kind but not their order or per-layer cache sizes, so a stage would have to invent its shape.
- **Visual-box wording**: the two Related notes and the ledes said the visuals were "below" or "under" an item; they now say "beside". The rounding lede says the chart plays by itself and the grid lines are dashed (as drawn).
- `02_split.html`, `05z_errbox.js.html`, `21_js_rd_common.js` copied from the templates; `99_js_tabs.js` (template, storage key `tn1102-tab`) replaces `90_js_tabs.js`. `build.sh` finds the repo root by walking up to `.venv` or `html_utils` (no git).
- `check_stages.mjs` (from the repo root): the animation in both modes at 1400 light, 920 light and 390 dark (autoplay on view, paused off screen, one list item per step, each step's stop reached, the served weight changing only at the last round-to-nearest step, last step reached, stops after a control, a list click jumps and stops), three splits two columns at 1400, no errors, NaN or sideways scroll, reduced motion.

Length: "N min to read all tabs" went from 31 to 32 (7,360 words): the two step lists. Nothing was cut; a tech-news issue has no ledger.
