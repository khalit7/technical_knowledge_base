# Context engineering: source

Build: `sh build.sh` writes `../index.html` from `parts/` (01_head, 10_header, 20_read_a..g = Reading, 33/34/35 tab HTML, 39 Further reading, every `*.js` in name order each in its own script, 99_js_tabs last). `python3 extract.py` regenerates `parts/30_js_data.js` (window.HCTX) from `recordings/` and `inputs/`; `python3 check.py` proves the page embeds it, recomputes the measured numbers quoted in prose, and scans for em-dashes and private strings.

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
- No `live.md` or `coverage.json`: a new page with no old Notion text. The parent root's section 3 and Trace and context lab are the floor; this page links their numbers (13,242-token startup, 184-token CLAUDE.md, the Loop lab's 0 cache reads) rather than repeating them, and carries everything new (forced compaction, cache placement, policies, skills, subagents, needles) with its own runs.
- Three lab tabs rather than one: each holds a different kind of evidence (a rules simulator, recorded sessions, graded calls).
- The needle tests are small (one haystack, few seeds) and say so; the published benchmarks are on the Long-context benchmarks page, linked.
