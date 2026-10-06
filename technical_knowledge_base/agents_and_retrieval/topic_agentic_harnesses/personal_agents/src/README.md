# Personal agents: source

Built 2026-10-06 by the personal_agents page agent (prefix hpers). `sh build.sh` writes `../index.html`.

## Parts
- `parts/01_head.html` (shared CSS, copied from the context_engineering sibling), `10_header.html` (title, tabs).
- Reading: `20_read_a.html` (styles, nav, In one screen), `b` (1 resident pieces), `c` (2 OpenClaw), `d` (3 Hermes Agent), `e` (4 mid-run messages, 5 memory), `f` (6 trust boundary), `g` (7 verification and undo), `h` (8 the record, 9 hosted and layering), `i` (10 old page, mistakes, interview questions; closes t-read).
- JS: `21_js_rd_common.js` (shared RD helpers), `30_js_data.js` (generated), `31_js_read_day.js`, `32_js_read_steer.js`, `33_js_read_mem.js`, `34_js_day.js`, `35_js_gate.js`, `36_js_read_old.js`, `99_js_tabs.js`.
- Tabs: `34_tab_day.html` (A day, replayed), `35_tab_gate.html` (Gate designer), `39_tab_more.html` (Further reading).

## Data and recordings
- `demo/`: the resident agent written for this page (`resident.py`, 241 lines; `world.py`, the fake world: inbox, calendar, eleven past-session lines in SQLite FTS5 with the Porter tokenizer), scenarios in `demo/scen/`, run lists `runs_haiku.txt`, `runs_sonnet.txt`, and `runset.sh`. Model: `claude -p --tools "" --system-prompt ... --setting-sources project --strict-mcp-config --no-session-persistence`, Claude Code 2.1.290, haiku = claude-haiku-4-5-20251001, sonnet = claude-sonnet-5-5. One ACTION line per reply, text after it dropped. Fake data only: no account, channel or service is touched.
- `recordings/`: 32 redacted runs (190 model calls). Raw runs stay in the scratch directory. `redact.py RAW_DIR` writes them: paths to /work, init records reduced to a whitelist, e-mail addresses, the machine's git identity and login scrubbed case-insensitively, em-dashes to ", " (none occurred), and a final privacy grep.
- `s2_haiku_hintbug_1` is a run recorded before a parser fix (Haiku put arguments beside "tool" instead of inside "args"; the old parser dropped them). Kept as evidence; every other run was recorded after the fix (the parser now accepts both forms and logs `flattened`). Earlier runs with the bug were discarded and re-recorded.
- Known bug left visible: with the gate off, the `remember` tool has no implementation and answers "error: unknown tool" (said on the page).
- `build_data.py` -> `parts/30_js_data.js` (recordings plus `old_claims.json`); memory answers graded by a keyword rule, every answer read by hand.
- `check.py`: page embeds exactly the built data; every hand-written number about the recordings matches; the Gate designer preset reproduces all 45 recorded gate-on decisions; privacy grep.
- `old_claims.json` and `coverage.json`: the old page (`live.md`, verbatim) claim by claim: 39 claims, 20 verified, 15 corrected, 4 unconfirmed.

## Sources
Research notes with quotes and URLs were gathered on 2026-10-06 from primary sources: docs.openclaw.ai (v2026.9.8), github.com/openclaw/openclaw (SECURITY.md, GitHub API), NousResearch/hermes-agent at tag v2026.9.24 (commit f97608f), NVD and GitHub advisories, the original incident reports (Ethiack, depthfirst, Bitsight, SecurityScorecard, Wiz, Koi, VirusTotal, AFP, Bloomberg), Meta's Muse posts, NVIDIA, Anthropic's September 2026 threat report, OWASP.

## Departures from the brief
- No local-model runs: the shared mlx_lm server died (generation thread) while batching other agents' long prompts; this agent did not own it and did not restart it.
- OpenClaw and Hermes Agent were not installed or run: the permission policy refused installing them. Everything about them is from docs and source.
- Data file is about 170 KB, so the page is about 296 KB, near the 300 KB guide.
