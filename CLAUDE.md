# Operating instructions for agent sessions in this repo

This repository is the home of Khalid's Technical knowledge base. **It is the source of truth.** Each page is one interactive HTML file built here and read on the public site built from `main` by GitHub Actions: https://khalit7.github.io/technical_knowledge_base/ (Khalid reads it; only he can push). Notion keeps the same tree as an index: each Notion page is one link to its site page, plus its video and child pages. Nothing is copied from Notion into this repo; Notion holds no knowledge.

## Layout

| Folder | What it is |
|---|---|
| `technical_knowledge_base/` | The knowledge base, laid out exactly like the Notion tree: one folder per Notion heading (`models_and_training/`, ...), one folder per page inside it, a child page's folder inside its parent's. Names are snake_case slugs of the Notion titles; each folder's README and `pages.json` give the exact title and Notion id. |
| `technical_knowledge_base/pages.json` | Manifest of every page: path, title, Notion id, status (`html_only` or `not_migrated`), `notion` (`link` once its Notion page is a link page), video, and for every topic page `prereqs`: the ids of its strict prerequisites (pages a reader cannot understand it without), which drive the learning map on the site's landing page. |
| `technical_knowledge_base/OWNERS.md` | Which page owns each concept; every other page links to the owner instead of re-teaching it. |
| `audit/` | Dated measurements of every page (reading minutes, visuals inline and in tabs). |
| `.github/workflows/site.yml` | Builds and deploys the reading site on every push to main. |
| `html_utils/` | Runtime only: `checkpage.sh`, `tabshot.mjs`, `clipcheck.mjs`, `tex2mathml.mjs`, `sync_status.py`, `page_finalize.py`, `paper_finalize.py`, `audit_pages.mjs`/`.py` (what each page gives a reader), `ledger.py` (condense without losing knowledge), `check_times.py` (reading times quoted for other pages; `--fix`), `learning_map.py` (checks `prereqs` and lays out the landing page's learning map; `check` before every push), `build_site.py` (the public reading site on GitHub Pages, see `sync-kb-github/site.md`). How pages are built lives in the `explainer-page` skill. |
| `.claude/skills/` | Only the four skills below. Real folders, no symlinks. The third-party HyperFrames skills the video workflow uses are vendored inside `explainer-video/vendor/`; unused ones were removed (reinstall with `npx hyperframes skills update <name>` then `explainer-video/scripts/vendor_skills.sh <name>`). Everything learned about how Khalid wants pages built (reader, page kinds, animation types, local runs, resource safety, briefs, lessons) lives in `explainer-page/`; narration scripts and voice envs in `explainer-video/narration/`. |

A page folder holds `index.html` (the whole page, built), `README.md`, `src/` (`build.sh`, `parts/`, `README.md`, `viz_ideas.md`, `ledger.json`, data scripts, `inputs/`), `img/` if it uses images and, if it has one, `video/` (the HyperFrames project; renders are not committed).

## Skills (the only procedures that touch the knowledge base from here)
- `explainer-page`: teach a subject as an interactive page: a new topic (root plus children) from a few lines of what Khalid wants to learn, a child page, a paper, a tech-news issue, or a rebuild or migration.
- `explainer-video`: a narrated video of a page (HyperFrames + Chatterbox Turbo).
- `sync-kb-github`: publish: check, commit and push (the site deploys from main); keep each Notion page a link page.
- `update-kb`: the periodic update. Reads the last-updated date from Notion (Source freshness, row "Technical KB"), researches everything since, writes that window's tech-news issue, integrates durable knowledge into the owning pages, adds papers, publishes, and moves the date forward.

No knowledge-base skills live in Notion any more (deleted 2026-10-19); Notion's Instructions page and the weekly Monday routine point here.

## Notion facts worth knowing
- Root page "Technical knowledge base", id `3c65c17b-0d0d-81c7-b646-e548e65d9446`; space id `13e79c56-ebab-4528-83aa-967a204b1f04`. Use the Notion MCP connector (fetch, create-pages, update-page).
- Each page's body is one link line to `https://khalit7.github.io/technical_knowledge_base/p/<id>/` (a redirect the site build writes, stable when a page moves), then its video and child pages. The exact line is in the `sync-kb-github` skill.
- `replace_content` only on pages without child pages or databases; otherwise small `update_content` edits that leave `<page>`, `<database>` and `<video>` tags untouched.
- Video uploads need `content_type` `video/mp4`; a video sits under the link line.

## Khalid's preferences
- **Ask, don't assume**, when a decision is his.
- **The goal of every page: understand the subject deeply in the least time** (`explainer-page/teaching/teaching-contract.md`, agreed 2026-10-23). A visual beside every core idea, chosen by what the concept is (static diagram, stepper, animation only when the change is the point, before/after like the DeepSeek MLA explainer, real image); nothing decorative; never autoplay. Length is judged per page and condensing never loses important information (knowledge ledger). He reads to understand, not to memorise: no quizzes or flashcards.
- Root `Topic: *` pages are short comparisons plus definitions; details live on child pages; one page owns each concept and the others link to it.
- Do not launch a multi-agent Workflow without his explicit opt-in; plain subagents are fine, about four at a time.

## Writing
No em-dashes anywhere: prose, HTML, captions, commit messages. Commas, colons, semicolons, parentheses; `--` for ranges.

## Setup on a new machine
`uv sync` (page data scripts), `cd html_utils && NPM_CONFIG_USERCONFIG= npm ci` (page checks), and for videos `.claude/skills/explainer-video/narration/install.md`.

## Git
`git pull` first, always. Commit after a meaningful unit of work; push to main. Never commit MP4s, PDFs or files over about 5 MB.
