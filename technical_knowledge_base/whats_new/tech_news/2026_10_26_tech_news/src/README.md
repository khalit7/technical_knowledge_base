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
- Visuals: `v_strip` + `12_js_strip.js`, `v_cost` + `13_js_cost.js` (Top stories, beside the Kimi story), `v_graft` + `14_js_graft.js` (Research, beside GRAFT; on `RD.anim` since 2026-11-13, below). `viz_ideas.md` records the choices.
- Checks: `sh html_utils/checkpage.sh technical_knowledge_base/whats_new/tech_news/2026_10_26_tech_news` from the repo root.

## The 2026-11-13 layout rollout (split layout, autoplay, step lists)

The issue's words (`issue.md`), checks and notes are unchanged; only the layout, the visual boxes and their motion changed.
- **Split in `mk_issue.py`, never in the generated part**: this issue's `mk_issue.py` is now the 2026-10-19 issue's (which differed from it only by the split), with the 2026-08-24 marker scheme. An item with a visual (`viz_after`) becomes `.s3sp`: the item card in `.s3L`, the visual in `.s3R`. Markers in a visual part: `<!--L-->` the visual's explanation for the left column, `<!--R-->` the right column, `<!--A-->` anything after the split, `<!--RFIRST-->` to put the right column first (an animation, so on a phone it sits at the top of its item). `"viz_with": [n]` groups earlier items of a section beside one visual; this issue does not need it.
- **Splits (three)**: At a glance (lead, theme and the strip's explanation | week strip); Top stories (the Kimi K3.1 Pro item and the chart's explanation | score against cost per task); Research (the GRAFT item, the animation's explanation and its two step lists | the animation, first in the DOM). Each visual's lede moved into the left column as `.vz-l`; the right column is wrapped in `.s3side`. Every other item, Models, Industry, Compute, Dev tools, Security, Talk of the town and Further reading stay full width (no visual).
- **The GRAFT animation now runs on `RD.anim`** (template `21_js_rd_common.js`; `10b_js_anim.js` and its `makeAnim`/`animCtl` were removed, nothing else used them): it plays by itself once half in view, pauses off screen, stops for good on any control or at its last step, never moves by itself under reduced motion. Two step lists (`sx-gr-pen`, `sx-gr-graft`, four steps each, static HTML in `v_graft.html`) carry the old per-step captions word for word, with the step's figure added to its bold title; one is shown per mode, and switching mode swaps the list and replays. A step reached by moving forward fades in and grows its bar over about 1.4 s.
- **Links instead of rebuilding**: the GRAFT explanation links to the paper page's 3D Fig. 1 (`#hero`: the adapters and where each gradient goes) and Fig. 2 (`#s-method`: one group's routed advantages); the issue does not redraw them.
- **No 3D stage.** The strip is a timeline, score against cost is a log-scale scatter, and the GRAFT diagram is a two-mode flow with one bar; the one mechanism with spatial structure (the adapters inside the MLP) is already drawn in 3D on its owner page, the GRAFT paper page. No other item has a mechanism with published numbers that would earn a new visual.
- **Visual-box fix**: the Kimi item's Related note said the chart was "below"; it now says "beside this story".
- `02_split.html`, `05z_errbox.js.html`, `21_js_rd_common.js` copied from the templates; `99_js_tabs.js` (template, storage key `tn1026-tab`) replaces `90_js_tabs.js`. `build.sh` finds the repo root by walking up to `.venv` or `html_utils` (no git).
- `check_stages.mjs` (from the repo root): the animation in both modes at 1400 light, 920 light and 390 dark (autoplay on view, paused off screen, one list item per step, each step title's percentage drawn, last step reached, stops after a control, a list click jumps and stops), three splits two columns at 1400, no errors, NaN or sideways scroll, reduced motion.

Length: "N min to read all tabs" went from 38 to 40 (9,128 words): the two step lists, which were drawn by script before and invisible to the count, and two sentences linking the paper page's figures. Nothing was cut; a tech-news issue has no ledger.
