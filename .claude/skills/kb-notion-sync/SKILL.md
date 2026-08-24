---
name: kb-notion-sync
description: Mirror the knowledge base to Notion (one-way, GitHub is the source of truth). Use when Khalid asks to sync/push the KB to Notion. Interactive sessions only; the Notion MCP connection is not available in headless or scheduled runs.
---

# Notion sync (one-way mirror)

GitHub/local repo is the source of truth. Never pull content back from Notion; never
resolve a conflict in Notion's favour (a standing decision in `DECISIONS.md`).

## Structure in Notion

One root page **Tech KB** containing:
- A child page per topic (from `topics/<topic>/summary.md`), with child pages per
  deep-dive file
- A **Papers** page mirroring `papers/INDEX.md`, with a child page per paper summary
  (do not upload PDFs; link to arXiv)
- A **Tracker** page mirroring `TRACKER.md` (Notion checkboxes are clickable, which is
  the point of the mirror)
- An **Updates** page with a child page per digest in `updates/`

## Steps

1. Find the existing **Tech KB** root page via Notion search; create it if absent.
   Record its URL in `sources/.notion-root` (gitignored is fine) for future runs.
2. Determine what changed since the last sync: `git diff --name-only <last-sync-tag>` if
   a `notion-sync` tag exists, else sync everything. After a successful sync, move the
   `notion-sync` tag to HEAD.
3. For each changed file, create or update the corresponding Notion page. Convert
   mermaid blocks to Notion code blocks with language `mermaid` (Notion renders them).
4. If Khalid ticked boxes in the Notion Tracker since the last sync, report those ticks
   back to him and offer to apply them to `TRACKER.md` (this is the one sanctioned
   Notion-to-repo flow, and it is manual).
5. Report: pages created/updated, anything skipped, tracker ticks found.
