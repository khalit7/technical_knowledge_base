---
name: kb-sync-from-notion
description: Sync this repo FROM Notion (the source of truth) and push. Use when Khalid asks to sync the repo, pull from Notion, or update the repo from Notion. Notion-to-repo only; never push repo content to Notion.
---

# Sync the repo from Notion

**Direction (decided 2026-08-24): Notion is the source of truth; this repo is the
mirror.** A scheduled cloud task updates Notion weekly (Mondays 07:00 UTC, Opus) and
then runs this same skill in its cloud clone, committing and pushing to main. So on
the PC, `git pull` is usually enough; run this skill for ad-hoc catch-ups, to backfill
anything the cloud run noted it skipped (e.g. taxonomy.svg re-renders), or if the
weekly run failed. Never resolve a conflict in the repo's favour; if the repo has
local edits Notion lacks, surface them to Khalid instead of overwriting either side
silently. Always `git pull` before starting.

Root page: **Technical knowledge base** (child of the personal "Me" page), id
`3c65c17b-0d0d-81c7-b646-e548e65d9446`
(https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446), also in
`sources/.notion-root`. Read its child page **Operating guide (for Claude)** first;
it is the binding manual and decisions log.

## Structure mapping (Notion -> repo)

- `Topic: <name>` page body -> `topics/<name>/summary.md` (restore repo formatting:
  H1 title line; taxonomy mermaid source into a `<details>` block below an embedded
  `taxonomy.svg`, re-rendered via
  `npx -y @mermaid-js/mermaid-cli -i <src>.mmd -o taxonomy.svg -b white` when changed)
- Topic child pages -> `topics/<name>/<kebab-case-of-title>.md` (keep existing
  filenames where the page clearly corresponds; new pages get new kebab-case files)
- Papers index page -> `papers/INDEX.md`; each paper child page ->
  `papers/YYYY-MM_short-name/summary.md`. For papers new since the last sync, download
  the PDF from the arXiv link to `paper.pdf` and verify with `pdfinfo` (PDFs live only
  in the repo, a standing decision).
- Tracker page -> `TRACKER.md` including tick state (Notion tick state always wins)
- Updates children -> `updates/YYYY-MM-DD.md`
- Tech news children -> `news/YYYY-MM-DD.md`
- Operating guide decisions log -> keep `DECISIONS.md` consistent with it

## Steps

1. Determine what changed: the last sync point is the newest commit whose message
   starts with `sync from notion` (`git log --grep='^sync from notion' -1`); compare
   its date against the Notion pages' last-edited times. When in doubt re-mirror the
   affected section whole rather than diffing line by line. (There is deliberately no
   `notion-sync` tag: the cloud run's credential cannot force-move tags, so the commit
   message convention is the marker.)
2. Regenerate the affected repo files per the mapping, preserving repo conventions
   (GOAL.md): no em-dashes, resources-first deep dives, dated entries.
3. Download PDFs for new papers; re-render changed taxonomy SVGs.
4. Verify: no broken relative links, no empty files, TRACKER.md matches the file tree.
5. Commit as `sync from notion YYYY-MM-DD` (this exact prefix; it is the sync marker)
   and push to main.
6. Update the root Notion page's "Last repo sync from Notion" date.
7. Report: pages pulled, files added/updated, papers downloaded, anything ambiguous.
