Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d819fa3cefdcd2ccff2f7 as of 2026-09-22T02:22:50.785Z:
<page url="https://app.notion.com/p/3c65c17b0d0d819fa3cefdcd2ccff2f7">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb" title="Topic: agentic-harnesses"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Open-source harnesses"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 10 min read · +3h 20m resources
## Best resources
- [sst/opencode on GitHub](https://github.com/sst/opencode) (repo, \~20 min for the README and layout) and the [OpenCode architecture guide](https://medium.com/@maclarensg_50191/how-opencode-actually-works-an-architecture-guide-backed-by-source-code-939811f0434f) (25 min): client/server split explained from source
- [Aider docs: repository map](https://aider.chat/docs/repomap.html) (15 min): the canonical writeup of graph-ranked repo context
- [goose on GitHub (block/goose)](https://github.com/block/goose) (repo, \~15 min for the README) and [goose docs](https://block.github.io/goose/) (docs, \~30 min for the core pages): MCP-native extension architecture
- [SWE-agent ACI background](https://swe-agent.com/latest/background/aci/) (15 min) and the [SWE-agent paper](https://arxiv.org/abs/2405.15793) (45 min): why interface design moves agent scores
- [mini-SWE-agent on GitHub](https://github.com/SWE-agent/mini-swe-agent) (repo, \~15 min to read the whole 100-line harness): 100-line harness, \~65% SWE-bench Verified
- [cline/cline on GitHub](https://github.com/cline/cline) (repo, \~20 min for the README and entry path): the most-read open agent codebase for VS Code-style harnesses
Open-source harnesses matter for two reasons: they are the only ones you can read, and they are where harness ideas get tested in public. Each contributes at least one idea worth stealing for anything you build with <mention-page url="https://app.notion.com/p/3c65c17b0d0d81ab8432c54d65b7f8c7"/>.
## OpenCode (SST, now anomalyco)
The leading provider-agnostic CLI (165k+ stars; \~5M monthly devs by mid-2026; MIT).
- **Architecture: strict client/server.** A TypeScript/Bun server owns all logic (LLM calls, tools, sessions, permissions); a Go/Bubble Tea TUI is a pure renderer over HTTP/SSE. Multiple frontends (TUI, desktop app, VS Code/Zed extensions, Slack, mobile web) attach to the same server, and sessions are inspectable and scriptable. The cleanest existing argument for "harness as a headless service with thin UIs".
- 75+ providers via [models.dev](http://models.dev) metadata; agents/modes with per-agent tool and permission sets; LSP integration for diagnostics; plugin system; share-links for sessions.
- 2026 politics worth knowing: Anthropic blocked third-party OAuth use of Claude subscriptions (Jan 2026), so Claude works via API key only; OpenAI now sponsors the project. Model-agnostic harnesses live at the pleasure of provider ToS, and the scale of that exposure was settled in August 2026, when OpenAI announced it would end Cursor's model access on Nov 12 following Cursor's acquisition by SpaceX, invoking a trust clause and citing contract violations by Musk's companies, with the ten-week runway offered explicitly as transition time. A frontier lab cutting off a major coding-agent vendor over corporate affiliation rather than conduct is the largest single dependency break the harness market has seen, and it generalises past Cursor: frontier model access is allocated rather than sold, so a third party's arrangement with a lab is a supply risk inside your own dependency graph, not a piece of gossip.
- Instructive: server/UI separation, provider abstraction layer, permission config per agent.
## Aider
The original (2023) terminal pair-programmer; Python, Apache-2.0. Development stalled after the August 2025 tagged release, with nothing tagged since, but it remains the most cited design in the field.
- **Repo map (the big idea)**: a tree-sitter parse of the whole repo extracts symbols (definitions/references), builds a dependency graph, and **graph-ranks (PageRank-style)** the most relevant symbols for the current task, packing the best snippets into a fixed token budget. This gave small-context models whole-repo awareness years before 1M windows, and remains the reference design for cheap repo context (Cursor's semantic search and Claude Code's agentic grep are the competing answers).
- **Edit formats as a first-class problem**: unified diffs vs search/replace blocks vs whole files, benchmarked per model (the "edit format leaderboard"). How you ask the model to express edits changes accuracy dramatically; deterministic apply + retry on malformed patches is part of the harness.
- **Git-native discipline**: every AI change is an auto-commit with a descriptive message; undo is `git revert`, not app state. Also: `/architect` two-model mode (strong model plans, cheap model edits), voice input, watch-files mode.
## Goose (Block, then Linux Foundation)
Rust; CLI + desktop; donated to the LF's Agentic AI Foundation (Apr 2026), so vendor-neutral by governance, model-agnostic by design (15+ providers).
- **Everything is an MCP extension**: the developer toolset itself, computer control, memory. The first mainstream harness to be MCP-native all the way down rather than MCP-as-add-on.
- Recipes (shareable task configurations), scheduled runs, and a desktop app targeting non-terminal users; more autonomous defaults than Aider.
- Instructive: what a harness looks like when the tool layer is 100% protocol-mediated, and an existence proof for foundation-governed agent infrastructure.
## Cline, Roo Code, Kilo Code (the VS Code extension family)
A fork lineage: Cline (2024) -\> Roo Code (fork) -\> Kilo Code (merged superset).
- **Cline** (Apache-2.0, 5M+ installs): Plan/Act mode split (read-only reasoning before mutation: the pattern Claude Code's Plan Mode and Codex's suggest mode share), MCP early adopter and MCP marketplace, human-in-the-loop diff approval per edit, checkpoints; v3.58 added native subagents; CLI 2.0 gives a headless/programmable mode. BYOK (bring-your-own-key) economics: the harness is free, you pay tokens.
- **Roo Code**: added custom modes (personas with restricted tool/file access: an early role-based-permissions design) and cloud/SOC 2 features; original repo archived May 2026, community-maintained since.
- **Kilo Code**: merged Cline+Roo features, added inline autocomplete and full JetBrains support; fastest-growing of the family in 2026 (\~300B tokens/day claimed).
- Instructive: the approval-per-diff UX, mode/permission matrices, and how quickly forks can overtake originals when the moat is UX not models.
## SWE-agent and mini-SWE-agent (Princeton)
Research scaffolds, not products, but the intellectual foundation of the field.
- **SWE-agent (2024)** introduced the **Agent-Computer Interface (ACI)** framing: the agent's tools are an interface to be designed like a UI, and interface quality changes outcomes as much as prompts. Concrete findings that shipped into every serious harness: compact windowed file viewing instead of raw `cat`; edit commands with **lint-on-edit that rejects syntactically broken changes before they land**; concise uniform tool output; guardrails only when their false-positive rate is \~0 (100%-precision checks).
- **mini-SWE-agent (2025)**: \~100 lines of Python, bash as the only tool, no tool-calling API, linear history; \~65% on SWE-bench Verified with a good model. The counter-lesson: as models improve, minimal harnesses close most of the gap on short, well-specified tasks, and elaborate scaffolding pays off mainly on long-horizon, messy work. Useful as a baseline and as the cleanest pedagogic implementation of the agent loop. A direct test of that claim landed in September 2026: an evaluation of 21 model-harness pairs, seven models across three harnesses, found harness choice barely moves task success rate while significantly changing cost, so a simple harness is competitive on the score and the elaborate one is charging for something else. The caveat mini-SWE-agent's own authors would add still holds, that this is the short-task regime.
- Adjacent: **OpenHands** (ex-OpenDevin), the open autonomous-agent platform with sandboxed runtime and browser; closest OSS analogue to Devin.
## Cross-cutting takeaways
1. Provider-agnosticism is a feature and a liability (OAuth/ToS risk; per-model edit-format tuning burden), and the liability is now priced: model access is allocated rather than sold, so any harness that is not the lab's own sits downstream of a commercial decision it does not control.
2. The recurring architecture is converging: agent-loop core, protocol-mediated tools (MCP), permission matrix, plan/act split, git-based undo, headless mode for CI.
3. The missing piece in that list is where an asynchronous agent's output lands, and the inbox is the standing answer. AWS released **Pizza Bot** in September 2026, an open-source inbox for background agents built on DeepAgents and LangGraph: work arrives as items to triage rather than as a terminal somebody has to be watching, which is the shape the pattern keeps converging on.
4. Read Cline or mini-SWE-agent for a first codebase tour; read Aider's repomap and SWE-agent's ACI docs for the two deepest single ideas.
See <mention-page url="https://app.notion.com/p/3c65c17b0d0d817ca14fc32338707c2f"/> for these patterns systematised.
</content>
</page>

<!-- second absorbed page -->

Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d810380c0d932d132c7b6 as of 2026-09-22T02:26:32.631Z:
<page url="https://app.notion.com/p/3c65c17b0d0d810380c0d932d132c7b6">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb" title="Topic: agentic-harnesses"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"OpenAI and Google harnesses"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 11 min read · +2h resources
## Best resources
- [Codex docs (developers.openai.com/codex)](https://developers.openai.com/codex) (docs, \~40 min for the core pages): CLI, cloud, IDE, SDK; the [cloud page](https://developers.openai.com/codex/cloud) (10 min) covers sandboxed tasks
- [openai/codex on GitHub](https://github.com/openai/codex) (repo, \~20 min for the README and architecture notes): the open-source Rust CLI itself; the discussions explain the native rewrite
- [Gemini CLI on GitHub](https://github.com/google-gemini/gemini-cli) (repo, \~20 min for the README and extension docs): open-source, extension docs included
- [Introducing Google Antigravity](https://antigravity.google/blog/introducing-google-antigravity) (10 min): the agent-first IDE pitch, plus the [I/O 2026 update](https://antigravity.google/blog/google-io-2026) (10 min)
- [Jules extension for Gemini CLI](https://developers.googleblog.com/en/introducing-the-jules-extension-for-gemini-cli/) (10 min): how Google wires sync CLI to async agent
## OpenAI: Codex and the Agents API
One brand, three surfaces sharing GPT-5.x-Codex models: **Codex CLI** (local terminal), **Codex cloud** (async sandboxes), **Codex IDE extension + app**. Alongside them OpenAI sells the agent loop itself, as the hosted **Agents API**.
### Codex CLI
- Open source (Apache-2.0), launched Apr 2025 as TypeScript, **rewritten in Rust** from mid-2025 (`codex-rs`): zero-dependency binary, no GC pauses, native security bindings. \~114k stars by Aug 2026.
- **Kernel-level sandboxing is the signature**: Seatbelt profiles on macOS, Landlock + seccomp on Linux; workspace-write by default, network off unless granted. Codex started kernel-first, where Claude Code enforces at the application layer with OS sandboxing added later. Approval modes (suggest/auto/full-access) compose with the sandbox.
- Wire-protocol core: the Rust engine exposes a protocol so TypeScript/Python SDKs and the IDE extension drive the same agent. MCP client and server support; `codex exec` for headless/CI; GitHub Action for PR review.
- Config in `~/.codex/config.toml`, memory in `AGENTS.md`, the open cross-vendor standard most harnesses honour. Codex popularised it and the argument over it is settled: Claude Code reads `AGENTS.md` directly from release 2.1.277, so the memory file is no longer a point of difference between the two.
- **September 2026 release train**: 0.154.0 and a **Codex desktop app** (Sep 11) added `max` and `ultra` reasoning-effort values, ExternalMessage support for synchronous and asynchronous operation, resume and fork, per-turn service tiers, plus floating quick-chat controls and app-window sharing on Windows and macOS. **Deep Research inside Codex** (Sep 9) produces editable cited outputs, with voice-model selection unified across GPT-5.6 and GPT-6 Astra and library sharing under viewer and editor permissions. A **persistent Codex**, turning ChatGPT into an always-on agent rather than a per-session one, is reported rather than announced.
- Character vs Claude Code: fewer extension layers (no skills/hooks ecosystem at the same depth), stronger default isolation, tight ChatGPT-plan bundling.
### Codex cloud
- Tasks run in isolated cloud containers preloaded with your repo; start from web, IDE, CLI (`codex cloud`), GitHub (@codex on issues/PRs), GitLab, Linear or Slack.
- **Parallelism and best-of-N are the point**: fire several tasks, or `--attempts 3` for one, and review diffs/PRs as they land. Environment setup is scripted per-repo (setup scripts, universal image, optional internet access policy).
- Pattern it popularised: local CLI for interactive work, cloud fleet for burn-down work (small fixes, review comments, dependency bumps).
### Agents API
- In public beta since Sep 10, 2026: OpenAI runs the agent loop on its own infrastructure, coordinating model calls, tool use and context, with managed sessions, first-class integrations for Blaxel, Cloudflare, E2B and Modal, and a choice of OpenAI-hosted or self-hosted sandboxes.
- What it changes for this page's subject: the harness becomes something you buy rather than something you write. Codex CLI and Codex cloud are products built on a loop OpenAI keeps to itself; the Agents API sells that loop, so the parts that most affect an agent's behaviour (state handling, context policy, and the loop itself) move out of the caller's process.
- Anthropic shipped the matching control surface the same day: auto permission policies for Managed Agents on the Claude Developer Platform, letting a server evaluate, run, deny or pause each agent and MCP tool call instead of prompting a person, plus a beta command attaching a terminal to a live session for real-time approval. Set against ARC Prize's Provider Adapter harness, described in <mention-page url="https://app.notion.com/p/3c65c17b0d0d8143abd0e126338fb9dd"/>, the direction is consistent: the pieces of a harness that most move the score are migrating behind the vendor's API. The permission half runs the other way and is the genuine gain, since policy-evaluated tool calls are what unattended operation actually needs.
## Google: Gemini CLI, Antigravity, Jules
Google splits the same three surfaces across distinct products, unified by Gemini 3.x models and increasingly by shared agent infrastructure. Two more surfaces arrived in September 2026: **Gemini for Windows** (Sep 10), a desktop app rolled out globally behind an Alt+Space shortcut, and **Google Home MCP** (early access from Sep 16), which lets an agent query device state and issue commands given a Premium Advanced subscription and a Cloud project. The second is the more consequential one here, because it extends an agent's action space out of the repo and the browser and into the house.
### Gemini CLI
- Open source (Apache-2.0), launched Jun 2025; ReAct-style loop, built-in tools (grep, file ops, shell, web fetch/search), MCP support, `GEMINI.md` memory, checkpointing, headless mode. Its historical edge: **1M-token context** and a very generous free tier.
- **Extensions** are the differentiator: packaged bundles (MCP servers + context files + commands, `gemini-extension.json`) with an ecosystem including Google-maintained ones (Security, Jules, Cloud Run, databases).
- Access boundary: consumer and free usage moved to **Antigravity CLI** in June 2026, leaving the open-source repo plus enterprise API and Vertex access. The split has held since, so recommending Gemini CLI means recommending a paid or self-keyed path rather than the generous free tier it was known for.
### Antigravity (agent-first IDE)
- Launched Nov 2025 with Gemini 3 Pro; free public preview; VS Code fork plus an **Agent Manager**, a mission-control surface where multiple agents work asynchronously across editor, terminal and browser (browser control via a Chrome extension is a first-class tool, not an afterthought).
- **Artifacts** are the core UX idea: agents emit task lists, implementation plans, screenshots and browser recordings as reviewable/commentable outputs, aiming verification at the artifact level instead of the token stream. Cross-surface memory persists learnings.
- Model-flexible in principle (Claude and GPT selectable at launch for some tiers). Antigravity 2.0 shipped at I/O 2026 alongside Gemini 3.5 Flash.
### Jules
- Google's **asynchronous** coding agent (GA Aug 2025): clones your repo into a Cloud VM, plans, executes (installs deps, runs tests), then pushes a branch/PR; audio changelogs; GitHub-centric. Gemini 2.5/3.x under the hood; Jules Tools CLI and API for scripting.
- The **Jules extension for Gemini CLI** shows Google's composition story: delegate background tasks from the synchronous CLI, keep working, collect branches later (same shape as Claude Code cloud sessions and Codex cloud).
## How they compare
<table header-row="true">
<tr>
<td></td>
<td>Codex (OpenAI)</td>
<td>Gemini CLI / Antigravity / Jules (Google)</td>
<td>Claude Code (reference)</td>
</tr>
<tr>
<td>Open source</td>
<td>CLI yes</td>
<td>CLI yes; Antigravity no</td>
<td>No (npm package, obfuscated)</td>
</tr>
<tr>
<td>Sandbox default</td>
<td>Kernel-level, on by default</td>
<td>Cloud VMs (Jules); CLI opt-in</td>
<td>App-layer permissions + OS sandbox opt-in</td>
</tr>
<tr>
<td>Async/cloud story</td>
<td>Codex cloud, best-of-N</td>
<td>Jules; Antigravity Agent Manager</td>
<td>Cloud sessions, agent teams</td>
</tr>
<tr>
<td>Hosted agent loop</td>
<td>Agents API, public beta since Sep 2026</td>
<td>Not sold separately; Jules is the nearest thing</td>
<td>Managed Agents with auto permission policies</td>
</tr>
<tr>
<td>Extensibility</td>
<td>MCP, `AGENTS.md`, SDKs</td>
<td>MCP, extensions bundles</td>
<td>Deepest: skills/hooks/subagents/plugins</td>
</tr>
<tr>
<td>Model coupling</td>
<td>GPT-5.x-Codex</td>
<td>Gemini 3.x (Antigravity partly multi-model)</td>
<td>Claude</td>
</tr>
<tr>
<td>Distinctive bet</td>
<td>Security + parallel cloud fleet</td>
<td>Context size + artifact-based verification</td>
<td>Context engineering + extensibility layers</td>
</tr>
</table>
Convergent evolution is the headline: every vendor now ships CLI + IDE presence + async cloud agents + MCP + a memory file, and since September 2026 a hosted loop as well. The table also has a fourth column waiting. Meta's **Muse Code** (Sep 2, 2026) is a first-party terminal and continuous-integration coding agent with sandbox-and-approval defaults, which makes four serious vendor CLIs rather than three; the CI mode is the novel part, because a harness running in the build pipeline has no human to approve anything and so replaces interactive approval with policy. The differences are defaults (sandboxing), extension depth, and where verification lives. Transferable ideas: Codex's kernel sandbox and wire protocol; Antigravity's artifact-level review; Jules's VM-per-task isolation.
See <mention-page url="https://app.notion.com/p/3c65c17b0d0d817ca14fc32338707c2f"/> for the shared engineering, <mention-page url="https://app.notion.com/p/3c65c17b0d0d81db9c7fc54987c1ab65"/> for the Anthropic side, and <mention-page url="https://app.notion.com/p/3c65c17b0d0d813f9695dc4175c44cbb"/> for MCP itself.
</content>
</page>