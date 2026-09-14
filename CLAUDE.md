# Operating instructions for Claude sessions in this repo

This is the **mirror** of Khalid's personal AI/ML knowledge base. **The source of truth
is Notion**: the "Technical knowledge base" page (id
`3c65c17b-0d0d-81c7-b646-e548e65d9446`, child of his "Me" page). Content changes in
Notion, either through the weekly update that **Khalid runs by hand** (the scheduled
cloud routine "Weekly tech KB update" was stopped on 2026-09-14; do not recreate it or
any other schedule unless he asks) or through ad-hoc sessions. This repo follows via
`/kb-sync-from-notion`, which Khalid runs on his PC; nothing syncs it automatically
(github.com/khalit7/technical_knowledge_base). On the PC: `git pull` first, always.

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
- Khalid frequently asks "explain X and add it": file the explanation as a child of
  the most relevant existing topic (new topic only if nothing fits), on both surfaces
  (Notion first), and tell him exactly where it went.

## Workflows (project skills in .claude/skills/)

- `/kb-sync-from-notion`: pull Notion into this repo, download new PDFs, commit as
  `sync from notion YYYY-MM-DD`, push. The main thing this repo is for.
- `/kb-add-paper <arxiv id or url>`: add one paper, Notion first, then here.
- `/kb-new-topic <name>`: add a topic, Notion first, then here.
- `/kb-weekly-update-manual`: the weekly update, run by hand when Khalid asks (works
  in Notion, then syncs here). Since 2026-09-14 this is the only way it runs.

## Git

Commit after meaningful units of work; push to main after syncs. The newest commit
whose message starts with `sync from notion` marks the last point the repo matched
Notion (no tag: the convention dates from when a cloud credential could not move tags,
and it stays because it needs nothing beyond a commit).
