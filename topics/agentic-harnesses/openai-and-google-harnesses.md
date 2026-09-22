# OpenAI and Google harnesses

⏱ 11 min read · +2h resources

### Best resources

- [Codex docs (developers.openai.com/codex)](https://developers.openai.com/codex) (docs, ~40 min for the core pages): CLI, cloud, IDE, SDK; the [cloud page](https://developers.openai.com/codex/cloud) (10 min) covers sandboxed tasks
- [openai/codex on GitHub](https://github.com/openai/codex) (repo, ~20 min for the README and architecture notes): the open-source Rust CLI itself; the discussions explain the native rewrite
- [Gemini CLI on GitHub](https://github.com/google-gemini/gemini-cli) (repo, ~20 min for the README and extension docs): open-source, extension docs included
- [Introducing Google Antigravity](https://antigravity.google/blog/introducing-google-antigravity) (10 min): the agent-first IDE pitch, plus the [I/O 2026 update](https://antigravity.google/blog/google-io-2026) (10 min)
- [Jules extension for Gemini CLI](https://developers.googleblog.com/en/introducing-the-jules-extension-for-gemini-cli/) (10 min): how Google wires sync CLI to async agent

### OpenAI: Codex and the Agents API

One brand, three surfaces sharing GPT-5.x-Codex models: **Codex CLI** (local terminal), **Codex cloud** (async sandboxes), **Codex IDE extension + app**. Alongside them OpenAI sells the agent loop itself, as the hosted **Agents API**.

#### Codex CLI

- Open source (Apache-2.0), launched Apr 2025 as TypeScript, **rewritten in Rust** from mid-2025 (`codex-rs`): zero-dependency binary, no GC pauses, native security bindings. ~114k stars by Aug 2026.
- **Kernel-level sandboxing is the signature**: Seatbelt profiles on macOS, Landlock + seccomp on Linux; workspace-write by default, network off unless granted. Codex started kernel-first, where Claude Code enforces at the application layer with OS sandboxing added later. Approval modes (suggest/auto/full-access) compose with the sandbox.
- Wire-protocol core: the Rust engine exposes a protocol so TypeScript/Python SDKs and the IDE extension drive the same agent. MCP client and server support; `codex exec` for headless/CI; GitHub Action for PR review.
- Config in `~/.codex/config.toml`, memory in `AGENTS.md`, the open cross-vendor standard most harnesses honour. Codex popularised it and the argument over it is settled: Claude Code reads `AGENTS.md` directly from release 2.1.277, so the memory file is no longer a point of difference between the two.
- **September 2026 release train**: 0.154.0 and a **Codex desktop app** (Sep 11) added `max` and `ultra` reasoning-effort values, ExternalMessage support for synchronous and asynchronous operation, resume and fork, per-turn service tiers, plus floating quick-chat controls and app-window sharing on Windows and macOS. **Deep Research inside Codex** (Sep 9) produces editable cited outputs, with voice-model selection unified across GPT-5.6 and GPT-6 Astra and library sharing under viewer and editor permissions. A **persistent Codex**, turning ChatGPT into an always-on agent rather than a per-session one, is reported rather than announced.
- Character vs Claude Code: fewer extension layers (no skills/hooks ecosystem at the same depth), stronger default isolation, tight ChatGPT-plan bundling.

#### Codex cloud

- Tasks run in isolated cloud containers preloaded with your repo; start from web, IDE, CLI (`codex cloud`), GitHub (@codex on issues/PRs), GitLab, Linear or Slack.
- **Parallelism and best-of-N are the point**: fire several tasks, or `--attempts 3` for one, and review diffs/PRs as they land. Environment setup is scripted per-repo (setup scripts, universal image, optional internet access policy).
- Pattern it popularised: local CLI for interactive work, cloud fleet for burn-down work (small fixes, review comments, dependency bumps).

#### Agents API

- In public beta since Sep 10, 2026: OpenAI runs the agent loop on its own infrastructure, coordinating model calls, tool use and context, with managed sessions, first-class integrations for Blaxel, Cloudflare, E2B and Modal, and a choice of OpenAI-hosted or self-hosted sandboxes.
- What it changes for this page's subject: the harness becomes something you buy rather than something you write. Codex CLI and Codex cloud are products built on a loop OpenAI keeps to itself; the Agents API sells that loop, so the parts that most affect an agent's behaviour (state handling, context policy, and the loop itself) move out of the caller's process.
- Anthropic shipped the matching control surface the same day: auto permission policies for Managed Agents on the Claude Developer Platform, letting a server evaluate, run, deny or pause each agent and MCP tool call instead of prompting a person, plus a beta command attaching a terminal to a live session for real-time approval. Set against ARC Prize's Provider Adapter harness, described in [Benchmark methodology: how benchmarks are used, misused, and die](../benchmarks/benchmark-methodology.md), the direction is consistent: the pieces of a harness that most move the score are migrating behind the vendor's API. The permission half runs the other way and is the genuine gain, since policy-evaluated tool calls are what unattended operation actually needs.

### Google: Gemini CLI, Antigravity, Jules

Google splits the same three surfaces across distinct products, unified by Gemini 3.x models and increasingly by shared agent infrastructure. Two more surfaces arrived in September 2026: **Gemini for Windows** (Sep 10), a desktop app rolled out globally behind an Alt+Space shortcut, and **Google Home MCP** (early access from Sep 16), which lets an agent query device state and issue commands given a Premium Advanced subscription and a Cloud project. The second is the more consequential one here, because it extends an agent's action space out of the repo and the browser and into the house.

#### Gemini CLI

- Open source (Apache-2.0), launched Jun 2025; ReAct-style loop, built-in tools (grep, file ops, shell, web fetch/search), MCP support, `GEMINI.md` memory, checkpointing, headless mode. Its historical edge: **1M-token context** and a very generous free tier.
- **Extensions** are the differentiator: packaged bundles (MCP servers + context files + commands, `gemini-extension.json`) with an ecosystem including Google-maintained ones (Security, Jules, Cloud Run, databases).
- Access boundary: consumer and free usage moved to **Antigravity CLI** in June 2026, leaving the open-source repo plus enterprise API and Vertex access. The split has held since, so recommending Gemini CLI means recommending a paid or self-keyed path rather than the generous free tier it was known for.

#### Antigravity (agent-first IDE)

- Launched Nov 2025 with Gemini 3 Pro; free public preview; VS Code fork plus an **Agent Manager**, a mission-control surface where multiple agents work asynchronously across editor, terminal and browser (browser control via a Chrome extension is a first-class tool, not an afterthought).
- **Artifacts** are the core UX idea: agents emit task lists, implementation plans, screenshots and browser recordings as reviewable/commentable outputs, aiming verification at the artifact level instead of the token stream. Cross-surface memory persists learnings.
- Model-flexible in principle (Claude and GPT selectable at launch for some tiers). Antigravity 2.0 shipped at I/O 2026 alongside Gemini 3.5 Flash.

#### Jules

- Google's **asynchronous** coding agent (GA Aug 2025): clones your repo into a Cloud VM, plans, executes (installs deps, runs tests), then pushes a branch/PR; audio changelogs; GitHub-centric. Gemini 2.5/3.x under the hood; Jules Tools CLI and API for scripting.
- The **Jules extension for Gemini CLI** shows Google's composition story: delegate background tasks from the synchronous CLI, keep working, collect branches later (same shape as Claude Code cloud sessions and Codex cloud).

### How they compare

|  | Codex (OpenAI) | Gemini CLI / Antigravity / Jules (Google) | Claude Code (reference) |
| --- | --- | --- | --- |
| Open source | CLI yes | CLI yes; Antigravity no | No (npm package, obfuscated) |
| Sandbox default | Kernel-level, on by default | Cloud VMs (Jules); CLI opt-in | App-layer permissions + OS sandbox opt-in |
| Async/cloud story | Codex cloud, best-of-N | Jules; Antigravity Agent Manager | Cloud sessions, agent teams |
| Hosted agent loop | Agents API, public beta since Sep 2026 | Not sold separately; Jules is the nearest thing | Managed Agents with auto permission policies |
| Extensibility | MCP, `AGENTS.md`, SDKs | MCP, extensions bundles | Deepest: skills/hooks/subagents/plugins |
| Model coupling | GPT-5.x-Codex | Gemini 3.x (Antigravity partly multi-model) | Claude |
| Distinctive bet | Security + parallel cloud fleet | Context size + artifact-based verification | Context engineering + extensibility layers |

Convergent evolution is the headline: every vendor now ships CLI + IDE presence + async cloud agents + MCP + a memory file, and since September 2026 a hosted loop as well. The table also has a fourth column waiting. Meta's **Muse Code** (Sep 2, 2026) is a first-party terminal and continuous-integration coding agent with sandbox-and-approval defaults, which makes four serious vendor CLIs rather than three; the CI mode is the novel part, because a harness running in the build pipeline has no human to approve anything and so replaces interactive approval with policy. The differences are defaults (sandboxing), extension depth, and where verification lives. Transferable ideas: Codex's kernel sandbox and wire protocol; Antigravity's artifact-level review; Jules's VM-per-task isolation.

See [Harness engineering: the transferable layer](harness-engineering.md) for the shared engineering, [Claude Code: deep dive](claude-code.md) for the Anthropic side, and [Model Context Protocol (MCP)](../protocols/mcp.md) for MCP itself.
