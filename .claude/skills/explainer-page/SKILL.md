---
name: explainer-page
description: Build an interactive explainer page for Khalid's Technical knowledge base, one self-contained HTML file that teaches a subject (Reading tab, labs and animations, Further reading). Use for a brand-new topic described in a few lines (root page plus child pages), a single child page, a paper page, a tech-news issue, or rebuilding or migrating an existing page. Covers understanding the topic, the teaching plan, page kinds, animation types, when to run things locally, building, checking and orchestrating subagents.
---

# explainer-page

**The goal: Khalid understands the subject deeply in the least time.** Read [teaching/teaching-contract.md](teaching/teaching-contract.md) first: the page shape, length judged per page with a knowledge ledger, and choosing each visual by what the concept is.

**Golden rule: understand the topic well enough to teach it before building anything.** A page is a teacher, not a summary. If you cannot explain the problem, the mechanism, the cost, when it matters and how to check it, with a running example and the numbers traced to sources, you are not ready to write a tab or brief an agent.

The repository is the source of truth. Every page is one interactive `index.html` built from `src/` in its folder under `technical_knowledge_base/`; it is read on the public site built from `main` (https://khalit7.github.io/technical_knowledge_base/), and its Notion page is only a link to it. Publishing is the `sync-kb-github` skill (check, commit, push; a new page also gets its Notion link page). Videos are the `explainer-video` skill.

## Inputs this skill handles
| Input | Start with | Page kind |
|---|---|---|
| A new topic and a few lines on what Khalid wants to learn | [understand/reader.md](understand/reader.md) (ask the opening questions), then research and curriculum | [page-kinds/topic-root.md](page-kinds/topic-root.md) + children [page-kinds/topic-child.md](page-kinds/topic-child.md), run with [orchestration/topic-pipeline.md](orchestration/topic-pipeline.md) |
| One new child page under an existing root | read the root and siblings, then research | [page-kinds/topic-child.md](page-kinds/topic-child.md) |
| A paper (title, arXiv link or PDF) | [understand/research.md](understand/research.md) (read the paper and its tables) | [page-kinds/paper.md](page-kinds/paper.md) |
| An article (a blog post, explainer, essay or postmortem worth its own page) | [understand/research.md](understand/research.md) (read the article and its responses) | [page-kinds/article.md](page-kinds/article.md) |
| A tech-news issue (written by the `update-kb` skill's periodic pass) | sources of the window | [page-kinds/tech-news.md](page-kinds/tech-news.md) |
| Merge, fold or retire an existing page | [page-kinds/migrate-or-fold.md](page-kinds/migrate-or-fold.md) | the kind it becomes |
| An audit or rebuild of a page already in the repo (condense, restructure, re-visualise) | [teaching/teaching-contract.md](teaching/teaching-contract.md) (knowledge ledger, `html_utils/ledger.py`), the measurement `html_utils/audit_pages.mjs` | the kind it is |

## The flow
1. **Know the reader.** [understand/reader.md](understand/reader.md): who Khalid is, what he already knows, the opening questions for a new topic (level, goals, evidence allowed, deletions). Ask only those; decide the curriculum yourself ([teach, don't ask scope]).
2. **Learn it.** [understand/research.md](understand/research.md): primary sources and their tables, pinned source code at file:line, independent measurements, every old claim verified, shared `FACTS.md`.
3. **Plan the teaching.** [understand/curriculum.md](understand/curriculum.md): one running example, the comparison axes for the root, depth for the children, labs, what to measure. Present it to Khalid as a teaching plan with reasons and the proposed children (approve, reword, drop).
4. **Choose the evidence.** [evidence/sourcing.md](evidence/sourcing.md) for published numbers; [evidence/local-runs.md](evidence/local-runs.md) for when running locally is genuinely useful; [evidence/resource-safety.md](evidence/resource-safety.md) before any heavy run.
5. **Choose the visuals.** [visuals/choosing.md](visuals/choosing.md), the catalogue [visuals/animation-types.md](visuals/animation-types.md) (before/after on the same input first), [visuals/three-d.md](visuals/three-d.md) (3D stages) and [visuals/mechanics.md](visuals/mechanics.md) (including the split layout).
6. **Write to teach.** [teaching/teaching-contract.md](teaching/teaching-contract.md), [teaching/page-quality.md](teaching/page-quality.md) and [teaching/writing-style.md](teaching/writing-style.md).
7. **Build and check.** [build/scaffold.md](build/scaffold.md), [build/templates/](build/templates/), [build/checks.md](build/checks.md).
8. **Publish** with the `sync-kb-github` skill. Concept owners: add a row to `technical_knowledge_base/OWNERS.md` when the page owns something new. Present pages to Khalid before publishing unless he has said to publish.
9. **Keep the lessons.** Add a dated lesson to the page-kind file or [lessons.md](lessons.md) when something new is learned; add a new page kind when Khalid approves a new shape.

Many pages at once (a topic, a batch of papers): [orchestration/topic-pipeline.md](orchestration/topic-pipeline.md) and the fill-in briefs in [orchestration/briefs/](orchestration/briefs/).

## Hard constraints (each rule lives in the file named)
- **The shapes in page-kinds are suggestions, not templates.** Take what fits the content, depart where it needs and say why in `src/README.md`.
- One self-contained `index.html` per page (no network, no CDN, no web fonts; images in `img/`), the AI buddy loader the only exception: [build/scaffold.md](build/scaffold.md).
- Tabs: Reading first and open by default, one tab per standalone lab or tool that deserves room, Further reading last.
- Split layout, 2D by default, every animation explained step by step: [teaching/teaching-contract.md](teaching/teaching-contract.md); motion rules: [visuals/mechanics.md](visuals/mechanics.md).
- Fail-safe JS, light and dark, 390 px with no sideways scroll, and the checkpage line: [build/scaffold.md](build/scaffold.md), [build/checks.md](build/checks.md).
- Every fact sourced and dated, measured results labelled: [evidence/sourcing.md](evidence/sourcing.md), [evidence/local-runs.md](evidence/local-runs.md).
- Privacy: [build/checks.md](build/checks.md), Privacy. Machine safety: [evidence/resource-safety.md](evidence/resource-safety.md).
- Agents never commit, publish or edit `pages.json`: [orchestration/topic-pipeline.md](orchestration/topic-pipeline.md), Lead rules.
- An existing page without a new equivalent is never left unchecked: [page-kinds/migrate-or-fold.md](page-kinds/migrate-or-fold.md).

## Reference pages in this repo
- Split layout, 3D stages, step lists and autoplay: `technical_knowledge_base/whats_new/papers/attention_is_all_you_need_transformer/`.
- Root built by a team with labs and children: `technical_knowledge_base/models_and_training/topic_generative_and_multimodal/` (children inside it).
- Before/after animation Khalid likes most: the MLA explainer, Fig. 4 of `technical_knowledge_base/models_and_training/topic_llm_architecture/attention_variants/` (`src/parts/44_js_sc_mla.js`).
- Paper: `technical_knowledge_base/whats_new/papers/ddpm/`, `.../clip/`.
- Each page's `src/README.md` says how it was built and `src/viz_ideas.md` lists the visuals built and rejected.

[teach, don't ask scope]: understand/reader.md
