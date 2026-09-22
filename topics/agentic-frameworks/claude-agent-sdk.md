# Claude Agent SDK

⏱ 8 min read · +2h 30m resources

### Best resources

- [Building agents with the Claude Agent SDK](https://claude.com/blog/building-agents-with-the-claude-agent-sdk) (Anthropic) (20 min): the design philosophy; the gather-context / take-action / verify-work loop.
- [Agent SDK overview](https://docs.claude.com/en/api/agent-sdk/overview) (docs, ~35 min for the core pages): official docs for the Python and TypeScript SDKs.
- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) (25 min): the essay whose "agent = model + tools + loop" thesis the SDK implements.
- [OpenAI Agents SDK docs](https://openai.github.io/openai-agents-python/) (docs, ~40 min for the core pages): the main comparison point.
- [Claude Code best practices](https://www.anthropic.com/engineering/claude-code-best-practices) (30 min): most of it transfers directly since the SDK is Claude Code's engine.

### What it is

The Claude Agent SDK (software development kit, and the Claude Code SDK until it was renamed in late 2025) packages the entire Claude Code harness as a library: the agent loop, the tool suite (file read/write/edit, bash, glob/grep, web search/fetch), context management (automatic compaction when the window fills), the permission system, and session persistence. Python (`claude-agent-sdk`) and TypeScript (`@anthropic-ai/claude-agent-sdk`).

The positioning is the inverse of most frameworks: LangGraph gives you graph primitives and you assemble an agent, while the Agent SDK gives you a finished, battle-tested agent and you configure what its loop can see and do. The core bet (from the blog post): agents work best with a computer, a filesystem and a shell as universal context store and action space, rather than a curated tool list only.

Two entry points: `query()` (fire a prompt, stream messages back, stateless per call) and `ClaudeSDKClient` (Python) / streaming sessions for stateful multi-turn interaction with interrupts.

Since September 2026 the loop is also available without the library. Anthropic's Claude Developer Platform runs **Managed Agents** under auto permission policies, so a server evaluates, runs, denies or pauses each agent and MCP tool call instead of prompting a person, with a beta command that attaches a terminal to a live session for approval in real time; OpenAI put the equivalent behind its Agents API on the same day. That reframes the choice this page describes. It is no longer framework against hand-rolled loop but whose process the loop runs in, and the SDK is the answer whenever the harness has to sit inside your own deployment: your sandbox, your network egress, your traces, your audit log. The platform-side account is in [Topic: agentic-harnesses](../agentic-harnesses/summary.md).

### The builder's primitives

- **Tools**: the built-in suite plus your own. Custom tools are defined in-process (`@tool` decorator, served over an in-process MCP server) so there is no subprocess hop. Permissioning is per-tool: `allowedTools`, `permissionMode`, or a `canUseTool` callback for programmatic gating (the SDK equivalent of Claude Code's permission prompts).
- **MCP** (Model Context Protocol): first-class client. Point `mcpServers` at stdio, HTTP or SSE (Server-Sent Events) servers and their tools appear alongside the built-ins: the integration story for issue trackers, databases, browsers. See [Model Context Protocol (MCP)](../protocols/mcp.md) for MCP itself.
- **Skills**: folders with a `SKILL.md` (YAML frontmatter: name + description) plus optional scripts/assets. Progressive disclosure: only name and description enter the system prompt, and the model loads the body on demand. A lazy-loaded prompt library with attachments, cheaper than a bloated system prompt and more portable than baking behaviour into config.
- **Subagents**: named agents with their own system prompt, tool allowlist and model, defined programmatically (`agents={...}`) or as `.claude/agents/*.md` files. The orchestrator delegates via a Task tool; the subagent runs in an isolated context window and returns only its final report. Context isolation as a feature: fan out searches or reviews without polluting the main context, with parallelism and cheap-model delegation (Haiku subagents for mechanical work) for free.
- **Hooks**: shell commands or callbacks on lifecycle events (PreToolUse, PostToolUse, SessionStart, Stop, ...) that can observe, block or rewrite behavior. The deterministic layer: lint-after-edit, block writes outside a directory, audit-log every bash call. Prompts steer; hooks guarantee.
- **Sessions and compaction**: conversations persist and resume by session id, and the harness auto-compacts old turns near the context limit. You inherit Anthropic's context engineering rather than writing your own summarizer.
Mental model for an infra-minded builder: the SDK is a managed runtime. Skills are lazy-loaded config, hooks are middleware, subagents are worker processes with private memory, MCP is the driver interface, permissions are the security policy.

### vs OpenAI Agents SDK

| Axis | Claude Agent SDK | OpenAI Agents SDK |
| --- | --- | --- |
| Philosophy | Full harness: opinionated loop + tools + context management included | Minimal primitives: Agent, Tool, Handoff, Guardrail, Session; you compose |
| Loop | Fixed (Claude Code's), customised via config/hooks | Thin `Runner.run` loop, easy to read end to end |
| Multi-agent | Orchestrator + isolated subagents (hierarchical) | Handoffs (peer-to-peer transfer) and agents-as-tools |
| Environment | Filesystem + bash assumed; agent "has a computer" | No environment assumption; tools are whatever you register |
| Guardrails | Hooks + permission system (can block any tool call) | Input/output guardrail functions, tripwires |
| Structured output | Prompt-level; validate downstream | First-class `output_type` (Pydantic) on each agent |
| Models | Claude (Bedrock/Vertex supported) | Any provider via LiteLLM integration, OpenAI-native by default |
| Observability | Hooks, OpenTelemetry (OTel) export; pair with Langfuse | Built-in traces dashboard on the OpenAI platform |
| Tracks | Also the engine of Claude Code itself; Managed Agents are the hosted counterpart | Successor of Swarm; the hosted Agents API (public beta, Sep 2026) runs the same loop on OpenAI's infrastructure with hosted or self-hosted sandboxes |

Choose the Claude Agent SDK when the task looks like work-on-a-computer (code, files, research, ops) and you want state-of-the-art harness behavior without building it; choose the OpenAI Agents SDK when you want a small, transparent loop you fully control, typed outputs and provider portability, which is to say when you would otherwise hand-roll. Pydantic AI occupies the same "minimal typed loop" niche with stronger validation and no OpenAI gravity.

### Cross-links

- The harness this SDK extracts: [Claude Code: deep dive](../agentic-harnesses/claude-code.md), in [Topic: agentic-harnesses](../agentic-harnesses/summary.md)
- ReAct loop lineage: [ReAct: Synergizing Reasoning and Acting in Language Models](../../papers/2022-10_react/summary.md)
- Multi-agent use of subagents: [Multi-agent patterns](multi-agent-patterns.md)
