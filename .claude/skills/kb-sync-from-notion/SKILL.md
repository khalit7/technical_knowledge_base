---
name: kb-sync-from-notion
description: Mirror this repo FROM Notion (the source of truth) and push. Use when Khalid asks to sync the repo, pull from Notion, or update the repo from Notion. Notion-to-repo only; never push repo content to Notion.
---

# Sync the repo from Notion

Notion is the source of truth; this repo is the mirror (decided 2026-08-24). Nothing
syncs automatically. Run this after a Notion session, after the manual weekly update,
or whenever the repo has fallen behind.

Root page: **Technical knowledge base**, id `3c65c17b-0d0d-81c7-b646-e548e65d9446`,
child of the personal "Me" page. Its operating manual now lives in Notion under
`Me -> _AI`: the **Instructions** page for what is true of every task, and the
**Maintain technical knowledge base** skill for the knowledge base itself.

## State-derived, not diff-derived

Every run walks the whole tree from the root page and writes every page to its mapped
file, then **deletes managed files whose Notion page no longer exists**. It does not
try to work out what changed since the last sync. Two reasons this is the only design
that holds up: a page deleted in Notion is invisible to an edit diff, so a diff-based
sync silently resurrects it forever; and a cleanup pass that folds thirty dated
sections into page bodies looks like thirty unrelated edits to a diff and like one
clean state to a walk.

## Script, not judgement

`tools/notion_mirror.py` does the whole thing: traversal, Notion blocks to markdown,
page mentions to relative repo links, file writing, orphan deletion, arXiv PDF
downloads, and the taxonomy re-render. It needs no model in the loop, so it is
reproducible and costs nothing to re-run.

The split is deliberate. Mechanical work (which page goes where, what to delete) is
scripted because a model doing it by hand is slower, more expensive and less
repeatable. Judgement (has Notion drifted from its own conventions, does the diff make
sense, is a page missing that should exist) stays with whoever runs the sync, at step
4 below.

```bash
export NOTION_TOKEN=ntn_...            # or write it to .notion-token (gitignored)
python3 tools/notion_mirror.py --dry-run          # report only
python3 tools/notion_mirror.py --render-svg       # the real run
```

The token is an internal integration secret from
<https://www.notion.so/profile/integrations>, with the integration connected to the
"Technical knowledge base" page. Read access is enough; the script never writes to
Notion. Without a token the script stops and says so.

## Mapping

| Notion | Repo |
|---|---|
| `Topic: <name>` page | `topics/<name>/summary.md` |
| child of a topic | `topics/<name>/<kebab-title>.md` |
| grandchild of a topic | `topics/<name>/<parent>/<kebab-title>.md` |
| Papers page | `papers/INDEX.md` |
| a row of the papers database | `papers/<YYYY-MM_short-name>/summary.md` |
| Tech news child page | `news/<YYYY-MM-DD>.md` |
| Updates child page | `updates/<YYYY-MM-DD>.md` (plus a slug when two land on a date) |
| Tracker page | `TRACKER.md` |
| any other root child, e.g. Known gaps | `<kebab-title>.md` at the repo root |

File names come from Notion page titles, so renaming a page in Notion renames the file
here. That is intended: Notion is the source of truth for names too.

## Repo-only assets, never deleted

`papers/*/paper.pdf`, `sources/`, `video/` and `tools/`. Paper PDFs are downloaded from
the arXiv link on the paper's page when missing; Notion keeps the summaries and links.

## Steps

1. `git pull`, and check the working tree is clean. Local edits to mirrored files are a
   mistake: surface them to Khalid rather than committing or discarding them.
2. `python3 tools/notion_mirror.py --dry-run` and read the added, changed and deleted
   lists.
3. `python3 tools/notion_mirror.py --render-svg` for the real run. The SVG re-render
   needs `npx`; skip the flag if the taxonomy diagrams did not change.
4. Review the diff. Every deletion should trace to a page deleted in Notion, and every
   large body change to a real edit. If something looks like a conversion defect rather
   than a content change, fix the converter, not the file: a hand-fixed file is
   overwritten by the next run.
5. Commit as `sync from notion YYYY-MM-DD`. That exact prefix is the sync marker: the
   newest such commit is the last point the repo matched Notion.
6. Push to main.
7. Report: pages mirrored, files added, changed and deleted, PDFs downloaded, and
   anything that looked wrong in Notion itself.

## When the converter is wrong

`tools/notion_mirror.py` is the only place that knows Notion's shape. Add block types,
fix mention handling and adjust the path map there. The manifest it writes,
`tools/.notion-mirror.json`, records page id, title, path and last edited time for every
mirrored page, which is the fastest way to answer "where did this file come from".
