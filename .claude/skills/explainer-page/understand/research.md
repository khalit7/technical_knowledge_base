# Research: learn the topic until you can teach it

How to study a subject before planning or building a page, where to look, and what research leaves behind in the repo.

## The bar: could you teach it?
Do not plan a page, write a brief or draw a visual until you can, for every building block of the subject:
- say the **problem** it solves, **how it works**, what it **costs**, **when** it matters, and **how to check** it;
- predict what a lab on the running example will show, and say what would surprise you;
- answer the interview questions you plan to put on the page, including one design question;
- say where the field disagrees, which claims are vendor claims, and which numbers have been measured independently.

Then write down, in one sentence, the question the subject keeps returning to (for Topic: llm-landscape, "where the test-time budget goes and what a model costs to serve"). The teaching plan and the visuals serve that question ([curriculum.md](curriculum.md), [../visuals/choosing.md](../visuals/choosing.md)).

## Start from what exists
Search the knowledge base (`technical_knowledge_base/pages.json` and the folders) for pages that already own a neighbouring subject: paper pages carry verified facts and live toys, topic children own their details. Link them by id instead of repeating them. An existing page on the subject is a floor of facts to carry or correct, never the scope ([../page-kinds/migrate-or-fold.md](../page-kinds/migrate-or-fold.md)).

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
Every number is traced, labelled, recomputed and checked as [../evidence/sourcing.md](../evidence/sourcing.md) says (it is the one home for labels, table over prose, disagreements and like-for-like comparisons). Recompute every derived number in a script (`src/recompute.py` or a lab's script) with asserts against the published value. Counts that drift (stars, upvotes, leaderboard positions) are dated readings, never charts.

## Shared facts across agents (FACTS.md)
When several agents build one topic, they share one `FACTS.md` in the topic's scratch folder:
- **Append on first verification.** Whoever first verifies a version, licence, default, API status, published number or date appends it under their key, with source URL and date.
- **Read before quoting.** Everyone reads it before quoting a number and never contradicts it. A disagreement is reported to the lead, who settles it at assembly. The Reading tab and the Price list once disagreed on what Thomson Reuters' $40M covered; the sourced reading won.
- **Copy into the repo.** Scratch is not durable (a reboot wiped it), so each agent also copies its verified facts into its own `src/facts.md`.
- **Agreement with the root.** When a child measures what a root lab measured, the numbers must agree: reuse the lab's recordings.

## What research leaves in the repo
- `src/facts.md`: every verified fact and measurement, with source and date.
- `src/inputs/`: small source extracts (table text, configs, anchors, transcribed figure labels), each under about 1 MB; never PDFs. Large downloads stay in scratch, recorded with URL, revision and sha256 so they can be restored.
- `src/viz_ideas.md`: candidate visuals with scores, data sources and formulas, and rejections ([../visuals/choosing.md](../visuals/choosing.md)).

