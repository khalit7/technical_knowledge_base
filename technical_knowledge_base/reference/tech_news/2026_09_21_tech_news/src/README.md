# 2026-09-21: tech news, source

`../index.html` is the whole Notion page "2026-09-21: tech news" (https://app.notion.com/p/3e25c17b0d0d813dba03fa81f5d8cc39, child of Tech news). The page has **a video block** (`<video>` block `3e45c17b-0d0d-81a4-a26c-d732344a2c81`, file `tech_news_2026_09_21.mp4`, caption "Tech news, week to 21 September 2026: four stories, and the rest of the week at the end"); it stays on the Notion page under the HTML, and the header carries its caption and description and links the block. No child pages or databases. Build with `sh build.sh`.

## Layout
Nine tabs, as in the approved 2026-08-24 issue: **At a glance** (`t-read`, open by default: lead, the week's theme, week strip, one row per section, follow-ups in one line each), one tab per section (`t-top`, `t-models`, `t-research`, `t-industry`, `t-compute`, `t-dev`, `t-talk`) with its own lead, its items as cards (verbatim text; Checked, Correction, Unconfirmed, Links and Related boxes; Hacker News points from the issue and comment counts from 2026-10-02 as separate badges; follow-ups in full under the item; the topic pages the item feeds) and its visuals, then **Further reading** (`t-more`).

Visuals, each after the item it explains: task horizon (`v_horizon`, `14_js_horizon.js`), two proofs to scale (`v_proofs`, `16_js_proofs.js`), Z.ai's 13 days (`v_zai`, `19_js_zai.js`), Rubin by interactivity (`v_vr`, `13_js_vr.js`) in Top stories; ternary packing animation (`v_tern`, `15_js_tern.js`, data `11c_tern_data.js`) and KV cache steps (`v_kv`, `20_js_kv.js`) in Research; Huawei roadmap (`v_roadmap`, `17_js_roadmap.js`) in Compute; harness tax (`v_htax`, `18_js_htax.js`) in Dev tools; the week strip (`v_strip`, `12_js_strip.js`) in At a glance.

## The issue is data
- `live.md`: the verbatim Notion fetch (extracted by script from the fetch result, never retyped).
- `mk_items.py` parses it into `data/items.json`. Changes from the 2026-08-24 version: the leading `# Video` section, the read-time line and the intro are recognised; Notion auto-links that split a bold title (`[**Z.ai**](http://Z.ai)** says ...**`) are joined; per-link time estimates after the trailing sources are kept; `\{ \}` escapes are undone.
- `data/annotations.json`: dates, short strip labels, tags, feeds, Hacker News badges, the condensed check notes, cross-tab links, follow-ups and where each visual goes. It was written from four source re-checks made on 2026-10-02 (the extracts are in `inputs/`).
- `mk_issue.py` renders `parts/03_issue.html` and `parts/11_data.js`. Changes: the issue's inline `**bold**` and `` `code` `` are rendered; short labels come from annotations; source read times are shown; Hacker News comment badges link the thread; the strip data carries only each item's first sentence (size).
- `12_js_strip.js`: dates generic (axis and window from annotations), an "earlier" column, row heights by the fullest cell.
- `01_css.html` was pruned of the template's unused rules.

## Files
- `recompute.py`: every derived number, with asserts on the published ones (task-horizon crossings, 2% and 4.6%, Z.ai's step product, Rubin ratios and per-GW cost, all 29 BITCOS rows and 26 of 29, Bonsai's bits, the KV steps 3,514 / 652 / 1,630 / 890 and 437x, Huawei pull-ins, harness-tax geometric means, and the smaller checks in the notes).
- `coverage.json` (from `mk_coverage.py`, run after `build.sh`): every item verbatim, its 415 numbers and 27 source links found in the built page, the video, the replaced read-time line, 6 dropped Notion auto-links, corrections and follow-ups. `all_found` true.
- `viz_ideas.md`: candidates, scores, data, rejections, and what the methodology lacked.
- `inputs/`: source extracts read on 2026-10-02, plus `next_issue_2026_09_28.md` (the next issue, used to find follow-ups, each checked against a primary source).
- Checks: `sh html_utils/checkpage.sh technical_knowledge_base/reference/tech_news/2026_09_21_tech_news` from the repo root.
