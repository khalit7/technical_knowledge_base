# Operating instructions for Claude sessions in this repo

This is the **mirror** of Khalid's personal AI/ML knowledge base. **The source of truth
is Notion**: the "Technical knowledge base" page (id
`3c65c17b-0d0d-81c7-b646-e548e65d9446`, child of his "Me" page). A scheduled cloud
task (Mondays 07:00 UTC, Opus, routine "Weekly tech KB update") updates Notion weekly
and then syncs this repo in its cloud clone, committing and pushing to main
(github.com/khalit7/technical_knowledge_base). On the PC: `git pull` first, always;
`/kb-sync-from-notion` is for ad-hoc catch-ups and for backfilling anything the cloud
run noted it skipped.

Before doing anything: read `GOAL.md` (structure and writing conventions, both binding)
and `DECISIONS.md` (standing decisions, do not re-ask them). The Notion side's manual
is the root page's child **Operating guide (for Claude)**.

## The short version of the rules

- **Never treat repo content as newer than Notion.** Content changes happen in Notion
  first; the repo follows via `/kb-sync-from-notion`. If you find local edits Notion
  lacks, surface them to Khalid instead of overwriting either side.
- The one repo-only asset: paper PDFs (`papers/*/paper.pdf`). Notion keeps summaries
  and arXiv links; the sync downloads PDFs.
- No em-dashes anywhere. Commas, colons, semicolons, parentheses. `--` for ranges.
- Every topic has a skimmable `summary.md` with a taxonomy diagram (rendered
  `taxonomy.svg` embedded, mermaid source in a `<details>` block; re-render on change,
  command in GOAL.md); deep-dive files start with a **Best resources** block, then
  synthesis.
- `TRACKER.md` mirrors the Notion Tracker, including tick state (Notion ticks win).
  Never uncheck or remove a box Khalid ticked.
- Date every update; superseded content goes into `<details>` blocks, not deleted.
- `news/` mirrors the Notion Tech news issues (weekly newsletter; routing rules in
  GOAL.md and on the Notion Tech news page).
- Audience: MSc-level AI engineer with production LLM experience. Summarise
  fundamentals, go deep on frontier material.

## Workflows (project skills in .claude/skills/)

- `/kb-sync-from-notion`: pull Notion into this repo, download new PDFs, commit, move
  the `notion-sync` tag, push. The main thing this repo is for.
- `/kb-add-paper <arxiv id or url>`: add one paper, Notion first, then here.
- `/kb-new-topic <name>`: add a topic, Notion first, then here.
- `/kb-weekly-update-manual`: manual fallback for the scheduled weekly update (runs in
  Notion, then syncs here).

## Git

Commit after meaningful units of work; push to main after syncs. The newest commit
whose message starts with `sync from notion` marks the last point the repo matched
Notion (no tag: the cloud run's credential cannot move tags).
