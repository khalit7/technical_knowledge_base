# 2026-09-28: tech news, source

`../index.html` is the whole Notion page "2026-09-28: tech news" (https://app.notion.com/p/3e95c17b0d0d81e69f97de1d3b6960f4, child of Tech news). The page has no child pages, databases or video. Build with `sh build.sh`.

## Layout
Nine tabs: **At a glance** (`t-read`, open by default: lead, theme, week strip, one row per section, one-line follow-up list), one tab per section (`t-top`, `t-models`, `t-research`, `t-industry`, `t-compute`, `t-dev`, `t-talk`), each with its own lead, its items as cards (verbatim text, Checked / Correction / Links / Unconfirmed / Related boxes, follow-ups in full under the item) and its visuals, then **Further reading** (`t-more`).

## Machinery (from the 2026-08-24 template, with the 2026-09-21 improvements)
- `live.md`: the verbatim Notion fetch, extracted by script from the session's saved tool result (never retyped).
- `mk_items.py` (unchanged from 2026-09-21) parses it into `data/items.json`.
- `data/annotations.json`: issue window and strip axis, glance texts, sections with leads, per item dates, short label, tags, feeds, Hacker News points (as stated) and comments (counted 2026-10-02), notes, follow-up and `viz_after`; `followups` with the dated "What happened next" entries. It was composed from the four source re-checks of 2026-10-02.
- `mk_issue.py`: as 2026-09-21, plus `relink()`, which puts the issue's own inline links (arXiv ids, github.com/docker/skills) back on their text; only Notion's bare-name auto-link (claude.ai) is dropped. The strip data no longer carries tags and first lines are cut at 150 characters (page size).
- `mk_coverage.py`: as 2026-09-21, also checking those inline links.
- `parts/10b_js_anim.js`: a shared step-animation controller (`makeAnim`, `animCtl`): modes, play, pause, step, scrub, speed, visibility and reduced motion. Reusable by later issues.
- Visuals: `v_price` + `13_js_price.js`, `v_share` + `15_js_share.js`, `v_sci` + `14_js_sci.js` (Top stories), `v_jit` + `16_js_jit.js` (Research), `v_fusion` + `18_js_fusion.js`, `v_quant` + `17_js_quant.js` (Dev tools), `v_ord` + `19_js_ord.js` (Talk), `v_strip` + `12_js_strip.js` (At a glance). `01b_css.html` adds table and checkbox styles missing from the trimmed CSS.

## Files
- `recompute.py`: every derived number, with asserts on the published ones.
- `coverage.json`: every item, its numbers and source links checked against the built page (`all_found` true); the dropped auto-link; corrections; follow-ups.
- `viz_ideas.md`: candidates, scores, data, rejections.
- `inputs/`: source text saved on 2026-10-02.
- Checks: `sh html_utils/checkpage.sh technical_knowledge_base/reference/tech_news/2026_09_28_tech_news` from the repo root.
- Long dashes in the saved source extracts were replaced by `--` (the repo allows no em-dashes anywhere).
