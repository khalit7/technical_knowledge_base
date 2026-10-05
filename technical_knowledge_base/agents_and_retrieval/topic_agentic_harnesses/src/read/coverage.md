# Coverage of the old Notion pages (Reading and Further reading tabs)

Old pages saved verbatim by script from the Notion fetch in `old/` (root fetched as of 2026-09-28; the five children as of 2026-09-22). Khalid asked to treat them as unverified notes. Each claim is marked:

- **verified**: checked against a primary source on 2026-10-05 (link given on the page) or against a recording in this repo.
- **verified (KB)**: taken from a live knowledge base page that checked it (paper pages, benchmark pages).
- **corrected**: the old claim was wrong or imprecise; the page carries the corrected form.
- **unconfirmed**: not checked here; not carried on the Reading tab. Candidates for the Harness atlas or the proposed child pages, each needing a primary source first.
- **moved**: owned by another tab, sibling root or page; linked, not repeated.

## Root page (Topic: agentic-harnesses)

| Old claim | Status | Where now |
|---|---|---|
| A harness wraps an LLM in an agent loop with tools: prompt assembly, tool schemas, permission gating, context management, UI | verified (Claude Code docs define the harness as the layer that provides tools and manages context) | Reading 0 |
| Harness quality swings SWE-bench by 10 to 22 points on identical weights ("Harness-Bench and similar") | unconfirmed (no primary source named); replaced by Arena HarnessTax (about +-2 points SWE-bench Lite, +-5 Terminal-Bench 2.0, cost about 2x) via the Agentic benchmarks page | Reading 7 |
| Harness decides the bill even where it does not move the score (21 pairs, 7 models, 3 harnesses) | verified (KB, Agentic benchmarks: Arena, 16 Sep 2026) | Reading 7, Further reading |
| MCP is the JSON-RPC protocol for tools | moved | MCP page |
| Taxonomy: terminal CLIs, IDEs, cloud agents, personal agents, research scaffolds | kept as the "where does it run" axis | Reading 6; atlas owns the product list |
| Product facts (Muse Code Sep 2, Cursor 3 Agents Window, Devin Desktop ex-Windsurf, Zed created ACP, Copilot background agents, Kilo fastest growing, Cursor Origin Aug 17, GitHub outage) | unconfirmed | Harness atlas / child "Other coding harnesses" |
| mini-SWE-agent about 65% on SWE-bench Verified | **corrected**: README (read 2026-10-05) says >74%, about 100 lines, bash only, no tool-calling interface | Reading 2 |
| Claude Code accepted AGENTS.md in 2.1.277/2.1.278 | partly verified: docs say Claude Code can read AGENTS.md; release numbers unconfirmed | Reading 3 |
| Claude Code 2.1.283 availableModelsMatch / deniedModels, /doctor prompt-audit, OTEL details, gateway settings | unconfirmed | child "Claude Code, from its recordings" |
| 2.1.283 made auto mode the starting mode | verified (docs: auto is the built-in starting mode for interactive sessions from v2.1.283) | Reading 5 |
| Delegating coordinator, Pizza Bot, Claude Projects coordinator | unconfirmed | not carried |
| Sakana Fugu orchestration as a model | unconfirmed | not carried |
| Devin Fusion: 62 for $7.90 vs 62 for $12.40 (AA Coding Agent Index v1.5) | unconfirmed | candidate for atlas |
| Toby Ord, swarm scaling | unconfirmed | frameworks root (multi-agent) |
| Linear: agents outpace CI (73%, 55 to 68%, 34%); Anthropic CI 25-fold | unconfirmed | not carried |
| Docker skills library | unconfirmed | not carried |
| Prime Agent: REPL, four-level state, ARC-AGI-3 30% to 95.5%, "underused" quote | verified (KB, Prime Agent page) | Reading 8 |
| JIT-Agent +7.7 / +8.8, 14.9 to 54.1% lower cost | verified (KB) | Reading 8 |
| StateM: harness tuned on scored tasks | verified (KB, Agentic benchmarks: 83.1% to 92.1% on TB 2.1, tuned on the same 89 tasks, submission closed) | Reading 7 |
| Apodex 1.1 | unconfirmed | not carried |
| WikiSkill (49.5 to 68.1, 39.4 to 63.3) | unconfirmed (no KB page) | not carried; candidate for "Context engineering" child |
| ContextPilot | unconfirmed | candidate for "Context engineering" child |
| Prime Agent specification exploitation | verified (KB): the Factorio shortcut saved as a skill | Reading 8 |
| ARC Prize Provider Adapter: GPT-6 Astra 62.7% vs 99.9% | **disagreement**: Agentic benchmarks page says 62.7% vs 98.6%. Not quoted; flagged in FACTS.md | Agentic benchmarks page |
| OpenAI Agents API and Anthropic Managed Agents auto permission policies (Sep 10) | unconfirmed | frameworks root (hosted runtimes) |
| HarnessDev (six creators, four domains, 2,207 instances; gap on code/search) | verified (KB); page carries the 34 of 64 held-out agreement | Reading 7, 8 |
| Repo-To-Skill, Paper2Agent 74 of 100 | unconfirmed | not carried |
| Terminal-Universe 37,300 environments, +11.9 TB 2.1 | **corrected** (KB): environments judged task-sufficient by an LLM, not shown runnable | Reading 8 |
| NeoHorse-1 | unconfirmed here (has a KB summary page per the old link) | not carried |
| Stencil harness playbook | unconfirmed | not carried |
| SoL-Pi 44.7 to 49.0% token traffic, about a third off cost | verified (KB) | Reading 8 |
| CliffCompaction 50% / 45% | unconfirmed | not carried |
| "three measurements put harness overhead at half of spend" | unconfirmed (rests on CliffCompaction) | not carried |
| RRSI +14.1 / +4.7 / 30% fewer tokens | **corrected** (KB): +14.1 with a secondary policy; +4.7 is the best of five OOD gains (mean 3.6); Table 2 says 36% | Reading 8 |
| Proactive Memory Agent numbers | verified (KB) | linked, Reading 3 |
| Just-in-Time Memory +16.2 / +16.3 / +3.9 | verified (KB) | linked, Reading 3 |
| Real-SWE results, 71.4% of short rollouts failed | unconfirmed here (Coding benchmarks page covers Real-SWE) | moved |
| Sierra Hyper-tau-bench 23.9% vs 82.2% | unconfirmed | not carried |
| Z.ai GLM-5.3 infra agent, 3.22x | unconfirmed | not carried |
| Nous 1,393 subagents refactor | unconfirmed | not carried |
| Agora numbers | verified (KB) | linked, Further reading |
| Emergence World | unconfirmed | not carried |
| Meta Muse Spark 1.3 security architecture | unconfirmed (old page itself says no primary URL) | principle carried without the product: Reading 5 ("keep enforcement outside the component that can be persuaded"; Claude Code credential masking is the verified example) |
| OpenAI DNS incident: flagged within 15 min, acknowledged 10:05, terminated 12:34 | **corrected**: report says flagged within 15 minutes, a person reviewing 3 minutes later, run killed 2.5 hours later; tool use on most capable models paused | Reading 5 |
| swarmtraces.org Hugging Face reconstruction | unconfirmed | not carried |
| Perplexity 108 trials, 4 of 9 models bypassed network policy | unconfirmed | child "Agent security" |
| Gemini broke out during an Irregular evaluation | unconfirmed | not carried |
| Manifold 349 skills with unreserved domains; Transluce probes | unconfirmed | child "Agent security" |
| ZCode workspace upload; Muse for Mac token zero-day | unconfirmed | child "Agent security" |
| Axes table (openness, model coupling, autonomy, surface, residency) | kept as five questions | Reading 6 |
| "Surface decides what verification is still available" | kept (reasoning, not a fact) | Reading 6 |
| Best resources (context engineering, long-running harnesses, SWE-agent, Terminal-Bench leaderboard, ACP) | first three verified and linked; leaderboard via the Agentic benchmarks page; ACP not linked (atlas) | Further reading |
| The video (re-cut 23 Sep 2026) | describes the old page; left for Khalid to decide | n/a |

## Claude Code: deep dive

| Old claim | Status | Where now |
|---|---|---|
| Single-threaded master loop, tools until no tool calls | verified (docs; recordings) | Reading 1 |
| "~98% of the code is infrastructure", codename nO | unconfirmed (third-party decompilation) | not carried |
| Read-only tools in parallel, mutating serially | unconfirmed | child |
| Real-time steering (queued messages, Esc) | verified (docs) | Reading 4 |
| TodoWrite, Plan Mode | verified (docs list plan mode; recordings show plan mode) | Reading 4 |
| Auto-compaction | verified (docs: clears older tool outputs first, then summarises) | Reading 3 |
| Extension layers table (CLAUDE.md, skills, commands, hooks, subagents, teams, MCP, plugins) | partly verified (CLAUDE.md, skills, hooks, subagents, MCP in docs); agent teams version numbers unconfirmed | Reading 3, 4; child |
| Hooks events, blocking | verified (32 events; exit 2 blocks) | Reading 4 |
| Sandboxed bash v2.0.5+ | sandbox verified (docs, off by default, Seatbelt / bubblewrap); version unconfirmed | Reading 5 |
| Deployment controls 2.1.257 to 2.1.278 | unconfirmed | child |
| Claude Fable 5.1 became the default model in 2.1.257 | unconfirmed | not carried |
| Power-user practices | reasoning; partly in mistakes/interview | Reading |

## OpenAI and Google harnesses
All product facts (Codex CLI Rust rewrite, star counts, kernel sandbox details, Sept 2026 release train, Agents API beta, Gemini CLI access changes, Antigravity, Jules, Muse Code) are **unconfirmed** and belong to the Harness atlas or the proposed "Other coding harnesses" child. The Reading tab names Codex CLI and Gemini CLI only as open-source terminal harnesses.

## Open-source harnesses
- Aider edit formats as a first-class problem: **verified** (aider.chat edit formats page: whole, diff, diff-fenced, udiff, editor-diff, editor-whole). Reading 2.
- SWE-agent ACI: **verified** (arXiv 2405.15793: 12.5% SWE-bench, 87.7% HumanEvalFix). Reading 2.
- mini-SWE-agent ~65%: **corrected** to >74% (README). Reading 2.
- OpenCode architecture, star counts, OAuth politics, Cursor and OpenAI cut-off, Goose to Linux Foundation, Cline family facts, Aider stalled since Aug 2025: **unconfirmed**; atlas or child.
- "Harness choice barely moves success, changes cost": **verified (KB)**. Reading 7.

## Harness engineering: the transferable layer
- Loop, deterministic apply layer, error recovery: kept as reasoning, Reading 1, 2, 9.
- Context lever stack (curation, progressive disclosure, compaction, notes, subagents): **verified** against Anthropic's context-engineering post (29 Sep 2025) and Claude Code docs. Reading 3.
- Tool design rules: **verified** against Anthropic's tool post (11 Sep 2025), including the 25,000-token default cap. Reading 2.
- "Agents optimising their own tools beat human-written versions": the post says agents can analyse transcripts and improve tools, and most of its advice came from doing so; the "beat" comparison is not carried.
- Permission spectrum (approval, allowlists, app-layer, OS sandbox, VM): kept as layers 1 to 4. Reading 5.
- Codex kernel sandbox details: unconfirmed; atlas.
- Long-running harness (initializer, feature loop, verification): **verified** (Anthropic, 26 Nov 2025: initializer agent, coding agent, claude-progress.txt, feature_list.json). Reading 3, 4.
- Memory layers, WikiSkill: WikiSkill unconfirmed.
- Benchmarks section: SWE-bench Verified 97%, Real-SWE 38.8%, Terminal-Bench 57.5 vs 64.7 (Terminus 2 vs Codex CLI), TB 4.0 changes, Nvidia ARC-AGI-3 30% to 100%, StateM 95.3% at $15 vs $575: all **moved** to the benchmark pages (StateM verified there); not repeated.
- Grok cryptographic context injection (Adversa AI): **unconfirmed**; the lesson (egress is the control, gate on the action) is carried with the verified OpenAI DNS example instead. Reading 5.

## Personal agents
All facts (OpenClaw history, star counts, workspace files, CVE-2026-25253, ClawHub malware, Hermes Agent skills loop, OpenRouter token volumes, Anthropic session-theft response, Meta Muse agent) are **unconfirmed** and stay on the child page, which section 10 proposes to rebuild from primary sources. The Reading tab names OpenClaw and Hermes Agent only as examples of resident agents.

## New on the Reading tab (not on the old pages)
- The running example replayed from real recordings (step 0 against Claude Code, same model).
- Measured costs, cache reads, startup context, run-to-run spread, Loop lab harness vs Claude Code.
- Tool calling as trained behaviour (OpenAI 13 Jun 2023; Toolformer Feb 2023).
- The lethal trifecta (Willison, 16 Jun 2025).
- Plan mode answered by Sonnet 5.5; result.usage omits subagents (recordings).
- Proposed child-page structure (section 10).
