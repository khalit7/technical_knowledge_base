# Context engineering: source

Build: `sh build.sh` runs `memory_layers/make_memory.py` (writes `parts/36_js_mem_data.js` and `parts/20_read_h.html`), then writes `../index.html` from `parts/` (01_head, 10_header, 20_read_a..k = Reading, 39 Further reading, every `*.js` in name order each in its own script, 99_js_tabs last). `python3 extract.py` regenerates `parts/30_js_data.js` (window.HCTX) from `recordings/` and `inputs/`; `python3 check.py` proves the page embeds it, recomputes the measured numbers quoted in prose, and scans for em-dashes and private strings. `node src/check_controls.mjs <page>/index.html` (from the repository root) clicks every control in both themes and widths and checks that nothing moves before the reader acts.

## Rebuilt to the teaching contract, 24 October 2026
**Shape.** Tabs went from five (Reading, Cache lab, Compaction lab, Needle lab, Further reading) to two (Reading, Further reading): each lab explained one mechanism, so its visual moved inline beside the claim it proves. The top is now the core idea in one sentence, a hero figure (`#hc-hero`: one request in assembly order, the cached-prefix bracket, the section number of each lever on the block it acts on, and the three stores outside the window), the levers table, "You need" and new terms. Sections: 1 budget, 2 order and cache (recorded placement bars, the rules, the cache simulator inline with its check table closed), 3 tool outputs, 4 compaction (before/after call-by-call chart, recall table, the summary's "Pending Tasks" and "Optional Next Step" shown open with the whole summary, the session logs, the answers and the cost table closed; research designs closed), 5 memory files and skills, 6 subagents, 7 notes outside the window, 8 memory layers (new), 9 context rot (needle grid inline), 10 your own policy, then depth (mistakes worth a second look, interview rehearsal, closed).

**Memory layers folded in.** `agents_and_retrieval/topic_agentic_frameworks/agent_memory_layers` (Mem0, Zep's Graphiti, Letta) becomes section 8: write and read policies, the three designs, a new stepper (`37_js_mem.js`: one changing fact, Sam's gateway, through four stores session by session: the paper loop rewrites it, Mem0 2.2.1 piles up three sentences, Graphiti closes edges with dates (one wrongly), Letta files notes it never searches; then the question and each store's answer), the score-by-ability table, seven recorded failure modes, and closed blocks for Mem0's two pipelines and ranking formula, Graphiti's bi-temporal edges and pipeline, MemGPT and Letta, the question set, vocabulary, a checklist and rehearsal, write costs, and every published benchmark number with its runner. Its recordings, scripts, sources and data are copied to `memory_layers/` (`fmem_data.json` is the data that page embedded; `SOURCE_README.md` is its run log); `make_memory.py` builds this page's part from them. Not carried: the Memory lab's per-answer matrix and the LOCOMO dispute dot-plot animation (interface; every number is in the static table and the answers are in `memory_layers/recordings/answers.json`).

**Ownership.** Linked instead of taught: Claude Code's post-compaction re-injection list (claude_code, section 9), other harnesses' compaction thresholds (other_coding_harnesses), KV-cache sizing and effective context as a model property (long_context), lost in the middle (agentic_retrieval), RULER and NoLiMa (long_context_and_multimodal), retrieval mechanics (rag-and-retrieval), the loop (building_a_harness).

**Visuals.** Inline visuals in Reading went from 1 counted (most bars were HTML) to 9 SVG: hero (new), budget bar, cache placement bars, cache simulator chart (moved from the Cache lab), tool-output policies, compaction before/after (now with the uncompleted calls as dashed outlines so the whole path is visible at step 0), skills against CLAUDE.md, subagents, memory stepper (new), needle grid (moved from the Needle lab, now SVG). Bar charts are drawn by one SVG helper (`HCV.bars` in `31_js_read.js`).

**Never autoplay.** `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `hctx-tab`); the old play-on-first-view and play-on-toggle calls are gone. A simulator preset or control change jumps to the last call (a response to the reader, not motion). `check_controls.mjs` confirms every animation stays on step 0 under normal and reduced motion.

**Fixed.** The cache simulator's cumulative-cost line ran off the chart when caching cost more than not caching (the axis was scaled to the uncached line only).

**Deleted as fat.** Headings and lead-ins ("The problem."), the "Go deeper" pointers to removed tabs, three mistakes that restated the core (the summary is not a faithful record; a subagent does not save tokens; and the per-mistake restatement of section 2), lab-tab interface text, the memory page's wind-ups and tab descriptions.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading core | 7,648 words, 33 min | 7,786 words, 34 min |
| Reading closed | 741 words, 3 min | 5,654 words, 25 min |
| Other tabs, core | Cache lab 683, Compaction lab 1,830, Needle lab 735, Further reading 705: 17 min | Further reading 948: 4 min |
| Visuals inline (audit count: svg, canvas, img) | 1 | 9 |
| Absorbed page (Agent memory layers) | Reading 7,863 words (34 min) plus 3 tabs (22 min) | section 8: about 6 min core, 10 in closed blocks |

The whole subject (this page plus its labs plus the memory-layers page) took about 50 + 56 minutes of core reading before; it now takes 34 plus 4. Reading itself grew by one minute while absorbing three lab tabs and a whole sibling page. The length is right because the ledger is almost all core (291 core, 51 depth), the page owns nine distinct levers that each need their mechanism and their own recorded evidence, and every section is now a claim, its figure and its numbers. What could still go: the levers table at the top (kept as the one-screen map), and some of section 8's failure list (kept because each failure is a test to run before trusting a memory layer).

## Ledger
`ledger.json`: 391 units, core 291, depth 51, owned 7 (claude_code 2, other_coding_harnesses 1, agentic_retrieval 1, long_context_and_multimodal 3), fat 42; `python3 html_utils/ledger.py check` problems 0. The absorbed page's ledger (`agent_memory_layers/src/ledger.json`): 226 units, owned here 185, fat 41, problems 0. Keys were proposed by a script (the longest distinctive number or phrase of each unit found in the built page) and reviewed by hand; units whose key is found only inside a closed block are labelled depth.

## Recordings (Claude Code 2.1.290, claude -p, Claude subscription, 6 Oct 2026)
31 sessions, all Claude Haiku 4.5 (`claude-haiku-4-5-20251001`), redacted by `redact.py` (task directory to `/work`, init record whitelisted, ids and uuids removed, the recording machine's git identity and any e-mail address replaced (a model copied the identity into a `git config` command in `c4_auto`), long generated tool outputs cut to 1,500 characters with the received length kept in `hctx_full_chars`, em-dashes to commas: 34 in model and tool text):
- `c1_manual`, `c1_manual_r2`, `c1_manual_r3`: the standard task, then `/context`, `/compact`, `/context`, a recall question, through `runs/drive.py` (`--input-format stream-json`, one user message per turn). `c1_control*`: the same without `/compact`. The task folder has a three-line CLAUDE.md with a codename; the first message gives a reviewer and a ticket.
- `c4_auto`: `--autocompact 100000`, a task that first reads five 75 KB logs (`runs/make_fixtures.py`); automatic compaction fired (first attempt "too_few_groups"). `c3_big_nocompact`: the same task in the default 200K window (no compaction; the run where the flag was missing, kept as the control). `c2_auto`: `CLAUDE_CODE_AUTOCOMPACT_PCT_OVERRIDE=16` with `--autocompact 100000` on the small task: no compaction, `/context` still showed a 33k buffer.
- `cache_*` (11): one-call sessions, "Reply with the single word OK.", `--max-turns 1`, varying where a timestamp sits (`runs/cache_exp.sh`).
- `ctx0`, `ctx_sk_base`, `ctx_sk_skill`, `ctx_sk_claudemd`: `claude -p "/context"` only (no model call). `sk_invoke`: a skill invoked (`runs/release-notes-SKILL.md`).
- `sa_none`, `sa_agent` (grep-able question), `sb_none`, `sb_none_r2`, `sb_agent`, `sb_agent_r2` (read-everything question) over the 30-module package from `runs/make_fixtures.py`, with and without the Agent tool.
Every run passed `--setting-sources project --strict-mcp-config --no-session-persistence` and `--append-system-prompt "Never use the em-dash character."`.

## Other measurements
- `tool_policies.py` applies six policies to the parent's `ci.log` (scratch; regenerate with the parent Trace and context lab); `runs/count.sh` and `runs/count2.sh` count each result's tokens with Haiku 4.5 and make the Sonnet 5.5 summary; results in `inputs/policies.json`. The raw log was refused by Haiku ("Prompt is too long"), so its count is the sum of three parts.
- `needle/`: `make.py` builds cases from the Python 3.9 standard library (local Xcode copy) with literal, non-literal and tracking needles; `run_claude.py` (Haiku 4.5, 72 calls: 52 plus 20 extra tracking seeds) and `run_mlx.py` (Qwen3-4B-Instruct-2507 4-bit on mlx_lm.server 0.32.0, the shared server on port 8090, one request at a time); `grade.py` writes `inputs/needle_haiku.json` and `inputs/needle_local.json`.
- `inputs/probe_scores.json`: the recall answers scored by hand, with the reason for every non-ok score.

claude -p invocations in all: 31 recorded sessions, 15 token-count and summary calls, 72 needle calls.

## Departures from the method
- No real image: the subject is a mechanism, not a physical object, and the one canonical figure (lost in the middle) belongs to Agentic retrieval.
- No `live.md` or `coverage.json`: a new page with no old Notion text. The parent root's section 3 and Trace and context lab are the floor; this page links their numbers (13,242-token startup, 184-token CLAUDE.md, the Loop lab's 0 cache reads) rather than repeating them, and carries everything new (forced compaction, cache placement, policies, skills, subagents, needles) with its own runs.
- Three lab tabs rather than one: each holds a different kind of evidence (a rules simulator, recorded sessions, graded calls).
- The needle tests are small (one haystack, few seeds) and say so; the published benchmarks are on the Long-context benchmarks page, linked.

## Update pass 2026-10-26 (update-kb)
Core 33.9 to 34.9 min (header 35). Integrated: Cloudflare's shared-prefix breakpoint (vendor figures) as the production case of section 2's ordering rule; cache engineering (`drop`, `repos`, arXiv 2610.28577) as a sixth compaction design in section 4; a pointer from section 6 to Multi-agent patterns, which now owns Anthropic's "fold subagents into the main loop" guidance and the 30 to 50 tool-definition figure.
