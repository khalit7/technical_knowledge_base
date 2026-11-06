# Claude Agent SDK: the Claude Code loop as a library: source

Child of Topic: agentic-frameworks. Builds `../index.html` (about 294 KB; the recordings data is about 130 KB of it).

## Shape (rebuilt 2026-10-24 to the teaching contract)
Child page (`.claude/skills/explainer-page/page-kinds/topic-child.md`), prefix `fsdk`, storage key `fsdk-tab`. Tabs: Reading, Options lab (a tool used across the page), Recordings (the dataset view every section draws on), Further reading. The Wire lab tab explained one mechanism (the pipe), so it moved into Reading section 1.

| Part | What |
|---|---|
| `20_read_a.html` | styles, nav, the core idea in one sentence, the hero (three processes, one pipe), You need, new terms, the pieces table; section 1 with the wire replay inline (s1 against s3) and a closed depth block (binary lookup, every control message, the old analogy) |
| `20_read_b.html` | section 2 (`query()`, the client; message classes closed), section 3 (the s1 against s3 before/after figure, the four defaults, who answers "ask"; option groups closed) |
| `20_read_c.html` | section 4 (where tools run: new static diagram), 5 (permission stepper; callback signature closed), 6 (subagents: new two-lane figure of run s5; AgentDefinition fields closed) |
| `20_read_d.html` | section 7 (sessions: new figure of run s4's three processes and running cost; rewind), 8 (structured output), 9 (cost bars, counting rules, connector bars) |
| `20_read_e.html` | section 10 (a product on it: auth, hosting, tenancy, observability, Python or TypeScript, inherit against pay; Managed Agents and OpenAI tables closed), 11 (dated facts, closed table), Depth (old page claim by claim, now static HTML; three interview questions) |
| `02_split.html`, `21_js_rd_common.js`, `25_js_s3.js`, `99_js_tabs.js` | the skill templates, unchanged (split layout; `RD.anim`; renderer v2 and `S3.stage`; tabs, key `fsdk-tab`) |
| `23_js_fsdk_read.js` | one-screen stats, rewind tile, structured output |
| `25_js_fsdk_read2.js` | cost and connector bars |
| `26_js_fsdk_wire.js` | the wire replay, a reader-driven widget since 2026-11-06 (opens on s1's first permission question, never plays by itself) |
| `27_js_fsdk_figs.js` | s1 against s3, where tools run, run s5 on two lanes |
| `40_js_sc_hero.js`, `41_js_sc_perm.js`, `42_js_sc_sess.js` | the three 3D stages (2026-11-06): Fig. 1 run s1 on the pipe, Fig. 2 the permission gates, Fig. 3 run s4's sessions |

Checks: `check_page.py` (data and 26 prose numbers), `check_stages.mjs` (2026-11-06: every stage plays in view at 1400, 920 and 390 px, steps to its end in every mode with one list item per step, flows stop off screen, nothing moves under reduced motion, the wire widget never plays by itself, the split is two columns at 1400), `check_controls.mjs` (every control in both themes and widths; every stage plays in view, the wire widget does not), `shot_el.mjs` (element screenshots for review). `label_ledger.py` fills `ledger.json` labels and keys (rerunnable).

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

## The 2026-11-06 pass: split layout, 3D stages (renderer v2), explained and autoplaying animations
- **Split layout** (`parts/02_split.html`, template, after `01_head.html` in `build.sh`). Split: the idea (Fig. 1 stage beside the core sentence and its step list), 1 (text beside the wire replay), 3 (beside s1 against s3), 4 (beside where tools run), 5 (Fig. 2 stage), 6 (beside run s5's lanes), 7 (Fig. 3 stage; the helpers, checkpointing and rewind part after it is full width), 9 twice (counting rules beside the cost bars; the connector pitfall beside its bars), and the Options lab (form and consequences left, the generated code, command and `initialize` right). Full width: You need, terms, pieces table and stats; 2; 8 (the structured output is code); 10; 11; Depth; Recordings (a dataset view); Further reading unchanged.
- **Three 3D stages** (`25_js_s3.js` v2, unchanged; scenes `40` to `42`), on the page's own recordings:
  - Fig. 1 (`40_js_sc_hero.js`, replaces the SVG architecture hero): the three processes (your process with its loop, hooks, callback and `@tool` server; the Claude Code child with its loop, permission check, tools and session file; the API with the model as a glass plate), stdin and stdout as two lanes, and run s1's 83 wire lines grouped into seven stretches (opening, first model call, a hook-settled read, a callback-decided test run, five more calls, the result). Flow colours by line kind, dot counts from the lines in each stretch; per-stretch counters and times drawn from `FSDK.wire.s1_wire`.
  - Fig. 2 (`41_js_sc_perm.js`, replaces the HTML stepper `24_js_fsdk_pipe.js`, deleted): the six stages as glass gates (your hook and callback green, Claude Code's rules blue), every main-thread tool call of s1 (7), s2 (9) and s3 (16) as a ball, grouped by the stage and verdict that settled it (same classification as the old stepper), flowing to the tool or back to the model; three step lists swapped by the mode toggle (4, 5 and 4 steps). The old stepper was one step per call (16 for s3), against the long-replay rule.
  - Fig. 3 (`42_js_sc_sess.js`, replaces the SVG of run s4): three processes on one history, session files as slabs with transcript flows into and out of them, the recorded `get_context_usage` as a glass context column (2,572 of 200,000, autocompact line at 167,000), and the reported cost after each phase as columns stacked earlier spend plus own. The "What the run shows" paragraph became its six steps; one derived number is new: the four reported totals sum to $0.1203 against $0.0424 really spent (sum of `total_cost_usd` over the four results).
- **Long replay turned widget**: section 1's wire replay (83 and 64 lines) no longer animates; it opens on s1's first permission question (s3: the first refusal) and moves only when the reader moves it (`A.go()` after creation marks it reader-driven in `RD.anim`). Fig. 1 plays the same run in seven explained stretches. Its predict prompt moved to the left column.
- **Kept 2D**: s1 against s3 (paired bars, numbers on an axis), where tools run (a static structure diagram that reads fully flat), run s5's two lanes (a timeline), the cost and connector bars (bars), the rewind tile and structured output (text). Code, option tables and configuration stay text.
- **Motion**: `21_js_rd_common.js` and `99_js_tabs.js` are the templates (key `fsdk-tab`); stages play once at least half in view, pause off screen, stop on any control or at the last step, never move under reduced motion. Page CSS `#t-read .an-ctl` now excludes `.stg-bar`, so the stage bar stays on one line on phones.
- **Checks**: `check_page.py` prose needle updated for the reworded context report, and its login-name scan made case-sensitive (the templates cite the page owner by his capitalised first name); `check_controls.mjs` never-autoplay assertion inverted; new `check_stages.mjs`. Last run: `check_stages.mjs` problems 0; `check_controls.mjs` clean at 390 dark and 920 light; `check_page.py` OK (26 numbers); `ledger.py check` problems 0 (units 25 and 26 re-keyed to the new hero and replay wording); `checkpage.sh` fail=0, emdash 0, errbox 1, clipped 0.
- **Length**: Reading core 26.7 min before, 29.9 after (6,148 to 6,888 words); closed details 9.7, unchanged; Options lab 2.3, Recordings 5.9, Further reading 2.5, unchanged. The growth is the step lists of the three stages (17 visible items), which carry the numbers each step draws; the hero caption, the stepper's note, the s4 caption and the "What the run shows" paragraph were cut against them. Header now says 30 min.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence (the SDK starts the Claude Code binary and answers its questions on the pipe) and a hero figure (the old architecture drawing, now titled with what to notice), then You need, five new terms and the pieces table.
- **Visuals inline beside the claim**: the Wire lab's replay moved into section 1 with a prediction prompt; four new figures drawn from the recordings: s1 against s3 on the same task (the before/after the defaults section describes), where each kind of tool runs (static), run s5's main agent and subagent on two time lanes (the stalled first delegation), and run s4's three processes with the running cost (replacing four text cards).
- **No autoplay**: template `21_js_rd_common.js` (the old one played each animation the first time it scrolled into view), and the two mode toggles no longer start playback.
- **Depth closed**: binary lookup and the control-message table, message classes, option groups, the callback signature, AgentDefinition fields, s9's refused commands, observability measurements, the Managed Agents and OpenAI tables, dated facts, the old page claim by claim (now static HTML, so the ledger can see it), three interview questions.
- **Deleted as fat**: the "Common mistakes" block (each one restated a section; the two facts only it held, the Claude Code preset's 7,612 against 1,388 tokens and the data-retention point, moved into sections 3 and 2), three interview questions that restated sections 5 and 9, the Wire lab card in Further reading.
- **Volatile**: versions, release dates and hook-event lists are gathered in section 11's dated table.
- **Further reading**: times updated for Claude Code (36), Building a harness (35), Context engineering (34) and Agent security (24); the "Agent memory layers" card was removed because its id is now an alias of Context engineering, whose card names the memory products.
- **Real images**: none. The page is about a library and a wire format; the real artefact is the recorded wire, which section 1 replays. No photo would teach anything here.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 30.7 min | 26.7 min |
| Reading, closed details | 2.9 min | 9.7 min |
| Other tabs, core | Wire lab 1.9, Options lab 2.3, Recordings 5.9, Further reading 2.6 | Options lab 2.3, Recordings 5.9, Further reading 2.5 |
| Core, Reading plus Wire lab | 32.6 min | 26.7 min |
| Visuals drawn in Reading (SVG, audit count) | 1 | 5 (plus the HTML stepper, replay, bars and tiles) |

Why about 27 minutes is right: the page owns eleven distinct parts of one library (the pipe, entry points, defaults, three kinds of tools, the permission order and hooks, subagents, sessions and rewind, structured output, cost accounting, deployment and the trade-off against one's own loop), each with a recorded run whose numbers are the evidence; about 700 of the core words are the step captions and counters of the replay and the stepper. What is optional on first read (reference tables, signatures, field lists, dated facts, the old page's audit) is closed. Cutting further would mean dropping a recorded finding, which the ledger forbids.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
278 units: core 206, depth 49, fat 22, volatile 1 (the PyPI licence fact, kept in section 11's dated table). 262 were drafted by `ledger.py init`; 16 were added by hand for what the old page drew by script (13 claim-table rows, the cost and connector bars, the hero). Fat units carry a `note`.
