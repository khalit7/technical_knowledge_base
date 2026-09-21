# tech_knowledge_base

A mirror of Khalid's Notion "Technical knowledge base", and the toolchain that
turns its pages into narrated explainer videos.

**Notion is the source of truth.** Read and edit there. These files follow.

## Reading

Start at any `topics/<topic>/summary.md` and follow the links into deep dives
and papers. `papers/INDEX.md` indexes the papers, and the PDFs under
`papers/*/paper.pdf` live only here. `news/` holds the weekly issues, `updates/`
the changelog, `TRACKER.md` the reading state.

## The two things this repo does

### Mirror Notion

```bash
git pull
export NOTION_TOKEN=ntn_...          # or write it to .notion-token
python3 tools/notion_mirror.py --dry-run
python3 tools/notion_mirror.py --render-svg
git commit -am "sync from notion $(date +%F)" && git push
```

The mirror is derived from Notion's current state rather than from a diff of
recent edits, so it deletes files whose page no longer exists. Paper PDFs,
`sources/`, `video/` and `tools/` are never touched. Details and the page-to-path
map: `.claude/skills/kb-sync-from-notion/SKILL.md`.

The token is an internal integration secret from
<https://www.notion.so/profile/integrations>, connected to the "Technical
knowledge base" page. Read access is enough; nothing here writes to Notion.

### Make a video

```bash
bash video/env/setup.sh
python3 video/build.py tech_news_2026_09_21 --skip-tts --quality l   # silent preview
python3 video/build.py tech_news_2026_09_21                          # with voice
```

`video/README.md` is the manual. The craft rules are the Notion skill
"Explainer video style and voice".

## Layout

```
topics/ news/ updates/ papers/ TRACKER.md known-gaps.md   mirrored from Notion
papers/*/paper.pdf                                        repo-only
sources/                                                  repo-only snapshots
tools/notion_mirror.py                                    the mirror
video/                                                    the video toolchain
.claude/skills/                                           the two workflows
```
