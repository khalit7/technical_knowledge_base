# Brief template: one article page (one agent per article)

Purpose: the fill-in prompt for a subagent that builds one article page (a page under Articles) as an HTML-only page; used when several articles are built at once, at most three agents at a time.

## How to fill it
- Give each agent the article's exact title, URL, author, Notion id (the lead creates the link page first, or leaves the id pending), folder `technical_knowledge_base/whats_new/articles/<slug>/`, and anything the lead already knows (responses and discussion threads found during research, the KB pages it touches, whether it earns a live ingredient).
- The method is [../../page-kinds/article.md](../../page-kinds/article.md), which adapts [../../page-kinds/paper.md](../../page-kinds/paper.md); this brief adds the rules for running several builders on one machine.
- Placeholders: `{{ARTICLE_TITLE}}`, `{{URL}}`, `{{PAGE_ID}}`, `{{SLUG}}`, `{{SCRATCH}}`, `{{TOOLS}}`, `{{KNOWN}}`, `{{REFERENCE}}` (the reference article folder: `technical_knowledge_base/whats_new/articles/weight_space_programming/`).

---

## Template

You build ONE article page of the knowledge base: "{{ARTICLE_TITLE}}" ({{URL}}; Notion page {{PAGE_ID}}; folder `technical_knowledge_base/whats_new/articles/{{SLUG}}/`). {{KNOWN}}

READ, in this order: CLAUDE.md (no em-dashes anywhere); the explainer-page skill at `.claude/skills/explainer-page/`: SKILL.md, `teaching/teaching-contract.md`, `page-kinds/article.md` (the article method; a SUGGESTION, not a template), `page-kinds/paper.md` (the method it adapts, with its dated lessons), `teaching/page-quality.md`, `teaching/writing-style.md`, `evidence/sourcing.md`, `evidence/local-runs.md`, `evidence/resource-safety.md`, `visuals/choosing.md`, `visuals/animation-types.md`, `visuals/mechanics.md`, `build/scaffold.md`, `build/checks.md`. Then the reference folder `{{REFERENCE}}` (copy its reusable `src/` pieces; never edit it).

STEP 0, READ: fetch the article and read it until you could teach it; `extract_article.py` keeps the plain-text extract in `src/inputs/article.txt` with the fetch date (gitignored: the full text never enters the public repo; `src/fragments.json` keeps the linked phrases). Read whatever the author released beside it (logs, prompts, tables). Find its responses (rebuttals, replications, the author's replies, the discussion thread) and read them too. Summarise in your own words; quote only where wording matters; the author's figures only under a licence that allows it, otherwise redrawn from the article's numbers and credited.

CONNECTIONS: every KB page is in `technical_knowledge_base/pages.json`. Link connected pages as `https://app.notion.com/p/<id>` (or `{{text|n:<id>}}` in parts). A mechanism another page owns gets a sentence and a link (`technical_knowledge_base/OWNERS.md`); this page owns only the article's argument, evidence and reception. List in your report the exact passages on other pages the article makes untrue or should extend: the lead edits those pages, not you.

PAGE: the headline card from `src/article.json` (required fields in `page-kinds/article.md`); the argument in the article's order with text-fragment links into it; "How much of this to believe"; "What the responses said"; "Where it moves the knowledge base"; Further reading. A live ingredient only when it teaches more than reading.

WORK IN SMALL STEPS AND SHARE THE MACHINE: follow `evidence/resource-safety.md` (guard via `sh {{TOOLS}}/guard.sh`, `nice -n 15`, anything over about 4 minutes detached with a pid file and a log, kill only your own PIDs). Scratch files in `{{SCRATCH}}/articles/{{SLUG}}/` or `src/`, never in `/tmp` outside the scratchpad or in `html_utils/`.

CHECKS: everything in `build/checks.md`; `build.sh` finds every text fragment in the extract; `python3 html_utils/whats_new.py check` passes for this page; `ledger.py check` problems 0. Rebuild the page as the very last step.

DO NOT: write to Notion, commit, edit `pages.json`, other pages' folders or `html_utils/`. Record visuals built and rejected in `src/viz_ideas.md`.

REPORT (once): the Reading outline; the takeaway and verdict and their reasons; the responses found; the passages on other KB pages to change (page, passage, what and why); the live ingredient chosen and why (or why none); departures from `page-kinds/article.md`; anything you could not source; reading time; page size; check results; lessons worth adding to `page-kinds/article.md`.

---

## After each article lands (lead)
Re-run `checkpage.sh` and look at the screenshots; make the KB edits the report lists (owner pages, Further reading); publish with the `sync-kb-github` skill. Add any new dated lesson to `page-kinds/article.md`.
