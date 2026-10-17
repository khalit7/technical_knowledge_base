# Research: learn the topic until you can teach it

How to study a subject before planning or building a page, where to look, how to treat numbers and old content, and what research leaves behind in the repo.

## The bar: could you teach it?
Do not plan a page, write a brief or draw a visual until you can, for every building block of the subject:
- say the **problem** it solves, **how it works**, what it **costs**, **when** it matters, and **how to check** it;
- predict what a lab on the running example will show, and say what would surprise you;
- answer the interview questions you plan to put on the page, including one design question;
- say where the field disagrees, which claims are vendor claims, and which numbers have been measured independently.

Then write down, in one sentence, the question the subject keeps returning to (for Topic: llms, "where the test-time budget goes and what a model costs to serve"). The teaching plan and the visuals serve that question ([curriculum.md](curriculum.md), [../visuals/choosing.md](../visuals/choosing.md)).

## Start from what exists
1. **Save the old page verbatim.** If the subject already has a Notion page, save it to `src/live.md` (or `src/read/old/` for a root and its children) with a script, never retyped ([../page-kinds/migrate-or-fold.md](../page-kinds/migrate-or-fold.md)).
2. **Treat it as unverified notes.** It is the floor of what the page must carry, not its scope and not its truth.
3. **Search the knowledge base** (`technical_knowledge_base/pages.json` and the folders) for pages that already own a neighbouring subject:
   - paper pages carry verified, corrected facts and live toys: use them, and link them;
   - topic children own their details: link them by Notion id instead of repeating them.
4. **List what exists**: the old page's visuals and outbound links. Its own sources are the first places to look; new ideas then do not repeat what is there.

## Overlap with live pages in other topics
Before planning a new topic, search `technical_knowledge_base/pages.json` (titles, paths) and the folder tree for pages that already teach part of it: another topic's child, a paper page, a lab tab. List them with what each owns. The default is to link them by id and not repeat them; folding one into the new topic or retitling it "TO DELETE: ..." is Khalid's decision (ask in the opening questions). Reuse their animations by linking, not rebuilding.

## Source order (most authoritative first)
1. **Primary papers and technical reports.**
   - Read the arXiv HTML (`/html/`, not `/abs/`): read the **tables, not the prose**, and the appendix.
   - Check every arXiv version (results and wording change between versions).
   - When text and table disagree, quote the table and say so.
   - Check each table's internal arithmetic (a percentage in Llama 3's Table 5 is a misprint).
   - Decode figures from their vector paths (SVG or PDF), calibrated on the gridlines; never read curves by eye.
2. **Official documentation and artefacts.** Model cards and `config.json` files (a config describes the checkpoint when it disagrees with the paper), API docs, changelogs and release notes, licences, pricing pages. Dated, because they change.
3. **Source code at a pinned version.**
   - Shallow-clone at a tag or commit, under the download lock ([../evidence/resource-safety.md](../evidence/resource-safety.md)), and record URL, ref, sha and date.
   - Locate lines by pattern in a script and quote them with `file:line` (for example `launcher/api.py:125-130`).
   - Reading code against the text produces many corrections: a released cross-attention with no causal mask; static rendezvous waits of 900 s, not 600; `nnx.jit` does not donate by default.
4. **Independent measurements.** Artificial Analysis, Epoch AI, LMArena, METR, ARC Prize, MLPerf, published replications.
   - Keep them apart from vendor figures and label which is which.
   - A vendor's evaluation partner is "with", not "independent".
5. **Explainers.** Visual and interactive explainers (Alammar, Raschka's gallery, Hugging Face blogs, the Ultra-Scale Playbook, Polo Club's Transformer Explainer, Distill). Use them to learn what readers find hard and what is already drawn, not as data. Videos come last: good for metaphors, rarely for numbers.

Search tactics that worked:
- Ask a fetch for exact tables, not summaries; use raw README files when the rendered page is thin; follow redirects by hand.
- `pdftotext -layout` keeps tables intact.
- The Wayback Machine (CDX API, raw captures) gets past bot-blocked hosts (Reuters, Bloomberg, openai.com) and shows what a page said on a date.
- The Hugging Face refs API counts checkpoint branches and gives exact token counts.
- SEC full-text search finds the exact filing for a company's own phrase.
- Always search for critiques of the topic's best-known claims: a widespread misconception makes a good visual.

## Numbers
- **Trace each figure** to the source that first states it, and record the link the moment you read it.
- **Recompute every derived number** in a script (`src/recompute.py` or a lab's script), with asserts against the published value.
- **Label every number**: published, derived (show the formula), measured here (machine and date), illustrative, or unconfirmed. Never fill a gap from memory.
- **Say how a default reproduces** a published figure: independently or by construction. When it does not reproduce, say so plainly in a box.
- **When two primary sources disagree**, show both with the arithmetic behind each; never pick silently. Check rounding before calling a mismatch a contradiction.
- **Compare like with like.**
  - Match precision (dense or sparse on both sides). Never splice benchmark versions or join two metrics a company reported one after the other.
  - Record the index version and date beside every score; dollars, GPU-hours and FLOPs stay on separate axes.
  - For an "x times" claim, find the two figures it divides and show the matched-budget and matched-performance versions.
- **Check provenance.**
  - Was a baseline row re-run or copied from another paper?
  - Which split does it come from?
  - Did the result use the released artefact at all?
- **Counts that drift** (stars, upvotes, leaderboard positions) are dated readings, never charts.

## Verify every old claim
Every claim carried from an old page is checked against a primary source:
- **verified**: carried, with its new source;
- **corrected**: the correction shown in a visible box on the page that owns the subject;
- **dropped**: only as a genuine duplicate, or as a stale claim with its correction.

What cannot be sourced is marked unconfirmed, never silently kept. Record each verdict in `src/coverage.json` (or `src/read/coverage.md` for a root).

## Coverage of an old page
- **Write the coverage list first.** List every distinct fact, number, mechanism step, caveat and source link of `live.md` before writing prose; it sets the outline.
- **Check it with a script** (`mk_coverage.py`). For each item, record where the HTML carries it, or why it was dropped.
- **When copying a coverage script from another page**, replace its item list entirely. A copied list once checked the wrong paper's facts and still reported all found.
- **When Notion is disconnected**, write `coverage.md` as a TODO ("old page not yet compared"), with the steps to run when it returns, and do it before publishing.

## Old children with no new equivalent
When the plan maps old child pages to new ones, some old pages will match nothing. Never leave them silently: leaving one looks like a judgment that it is fine. (2026-10-17: two such pages, "Terraform and the AWS ML Stack" and "Text Diffusion and World Models", turned out to be uncovered, and Khalid asked why they had been left.)
1. Grep the new pages (`index.html` and `src/`) for each unmatched page's key terms.
2. Report what is covered and what is not, item by item.
3. Ask Khalid: rebuild it as a child, fold it into the root or a sibling, or retitle it "TO DELETE: ..." with a line saying where its content went ([../page-kinds/migrate-or-fold.md](../page-kinds/migrate-or-fold.md)).

## Shared facts across agents (FACTS.md)
When several agents build one topic, they share one `FACTS.md` in the topic's scratch folder:
- **Append on first verification.** Whoever first verifies a version, licence, default, API status, published number or date appends it under their key, with source URL and date.
- **Read before quoting.** Everyone reads it before quoting a number and never contradicts it. A disagreement is reported to the lead, who settles it at assembly. The Reading tab and the Price list once disagreed on what Thomson Reuters' $40M covered; the sourced reading won.
- **Copy into the repo.** Scratch is not durable (a reboot wiped it), so each agent also copies its verified facts into its own `src/facts.md`.
- **Agreement with the root.** When a child measures what a root lab measured, the numbers must agree: reuse the lab's recordings.

## What research leaves in the repo
- `src/facts.md`: every verified fact and measurement, with source and date.
- `src/inputs/`: small source extracts (table text, configs, anchors, transcribed figure labels), each under about 1 MB; never PDFs. Large downloads stay in scratch, recorded with URL, revision and sha256 so they can be restored.
- `src/coverage.json` or `coverage.md`: the old page's items and their fate.
- `src/viz_ideas.md`: candidate visuals with scores, data sources and formulas, and rejections ([../visuals/choosing.md](../visuals/choosing.md)).

---
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 9ee6d1ea, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)

Sources distilled: html_utils/interactive-html-ideas.md section 2 (sources, search tactics, number rules); html_utils/BRIEF_page_agent.md (Step 0, research beyond the old page); html_utils/BRIEF_paper_agent.md (coverage list); html_utils/methods/topic_pages.md Part B; memory check-coverage-before-leaving-old, teach-dont-ask-scope, scratch-wiped-reboot and the gm, mi, jax, swe topic logs; kb_briefs gm/mi/jx/dc common and child briefs (FACTS.md, pinned source, published vs measured).
