# 2026-08-24: tech news, source

`../index.html` is the whole Notion page "2026-08-24: tech news" (https://app.notion.com/p/3c65c17b0d0d81ca8c8af3c2fc0c3ced, child of Tech news). The page has no child pages, databases or video. Build with `sh build.sh`.

## Layout
Nine tabs: **At a glance** (`t-read`, open by default: lead, theme, week strip, one row per section linking to its tab, one-line follow-up list), one tab per section (`t-top`, `t-models`, `t-research`, `t-industry`, `t-compute`, `t-dev`, `t-talk`), each with its own lead paragraph, its items as cards (verbatim text, Checked / Correction / Links / Unconfirmed / Related boxes, follow-ups in full under the item) and its visual, then **Further reading** (`t-more`). Each item lives in one tab only; other tabs link to it with in-page tab links (`[[text|tab|target id]]` in the data). The strip's click and every follow-up link open the item's tab.

## The issue is data (reuse this for the next issues)
- `live.md`: the verbatim Notion fetch (saved by script from the fetch result, never retyped).
- `mk_items.py` parses it into `data/items.json`: one record per item with its section, title (top stories), verbatim text and source links. It works on any issue in the same markdown shape.
- `data/annotations.json` adds what the text does not hold: the issue window and strip axis, `glance` (At a glance lead, theme, follow-up heading), the sections with their colours, tab id, tab label, lead paragraph and At a glance line, the knowledge base pages an item feeds, and per item `d` (date), `also` (other dates), `dnote`, `tags`, `numbers` (value, unit, kind), `hn` (points and comments, kept separate), `notes` (`check`, `corr`, `link`, `unc`, `rel` for cross-tab links), `follow` (id of a follow-up) and `viz_after` (which visual part follows the item). `followups` holds the dated "What happened next" entries.
- `mk_issue.py` renders `parts/03_issue.html` (the tab bar and all section tabs, readable without JavaScript) and `parts/11_data.js` (the same data for the week strip) and includes `parts/v_<name>.html` after an item when `viz_after` names it.
- Reusable unchanged for another issue: `mk_items.py`, `mk_issue.py`, `mk_coverage.py`, `parts/01_css.html`, `parts/10_js_common.js`, `parts/11b_js_jump.js`, `parts/12_js_strip.js` and `parts/v_strip.html` (week strip), `parts/13_js_money.js` (values by kind; edit its small data block), `parts/90_js_tabs.js`. Issue-specific: `parts/v_*.html` with `14_js_harness.js`, `15_js_diff.js`, `16_js_mem.js` (memory and image-token calculator).
- For the next issue: copy `src/`, save its `live.md`, write its `annotations.json` (dates, short labels are in `SHORT` in `mk_issue.py`), drop or replace the issue-specific visuals in `build.sh`, build, then `python3 mk_coverage.py`.

## Files
- `recompute.py`: every derived number (StateM ratios and adjudicated scores, AVO's 12%, DiffusionGemma's passes and milliseconds, memory percentages, image-token ceilings, deal multiples), with asserts on the published ones.
- `coverage.json` (from `mk_coverage.py`): every item, its numbers and source links checked against the built page; the one dropped link (Notion's auto-link of AGENTS.md); corrections and follow-ups.
- `viz_ideas.md`: candidates, scores, data, rejections.
- `inputs/`: source text saved on 2026-10-02 (StateM abstract, DiffusionGemma HTML, Nvidia AVO post, TechCrunch pieces, Tom's Hardware, Cerebras current and archived, DeepSeek docs current and archived, OpenRouter, Cursor, GitHub postmortem, Chips and Cheese, Modular, follow-up sources).
- Checks: `sh html_utils/checkpage.sh technical_knowledge_base/reference/tech_news/2026_08_24_tech_news` from the repo root.
