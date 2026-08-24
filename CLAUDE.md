# Operating instructions for Claude sessions in this repo

This is Khalid's personal AI/ML knowledge base. You maintain it; he reads it.

Before doing anything: read `GOAL.md` (structure and writing conventions, both binding)
and `DECISIONS.md` (standing decisions, do not re-ask them).

## The short version of the rules

- No em-dashes anywhere. Commas, colons, semicolons, parentheses. `--` for ranges.
- Every topic has a skimmable `summary.md` with a taxonomy diagram (rendered
  `taxonomy.svg` embedded, mermaid source kept in a `<details>` block; re-render on
  change, command in GOAL.md); depth lives in deep-dive files that start with a
  **Best resources** links block, then synthesis.
- Papers go in `papers/YYYY-MM_short-name/` (PDF + `summary.md`), get a row in
  `papers/INDEX.md`, a checkbox in `TRACKER.md`, and cross-links from topic summaries.
- Every new readable artifact gets an unchecked checkbox at the top of its `TRACKER.md`
  section. Never uncheck or remove a box Khalid ticked.
- **Adding or removing a topic MUST be synced to Notion in the same session** (follow
  the kb-notion-sync skill; root page id is recorded there). Content-only edits can
  wait for the next explicit `/kb-notion-sync`, but topic-level structure never drifts.
- Date every update; superseded content goes into `<details>` blocks, not deleted.
- Audience: MSc-level AI engineer with production LLM experience. Summarise fundamentals,
  go deep on frontier material.

## Workflows (project skills in .claude/skills/)

- `/kb-weekly-update`: the periodic news/paper pull.
- `/kb-add-paper <arxiv id or url>`: add one paper end to end.
- `/kb-new-topic <name>`: scaffold a new topic to spec.
- `/kb-notion-sync`: mirror changed pages to Notion (interactive sessions only).

## Git

Local commits are fine after meaningful units of work. Push only when a remote exists and
Khalid has asked for pushes, or a standing decision says so.
