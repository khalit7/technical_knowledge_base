---
name: kb-maintain
description: Add, edit or reorganise material in the Technical knowledge base: placement, page shape, the intake/knowledge/history split, and writing conventions.
---

# Maintain technical knowledge base

*Mirrored from Notion, where it is the source of truth. Edit it there:*
*Me -> _AI -> Skills -> Maintain technical knowledge base. Changes here are overwritten by the next sync.*

Add, edit or reorganise material in the Technical knowledge base: placement, page shape, the intake/knowledge/history split, and writing conventions.

## Purpose

Page-specific guidance for maintaining the Technical knowledge base.

## Source of truth

Notion is the source of truth. A GitHub mirror exists and manages its own sync; it is never this skill's responsibility, and paper PDFs may live only there.

## Model

Keep the hierarchy shallow. Category names on the KB root are headings, not container pages.

- **Topic pages** hold the current taxonomy, mental map, synthesis and links to deep dives.
- **Deep dives** hold focused explanations and resources.
- [Papers](../../../papers/INDEX.md) holds one row per paper; the row opens to the full summary.
- Tech news holds weekly news. Updates is the only changelog. [Tracker](../../../TRACKER.md) holds structured reading state.
Put new material into the most relevant existing topic whenever possible. Create a new topic only when no existing topic fits, and only when the body of durable knowledge justifies it rather than because one or two news items lack a home.

## Three layers: intake, knowledge, history

Material should sit in exactly one layer.

- **Tech news is the intake layer.** Dated releases and industry news land in Tech news first.
- **Topic and deep-dive pages describe the current state of knowledge**, not the history of how it arrived. Integrate durable information into the relevant existing section.
- **Updates is the changelog.** Records of what was edited belong in Updates.
Consequences worth stating explicitly:

- Do not accumulate dated "Added YYYY-MM-DD" appendices on knowledge pages when the information can be incorporated cleanly.
- Do not leave notes addressed to a future editor in page prose, such as "add a row when this page is next revised" or explanations of what a previous run did. Do the work, or record it in Updates.
- When new material supersedes something already on the page, revise the existing passage rather than adding a second account of the same thing.

## Page shape

For readable deep dives, prefer this order when applicable:

1. Reading-time estimate.
2. Explanation and mental model.
3. Practical implications.
4. **Best resources**: ideally 1 to 3 genuinely recommended resources.
5. **Further reading**: useful additional material.
6. Cross-links to related KB pages.
Not every page needs every section.

## Reading-time convention

Keep the page-level `⏱ N min read · +Xh Ym resources` estimate where useful. External recommended resources should carry time estimates. Do not maintain a whole-KB aggregate or require every edit to cascade calculated totals through all ancestors. Topic-level roll-ups are optional when genuinely useful.

## Notion-native language

Write for Notion. Every internal reference is a native page mention, never a filename.

**Never write these.** They are the pattern that took a full cleanup pass to remove once it had spread:

- `[some-page.md](http://some-page.md)`, or any filename rendered as a link. Notion turns a bare `x.md` into a fake external link automatically, so type the mention instead of the name.
- `../topic-name/`, `topics/topic-name`, `_comparisons/`, `papers/`, "this folder", "this repo", "subfolders".
- A page name in backticks, such as `Topic: llms`, where a mention would resolve.
- A table column headed **File**. Head it **Page**.
- A section headed **Files** or **Map of the files**. Head it **Deep dives**.
- A **markdown link wrapping a real Notion URL**, such as `[Some page](https://app.notion.com/p/...)`. This one resolves, so it looks fine, which is why it spreads. It is still wrong: it renders as an external link, it does not carry the page icon, it does not follow a rename, and it produces no backlink. Use the mention.
- **A page name in bold standing in for a link**, such as a cross-links list reading `**inference-and-serving**` or `**rag-and-retrieval**`. This reads as deliberate typography rather than as something broken, so it survives review, and it is the form the most carefully written pages tend to use. If the bold text names a page, it should be a mention.
- A page named in plain prose with no link at all ("see the hardware topic's interconnects page", "covered in inference-and-serving"). Name it with a mention instead.
**The one exception.** Real configuration filenames that exist in other people's tools, such as `CLAUDE.md`, `AGENTS.md`, `SKILL.md` or `SOUL.md`, are legitimate content. Write them as inline code so they read as filenames and cannot become links. Never link them.

**When a reference has no page behind it**, do not invent a filename as a placeholder. Either create the page, or rewrite the sentence to say the thing in prose.

## Writing conventions

- Explain named entities and expand acronyms on first use at the depth appropriate for an experienced AI research engineer.
- Lead with the outcome and keep main pages skimmable; use child pages for depth.
- Preserve relevant historical context inside explanations, but keep maintenance history in Updates.
- Preserve the established no-em-dash convention.

## Short videos and other source media

Treat a short video as a **source type**, not as its own knowledge silo. Route its durable technical content into the most relevant existing topic or deep dive.

- Capture source/creator, URL, duration and capture date when available.
- Separate the creator's **claim** from verified fact and from the knowledge actually integrated into the KB.
- Record the useful explanation or insight and any important caveats.
- When the video is primarily a good explanation rather than a source of new knowledge, add it under **Best resources** or **Further reading** instead of creating a standalone page.
- Create a standalone source note only when the source itself warrants durable analysis; link it to the topic it informs.
- Do not promote an unsupported creator claim into KB fact. Verify externally when the claim matters.

## Reading tracker

New readable artifacts should be represented in [Tracker](../../../TRACKER.md). Preserve existing read state. Use Notion page names.

## Related skills

- [Weekly technical KB update](../kb-weekly-update/SKILL.md) for the recurring research and news pass.
- [Produce technical explainer video](../kb-make-video/SKILL.md) for derived video explanations.

## Validation

After edits, verify placement, internal links, reading-tracker impact and any affected reference or index pages. Confirm durable knowledge was integrated into a topic rather than left only in a digest.

**Check every page you touched for repository-shaped references before you finish.** Search the page for `.md`, `../`, `topics/` and `app.notion.com`. Any hit that is not a real configuration filename in inline code is a defect, and fixing it is part of the edit that introduced it rather than a later cleanup.
