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

The mirror exists since 2026-08-24. Root page: **Technical knowledge base**, a child of
the personal "Me" page, id `3c65c17b-0d0d-81c7-b646-e548e65d9446`
(https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446), also recorded in
`sources/.notion-root`. Topic pages are named `Topic: <folder-name>`; each deep-dive
file is a child page titled by its H1. Conversion rules used everywhere: page title
from the H1 (stripped from the body); drop the `taxonomy.svg` image line and the
`<details>` wrapper but keep the ```mermaid fence (Notion renders it); relative links
become plain text; external links stay.

**Always sync when topics are added or removed** (standing instruction from Khalid,
2026-08-24): creating or deleting a topic must be mirrored to Notion in the same
session, including its Tracker section. Content-only edits can wait for the next
explicit sync.

## Steps

1. Use the root page id above (fall back to Notion search for "Technical knowledge
   base" under the Me page if it moved; update this file and `sources/.notion-root` if
   so).
2. Determine what changed since the last sync: `git diff --name-only <last-sync-tag>` if
   a `notion-sync` tag exists, else sync everything. After a successful sync, move the
   `notion-sync` tag to HEAD.
3. For each changed file, create or update the corresponding Notion page. Convert
   mermaid blocks to Notion code blocks with language `mermaid` (Notion renders them).
4. If Khalid ticked boxes in the Notion Tracker since the last sync, report those ticks
   back to him and offer to apply them to `TRACKER.md` (this is the one sanctioned
   Notion-to-repo flow, and it is manual).
5. Report: pages created/updated, anything skipped, tracker ticks found.
