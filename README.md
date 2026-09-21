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
uv run tools/notion_mirror.py --dry-run
uv run tools/notion_mirror.py
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
bash video/env/setup.sh                              # manim, once
uv run video/build.py tech_news_2026_09_21_short --skip-tts --quality l   # silent preview
uv run video/build.py tech_news_2026_09_21_short                          # with voice
```

`video/README.md` is the mechanics. The method is the Notion skill "Produce
technical explainer video", mirrored here as `.claude/skills/kb-make-video/`.

## Layout

```
topics/ news/ updates/ papers/ TRACKER.md known-gaps.md   mirrored from Notion
papers/*/paper.pdf                                        repo-only
sources/                                                  repo-only snapshots
tools/notion_mirror.py                                    the mirror
video/                                                    the video toolchain
.claude/INSTRUCTIONS.md, .claude/skills/                   mirrored from Notion
pyproject.toml, uv.lock                                   dependencies, via uv
```

## Dependencies

The project is uv-managed. `uv run <script>` installs what it needs on first
use, from `uv.lock`.

- The mirror needs only `requests`, which is the default dependency set, so a
  fresh clone can sync in seconds.
- The voice half of the video pipeline is the `tts` group: `uv sync --group tts`,
  or just `uv run --group tts ...`. It pulls PyTorch from the CUDA 12.8 index,
  because the RTX 5090s are Blackwell and the default PyPI wheels give a
  working import with a GPU that never engages.
- The animation half is the `video` group: manim, which builds pycairo and
  manimpango against the cairo and pango headers installed on this machine.

Both video groups are requested together (`uv sync --group tts --group video`),
because syncing one at a time uninstalls the other.

The system packages behind them, installed once with apt, are listed at the
bottom of `pyproject.toml`.
