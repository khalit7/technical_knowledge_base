# Brief: build one paper page (given to one subagent per paper) (a row of the Papers database) as an HTML-only page

Repo: /Users/khalid/technical_knowledge_base. You are given the paper's title, Notion id and folder.

Read, in this order: CLAUDE.md; html_utils/methods/README.md and html_utils/methods/papers.md (the approved paper-page method; it is a SUGGESTION, not a template: follow it where it fits this paper, depart from it where it does not, and say why in src/README.md; a paper with nothing to run, no table worth rebuilding or no "then and now" simply does not get that tab); html_utils/BRIEF_page_agent.md (the full model, Step 0, steps and reply format) and everything it says to read; the reference implementation technical_knowledge_base/reference/papers/attention_is_all_you_need_transformer/ (index.html and src/: copy its reusable pieces as papers.md lists them; never edit that folder).

Step 0: fetch the row page read-only (ToolSearch "select:mcp__notion__notion-fetch") and save it verbatim to src/live.md with a script (never retype). The database properties (Paper, Takeaway, Topics, Year) stay in Notion; use the Takeaway on the headline card; every fact of the page body must survive (src/coverage.json). Fetch the paper itself (arXiv HTML where it exists, else the PDF text or the publisher page; keep small extracts in src/inputs/, never PDFs or files over about 1 MB) and read it until you could teach it.

Connections: every KB paper page is in technical_knowledge_base/pages.json (entries with "parent": "Papers": folder, title, Notion id), as are topic and other KB pages. Link connected pages as https://app.notion.com/p/<id>; the parent Papers page is 3c65c17b0d0d81549dbedb27e8f2a26f.

Live ingredient: choose by what the paper is (papers.md's table) and only if it teaches more than reading. A toy model trained with `uv run --with torch python src/train.py` (never add torch to pyproject.toml) must have its JS forward pass checked against PyTorch and its accuracy measured on held-out data; keep training under about 40 minutes of CPU (other agents are training in parallel). Weights and data count toward the page size: stay under about 300 KB unless the content truly needs more (say so).

**Coverage list.** When you copy `mk_coverage.py` from another paper, replace its item list entirely with this paper's own facts from `src/live.md`; a copied list once checked the wrong paper's facts and still reported all found.

**What to keep in the repo.** Keep every file the page's own scripts need to rebuild and check it, including the exported weights `check_forward.py` loads. Leave out large intermediate training checkpoints (`model/ck/` and similar) unless a script needs them, and training data (regenerate it with a script). Keep each paper's `src/model/` under about 1 MB.

**Long-running commands (important).** An agent that shows no progress for 600 seconds is killed, and that includes one stuck writing a very large file in a single call: write big files (paper.json, long HTML parts, long scripts) in several smaller pieces. Also, and several builders run at once on one machine. So:
- Never run anything that can take more than about 4 minutes as one foreground command: model training, long screenshot loops, big fetch batches.
- Start training with the Bash tool's `run_in_background`, write progress to a log file, and check the log with short commands every few minutes.
- Call `torch.set_num_threads(2)` (or set `OMP_NUM_THREADS=2`) and train variants one after another, not all at once.
- If `checkpage.sh` is slow because the machine is busy, run it in the background too.
- Before training, look in `src/model/` for checkpoints an interrupted builder already produced, and reuse them if their config matches.

Check: `sh html_utils/checkpage.sh <folder>` must end fail=0 with emdash 0, errbox 1 and clipped 0; look at the screenshots of every tab (crop them) and mid-animation frames; exercise every control with a script at 390 dark and 920 light (no errors, NaN, undefined, sideways scroll, text under 11 px, overlap). No em-dashes anywhere.

Never write to Notion, commit, edit pages.json, other papers' folders or shared html_utils files (put this paper's new idea rows in src/viz_ideas.md with ids P-<folder>.<k>; the orchestrator merges them; temporary scripts go in your own scratch space or src/).

The paper tab ends with "How much of this to believe" (the paper's own evidence judged: what holds up, what is not like for like, single runs, error bars, appendix contradictions, a plain verdict) and, for papers recent enough to adopt, "What it takes to use this"; the headline card carries the one-line verdict (see papers.md).

Reply as BRIEF_page_agent.md specifies, plus: the verdict and its main reasons, the live ingredient chosen and why (or why none), what reproduces and what does not, corrections to the old summary, departures from papers.md and why, size, and the new idea rows.
