---
name: kb-weekly-update
description: Run the weekly research and news pass: integrate durable knowledge into topics, then write the dated Tech news issue and Updates digest.
---

# Weekly technical KB update

*Mirrored from Notion, where it is the source of truth. Edit it there:*
*Me -> _AI -> Skills -> Weekly technical KB update. Changes here are overwritten by the next sync.*

Run the weekly research and news pass: integrate durable knowledge into topics, then write the dated Tech news issue and Updates digest.

## Use when

Khalid explicitly asks to run the weekly Technical KB update, or you are Job B inside Run the weekly Monday update.

## Read first

[Maintain technical knowledge base](../kb-maintain/SKILL.md) for placement, page shape and writing conventions. The pages this skill writes to are Tech news, Updates, [Papers](../../../papers/INDEX.md), [Tracker](../../../TRACKER.md) and the topic pages under Technical knowledge base.

## Scope

Notion only. There is no repository work in this skill: the GitHub mirror manages its own sync.

## Research and news scope

Cover relevant AI/ML and major big-tech developments: model/tool releases, research, papers, chips and compute, developer tooling and agents, material company moves, and significant technical community discussion. Skip general startups, consumer gadgets and crypto unless genuinely major.

## Procedure

1. Establish the research window from the newest Updates entry.
2. Research developments relevant to the existing topic map and check important releases that may not surface through topic searches.
3. Integrate durable technical knowledge into the appropriate topic or deep-dive section. Do **not** append dated update blocks to knowledge pages when the material can be integrated into the current explanation.
4. Give clearly relevant papers the normal [Papers](../../../papers/INDEX.md) treatment: one row per paper with Year, Topics and Takeaway, and the full summary in the row. Less central papers can remain links in Tech news until deeper treatment is requested.
5. Create the dated Tech news issue. Put the 3–5 most important stories first, then use sections as warranted. Keep each item concise, factual and linked; avoid hype.
6. Create the dated Updates digest as the changelog of actual KB edits. Change history belongs here rather than on topic pages.
7. Update [Tracker](../../../TRACKER.md) for newly readable artifacts without altering existing read state.
8. Apply the Technical KB writing conventions and page-level reading/resource estimates. Do not recompute a whole-KB aggregate.
9. Update the **Technical KB** row in Last updated: Through date, Last processed and Status. When running as Job B, plan this rather than writing it, because the main session writes bookkeeping last.

## Routing

- Technical developments appear in Tech news **and** are integrated into durable topic pages when worth retaining.
- General industry news can live only in Tech news.
- Do not create a new topic merely because one or two news items lack a home; create one only when the body of durable knowledge justifies it.

## Validation

Confirm that durable knowledge was integrated rather than left only in a digest, the Updates entry matches actual edits, new readable artifacts appear in Tracker, and bookkeeping reflects only completed work.

Before finishing, search every page you wrote to for `.md`, `../`, `topics/` and `app.notion.com`. Any hit that is not a real configuration filename in inline code is a defect introduced by this run, and it is fixed now rather than left for a cleanup pass.
