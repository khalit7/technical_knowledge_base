# Brief template: one paper page (one agent per paper)

Purpose: the fill-in prompt for a subagent that builds one paper page (a row of the Papers database) as an HTML-only page; used when several papers are built at once, about four agents at a time.

## How to fill it
- Give each agent the paper's exact title, Notion id (the row page; for a brand-new paper, the lead creates the row first or leaves the id pending), folder `technical_knowledge_base/whats_new/papers/<slug>/`, and anything the lead already knows (the paper's kind, an existing KB page that animates the same mechanism).
- The method is [../../page-kinds/paper.md](../../page-kinds/paper.md); this brief adds the rules for running many builders on one machine.
- Placeholders: `{{PAPER_TITLE}}`, `{{ROW_ID}}`, `{{SLUG}}`, `{{SCRATCH}}`, `{{TOOLS}}`, `{{KNOWN}}`.

---

## Template

You build ONE paper page of the knowledge base: "{{PAPER_TITLE}}" (Papers database row {{ROW_ID}}; folder `technical_knowledge_base/whats_new/papers/{{SLUG}}/`). {{KNOWN}}

READ, in this order: CLAUDE.md (no em-dashes anywhere); the explainer-page skill at `.claude/skills/explainer-page/`: SKILL.md, `page-kinds/paper.md` (the approved paper method and its dated lessons; a SUGGESTION, not a template: follow it where it fits this paper, depart where it does not and say why in `src/README.md`; a paper with nothing to run, no table worth rebuilding or no "then and now" simply does not get that tab), `teaching/page-quality.md`, `teaching/writing-style.md`, `evidence/sourcing.md`, `evidence/local-runs.md`, `evidence/resource-safety.md`, `visuals/choosing.md`, `visuals/animation-types.md`, `visuals/mechanics.md`, `build/scaffold.md`, `build/checks.md`. Then the reference implementation `technical_knowledge_base/whats_new/papers/attention_is_all_you_need_transformer/` (index.html and src/: copy its reusable pieces as `page-kinds/paper.md` lists them; never edit that folder).

STEP 0, SAVE AND READ: fetch the row page read-only (ToolSearch `select:mcp__notion__notion-fetch`) and save it verbatim to `src/live.md` with a script (never retype). The database properties (Paper, Takeaway, Topics, Year) stay in Notion; use the Takeaway on the headline card; every fact of the old page body must survive or be corrected (`src/coverage.json`). Fetch the paper itself (arXiv HTML where it exists, else the PDF text or the publisher page; keep small extracts in `src/inputs/`, never PDFs or files over about 1 MB) and read it, tables and appendix included, until you could teach it.

CONNECTIONS: every KB page is in `technical_knowledge_base/pages.json` (paper pages have `"parent": "Papers"`; the Papers page is 3c65c17b0d0d81549dbedb27e8f2a26f). Link connected pages as `https://app.notion.com/p/<id>` (or `{{text|n:<id>}}` in parts). If another page already animates this mechanism, link it and build the live ingredient around what only this paper claims.

LIVE INGREDIENT: choose by what the paper is (the table in `page-kinds/paper.md`) and only if it teaches more than reading. A toy model trained with `uv run --no-project --with torch python src/train.py` (never add torch to pyproject.toml) must have its JS forward pass checked against PyTorch and its accuracy measured on held-out data. Keep training under about 40 minutes of CPU. Weights and data count toward the page size: stay under about 1 MB unless the content truly needs more (say so).

COVERAGE LIST: when you copy `mk_coverage.py` from another paper, replace its item list entirely with this paper's own facts from `src/live.md` (a copied list once checked the wrong paper's facts and still reported all found).

WHAT TO KEEP IN THE REPO: every file the page's own scripts need to rebuild and check it, including the exported weights `check_forward.py` loads. Leave out large intermediate checkpoints (`model/ck/` and similar) unless a script needs them, and training data (regenerate it with a script). Keep `src/model/` under about 1 MB.

WORK IN SMALL STEPS AND SHARE THE MACHINE (several builders run at once):
- A 600 s no-progress watchdog kills agents, including one stuck writing a very large file in one call: write big files (`paper.json`, long parts, long scripts) in pieces of a few KB. Never read over about 40 KB in one call.
- Never run anything that can take more than about 4 minutes as one foreground command: training, long screenshot loops, big fetch batches. Start it detached with a pid file and a progress log, check the log with short commands, and do other work meanwhile; no sleep loops.
- `torch.set_num_threads(2)` (or `OMP_NUM_THREADS=2`) when several builders run, 4 at most otherwise; `nice -n 15`; train variants one after another. Run `sh {{TOOLS}}/guard.sh` before heavy steps; if HIGH, do light work. GPU (MPS) only under the bench lock with `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45` (plus `PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35`) (see `evidence/resource-safety.md`).
- If `checkpage.sh` is slow because the machine is busy, run it in the background too.
- Before training, look in `src/model/` for checkpoints an interrupted builder already produced and reuse them if their config matches.
- Never `pkill` or `killall`; kill only PIDs you started. Scratch files in `{{SCRATCH}}/papers/{{SLUG}}/` or `src/`, never in `/tmp` outside the scratchpad or in `html_utils/`.

PAGE: the paper tab ends with "How much of this to believe" (the paper's own evidence judged: what holds up, what is not like for like, single runs, error bars, appendix contradictions, a plain verdict) and, for papers recent enough to adopt, "What it takes to use this"; the headline card carries the one-line verdict. Every claim links into the paper at section, table or equation level; derived numbers recomputed in `src/recompute.py` with "defaults reproduce X (independently or by construction)" or a plain "does not reproduce" box.

CHECKS: `sh html_utils/checkpage.sh technical_knowledge_base/whats_new/papers/{{SLUG}}` ends fail=0, emdash 0, errbox 1, clipped 0; look at the screenshots of every tab (crop them) and mid-animation frames; exercise every control with a script at 390 px dark and 920 px light (`headless: 'shell'`; no errors, NaN, undefined, sideways scroll, text under 11 px, overlap); privacy grep (`/Users/`, `Users-`, `claude-`, `glpat`, `sk-ant`, emails); delete `__pycache__` and `.shots`. Rebuild the page as the very last step, after any final rerun or edit.

DO NOT: write to Notion, commit, edit `pages.json`, other papers' folders or `html_utils/`. Record visuals built and rejected in `src/viz_ideas.md`.

REPORT (once): the tabs and Reading outline; the verdict and its main reasons; the live ingredient chosen and why (or why none); what reproduces and what does not; coverage counts and corrections to the old summary; departures from `page-kinds/paper.md` and why; anything you could not source; reading time; page size; check results; new lessons worth adding to `page-kinds/paper.md`.

---

## After each paper lands (lead)
Re-run `checkpage.sh` and look at the screenshots; publish with the `sync-kb-github` steps (a row page has no children: `replace_content` with the embed and the source line); `python3 html_utils/paper_finalize.py <slug>` (marks it `html_only`, records the hash, commits); `git push`. Add any new dated lesson to `page-kinds/paper.md`.
