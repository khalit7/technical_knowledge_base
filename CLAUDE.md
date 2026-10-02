# Operating instructions for agent sessions in this repo

This repository is the home of Khalid's Technical knowledge base. **It is the source of truth.** Notion only displays it: each migrated Notion page is one interactive HTML file built here, plus its video and child pages. Nothing is copied from Notion into this repo; when something exists only in Notion, it is brought here first and then published back.

## Layout

| Folder | What it is |
|---|---|
| `technical_knowledge_base/` | The knowledge base, laid out exactly like the Notion tree: one folder per Notion heading (`models_and_training/`, ...), one folder per page inside it, a child page's folder inside its parent's. Names are snake_case slugs of the Notion titles; each folder's README and `pages.json` give the exact title and Notion id. |
| `technical_knowledge_base/pages.json` | Manifest of every page: path, title, Notion id, status (`html_only` or `not_migrated`), `published_sha256` (what Notion holds now), video. |
| `html_utils/` | Building and checking interactive pages: `checkpage.sh`, `tabshot.mjs`, `sync_status.py`, `templates/`, `methods/` (one file per kind of page: the approved shape, as suggestions, not templates), the page-agent brief, and `interactive-html-ideas.md` (every visualisation idea so far plus the methodology for choosing them). |
| `video_utils/` | Narration (Chatterbox Turbo) and take checking for HyperFrames explainer videos; install notes in its README. |
| `.claude/skills/` | The skills (below) plus the vendored HyperFrames skills. Real folders, no symlinks. |

A migrated page folder holds `index.html` (the whole Notion page, built), `README.md`, `src/` (`build.sh`, `parts/`, `README.md`, `viz_ideas.md`, data scripts, `inputs/`) and, if it has one, `video/` (the HyperFrames project; renders are not committed).

## Skills (the only procedures that touch the knowledge base from here)
- `create-interactive-html`: build or rebuild a page as an HTML-only page.
- `create-explainer-video`: a narrated video of a page (HyperFrames + Chatterbox Turbo).
- `sync-KB-github`: publish every changed page to Notion, then commit and push.
The weekly Monday update (`update-KB`) still runs from Notion and has not been adapted to this model yet; Khalid will fix it. Do not run it from here.

## Notion facts worth knowing
- Root page "Technical knowledge base", id `3c65c17b-0d0d-81c7-b646-e548e65d9446`; space id `13e79c56-ebab-4528-83aa-967a204b1f04`. Use the Notion MCP connector (fetch, create-file-upload, update-page).
- The HTML block is a sandboxed iframe: no network of any kind.
- `replace_content` only on pages without child pages or databases; otherwise small `update_content` edits that leave `<page>`, `<database>` and `<video>` tags untouched.
- A fetched embed or video shows a signed S3 URL that never matches in `update_content`; match the stable `file://` form described in the `sync-KB-github` skill.
- Video uploads need `content_type` `video/mp4`.

## Khalid's preferences
- **Ask, don't assume**, when a decision is his.
- **Animations** for explanations, often: before/after of the same input, like the DeepSeek MLA explainer (`technical_knowledge_base/models_and_training/topic_llms/deepseek/`).
- Root `Topic: *` pages are short comparisons plus definitions; details live on child pages.
- Do not launch a multi-agent Workflow without his explicit opt-in; plain subagents are fine, about four at a time.

## Writing
No em-dashes anywhere: prose, HTML, captions, commit messages. Commas, colons, semicolons, parentheses; `--` for ranges.

## Setup on a new machine
`uv sync` (page data scripts), `cd html_utils && npm ci` (page checks), and for videos the steps in `video_utils/README.md`.

## Git
`git pull` first, always. Commit after a meaningful unit of work; push to main. Never commit MP4s, PDFs or files over about 5 MB.
