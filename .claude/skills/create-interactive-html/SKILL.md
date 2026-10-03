---
name: create-interactive-html
description: Turn a Technical knowledge base page (topic, child page, tech news issue, paper, ...) into an HTML-only page, one self-contained interactive HTML file that is the whole Notion page, with a Reading tab (explanation with inline visualisations and animations), one tab per standalone visualisation, and a Further reading tab. Use when Khalid asks for a page to be converted, built or rebuilt.
---

# create-interactive-html

Each knowledge base page is one interactive HTML file. Its source lives in this repository at `technical_knowledge_base/<section>/<topic>/[<child>/]src/`, `src/build.sh` builds `index.html` beside it, and the `sync-KB-github` skill puts that file on the Notion page as its only content (plus any video and child pages). The repository is the source of truth; Notion only displays it.

## Use when
Khalid asks for a page (or a whole topic) to be made HTML-only, or for an existing page's HTML to be changed or rebuilt. Narrated videos are the `create-explainer-video` skill.

## Read first
- `html_utils/methods/README.md`, then the method for this kind of page if there is one (`topic_pages.md`, `tech_news.md`, `papers.md`): the shape Khalid approved for that kind, why, and its reference folder. **They are suggestions, not templates**: take what fits the page's content, change or drop what does not, and give a page that fits none of them a shape of its own, saying why in its `src/README.md`. Never force content into a method's shape. When Khalid approves a new shape or changes his mind, update or add a method file.
- `html_utils/BRIEF_page_agent.md`: the full model, fail-safe build and steps. A subagent building a page is given this brief.
- `html_utils/interactive-html-ideas.md`: every visualisation idea built or rejected so far, and the Methodology for choosing visualisations (scoring, tab versus inline, recompute scripts, independent versus by-construction reproduction, conflicting primary sources side by side, index version and date beside every score, matched precision, never splicing metrics, where to look for ideas and data, animation guidance). Add the page's ideas to its table when you finish.
- A finished example: the method's reference folder, or for a deep-dive child page `technical_knowledge_base/models_and_training/topic_llms/anthropic_claude_family/`.

## The page model
- **The HTML is the page.** The old Notion text is deleted, so the HTML must carry every piece of knowledge the page had, self-contained. Child pages, databases and a video stay on the Notion page under the HTML and are linked from it.
- **A root `Topic: *` page** is mainly a comparison between things plus the definitions needed for it: its Reading tab is as short as possible while still self-sufficient. Move details down to the child page that owns them first (move, then cut), never just drop them.
- **Tabs, always:** Reading first and open by default (explanation interleaved with the visualisations needed to follow it), then one tab per standalone visualisation that deserves room (none is fine), then Further reading last (child pages, related pages and the best resources, every one a working link with `target="_blank" rel="noopener noreferrer"`, Notion pages as `https://app.notion.com/p/<id>`, each with a time estimate). Which visuals and how many is your decision from the content.
- **Every visualisation earns its place:** build one only where interacting teaches more than reading. Say what it shows and what to try; make its starting state meaningful; compute its numbers from the page's formulas; label illustrative inputs. **Prefer animations** for mechanisms and processes, especially before/after: the same input run through the old method and the new one, drawn to scale, a caption per step, counters, play/pause/step/scrub/speed, running only on screen and in the visible tab, paused under reduced motion (Khalid's favourite is the DeepSeek MLA explainer).
- **Sourcing:** every specific fact links its source inline; derived numbers show their formula; a "defaults reproduce X (source)" line says independently or by construction; unsourced claims are marked unconfirmed.

## Constraints
- **Notion's HTML block is a sandboxed iframe:** one self-contained file, no network, CDN, web fonts, images by URL or fetch. Hand-written HTML, SVG and Canvas. Storage wrapped in try/catch; the page works without it.
- **Fail-safe build:** each JS part in its own `<script>`, the tab wiring last, the hidden `#jsErr` box and global error handler from `html_utils/templates/05z_errbox.js.html`. Never pass a literal backslash-n through `echo` in `build.sh`.
- Light and dark via `prefers-color-scheme`, colours as CSS variables; phone width with no sideways page scroll; under about 300 KB; draw each tab's charts when the tab opens.
- No em-dashes anywhere.

## How
1. **Set up the folder.** Find the page in `technical_knowledge_base/pages.json` (path, title, Notion id). Folder names are snake_case slugs of the Notion titles. A child page gets its own folder inside its parent's and its own manifest entry (`"parent"`).
2. **Absorb the subject:** fetch the Notion page (read-only) if it is still written text, save it verbatim to `src/live.md`, read it with its child pages and resources until you could teach it.
3. **Build** following the brief; for several pages at once, give each a subagent with `html_utils/BRIEF_page_agent.md` (ask Khalid before running a multi-agent Workflow; plain subagents are fine). Run at most about four at a time, starting the next page as each finishes. A root page is built one subagent per tab (Part A of `html_utils/methods/topic_pages.md`); a child page's prompt names its parent root and the siblings and paper pages to link. Present finished pages to Khalid for review before publishing unless he has said to publish.
4. **Check:** `sh html_utils/checkpage.sh <page folder>` must end `fail=0`, `emdash 0`, `errbox 1`. Look at the screenshots. Confirm `src/coverage.json` accounts for everything in `src/live.md`.
5. **Publish and record:** publish with the `sync-KB-github` skill (a page with child pages is cleared block by block with `update_content`, never `replace_content`), then `python3 html_utils/page_finalize.py <page folder>...` (sets `html_only`, records the published hash, copies the page's idea tables into the ideas log, commits; paper pages use `paper_finalize.py`) and `git push`. Append any general lesson to the method file's Lessons.

## Tooling
`cd html_utils && npm ci` once (puppeteer with its own Chrome). Data scripts are plain Python 3 (stdlib, plus `pyyaml` in a few) and run from the page's `src/`.
