# Open-source harnesses

⏱ 10 min read · +3h 20m resources

### Best resources

- [sst/opencode on GitHub](https://github.com/sst/opencode) (repo, ~20 min for the README and layout) and the [OpenCode architecture guide](https://medium.com/@maclarensg_50191/how-opencode-actually-works-an-architecture-guide-backed-by-source-code-939811f0434f) (25 min): client/server split explained from source
- [Aider docs: repository map](https://aider.chat/docs/repomap.html) (15 min): the canonical writeup of graph-ranked repo context
- [goose on GitHub (block/goose)](https://github.com/block/goose) (repo, ~15 min for the README) and [goose docs](https://block.github.io/goose/) (docs, ~30 min for the core pages): MCP-native extension architecture
- [SWE-agent ACI background](https://swe-agent.com/latest/background/aci/) (15 min) and the [SWE-agent paper](https://arxiv.org/abs/2405.15793) (45 min): why interface design moves agent scores
- [mini-SWE-agent on GitHub](https://github.com/SWE-agent/mini-swe-agent) (repo, ~15 min to read the whole 100-line harness): 100-line harness, ~65% SWE-bench Verified
- [cline/cline on GitHub](https://github.com/cline/cline) (repo, ~20 min for the README and entry path): the most-read open agent codebase for VS Code-style harnesses
Open-source harnesses matter for two reasons: they are the only ones you can read, and they are where harness ideas get tested in public. Each contributes at least one idea worth stealing for anything you build with [Topic: agentic-frameworks](../agentic-frameworks/summary.md).

### OpenCode (SST, now anomalyco)

The leading provider-agnostic CLI (165k+ stars; ~5M monthly devs by mid-2026; MIT).

- **Architecture: strict client/server.** A TypeScript/Bun server owns all logic (LLM calls, tools, sessions, permissions); a Go/Bubble Tea TUI is a pure renderer over HTTP/SSE. Multiple frontends (TUI, desktop app, VS Code/Zed extensions, Slack, mobile web) attach to the same server, and sessions are inspectable and scriptable. The cleanest existing argument for "harness as a headless service with thin UIs".
- 75+ providers via models.dev metadata; agents/modes with per-agent tool and permission sets; LSP integration for diagnostics; plugin system; share-links for sessions.
- 2026 politics worth knowing: Anthropic blocked third-party OAuth use of Claude subscriptions (Jan 2026), so Claude works via API key only; OpenAI now sponsors the project. Model-agnostic harnesses live at the pleasure of provider ToS, and the scale of that exposure was settled in August 2026, when OpenAI announced it would end Cursor's model access on Nov 12 following Cursor's acquisition by SpaceX, invoking a trust clause and citing contract violations by Musk's companies, with the ten-week runway offered explicitly as transition time. A frontier lab cutting off a major coding-agent vendor over corporate affiliation rather than conduct is the largest single dependency break the harness market has seen, and it generalises past Cursor: frontier model access is allocated rather than sold, so a third party's arrangement with a lab is a supply risk inside your own dependency graph, not a piece of gossip.
- Instructive: server/UI separation, provider abstraction layer, permission config per agent.

### Aider

The original (2023) terminal pair-programmer; Python, Apache-2.0. Development stalled after the August 2025 tagged release, with nothing tagged since, but it remains the most cited design in the field.

- **Repo map (the big idea)**: a tree-sitter parse of the whole repo extracts symbols (definitions/references), builds a dependency graph, and **graph-ranks (PageRank-style)** the most relevant symbols for the current task, packing the best snippets into a fixed token budget. This gave small-context models whole-repo awareness years before 1M windows, and remains the reference design for cheap repo context (Cursor's semantic search and Claude Code's agentic grep are the competing answers).
- **Edit formats as a first-class problem**: unified diffs vs search/replace blocks vs whole files, benchmarked per model (the "edit format leaderboard"). How you ask the model to express edits changes accuracy dramatically; deterministic apply + retry on malformed patches is part of the harness.
- **Git-native discipline**: every AI change is an auto-commit with a descriptive message; undo is `git revert`, not app state. Also: `/architect` two-model mode (strong model plans, cheap model edits), voice input, watch-files mode.

### Goose (Block, then Linux Foundation)

Rust; CLI + desktop; donated to the LF's Agentic AI Foundation (Apr 2026), so vendor-neutral by governance, model-agnostic by design (15+ providers).

- **Everything is an MCP extension**: the developer toolset itself, computer control, memory. The first mainstream harness to be MCP-native all the way down rather than MCP-as-add-on.
- Recipes (shareable task configurations), scheduled runs, and a desktop app targeting non-terminal users; more autonomous defaults than Aider.
- Instructive: what a harness looks like when the tool layer is 100% protocol-mediated, and an existence proof for foundation-governed agent infrastructure.

### Cline, Roo Code, Kilo Code (the VS Code extension family)

A fork lineage: Cline (2024) -> Roo Code (fork) -> Kilo Code (merged superset).

- **Cline** (Apache-2.0, 5M+ installs): Plan/Act mode split (read-only reasoning before mutation: the pattern Claude Code's Plan Mode and Codex's suggest mode share), MCP early adopter and MCP marketplace, human-in-the-loop diff approval per edit, checkpoints; v3.58 added native subagents; CLI 2.0 gives a headless/programmable mode. BYOK (bring-your-own-key) economics: the harness is free, you pay tokens.
- **Roo Code**: added custom modes (personas with restricted tool/file access: an early role-based-permissions design) and cloud/SOC 2 features; original repo archived May 2026, community-maintained since.
- **Kilo Code**: merged Cline+Roo features, added inline autocomplete and full JetBrains support; fastest-growing of the family in 2026 (~300B tokens/day claimed).
- Instructive: the approval-per-diff UX, mode/permission matrices, and how quickly forks can overtake originals when the moat is UX not models.

### SWE-agent and mini-SWE-agent (Princeton)

Research scaffolds, not products, but the intellectual foundation of the field.

- **SWE-agent (2024)** introduced the **Agent-Computer Interface (ACI)** framing: the agent's tools are an interface to be designed like a UI, and interface quality changes outcomes as much as prompts. Concrete findings that shipped into every serious harness: compact windowed file viewing instead of raw `cat`; edit commands with **lint-on-edit that rejects syntactically broken changes before they land**; concise uniform tool output; guardrails only when their false-positive rate is ~0 (100%-precision checks).
- **mini-SWE-agent (2025)**: ~100 lines of Python, bash as the only tool, no tool-calling API, linear history; ~65% on SWE-bench Verified with a good model. The counter-lesson: as models improve, minimal harnesses close most of the gap on short, well-specified tasks, and elaborate scaffolding pays off mainly on long-horizon, messy work. Useful as a baseline and as the cleanest pedagogic implementation of the agent loop. A direct test of that claim landed in September 2026: an evaluation of 21 model-harness pairs, seven models across three harnesses, found harness choice barely moves task success rate while significantly changing cost, so a simple harness is competitive on the score and the elaborate one is charging for something else. The caveat mini-SWE-agent's own authors would add still holds, that this is the short-task regime.
- Adjacent: **OpenHands** (ex-OpenDevin), the open autonomous-agent platform with sandboxed runtime and browser; closest OSS analogue to Devin.

### Cross-cutting takeaways

1. Provider-agnosticism is a feature and a liability (OAuth/ToS risk; per-model edit-format tuning burden), and the liability is now priced: model access is allocated rather than sold, so any harness that is not the lab's own sits downstream of a commercial decision it does not control.
2. The recurring architecture is converging: agent-loop core, protocol-mediated tools (MCP), permission matrix, plan/act split, git-based undo, headless mode for CI.
3. The missing piece in that list is where an asynchronous agent's output lands, and the inbox is the standing answer. AWS released **Pizza Bot** in September 2026, an open-source inbox for background agents built on DeepAgents and LangGraph: work arrives as items to triage rather than as a terminal somebody has to be watching, which is the shape the pattern keeps converging on.
4. Read Cline or mini-SWE-agent for a first codebase tour; read Aider's repomap and SWE-agent's ACI docs for the two deepest single ideas.
See [Harness engineering: the transferable layer](harness-engineering.md) for these patterns systematised.
