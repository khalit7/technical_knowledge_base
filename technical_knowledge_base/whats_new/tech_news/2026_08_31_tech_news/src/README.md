# 2026-08-31: tech news, source

`../index.html` is the whole Notion page "2026-08-31: tech news" (https://app.notion.com/p/3cd5c17b0d0d81bba144e6734bb2fc8f, child of Tech news). The page has no child pages, databases or video. Build with `sh build.sh`, then `python3 mk_coverage.py`.

## Layout
Ten tabs: **At a glance** (`t-read`, open by default: lead, theme, week strip with tab and part filters, one row per section, the follow-ups in one line each, and "How this issue was put together" with the issue's own notes on its three parts, verbatim), one tab per section (`t-top`, `t-models`, `t-research`, `t-industry`, `t-compute`, `t-dev`, `t-security`, `t-talk`), each with its own lead paragraph, its items as cards and its visual, then **Further reading** (`t-more`).

The issue in Notion has three parts: the original run (six sections), "Merged in from the concurrent run" and "Backfill added 2026-08-31", each with its own subsections. Tabs follow the subject, so every "Models" subsection lands in the Models tab; each card is labelled with its part (Issue as published, From the concurrent run, Backfill, added Aug 31). Each item lives in one tab only; others link to it with in-page tab links.

Each card: the issue's text verbatim (markdown rendered: bold, italic, code, links), its sources (trailing and inline links), the issue's own italic note if it has one, then dated Checked / Correction / Links / Unconfirmed / Related boxes, follow-ups in full, and the topic pages it feeds.

## Visuals
- `v_strip.html` + `12_js_strip.js`: the week strip (N1), generalised: day labels and window text come from the data, other dates outside the axis are skipped, and a second row of chips filters by part.
- `v_dflash.html` + `14_js_dflash.js`: DFlash 2 animated against plain decoding, a sequential drafter and DFlash, then the card's measured throughput (Models).
- `v_params.html` + `15_js_params.js`: the week's models counted every way, and bytes by precision (Models).
- `v_wiki.html` + `16_js_wiki.js`: WikiSkill's Table 1 (Research).
- `v_mcp.html` + `31_js_sc_mcp.js`: MCP with and without sessions, a 3D stage since 2026-11-13 (Talk of the town).
- `v_traffic.html` + `18_js_traffic.js`: the AI traffic figures on one scale (Talk of the town).
- `10b_js_anim.js`: the step-animation engine both animations use (play, pause, step, scrub, speed, mode buttons; animates only on screen, in the visible tab and with the page visible; paused with each step complete under reduced motion). Reusable for later issues.

## The issue is data
- `live.md`: the verbatim Notion fetch, extracted by script from the fetch result.
- `mk_items.py` (adapted from 2026-08-24): parses `live.md` into `data/items.json`, handling "## " subsections, the parts, italic notes under an item or a subsection, Notion's split bold around auto-linked names, inline and auto-links.
- `data/annotations.py` writes `data/annotations.json` (kept as Python so the HTML strings need no escaping): issue window and strip axis, sections with the subsection names they collect (`match`), the parts, `glance`, `short` labels for untitled items, per item `d`, `also`, `dnote`, `tags`, `feeds`, `hn`, `notes`, `follow`, `viz_after`, and the follow-ups.
- `mk_issue.py` (adapted): groups items by tab, labels each card with its part, renders the issue's markdown, writes `parts/03_issue.html` and `parts/11_data.js`.
- `mk_coverage.py` (adapted): checks every item's verbatim text, numbers and links (trailing and inline) and the issue's own notes against the built page, lists the dropped Notion auto-links, corrections, unconfirmed notes and follow-ups.
- Unchanged from 2026-08-24: `parts/01_css.html` (additions in `01b_css.html`: an eighth colour, part labels, notes, the visuals, the split additions), `10_js_common.js`, `11b_js_jump.js`. From the skill's templates (2026-11-13): `02_split.html`, `25_js_s3.js` (S3 v2), `05z_errbox.js.html`, `99_js_tabs.js` (storage key `tn0831-tab`; replaces `90_js_tabs.js`).

## Files
- `recompute.py`: every derived number (Hugging Face and Nvidia ratios, all 45 DFlash 2 speed-ups and the per-cycle times, checkpoint bytes and the four published sizes they reproduce, all 25 WikiSkill averages, the traffic split, date spans, the MCP scenario counts), with asserts.
- `coverage.json`: every item, its numbers and links, the issue's notes, with where the HTML carries each; `all_found` true.
- `viz_ideas.md`: candidates, scores, data, rejections, and what the methodology lacked.
- `inputs/`: source text saved on 2026-10-02 (`fetch.py` fetches a page to text), Wayback copies where a site refuses automated reading, and `hf_meta.json` from the Hugging Face API.
- Checks: `sh html_utils/checkpage.sh technical_knowledge_base/whats_new/tech_news/2026_08_31_tech_news` from the repo root.

## The 2026-11-13 rollout pass (split layout, 3D stage, explained and autoplaying animations)
The issue's words, checks, follow-ups and numbers are unchanged; only layout, visuals and motion changed.
- **Split layout, made in `mk_issue.py`** (never in the generated part): a visual part `parts/v_<name>.html` is one or more blocks separated by `<!--split-->`, each `<!--left-->` (heading, lede, step list, sources) then `<!--right:anim-->` (animation or stage, first in the DOM) or `<!--right:fig-->` (chart or widget, after the text, in `.s3side`). The item's card opens the first block's left column. Every 2D card in the right column sits in `.s3side` (sticky from 1100 px). The week strip splits the same way under the At a glance lead. (The 2026-08-24 issue does the same with other marker names; either works.)
- **Sections**: At a glance (strip, split, 2D figure); Models: DFlash2 (split, 2D step animation, four step lists) and What the card measured (split, 2D chart), the parameter counter after the DeepSeek NVFP4 item (split, 2D); Research: WikiSkill's table (split, 2D); Talk of the town: MCP with and without sessions (split, **3D stage**, two step lists) and the traffic chart (split, 2D). Every other item stays full width.
- **3D stage `#stg-mc`** (`31_js_sc_mcp.js`): client, gateway and three instances on the floor; a session is a glass plate on the instance holding it; requests and replies are flows (handshake yellow, failure in the warning colour); a dashed tether shows sticky routing; a stack of tiles beside each instance counts the requests it answered (with sessions A 5, B 4, C 0; without, A 1, B 3, C 2); the camera moves in close for the restart. Steps and per-step round trips are the old animation's, still asserted in `recompute.py` (9 and 6 round trips, 4 handshake). The captions and request and reply lines moved into `ol.sx` lists in `v_mcp.html`.
- **Kept 2D**: the strip (a timeline), the parameter and byte counter, WikiSkill's table, the measured throughput bars and the traffic chart (numbers on an axis); the DFlash animation (its content is words in token slots, which must stay readable).
- **Motion**: `10b_js_anim.js` (`stepAnim`) has the 2026-11-06 rules: plays once half in view, pauses off screen, stops for good on any control or at the last step, nothing under reduced motion, step lists per mode (filled from the steps when empty), a list click plays that step once, `data-playing` while it plays; each step's motion takes the first 45% of 4.6 s and the rest holds. The DFlash per-step captions now live only in the step lists.
- `build.sh` finds the repo root by walking up to `.venv` or `html_utils` (no git) and writes the long-dash detector as bytes; saved extracts in `inputs/` had their long dashes replaced with `--`.
- `check_stages.mjs`: the layout and motion checks at 1400 light, 920 light and 390 dark (autoplay, off-screen pause, one list item per step in every mode, reader controls, mode replays, reduced motion, two columns at 1400 px) plus the MCP numbers against `recompute.py` and the step lists.
- Reading time: 51 min before, 55 after (the MCP step text, formerly drawn by script, is now static text in the step lists; the DFlash step lists are still drawn by script).
