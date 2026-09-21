# OpenAI and Google harnesses

⏱ 9 min read · +2h resources

*Updated: 2026-08-24*

### Best resources

- [Codex docs (developers.openai.com/codex)](https://developers.openai.com/codex) (docs, ~40 min for the core pages): CLI, cloud, IDE, SDK; the [cloud page](https://developers.openai.com/codex/cloud) (10 min) covers sandboxed tasks
- [openai/codex on GitHub](https://github.com/openai/codex) (repo, ~20 min for the README and architecture notes): the open-source Rust CLI itself; the discussions explain the native rewrite
- [Gemini CLI on GitHub](https://github.com/google-gemini/gemini-cli) (repo, ~20 min for the README and extension docs): open-source, extension docs included
- [Introducing Google Antigravity](https://antigravity.google/blog/introducing-google-antigravity) (10 min): the agent-first IDE pitch, plus the [I/O 2026 update](https://antigravity.google/blog/google-io-2026) (10 min)
- [Jules extension for Gemini CLI](https://developers.googleblog.com/en/introducing-the-jules-extension-for-gemini-cli/) (10 min): how Google wires sync CLI to async agent

### OpenAI: Codex

One brand, three surfaces sharing GPT-5.x-Codex models: **Codex CLI** (local terminal), **Codex cloud** (async sandboxes), **Codex IDE extension + app**.

#### Codex CLI

- Open source (Apache-2.0), launched Apr 2025 as TypeScript, **rewritten in Rust** from mid-2025 (`codex-rs`): zero-dependency binary, no GC pauses, native security bindings. ~114k stars by Aug 2026.
- **Kernel-level sandboxing is the signature**: Seatbelt profiles on macOS, Landlock + seccomp on Linux; workspace-write by default, network off unless granted. Claude Code enforces at the application layer with OS sandboxing as a newer addition; Codex started kernel-first. Approval modes (suggest/auto/full-access) compose with the sandbox.
- Wire-protocol core: the Rust engine exposes a protocol so TypeScript/Python SDKs and the IDE extension drive the same agent. MCP client and server support; `codex exec` for headless/CI; GitHub Action for PR review.
- Config in `~/.codex/config.toml`, memory in `AGENTS.md` (the cross-vendor convention Claude Code reads as `CLAUDE.md`; `AGENTS.md` is now an open standard many harnesses honor).
- Character vs Claude Code: fewer extension layers (no skills/hooks ecosystem at the same depth), stronger default isolation, tight ChatGPT-plan bundling.

#### Codex cloud

- Tasks run in isolated cloud containers preloaded with your repo; start from web, IDE, CLI (`codex cloud`), GitHub (@codex on issues/PRs), GitLab, Linear, or Slack.
- **Parallelism and best-of-N are the point**: fire several tasks, or `--attempts 3` for one task, review diffs/PRs as they land. Environment setup is scripted per-repo (setup scripts, universal image, optional internet access policy).
- Pattern it popularised: local CLI for interactive work, cloud fleet for burn-down work (small fixes, review comments, dependency bumps).

### Google: Gemini CLI, Antigravity, Jules

Google splits the same three surfaces across distinct products, unified by Gemini 3.x models and increasingly by shared agent infrastructure.

#### Gemini CLI

- Open source (Apache-2.0), launched Jun 2025; ReAct-style loop, built-in tools (grep, file ops, shell, web fetch/search), MCP support, `GEMINI.md` memory, checkpointing, headless mode. Its historical edge: **1M-token context** plus a very generous free tier.
- **Extensions** are the differentiator: packaged bundles (MCP servers + context files + commands, `gemini-extension.json`) with an ecosystem including Google-maintained ones (Security, Jules, Cloud Run, databases).
- Shake-up (Jun 2026): consumer/free access shifted toward **Antigravity CLI**; the OSS repo and enterprise API/Vertex access continue. Watch this boundary when recommending it.

#### Antigravity (agent-first IDE)

- Launched Nov 2025 with Gemini 3 Pro; free public preview; VS Code fork plus an **Agent Manager**: a mission-control surface where multiple agents work asynchronously across editor, terminal, and browser (browser control via a Chrome extension is a first-class tool, not an afterthought).
- **Artifacts** are the core UX idea: agents emit task lists, implementation plans, screenshots, browser recordings as reviewable/commentable outputs, aiming verification at the artifact level instead of the token stream. Cross-surface memory persists learnings.
- Model-flexible in principle (Claude and GPT selectable at launch for some tiers). Antigravity 2.0 shipped at I/O 2026 alongside Gemini 3.5 Flash.

#### Jules

- Google's **asynchronous** coding agent (GA Aug 2025): clones your repo into a Cloud VM, plans, executes (installs deps, runs tests), then pushes a branch/PR; audio changelogs; GitHub-centric. Gemini 2.5/3.x under the hood; Jules Tools CLI and API for scripting.
- The **Jules extension for Gemini CLI** shows Google's composition story: delegate background tasks from the synchronous CLI, keep working, collect branches later (same shape as Claude Code cloud sessions and Codex cloud).

### How they compare (Aug 2026 snapshot)

|  | Codex (OpenAI) | Gemini CLI / Antigravity / Jules (Google) | Claude Code (reference) |
| --- | --- | --- | --- |
| Open source | CLI yes | CLI yes; Antigravity no | No (npm package, obfuscated) |
| Sandbox default | Kernel-level, on by default | Cloud VMs (Jules); CLI opt-in | App-layer permissions + OS sandbox opt-in |
| Async/cloud story | Codex cloud, best-of-N | Jules; Antigravity Agent Manager | Cloud sessions, agent teams |
| Extensibility | MCP, `AGENTS.md`, SDKs | MCP, extensions bundles | Deepest: skills/hooks/subagents/plugins |
| Model coupling | GPT-5.x-Codex | Gemini 3.x (Antigravity partly multi-model) | Claude |
| Distinctive bet | Security + parallel cloud fleet | Context size + artifact-based verification | Context engineering + extensibility layers |

Convergent evolution is the headline: every vendor now ships CLI + IDE presence + async cloud agents + MCP + a memory file. The differences are defaults (sandboxing), extension depth, and where verification lives. Transferable ideas: Codex's kernel sandbox and wire protocol; Antigravity's artifact-level review; Jules's VM-per-task isolation.

See [Harness engineering: the transferable layer](harness-engineering.md) for the shared engineering, [Claude Code: deep dive](claude-code.md) for the Anthropic side, and [Model Context Protocol (MCP)](../protocols/mcp.md) for MCP itself.
