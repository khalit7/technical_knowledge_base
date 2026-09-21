---
name: kb-update
description: Add to, edit or reorganise the technical knowledge base, including the weekly research pass: placement, page shape, integrating rather than appending, and what else has to move when something new arrives.
---

# Update technical knowledge base

*Mirrored from Notion, where it is the source of truth. Edit it there:*
*Me -> _AI -> Skills -> Update technical knowledge base. Changes here are overwritten by the next sync.*

Add to, edit or reorganise the Technical knowledge base, including the weekly research pass: where material goes, what shape a page takes, how an update is integrated rather than appended, and what else has to move when something new arrives.

## Use when

Anything changes in the Technical knowledge base: a weekly research pass, an ad-hoc "explain this and add it", a new paper, a correction, or a reorganisation. One skill, because a weekly sweep and a one-off addition do exactly the same work and have to obey exactly the same rules.

## Read first

[Instructions](../../INSTRUCTIONS.md), which holds what is true for every task.

## Source of truth and scope

This workspace is the source of truth. A GitHub mirror exists and [Sync the knowledge base mirror](../kb-sync-from-notion/SKILL.md) manages it; that is never this skill's responsibility, and paper PDFs may live only there.

## The model

Keep the hierarchy shallow. Category names on the knowledge base root are headings, not container pages.

- **Topic pages** hold the current taxonomy, mental map, synthesis and links to deep dives.
- **Deep dives** hold focused explanations and resources.
- [Papers](../../../papers/INDEX.md) holds one row per paper; the row opens to the full summary.
- Tech news holds weekly news. Updates is the only changelog. [Tracker](../../../TRACKER.md) holds structured reading state.
Put new material into the most relevant existing topic whenever possible. Create a new topic only when no existing topic fits, and only when the body of durable knowledge justifies it rather than because one or two news items lack a home.

## Three layers: intake, knowledge, history

Material sits in exactly one layer.

- **Tech news is intake.** Dated releases and industry news land there first.
- **Topic and deep-dive pages describe the current state of knowledge**, not the history of how it arrived.
- **Updates is the changelog.** Records of what was edited belong there.

## Integrate, never append

This is the rule that decides whether the knowledge base reads like a reference or like a mailing list archive, and it is the one most often broken under time pressure.

**A knowledge page must read as though its current state had always been true.** Somebody arriving for the first time should not be able to tell which sentence was written this week. That means:

- **No dated additions on knowledge pages.** Not "Added 2026-09-21", not "Update:", not a new section at the bottom holding this week's news, not a bullet appended to a list with a date on it. If the page already discusses the thing, revise the passage. If it does not, write it into the place where it belongs.
- **When new material supersedes something, rewrite the old passage.** Do not leave both accounts and let the reader work out which is current.
- **The date lives in **Updates, in the page's own "last updated" line, and in Tech news. Those three places carry all the history anyone needs.
- **A date inside a sentence is fine when it is part of the fact.** "Shipped in September 2026" is content. "Added September 2026" is bookkeeping, and bookkeeping does not go on knowledge pages.
- **Do not leave notes for a future editor** in page prose, such as "add a row when this is next revised". Do the work now, or record it in Updates.
The test: read the paragraph you just wrote with the date removed. If it stops making sense, you appended instead of integrating.

## When something new arrives, the map moves too

A new model, tool, technique or result almost never touches only one paragraph. The commonest defect in this knowledge base is a detail page that knows about something the topic page above it has never heard of.

So whenever material is added, walk up and fix what it invalidates:

- **The topic page's taxonomy diagram.** If a new family, layer or category appeared, it belongs in the diagram, and something else may need to move or be renamed.
- **The topic page's summary or "state of play".** These are written as claims about the present ("the frontier is crowded and close", "everything at scale is sparse mixture of experts"). A new arrival can make one of those claims false, and a false summary is worse than an out-of-date one.
- **Any table or index that enumerates things.** A families table, a comparison table, a list of providers or tools is a promise to be complete. Adding a row is part of the edit that adds the thing, not a later cleanup.
- **The pages that compare.** If a page argues X is the fastest, the cheapest, the only one doing something, and the new arrival changes that, the comparison is now wrong.
- **Cross-links both ways.** The new material links up to its topic, and the topic links down to it.
Ask, for every addition: which sentence elsewhere in this knowledge base is now untrue? That question is most of the work.

## When a page has a video

Some pages carry a derived explainer video, made under [Produce technical explainer video](../kb-make-video/SKILL.md). The video is a snapshot; the page keeps moving.

**If you add or change material on a page that has a video, say so next to the video.** A short italic note directly under it, naming what the video does not know and the date the page moved past it: *"This video was made on 21 September 2026 and does not cover Step 5 Preview or the encoder-decoder turn."*

That note is the one dated marker allowed on a knowledge page, because it is a statement about an artifact rather than about the subject, and a viewer has no other way to know the video is behind. Remove it when the video is remade. If the gap grows past a couple of notes, the video wants remaking rather than another line of caveats.

## Page shape

For readable deep dives, prefer this order when applicable:

1. Reading-time estimate.
2. Explanation and mental model.
3. Practical implications.
4. **Best resources**: ideally 1 to 3 genuinely recommended resources.
5. **Further reading**: useful additional material.
6. Cross-links to related pages.
Not every page needs every section.

## Reading-time convention

Keep the page-level `⏱ N min read · +Xh Ym resources` estimate where useful. External recommended resources should carry time estimates. Do not maintain a whole-knowledge-base aggregate or cascade calculated totals through all ancestors. Topic-level roll-ups are optional when genuinely useful.

## Notion-native language

Write for Notion. Every internal reference is a native page mention, never a filename.

**Never write these.** They are the pattern that took a full cleanup pass to remove once it had spread:

- `[some-page.md](http://some-page.md)`, or any filename rendered as a link. Notion turns a bare `x.md` into a fake external link automatically, so type the mention instead of the name.
- `../topic-name/`, `topics/topic-name`, `_comparisons/`, `papers/`, "this folder", "this repo", "subfolders".
- A page name in backticks, such as `Topic: llms`, where a mention would resolve.
- A table column headed **File**. Head it **Page**.
- A section headed **Files** or **Map of the files**. Head it **Deep dives**.
- A **markdown link wrapping a real Notion URL**, such as `[Some page](https://app.notion.com/p/...)`. This one resolves, so it looks fine, which is why it spreads. It is still wrong: it renders as an external link, it does not carry the page icon, it does not follow a rename, and it produces no backlink. Use the mention.
- **A page name in bold standing in for a link**. This reads as deliberate typography rather than as something broken, so it survives review. If the bold text names a page, it should be a mention.
- A page named in plain prose with no link at all ("see the hardware topic's interconnects page"). Name it with a mention instead.
**The one exception.** Real configuration filenames that exist in other people's tools, such as `CLAUDE.md`, `AGENTS.md`, `SKILL.md` or `SOUL.md`, are legitimate content. Write them as inline code so they read as filenames and cannot become links. Never link them.

**When a reference has no page behind it**, do not invent a filename as a placeholder. Either create the page, or rewrite the sentence to say the thing in prose.

## Writing conventions

- Explain named entities and expand acronyms on first use, at the depth appropriate for an experienced AI research engineer.
- Lead with the outcome and keep main pages skimmable; use child pages for depth.
- Preserve relevant historical context inside explanations, but keep maintenance history in Updates.
- No em-dashes.

## The weekly pass

The same rules, run over a whole week at once.

1. Establish the research window from the newest Updates entry.
2. Research developments relevant to the existing topic map, and check important releases that may not surface through topic searches.
3. **Integrate durable technical knowledge into the topic or deep-dive page it belongs on**, under the rules above: rewrite the passage, fix the taxonomy, fix the table, fix the summary sentence the news makes false, and add the note under any video the change leaves behind.
4. Give clearly relevant papers the normal [Papers](../../../papers/INDEX.md) treatment: one row per paper with Year, Topics and Takeaway, and the full summary in the row. Less central papers can remain links in Tech news until deeper treatment is requested.
5. Write the dated Tech news issue. The 3 to 5 most important stories first, then sections as warranted. Concise, factual, linked, no hype.
6. Write the dated Updates digest: the changelog of what was actually edited. This is where the week's history lives, and it is why the topic pages do not need any.
7. Update [Tracker](../../../TRACKER.md) for newly readable artifacts, without altering existing read state.
8. Apply the writing conventions and the page-level estimates.
9. Update the **Technical KB** row in Last updated: Through date, Last processed and Status.

### Research and news scope

Relevant AI/ML and major big-tech developments: model and tool releases, research, papers, chips and compute, developer tooling and agents, material company moves, and significant technical community discussion. Skip general startups, consumer gadgets and crypto unless genuinely major.

### Routing

- Technical developments appear in Tech news **and** are integrated into durable topic pages when worth retaining.
- General industry news can live only in Tech news.
- Do not create a topic merely because one or two news items lack a home.

## Short videos and other source media

Treat a short video as a **source type**, not as its own knowledge silo. Route its durable technical content into the most relevant existing topic or deep dive.

- Capture source, creator, URL, duration and capture date where available.
- Separate the creator's **claim** from verified fact and from the knowledge actually integrated.
- When the video is primarily a good explanation rather than a source of new knowledge, add it under **Best resources** or **Further reading** instead of creating a standalone page.
- Do not promote an unsupported creator claim into knowledge base fact.

## Reading tracker

New readable artifacts should be represented in [Tracker](../../../TRACKER.md). Preserve existing read state. Use page names.

## Related skills

- [Produce technical explainer video](../kb-make-video/SKILL.md) for derived explainer videos.
- [Sync the knowledge base mirror](../kb-sync-from-notion/SKILL.md) for the GitHub mirror.

## Validation

After any edit, check all of these:

- Durable knowledge was **integrated into a page**, not left only in a digest, and not appended as a dated block.
- Nothing you wrote carries a date that is bookkeeping rather than content.
- The taxonomy, the tables and the summary claims on the topic page above still tell the truth.
- Any video on a page you changed carries a note saying what it now misses.
- The Updates entry matches the edits actually made.
- New readable artifacts appear in the Tracker, and no existing read state changed.
- **Search every page you touched for ****`.md`****, ****`../`****, ****`topics/`**** and ****`app.notion.com`****.** Any hit that is not a real configuration filename in inline code is a defect introduced by this run, and fixing it is part of the edit rather than a later cleanup.
