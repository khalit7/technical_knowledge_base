---
name: kb-sync-from-notion
description: Mirror this knowledge base into the GitHub repository, state-derived and able to delete. Use when Khalid asks to sync the repo or pull from Notion.
---

# Sync the knowledge base mirror

*Mirrored from Notion, where it is the source of truth. Edit it there:*
*Me -> _AI -> Skills -> Sync the knowledge base mirror. Changes here are overwritten by the next sync.*
*This copy is the page as Notion last edited it, 2026-09-21 20:42:00 UTC. A procedure*
*that has moved on since then has moved on in Notion first, so if anything here*
*contradicts what the tools actually do, re-run the sync before trusting this file.*

Mirror the knowledge base into its GitHub repository. Notion to repository only, never the other way.

## Use when

Khalid asks to sync the repo, pull from Notion, or update the repo from Notion. Run it after a session that changed pages here, after the weekly update, or whenever the mirror has fallen behind. Nothing runs it automatically.

## Read first

[Update technical knowledge base](../kb-update/SKILL.md), because the conventions it sets are what the mirror is copying, and a defect in them shows up as a defect in the repository.

## Principle

**This workspace is the source of truth; the repository is the mirror and is never the origin of a fact.** If the repository has local edits this workspace lacks, surface them to Khalid rather than overwriting either side.

### State-derived, not diff-derived

Every run walks the whole tree from the root page, writes every page to its mapped file, and **deletes mirrored files whose page no longer exists**. It does not work out what changed since the last run. Two reasons that is the only design that holds up: a deleted page is invisible to an edit diff, so a diff-based sync resurrects it forever; and a cleanup pass that folds thirty dated sections into page bodies looks like thirty unrelated edits to a diff and like one clean state to a walk.

### Script, not judgement

`tools/notion_mirror.py` does the whole thing: traversal, blocks to markdown, page mentions resolved to relative links, file writing, orphan deletion and arXiv PDF downloads. Mechanical work is scripted because a model doing it by hand is slower, more expensive and less repeatable. Judgement stays with whoever runs it, at the review step.

## What gets mirrored

| Here | In the repository |
| --- | --- |
| `Topic: <name>` page | `topics/<name>/summary.md` |
| child of a topic | `topics/<name>/<kebab-title>.md` |
| Papers page, and each row | `papers/INDEX.md`, `papers/<YYYY-MM_name>/summary.md` |
| Tech news child page | `news/<YYYY-MM-DD>.md` |
| Updates child page | `updates/<YYYY-MM-DD>.md` |
| Tracker | `TRACKER.md`, tick state included |
| any other root child | `<kebab-title>.md` at the repository root |
| `Me -> _AI -> Instructions` | `.claude/INSTRUCTIONS.md` |
| a skill in `Me -> _AI` whose Area is Technical knowledge base | `.claude/skills/<Command>/SKILL.md` |

That last row is the reason a procedure is written once. A skill page here is mirrored into the repository in the form a coding agent can load, with its front matter generated from the row's **Command** and **Description**. There is no second, hand-written copy to drift, and a skill without a Command is not mirrored.

File names come from page titles, so renaming a page here renames the file there. That is intended.

**Repo-only, never deleted:** `papers/*/paper.pdf`, `sources/`, `video/` and `tools/`. Paper PDFs are downloaded from the arXiv link on each paper page; this workspace keeps the summaries and the links.

## Running it

```bash
git pull
export NOTION_TOKEN=ntn_...            # or write it to .notion-token (gitignored)
uv run tools/notion_mirror.py --dry-run
uv run tools/notion_mirror.py
```

The token is a Notion integration secret or a personal access token with read access. The script never writes here.

## Steps

1. `git pull`, and check the working tree is clean. Local edits to mirrored files are a mistake: surface them rather than committing or discarding them.
2. Dry run, and read the added, changed and deleted lists.
3. The real run.
4. Review the diff. Every deletion should trace to a page deleted here, and every large body change to a real edit. If something looks like a conversion defect rather than a content change, fix the converter rather than the file: a hand-fixed file is overwritten by the next run.
5. Commit as `sync from notion YYYY-MM-DD`. That exact prefix is the marker for the last point the mirror matched this workspace.
6. Push.

## Validation

The run ends by listing mentions that point at a page which no longer exists. Those are defects here, not in the repository: fix them on the page and run again, rather than editing the mirrored file.

Report afterwards: pages mirrored, files added, changed and deleted, PDFs downloaded, and anything that looked wrong in this workspace.
