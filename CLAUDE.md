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

The conventions that govern content are in Notion, under `Me -> _AI`:

- **Instructions**: what is true for every task, read before anything else.
- **Skills**: one page per procedure. For this material, **Maintain technical
  knowledge base** (placement, page shape, writing conventions) and **Produce
  technical explainer video** (the whole video method: spine, animation,
  script, voice, and where the finished thing lives).

Do not restate those rules here and do not edit content in this repo expecting
it to reach Notion. If you find local edits Notion lacks, surface them to
Khalid rather than overwriting either side.

## The two jobs

- `/kb-sync-from-notion` mirrors Notion into this repo. It is derived from
  Notion's current state, deletes files whose page is gone, and is driven by
  `tools/notion_mirror.py`. It needs a Notion integration token.
- `/kb-make-video` produces an episode from a page. Everything it needs is in
  `video/`, and `video/README.md` is its manual.

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
