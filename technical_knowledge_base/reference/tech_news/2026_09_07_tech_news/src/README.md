# 2026-09-07: tech news, source

`../index.html` is the whole Notion page "2026-09-07: tech news" (https://app.notion.com/p/3d45c17b0d0d81dca858e1cec21d3314, child of Tech news). The page has no child pages, databases or video. Build with `sh build.sh`; check with `sh html_utils/checkpage.sh technical_knowledge_base/reference/tech_news/2026_09_07_tech_news` from the repo root.

## Layout
Nine tabs, as on the approved 2026-08-24 issue: **At a glance** (`t-read`, open by default: lead, the week's theme, week strip, one row per section linking to its tab, one-line follow-up list), one tab per section (`t-top`, `t-models`, `t-research`, `t-industry`, `t-compute`, `t-dev`, `t-talk`), each with its own lead paragraph, its items as cards (verbatim text with its bold, code and inline links, then Checked / Correction / Links / Unconfirmed / Related boxes, follow-ups in full under the item) and its visual, then **Further reading** (`t-more`). Visuals: the week strip (At a glance), cost per task on two index versions (Models, after GLM-5.3-Flash), money by kind and OpenAI's GPU reallocation (Industry), the routing animation (Dev tools).

## Machinery (copied from 2026-08-24 and adapted)
- `live.md`: the verbatim Notion fetch, extracted by script from the session transcript (never retyped).
- `mk_items.py`: now keeps `title_md` and `md` (bold, inline code and inline links in place) beside the plain `title` and `text`, and handles Notion's split bold around a leading link (`[**Z.ai**](...)** rest**`).
- `mk_issue.py`: renders the markdown-lite text, puts no space between a title and text that starts with punctuation, takes strip labels from `short` in annotations, marks Hacker News badges as the issue's or as read on the check date (`hn.read`), shows "none in the issue" for items without sources, and exports only the sections' ids and labels to `11_data.js` (the leads contain links).
- `mk_coverage.py`: strips inline tags without adding spaces, checks inline links as well as trailing sources, and lists the visuals.
- `parts/12_js_strip.js`: the axis now crosses a month boundary (day labels from the dates, a month marker where the month changes, the window caption from the data), and a crowded cell becomes a small grid so every mark stays clickable at 390 px.
- `data/annotations.json`: the issue window and axis, `glance`, sections (leads rewritten per tab), feeds, per item `d`, `also`, `dnote`, `tags`, `feeds`, `hn`, `notes`, `follow`, `viz_after`, `short`; and the six follow-ups.
- Issue-specific parts: `v_aaidx.html` with `13b_js_aaidx.js`, `v_route.html` with `14_js_route.js`, `v_gpu.html` with `16_js_gpu.js`, `v_money.html` with `13_js_money.js` (its data block rewritten for this week).

## Files
- `recompute.py`: every derived number (ARC-AGI-3 gaps at matched effort, the 48% scope figure, cache-read shares, Gemini's price change, GLM-5.3-Flash's cache ratios from both config.json files, RPM speed-ups, Mercor's relative gain, Fermat's unused theorems, the GPU shares, the money multiples, the index deltas between v4.1.1 and v4.3, the routing session), with asserts on the published ones.
- `coverage.json`: all 54 items, 288 numbers and 61 links (51 trailing sources, 10 inline) found in the built page; nothing dropped; corrections and follow-ups listed.
- `viz_ideas.md`: candidates, scores, rejections (three were already built on the OpenAI, Topic: llms and Zhipu pages) and the new idea rows N0907.1 to N0907.3.
- `inputs/`: source text read on 2026-10-02 (pages that refused direct reads came from Wayback captures of September 2026), both GLM config.json files, `fetch_meta.json`.
