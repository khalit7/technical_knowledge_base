# Method: weekly tech news issues

Approved on 2026-08-24: tech news (2026-10-02), then used for the five issues after it; reference folder `technical_knowledge_base/reference/tech_news/2026_08_24_tech_news/` (later issues improved its scripts; `2026_09_21_tech_news/` and `2026_09_28_tech_news/` have the newest). A suggestion, not a template: read `README.md` in this folder first.

## What the page is for

One week of AI/ML and big-tech news, kept for later. The reader's questions are "what happened, what connects it, and did it hold?" Unlike a topic page, the text is a dated record. **The issue's own words stay verbatim.** Everything learned since is added beside them, never written over them.

## Shape that worked

- **One tab per section**, in the issue's own order, with short labels, for example: At a glance | Top stories | Models | Research | Industry | Compute | Dev tools | Talk of the town | Further reading. Use the sections the issue actually has (one issue had a Security section; one was assembled from three parts and got tabs by subject, with each card labelled by its part).
- **Rewrite, do not just split.** Khalid: "don't just split them, re-write so that it makes sense for them to live in different tabs". Each tab opens with its own lead paragraph that frames that section's week (the thread connecting its items), so it stands on its own.
- **At a glance** (open by default):
  - a short lead (dates, item count) and the week's theme in two or three sentences;
  - the week strip: one mark per item by day and section, with a click opening the item in its own tab;
  - one line per section linking to its tab;
  - a one-line "What happened next" list.
- **Item cards:**
  - the issue's text verbatim, with its date, sources, Hacker News points and comments (separate badges), and the topic page it feeds;
  - dated boxes from re-checking the sources: **Checked**, **Correction**, **Unconfirmed**, **Links** (a source found for an unsourced item), **Related** (an item in another tab).
  - Each item lives in exactly one tab.
- **What happened next:** sourced follow-ups dated as of the build, under the item they update. Later issues in the series are a good lead, but check them against primary sources.
- **Further reading:** the KB pages the items feed, the previous and next issues, the parent Tech news page, and the best resources, each with a time estimate.
- **Content as data:** `mk_items.py` parses `live.md` into items; `annotations.json` holds dates, tags, checks, follow-ups, tab leads and visual placements; `mk_issue.py` generates the tabs; `mk_coverage.py` proves every item, number and link survived. A new issue copies the machinery and writes new annotations.

## Visuals

- Choose fresh for each week with the Methodology. Keep the week strip.
- Build at least one before/after animation where the week has a mechanism that replaced another (DiffusionGemma against autoregressive decoding, an agent harness with and without its pieces, a KV cache shrinking step by step).
- Good kinds so far: a chart that shows which figure a headline divides ("2%" against what?); a published number recomputed from configs or tables; a calculator for an argument (Ord's swarm arithmetic); prices before and after on one task.
- Never put different kinds of figure on one axis (a valuation, a run rate and a financing guarantee are three rows, not three bars).

## Rules learned

- Check every number against the primary source; corrections go in boxes, never into the issue's text.
- When a source was rewritten after publication, compare the Wayback capture nearest the issue date and record the change as a follow-up.
- Check launch-day superlatives ("cheapest at its level") against every model published the same day.
- Give counts that drift (upvotes, stars) as dated readings, never as charts.
- For an "orders of magnitude" or "x times" claim, find the two figures it divides.
- Call a vendor's evaluation partner "with", not "independent".
- Verify "nothing new shipped" claims against the release APIs.
- Never draw an escape or attack route step by step; the text and dated checks carry it.
- Some hosts block automated reading (Reuters, Bloomberg, openai.com): try the Wayback Machine, and mark what stays unchecked.
- A page may carry a narrated video: keep its `<video>` block under the HTML when publishing, and name it in the header.

## Lessons

- 2026-10-02: a missing page wrapper (`<div class="w">`) left cards 16 px past the phone screen with no sideways scroll, so `checkpage` passed; `clipcheck.mjs` now catches it.
