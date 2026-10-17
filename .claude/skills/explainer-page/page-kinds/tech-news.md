# Page kind: a weekly tech-news issue

One week of AI/ML and big-tech news as a dated record: the issue's own words verbatim, re-checked against sources, with what happened next added beside them, never over them.

Approved on 2026-08-24: tech news (2026-10-02), then used for the five issues after it.
- **Reference folder**: `technical_knowledge_base/reference/tech_news/2026_08_24_tech_news/`.
- **Newest scripts**: in `2026_09_21_tech_news/` and `2026_09_28_tech_news/`, whose `src/README.md` describes the machinery.

A suggestion, not a template: use the sections the issue actually has.

## What the page is for
The reader's questions: **"what happened, what connects it, and did it hold?"** Unlike a topic page, the text is a record. **The issue's own words stay verbatim.** Everything learned since is added beside them in labelled boxes.

## Shape that worked
- **One tab per section**, in the issue's own order, with short labels, for example: At a glance | Top stories | Models | Research | Industry | Compute | Dev tools | Talk of the town | Further reading.
  - Use the sections the issue has (one issue had a Security section).
  - An issue assembled from several parts gets tabs by subject, with each card labelled by its part.
- **Rewrite, do not just split.** Khalid: "don't just split them, re-write so that it makes sense for them to live in different tabs". Each tab opens with its own lead paragraph framing that section's week (the thread connecting its items), so it stands on its own.
- **At a glance** (open by default):
  - a short lead (dates, item count) and the week's theme in two or three sentences;
  - the week strip: one mark per item by day and section; a click opens the item in its tab;
  - one line per section linking to its tab;
  - a one-line "What happened next" list.
- **Item cards**:
  - the issue's text verbatim, with its date, sources, Hacker News points and comments (separate badges), and the topic page it feeds;
  - dated boxes from re-checking the sources: **Checked**, **Correction**, **Unconfirmed**, **Links** (a source found for an unsourced item), **Related** (an item in another tab);
  - each item lives in exactly one tab and is linked from the others.
- **What happened next**: sourced follow-ups, dated as of the build, under the item they update and linked both ways. Later issues in the series are a good lead, but check them against primary sources.
- **Further reading**: the knowledge base pages the items feed, the previous and next issues, the parent Tech news page, and the best resources, each with a time estimate.

## Content as data
- **`live.md`**: the verbatim Notion fetch, extracted by script from the saved tool result (never retyped).
- **`mk_items.py`** parses it into `data/items.json`.
- **`data/annotations.json`** holds:
  - the issue window and strip axis, glance texts, and section leads;
  - per item: dates, short label, tags, feeds, Hacker News counts, notes, follow-ups and `viz_after` (where a visual goes);
  - the dated `followups`.
- **`mk_issue.py`** generates the tabs; `relink()` restores the issue's own inline links.
- **`mk_coverage.py`** proves every item, number and inline link survived (`all_found`).
- **`recompute.py`** asserts every derived number.
- **`10b_js_anim.js`** is a shared step-animation controller (modes, play, pause, step, scrub, speed, visibility, reduced motion), reusable by later issues.

A new issue copies the machinery and writes new annotations.

## Visuals
- **Choose fresh each week** ([../visuals/choosing.md](../visuals/choosing.md)). Keep the week strip.
- **Most items need no visual.** An issue earns one index visual (the strip), plus a visual only where a headline hides a mechanism or joins two different comparisons.
- **At least one before/after animation** where the week has a mechanism that replaced another: DiffusionGemma against autoregressive decoding; an agent harness with and without its pieces; a KV cache shrinking step by step.
- **Good kinds so far**:
  - a chart showing which figure a headline divides ("2%" of what?);
  - a published number recomputed from configs or tables;
  - a calculator for an argument (Ord's swarm arithmetic);
  - prices before and after on one task.
- **Never put different kinds of figure on one axis**: a valuation, a run rate and a financing guarantee are three rows, not three bars.

## Rules learned
- **Check every number** against the primary source; corrections go in boxes, never into the issue's text.
- **When a source was rewritten** after publication, compare the Wayback capture nearest the issue date (the "as reported" check) and record the change as a follow-up.
- **Launch-day superlatives** ("cheapest at its level"): check them against every model published the same day.
- **Counts that drift** (upvotes, stars) are dated readings, never charts.
- **"Orders of magnitude" or "x times" claims**: find the two figures they divide.
- **A vendor's evaluation partner** is "with", not "independent".
- **"Nothing new shipped" claims**: verify them against the release APIs.
- **Never draw an escape or attack route** step by step; the text and dated checks carry it.
- **Hosts that block automated reading** (Reuters, Bloomberg, openai.com): try the Wayback Machine, and mark what stays unchecked.
- **Long dashes in saved source extracts**: replace them with `--` ([../teaching/writing-style.md](../teaching/writing-style.md)).
- **A narrated video**: keep its `<video>` block under the HTML when publishing, and name it in the header.

## Lessons
- **2026-10-02**: a missing page wrapper (`<div class="w">`) left cards 16 px past the phone screen with no sideways scroll, so `checkpage` passed; `clipcheck.mjs` now catches it ([../build/checks.md](../build/checks.md)).
- **2026-09-28 issue**: the strip data carries no tags and first lines are cut at 150 characters, to keep the page small; the issue's own inline links (arXiv ids, repositories) are restored on their text by `relink()`.

---
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 9ee6d1ea, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)

Sources distilled: html_utils/methods/tech_news.md (whole method, rules, lesson); html_utils/interactive-html-ideas.md section 2 (news-issue rules); reference/tech_news/2026_09_28_tech_news/src/README.md (machinery).
