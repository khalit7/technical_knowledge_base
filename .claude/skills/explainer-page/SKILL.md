---
name: explainer-page
description: Build an interactive explainer page for Khalid's Technical knowledge base, one self-contained HTML file that teaches a subject (Reading tab, labs and animations, Further reading). Use for a brand-new topic described in a few lines (root page plus child pages), a single child page, a paper page, a tech-news issue, or rebuilding or migrating an existing page. Covers understanding the topic, the teaching plan, page kinds, animation types, when to run things locally, building, checking and orchestrating subagents.
---

# explainer-page

**The goal: Khalid understands the subject deeply in the least time.** Read [teaching/teaching-contract.md](teaching/teaching-contract.md) first: the page shape, length judged per page with a knowledge ledger, and choosing each visual by what the concept is. It overrides any older rule here that adds mandatory sections.

**Golden rule: understand the topic well enough to teach it before building anything.** A page is a teacher, not a summary. If you cannot explain the problem, the mechanism, the cost, when it matters and how to check it, with a running example and the numbers traced to sources, you are not ready to write a tab or brief an agent.

The repository is the source of truth; Notion only displays it. Every page is one interactive `index.html` built from `src/` in its folder under `technical_knowledge_base/`, then published by the `sync-kb-github` skill. Videos are the `explainer-video` skill.

## Inputs this skill handles
| Input | Start with | Page kind |
|---|---|---|
| A new topic and a few lines on what Khalid wants to learn | [understand/reader.md](understand/reader.md) (ask the opening questions), then research and curriculum | [page-kinds/topic-root.md](page-kinds/topic-root.md) + children [page-kinds/topic-child.md](page-kinds/topic-child.md), run with [orchestration/topic-pipeline.md](orchestration/topic-pipeline.md) |
| One new child page under an existing root | read the root and siblings, then research | [page-kinds/topic-child.md](page-kinds/topic-child.md) |
| A paper (title, arXiv link or PDF) | [understand/research.md](understand/research.md) (read the paper and its tables) | [page-kinds/paper.md](page-kinds/paper.md) |
| A tech-news issue (written by the `update-kb` skill's periodic pass) | sources of the window | [page-kinds/tech-news.md](page-kinds/tech-news.md) |
| An existing written Notion page or an old topic | [page-kinds/migrate-or-fold.md](page-kinds/migrate-or-fold.md) (coverage floor, unmatched children) | the kind it becomes |
| An audit or rebuild of a page already in the repo (condense, restructure, re-visualise) | [teaching/teaching-contract.md](teaching/teaching-contract.md) (knowledge ledger, `html_utils/ledger.py`), the measurement `html_utils/audit_pages.mjs` | the kind it is |

## The flow
1. **Know the reader.** [understand/reader.md](understand/reader.md): who Khalid is, what he already knows, the opening questions for a new topic (level, goals, evidence allowed, deletions). Ask only those; decide the curriculum yourself ([teach, don't ask scope]).
2. **Learn it.** [understand/research.md](understand/research.md): primary sources and their tables, pinned source code at file:line, independent measurements, every old claim verified, shared `FACTS.md`.
3. **Plan the teaching.** [understand/curriculum.md](understand/curriculum.md): one running example, the comparison axes for the root, depth for the children, labs, what to measure. Present it to Khalid as a teaching plan with reasons and the proposed children (approve, reword, drop).
4. **Choose the evidence.** [evidence/sourcing.md](evidence/sourcing.md) for published numbers; [evidence/local-runs.md](evidence/local-runs.md) for when running locally is genuinely useful; [evidence/resource-safety.md](evidence/resource-safety.md) before any heavy run on the Mac.
5. **Choose the visuals.** [visuals/choosing.md](visuals/choosing.md), the catalogue [visuals/animation-types.md](visuals/animation-types.md) (before/after on the same input first), and [visuals/mechanics.md](visuals/mechanics.md).
6. **Write to teach.** [teaching/teaching-contract.md](teaching/teaching-contract.md), [teaching/page-quality.md](teaching/page-quality.md) and [teaching/writing-style.md](teaching/writing-style.md).
7. **Build and check.** [build/scaffold.md](build/scaffold.md), [build/templates/](build/templates/), [build/checks.md](build/checks.md).
8. **Publish and record.** The `sync-kb-github` skill, then `python3 html_utils/page_finalize.py <folder>` (papers: `paper_finalize.py <slug>`), `git push`, `python3 html_utils/sync_status.py --no-build`. Present pages to Khalid before publishing unless he has said to publish.
9. **Keep the lessons.** Add a dated lesson to the page-kind file or [lessons.md](lessons.md) when something new is learned; add a new page kind when Khalid approves a new shape.

Many pages at once (a topic, a batch of papers): [orchestration/topic-pipeline.md](orchestration/topic-pipeline.md) and the fill-in briefs in [orchestration/briefs/](orchestration/briefs/).

## Hard constraints
- **The shapes in page-kinds are suggestions, not templates.** Take what fits the content, depart where it needs and say why in `src/README.md`. Never force content into a shape.
- One self-contained `index.html` per page: no network, no CDN, no web fonts; images as small WebP files in `img/` once the page is served by the private site, data URIs while it is still a Notion embed ([visuals/mechanics.md](visuals/mechanics.md)).
- Tabs: Reading first and open by default, one tab per standalone lab or tool that deserves room, Further reading last.
- Fail-safe JS (one `<script>` per JS part, the `#jsErr` box), light and dark, 390 px with no sideways scroll, animations pause off screen and under reduced motion.
- Every specific fact sourced inline and dated; measured results labelled with the machine; anything not run says "not run here" and why.
- No em-dashes anywhere (prose, HTML, captions, commits).
- Privacy: never write the home path, the scratchpad path, hostnames, network addresses, git identity, emails or tokens into the repo or a page.
- Safety of the Mac first: guard before heavy steps, one GPU job at a time, the MPS memory cap ([evidence/resource-safety.md](evidence/resource-safety.md)).
- Ask Khalid before a multi-agent Workflow; plain subagents are fine (about four at a time). Agents never commit, publish or edit `pages.json`.
- Never leave an old page without a new equivalent unchecked: grep coverage, report, ask (rebuild, fold, or retitle "TO DELETE: ...").

## Reference pages in this repo
- Root built by a team with labs and children: `technical_knowledge_base/models_and_training/topic_generative_and_multimodal/` (children inside it).
- Before/after animation Khalid likes most: `technical_knowledge_base/models_and_training/topic_llm_landscape/deepseek/` (the MLA explainer).
- Paper: `technical_knowledge_base/reference/papers/ddpm/`, `.../clip/`.
- Each page's `src/README.md` says how it was built and `src/viz_ideas.md` lists the visuals built and rejected.

[teach, don't ask scope]: understand/reader.md
