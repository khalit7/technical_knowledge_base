# Claude Agent SDK: the Claude Code loop as a library: source

Child of Topic: agentic-frameworks. Builds `../index.html` (about 285 KB; the recordings data is about 130 KB of it).

## Shape
Part B (child page) of `html_utils/methods/topic_pages.md`: a Reading tab in the order a user meets the library (what it is, entry points, options and defaults, tools, permissions and hooks, subagents, sessions, structured output, cost, deployment and alternatives), then the old page claim by claim, common mistakes and interview questions. Three tabs: Wire lab (replay of the recorded inter-process wire, before/after), Options lab (options to code, command line and consequences, checked against recorded commands), Recordings. Departure from the method: no "in production now" section; the hosting patterns and the Managed Agents mapping in section 10 play that role. Claude Code the product is owned by the harnesses child "Claude Code, taken apart" and is linked, not repeated.

## Recordings (6 Oct 2026, Claude subscription)
Python claude-agent-sdk 0.2.163 with its bundled Claude Code 2.1.286 (s8: TypeScript @anthropic-ai/claude-agent-sdk 0.3.291 with Claude Code 2.1.291), Haiku 4.5 unless noted, on the shared `textstats` task repository (fresh copy per run). Every run passes `setting_sources=[]` and `strict_mcp_config=True` and an explicit tool list, except the counting calls of s7, which only kept counts.
- s1_wire: our four tools in-process, PreToolUse hook (allows read-only tools), PostToolUse, can_use_tool. Wire logged.
- s2_deny: as s1, prompt also asks for a new test; callback makes tests/ read-only.
- s3_bare: defaults written out (empty prompt but one line, default tools, mode default, no callback). Wire logged.
- s4_session: ClaudeSDKClient two turns + get_context_usage, then resume and fork.
- s5_subagent: Sonnet 5.5 + Haiku subagent from AgentDefinition, acceptEdits, one allow rule.
- s6_structured: output_format JSON schema.
- s7_connectors: six one-turn calls, strict vs not, counts only (no names stored anywhere).
- s8_ts: s1 in TypeScript.
- s9_rewind: built-in tools, file checkpointing, rewind_files.
Session transcripts the runs wrote under the home directory were measured (`recordings/session_files.json`) and deleted.

## Files
- `code/`: the scenario scripts, `common.py` (tools reuse `../../src/same/code/tools_impl.py` of the root), `wire.py` (stand-in for the CLI binary that logs every stdin/stdout line), `run.sh` / `run_ts.sh` (fresh repo copy, run, test afterwards, diff; set ROOT_CODE), `s8_ts.mjs`.
- `redact.py RAW WORK`: raw logs (kept outside the repo) to `recordings/*.json`; whitelists the init record and the initialize answer (which carries the account), scrubs paths, login name, git identity and e-mails, replaces ids, refuses to write if anything private remains.
- `recompute.py`: every number into `data/numbers.json` (calls deduplicated by message id, cost reproduced from list prices, per-phase costs).
- `gen_data.py`: `parts/22_js_fsdk_data.js`.
- `check_page.py`: data part up to date and embedded, exactly the recorded runs, 26 prose numbers recomputed, private-string and em-dash scan.
- `live.md` (old Notion page verbatim), `coverage.json` (33 claims and their fate), `viz_ideas.md`.

## Pipeline
    python3 redact.py RAW WORK && python3 recompute.py && python3 gen_data.py && sh build.sh && python3 check_page.py
    (from the repo root) sh html_utils/checkpage.sh technical_knowledge_base/agents_and_retrieval/topic_agentic_frameworks/claude_agent_sdk

## Findings worth carrying elsewhere
- `system_prompt=None` sends `--system-prompt ""`; `tools=None` gives Claude Code's default set (29 tools here); `can_use_tool` adds `--permission-prompt-tool stdio`.
- Defaults with nobody answering: `subtype "success"`, 6 refusals, tests failing (s3).
- MCP tools of an in-process server ask for permission like any other tool (every call reached the callback in s4).
- Non-strict starts loaded 0, 165 and 122 connector tools on the same account minutes apart (up to 128,306 tokens, $0.257 for "OK").
- `model_usage` includes one small Haiku call per new session (916 input tokens) that the stream never shows; purpose unconfirmed.
- Subagent cache writes reproduce only at the 5-minute price (as on the Claude Code child).
- The TypeScript SDK's first call was 176 tokens larger, from its newer bundled Claude Code.
