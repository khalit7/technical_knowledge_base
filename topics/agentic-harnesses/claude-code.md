# Claude Code: deep dive

⏱ 8 min read · +2h 55m resources

*Updated: 2026-09-21 (September deployment controls integrated through 2.1.278, including **`AGENTS.md`** support; stray release fragment repaired)*

### Best resources

- [Claude Code docs](https://code.claude.com/docs/en/overview) (docs, ~40 min for the core pages): canonical reference; the [What's new](https://code.claude.com/docs/en/whats-new) (~10 min) page tracks the fast-moving surface
- [Anthropic: Claude Code best practices](https://www.anthropic.com/engineering/claude-code-best-practices) (30 min): the agentic-coding playbook, still the single best read
- [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) (25 min): the design philosophy behind compaction, note-taking, subagents
- [PromptLayer: Behind the scenes of the master agent loop](https://blog.promptlayer.com/claude-code-behind-the-scenes-of-the-master-agent-loop/) (20 min): reverse-engineered internals of the single-threaded loop
- [Claude Agent SDK docs](https://platform.claude.com/docs/en/agent-sdk/overview) (docs, ~35 min for the core pages): the same harness as a library
- [Changelog](https://code.claude.com/docs/en/changelog) (15 min): the release feed behind the deployment controls below

### What it is

Anthropic's terminal-first coding agent (launched Feb 2025), now spanning CLI, VS Code and JetBrains extensions, a web UI with cloud sessions, and a GitHub app. It is the reference implementation of the "harness" idea: a deliberately simple loop surrounded by heavy engineering in context management, permissions, and extensibility. Model-locked to Claude in practice (Opus/Sonnet/Haiku tiers), though enterprise routes exist via Bedrock/Vertex.

### Architecture: the loop

The core is a **single-threaded master loop** (internally codenamed nO in early decompiled analyses): send conversation + tool schemas to the model; if the response contains tool calls, execute them (read-only tools in parallel, mutating tools serially), append results, repeat until the model stops calling tools. Deliberate design choices:

- **One main thread, no graph.** Anthropic rejected multi-agent swarms for the primary flow; debuggability and steerability beat theoretical parallelism. Parallelism is opt-in via subagents and agent teams.
- **Complexity lives around the loop, not in it.** Analyses estimate ~98% of the code is infrastructure: streaming, permission gating, compaction, error recovery, TUI.
- **Real-time steering**: user input mid-turn is injected into the loop (queued messages, Esc to interrupt) rather than waiting for the turn to end.
- **Planning as a tool**: the TodoWrite/task list keeps the model honest on multi-step work; Plan Mode (Shift+Tab) is a read-only mode that produces an approved plan before edits.
- **Context management**: auto-compaction summarises the transcript as the window fills, preserving decisions and unresolved state while discarding stale tool output; the scratchpad directory and `CLAUDE.md` act as external memory. With 1M-token Sonnet/Opus context this triggers later but the machinery is unchanged.
- **Small, sharp toolset**: Read/Write/Edit, Bash (persistent-ish shell), Grep/Glob, WebFetch/WebSearch, Task (subagents), NotebookEdit. Tool descriptions are long and prescriptive; this is prompt engineering aimed at the tool layer.

### The extension layers

Each layer changes what the model can see or do; knowing which to reach for is the core power-user skill.

| Layer | What it is | When to use |
| --- | --- | --- |
| **`CLAUDE.md`** | Markdown memory auto-loaded into context (enterprise, user `~/.claude/`, project, subdirectory scoped); the cross-tool `AGENTS.md` works as a full alternative since 2.1.278 | Always-on facts: build commands, conventions, gotchas. Keep it short; it taxes every request |
| **Skills** | Folders with `SKILL.md`  • optional scripts/assets; only name+description loaded until invoked (progressive disclosure) | Real domain procedures with helper files; shareable know-how |
| **Slash commands** | Prompt templates in `.claude/commands/` | Parameterised prompts with no logic |
| **Hooks** | Shell commands on lifecycle events (PreToolUse, PostToolUse, Stop, SessionStart, ...) that can block or inject context | Deterministic enforcement: run prettier after edits, block writes outside repo, gate on tests. Rules you want obeyed 100% of the time are hooks, not prompts |
| **Subagents** | Separate context windows launched via the Task tool, defined in `.claude/agents/*.md` with own model/tools/prompt | Context isolation (search fan-out returns conclusions, not file dumps) and parallelism |
| **Agent teams** | Research preview: multiple full sessions from one orchestrator, cross-session messaging (v2.1.220+, Aug 2026) | Independent workstreams on related tasks |
| **MCP** | Client (and server via `claude mcp serve`) for external tools/resources; see [Model Context Protocol (MCP)](../protocols/mcp.md) | Third-party context: issue trackers, DBs, browsers |
| **Plugins** | Versioned bundles of skills+commands+hooks+agents+MCP configs, installable from marketplaces | Distribution unit for all of the above |
| **Output styles / statusline** | Persona and TUI customisation | Cosmetic/system-prompt level changes |

Rule of thumb from the community: prompt template -> slash command; domain logic + files -> skill; must-always-happen -> hook; isolated or parallel work -> subagent; share it -> plugin.

### SDK and headless use

- `claude -p "prompt"` (headless/print mode) with `--output-format json` for scripting and CI.
- The **Claude Agent SDK** (TypeScript/Python) exposes the same loop, tools, permission system, hooks, and MCP support as a library: Claude Code minus the TUI. It is Anthropic's recommended base for building non-coding agents too, and belongs equally to [Topic: agentic-frameworks](../agentic-frameworks/summary.md).
- GitHub Actions integration and cloud sessions ([claude.ai/code](http://claude.ai/code)) run the harness in managed sandboxes; `claude agents` dashboards track running/blocked sessions.

### Deployment and organisation controls (as of Sep 2026)

The releases through September 2026 (2.1.257 to 2.1.278) changed how the harness is deployed far more than how it feels to use. Grouped by what each one changes for a deployer:

- **Repo memory file**: the cross-tool `AGENTS.md` standard is now accepted alongside `CLAUDE.md`. 2.1.277 added it for projects with no `CLAUDE.md`, and 2.1.278 generalised it to a full alternative, which ends the agent-config standardisation argument in favour of the shared standard. `omitClaudeMd` in agent frontmatter stops a subagent loading the memory file at all (2.1.271).
- **Managed MCP servers**: `managedMcpServers` is a managed setting through which an organisation pushes HTTP and SSE MCP servers to every session rather than relying on per-user config (2.1.259). `CLAUDE_CODE_MCP_STARTUP_WAIT_MS` tunes connection timing (2.1.274), and MCP disconnections raise notifications (2.1.273).
- **Unattended hosts**: `--permission-prompts none` for headless hosts that must run without a human available to approve anything (2.1.259); `maxEffortLevel` to cap reasoning effort across all providers (2.1.267); per-command `allowed_domains` for Bash, PowerShell and Monitor in auto mode (2.1.271); auto mode defaulting to a **server-side classifier** for Claude API and Enterprise users with no classifier overhead charge, surfaced as an `Auto mode server` row in `/status` (2.1.278).
- **Gateways and proxies**: gateway pricing delivered through managed settings (2.1.268) and a 1x to 10x `multiplier` in model pricing (2.1.271); `--accept-command <sha256>` pins plugin installs (2.1.271); opt-in request header hints via `CLAUDE_CODE_GATEWAY_HINT_HEADERS=1` (2.1.273); `CLAUDE_GATEWAY_PROXY_IS_EGRESS_BOUNDARY=1` plus optional per-upstream `headers:` maps (2.1.278). 2.1.276 was a critical fix for **every** request failing with `400 Input tag 'advisor_20260301'` behind an `ANTHROPIC_BASE_URL` proxy, which is the kind of failure worth knowing the version number of.
- **Policy visibility**: an Organization policy status line (2.1.261).
- **Context budget**: `bashOutputMaxChars` and `taskOutputMaxChars` are configurable up to 128K, which is the practical cap on how much tool output can enter context in one turn (2.1.261).
- **Extension hygiene**: `/skill-doctor` identifies skills that are installed but never used (2.1.261); `claude plugin eval` gives reproducible plugin scoring (2.1.269); `/plugin install <plugin> --marketplace <source>` installs from a named source (2.1.275). The middle one matters beyond this page: it is a vendor shipping harness-extension evaluation as a first-party command, which is the HarnessDev benchmark question reduced to a CLI flag.
- **Observability**: OpenTelemetry `effort` attributes plus managed-settings events, and a visible warning when memory usage is critical (2.1.274).
- **Reliability**: `WebFetch` times out at 300 seconds instead of hanging indefinitely (2.1.268); read-only git commands no longer request permission unexpectedly in long sessions (2.1.270); macOS 12 launch failures fixed (2.1.258).
- **Working surface**: `/output-style` switches display formats across sessions and Bash tool results carry file-change diffs (2.1.269); a fullscreen `/diff` panel, prompt-cache diagnostics and MCP server management inside VS Code (2.1.260); Ctrl+Enter interrupts the current turn and sends queued messages, and skills and plugins sync from [claude.ai](http://claude.ai/) into terminal sessions (2.1.275); Remote Control session forking (2.1.273).
Claude Fable 5.1 became the default model in 2.1.257, which also tightened sandbox safeguards.

### Why it works (the transferable lessons)

1. **The model is the planner; the harness is the environment.** No hardcoded workflow graphs; invest in what the model perceives (tool results, `CLAUDE.md`, compaction quality).
2. **Progressive disclosure everywhere.** Skills load on demand; subagents keep exploration out of the main window; MCP tool schemas can be deferred and searched. Context is a budget, spent reluctantly.
3. **Determinism at the edges.** Hooks and the permission system are code, not prompts; safety and style rules do not depend on model compliance.
4. **Permission model as UX**: default-ask with allowlists (`settings.json` permissions), `--dangerously-skip-permissions` only inside containers; sandboxed bash (v2.0.5+, OS-level filesystem/network isolation) reduces prompt fatigue without widening blast radius.

### Power-user practices (field-tested, Aug 2026)

- Curate `CLAUDE.md` ruthlessly; treat it like a prompt you pay for on every request. Use `#` to append memories as you notice recurring corrections.
- Plan Mode first for anything non-trivial; approve the plan, then let it run.
- Use subagents for search/review fan-out ("use a subagent to find every caller of X") to keep the main context clean; use `/compact` at natural checkpoints rather than letting auto-compact fire mid-task.
- Parallelise with git worktrees (or agent teams) rather than one overloaded session.
- Wire verification in: a Stop hook that runs tests, or a "verify with the real app" habit; the loop is only as good as its feedback signal.
- `/rewind` (checkpointing) to roll back code+conversation instead of manual git surgery.
- Vendored skill packs and plugin marketplaces (e.g. anthropics/skills) beat hand-rolled prompt folders for shareable workflows.
See [Harness engineering: the transferable layer](harness-engineering.md) for how these ideas generalise across harnesses, and [OpenAI and Google harnesses](openai-and-google-harnesses.md) for the competing design points.
