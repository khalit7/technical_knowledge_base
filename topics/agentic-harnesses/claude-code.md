# Claude Code: deep dive

*Updated: 2026-08-24*

## Best resources

- [Claude Code docs](https://code.claude.com/docs/en/overview): canonical reference; the [What's new](https://code.claude.com/docs/en/whats-new) page tracks the fast-moving surface
- [Anthropic: Claude Code best practices](https://www.anthropic.com/engineering/claude-code-best-practices): the agentic-coding playbook, still the single best read
- [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents): the design philosophy behind compaction, note-taking, subagents
- [PromptLayer: Behind the scenes of the master agent loop](https://blog.promptlayer.com/claude-code-behind-the-scenes-of-the-master-agent-loop/): reverse-engineered internals of the single-threaded loop
- [Claude Agent SDK docs](https://platform.claude.com/docs/en/agent-sdk/overview): the same harness as a library

## What it is

Anthropic's terminal-first coding agent (launched Feb 2025), now spanning CLI, VS Code and
JetBrains extensions, a web UI with cloud sessions, and a GitHub app. It is the reference
implementation of the "harness" idea: a deliberately simple loop surrounded by heavy
engineering in context management, permissions, and extensibility. Model-locked to Claude in
practice (Opus/Sonnet/Haiku tiers), though enterprise routes exist via Bedrock/Vertex.

## Architecture: the loop

The core is a **single-threaded master loop** (internally codenamed nO in early decompiled
analyses): send conversation + tool schemas to the model; if the response contains tool
calls, execute them (read-only tools in parallel, mutating tools serially), append results,
repeat until the model stops calling tools. Deliberate design choices:

- **One main thread, no graph.** Anthropic rejected multi-agent swarms for the primary flow;
  debuggability and steerability beat theoretical parallelism. Parallelism is opt-in via
  subagents and agent teams.
- **Complexity lives around the loop, not in it.** Analyses estimate ~98% of the code is
  infrastructure: streaming, permission gating, compaction, error recovery, TUI.
- **Real-time steering**: user input mid-turn is injected into the loop (queued messages,
  Esc to interrupt) rather than waiting for the turn to end.
- **Planning as a tool**: the TodoWrite/task list keeps the model honest on multi-step work;
  Plan Mode (Shift+Tab) is a read-only mode that produces an approved plan before edits.
- **Context management**: auto-compaction summarises the transcript as the window fills,
  preserving decisions and unresolved state while discarding stale tool output; the
  scratchpad directory and CLAUDE.md act as external memory. With 1M-token Sonnet/Opus
  context this triggers later but the machinery is unchanged.
- **Small, sharp toolset**: Read/Write/Edit, Bash (persistent-ish shell), Grep/Glob, WebFetch/
  WebSearch, Task (subagents), NotebookEdit. Tool descriptions are long and prescriptive;
  this is prompt engineering aimed at the tool layer.

## The extension layers

Each layer changes what the model can see or do; knowing which to reach for is the core
power-user skill.

| Layer | What it is | When to use |
|---|---|---|
| **CLAUDE.md** | Markdown memory auto-loaded into context (enterprise, user `~/.claude/`, project, subdirectory scoped) | Always-on facts: build commands, conventions, gotchas. Keep it short; it taxes every request |
| **Skills** | Folders with `SKILL.md` + optional scripts/assets; only name+description loaded until invoked (progressive disclosure) | Real domain procedures with helper files; shareable know-how |
| **Slash commands** | Prompt templates in `.claude/commands/` | Parameterised prompts with no logic |
| **Hooks** | Shell commands on lifecycle events (PreToolUse, PostToolUse, Stop, SessionStart, ...) that can block or inject context | Deterministic enforcement: run prettier after edits, block writes outside repo, gate on tests. Rules you want obeyed 100% of the time are hooks, not prompts |
| **Subagents** | Separate context windows launched via the Task tool, defined in `.claude/agents/*.md` with own model/tools/prompt | Context isolation (search fan-out returns conclusions, not file dumps) and parallelism |
| **Agent teams** | Research preview: multiple full sessions from one orchestrator, cross-session messaging (v2.1.220+, Aug 2026) | Independent workstreams on related tasks |
| **MCP** | Client (and server via `claude mcp serve`) for external tools/resources; see [../protocols/](../protocols/summary.md) | Third-party context: issue trackers, DBs, browsers |
| **Plugins** | Versioned bundles of skills+commands+hooks+agents+MCP configs, installable from marketplaces | Distribution unit for all of the above |
| **Output styles / statusline** | Persona and TUI customisation | Cosmetic/system-prompt level changes |

Rule of thumb from the community: prompt template -> slash command; domain logic + files ->
skill; must-always-happen -> hook; isolated or parallel work -> subagent; share it -> plugin.

## SDK and headless use

- `claude -p "prompt"` (headless/print mode) with `--output-format json` for scripting and CI.
- The **Claude Agent SDK** (TypeScript/Python) exposes the same loop, tools, permission
  system, hooks, and MCP support as a library: Claude Code minus the TUI. It is Anthropic's
  recommended base for building non-coding agents too, and belongs equally to
  [../agentic-frameworks/](../agentic-frameworks/summary.md).
- GitHub Actions integration and cloud sessions (claude.ai/code) run the harness in managed
  sandboxes; `claude agents` dashboards track running/blocked sessions.

## Why it works (the transferable lessons)

1. **The model is the planner; the harness is the environment.** No hardcoded workflow
   graphs; invest in what the model perceives (tool results, CLAUDE.md, compaction quality).
2. **Progressive disclosure everywhere.** Skills load on demand; subagents keep exploration
   out of the main window; MCP tool schemas can be deferred and searched. Context is a
   budget, spent reluctantly.
3. **Determinism at the edges.** Hooks and the permission system are code, not prompts;
   safety and style rules do not depend on model compliance.
4. **Permission model as UX**: default-ask with allowlists (`settings.json` permissions),
   `--dangerously-skip-permissions` only inside containers; sandboxed bash (v2.0.5+, OS-level
   filesystem/network isolation) reduces prompt fatigue without widening blast radius.

## Power-user practices (field-tested, Aug 2026)

- Curate CLAUDE.md ruthlessly; treat it like a prompt you pay for on every request. Use
  `#` to append memories as you notice recurring corrections.
- Plan Mode first for anything non-trivial; approve the plan, then let it run.
- Use subagents for search/review fan-out ("use a subagent to find every caller of X") to
  keep the main context clean; use `/compact` at natural checkpoints rather than letting
  auto-compact fire mid-task.
- Parallelise with git worktrees (or agent teams) rather than one overloaded session.
- Wire verification in: a Stop hook that runs tests, or a "verify with the real app" habit;
  the loop is only as good as its feedback signal.
- `/rewind` (checkpointing) to roll back code+conversation instead of manual git surgery.
- Vendored skill packs and plugin marketplaces (e.g. anthropics/skills) beat hand-rolled
  prompt folders for shareable workflows.

See [harness-engineering.md](harness-engineering.md) for how these ideas generalise across
harnesses, and [openai-and-google-harnesses.md](openai-and-google-harnesses.md) for the
competing design points.
