# Operating instructions for agent sessions in this repo

This repo does two things, and nothing else:

1. **Mirrors** Khalid's Notion "Technical knowledge base" into files.
2. **Produces** the explainer videos derived from those pages.

Everything else that used to live here now lives in Notion, which is where the
knowledge actually is.

## Source of truth

**Notion is the source of truth. This repo is the mirror and is never the origin
of a fact.** Root page: "Technical knowledge base", id
`3c65c17b-0d0d-81c7-b646-e548e65d9446`, a child of the personal "Me" page.

## One copy of every procedure

The operating instructions and every procedure live in Notion, under
`Me -> _AI`, and are **mirrored into this repo by the sync**:

- `.claude/INSTRUCTIONS.md` is the Instructions page.
- `.claude/skills/<command>/SKILL.md` is one skill page each, with its front
  matter generated from the row's Command and Description so it loads here.

**Those files are generated. Never edit them.** The next sync overwrites them.
A change to a procedure is a change to the Notion page, and it reaches this
repo the same way every other fact does. A skill whose Area is not "Technical
knowledge base", or which has no Command, is not mirrored, because it governs
some other part of Notion.

The same rule holds for content: do not edit mirrored files expecting the
change to reach Notion. If you find local edits Notion lacks, surface them to
Khalid rather than overwriting either side.

## The two jobs

- `/kb-sync-from-notion` mirrors Notion into this repo, state-derived, deleting
  files whose page is gone, driven by `tools/notion_mirror.py`. It needs a
  Notion token.
- `/kb-make-video` produces an episode from a page, using `video/`, with
  `video/README.md` as the mechanics.

Both of those skills are themselves mirrored from Notion.

## Repo-only assets, never deleted by a sync

`papers/*/paper.pdf` (Notion keeps the summaries and the arXiv links),
`sources/`, `video/` and `tools/`.

## Writing

No em-dashes anywhere, in prose or in commit messages. Commas, colons,
semicolons, parentheses. `--` for ranges.

## Git

Commit after a meaningful unit of work. A sync commits as
`sync from notion YYYY-MM-DD`, and the newest such commit marks the last point
the repo matched Notion. Push to main after syncing. On this machine, `git pull`
first, always.
