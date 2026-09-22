# Personal agents: OpenClaw, Hermes Agent, and how they differ from coding harnesses

⏱ 13 min read · +2h 27m resources

The 2026 category that is not a coding harness: always-on personal agents that live on a daemon, listen on your messaging accounts, and act on your life rather than your repo. Two projects dominate it: **OpenClaw** (Peter Steinberger, now an OpenClaw Foundation project) and **Hermes Agent** (Nous Research). Both are open source, self-hosted and model-agnostic. What separates them from Claude Code or Codex is the trust boundary, not the agent loop.

### Best resources

- [OpenClaw docs: agent runtime](https://docs.openclaw.ai/concepts/agent) (15 min) and [agent runtimes](https://docs.openclaw.ai/concepts/agent-runtimes) (15 min): the workspace contract, the bootstrap files, and the runtime abstraction that lets OpenClaw delegate a turn to Codex or Claude CLI. The clearest primary source in the category.
- [Hermes Agent architecture doc](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/architecture.md) (30 min): full subsystem map, data flow for CLI / gateway / cron, design principles. Read this one if you read only one.
- [Hermes Agent repo](https://github.com/NousResearch/hermes-agent) (repo, ~20 min for the README and entry path) and [OpenClaw repo](https://github.com/openclaw/openclaw) (repo, ~20 min for the README and entry path).
- [NVIDIA Nemotron Labs: what OpenClaw agents mean for every organization](https://blogs.nvidia.com/blog/what-openclaw-agents-mean-for-every-organization/) (10 min): the "claw" framing (persistent heartbeat agents) from a non-participant.
- [freeCodeCamp: build and secure a personal AI agent with OpenClaw](https://www.freecodecamp.org/news/how-to-build-and-secure-a-personal-ai-agent-with-openclaw/) (25 min): three-layer architecture walkthrough plus the security section most tutorials skip.
- [Wikipedia: OpenClaw](https://en.wikipedia.org/wiki/OpenClaw) (12 min): the incident and regulation record, which the vendor comparisons tend to launder.

### The category

A coding harness is invoked: you open a session, it works in a repo, it ends. A personal agent is **resident**, a background daemon (a "gateway") that receives input wherever you already talk (WhatsApp, Telegram, Discord, Signal, Slack, iMessage, email), keeps state across months, and wakes itself on a schedule or heartbeat to check whether anything needs doing. NVIDIA's framing: most agents are prompt-triggered and stop; a "claw" runs persistently and surfaces only what needs a human decision.

The scope is life admin and personal ops: triage mail, prep meetings, chase a dealer over email, run a cron that summarises papers into Telegram every morning, drive the smart home. Same agent loop as a coding harness underneath. Completely different exposure.

September 2026 brought the first frontier-lab entrant. Meta's **Muse agent** (Sep 9) is a general assistant across US web, mobile and WhatsApp, wired to email, calendar, payments, health, shopping and smart home, with each agent instance running in an isolated virtual machine under dedicated security monitoring. Same scope and the same attacker-reachable inputs as the two self-hosted projects below, with the two differences that decide everything else: it is hosted rather than self-hosted, and the isolation is the vendor's engineering rather than yours.

### OpenClaw

Created by Peter Steinberger, released late January 2026 (earlier names Clawdbot and Moltbot) and immediately the fastest-growing repo on GitHub: past 100k stars in its first week, past 250k by March, overtaking React; the project site quoted 346k+ by June. Node 20+, `npm install -g openclaw` then `openclaw onboard --install-daemon`.

**Three layers**: channel adapters (all the messaging platforms) feed one **gateway** process, which routes turns into an **agent runtime**. Model-agnostic by design: Anthropic, OpenAI, Gemini, local Ollama, OpenRouter refs, all as `provider/model`.

**The workspace contract** is the part worth stealing. Each agent owns one directory that is its only cwd, holding user-editable bootstrap files injected into the system prompt's Project Context on the first turn of a session:

| File | Role |
| --- | --- |
| `AGENTS.md` | Operating instructions plus memory (the `CLAUDE.md` analogue) |
| `SOUL.md` | Persona, boundaries, tone. No coding harness has this concept |
| `IDENTITY.md` | Agent name, vibe, emoji |
| `USER.md` | Who you are and how to address you |
| `MEMORY.md` | Root long-term memory, injected only if present |
| `BOOTSTRAP.md` | One-time first-run ritual, deleted after completion |

Other notable machinery: skills resolved from a precedence chain (workspace, `.agents/skills`, `~/.agents/skills`, managed, bundled) with **ClawHub** as the public skill marketplace; sessions in per-agent SQLite; **steering while streaming** (a message arriving mid-run is injected into the current run before the next tool launch rather than queued, which is the right default when the input channel is a chat); multi-agent routing with per-agent workspaces and channel bindings.

**The architectural detail that matters most**: OpenClaw separates *provider*, *model*, *agent runtime*, and *channel* as four independent layers, and the runtime is pluggable. Embedded harnesses (`openclaw`, `codex`, `copilot`) run inside its prepared loop; CLI backends run a local CLI process (`claude-cli`); and external harnesses (Claude Code, Gemini CLI, OpenCode, Cursor) attach over **ACP**. Its docs specify a compatibility contract for a non-native runtime: who owns the model loop, who owns canonical thread history, whether OpenClaw tools and hooks still fire, what compaction metadata is exposed. A mature statement of the layering question, and it makes OpenClaw a host for Claude Code rather than a competitor to it.

### Hermes Agent

Nous Research, first release February 2026, MIT, Python (uv, one-line installer). 231k GitHub stars by mid-2026, and a `hermes claw migrate` command that imports an OpenClaw install's settings, memories, skills and keys, which tells you who it was aimed at. By May 2026, OpenRouter's app rankings reportedly put Hermes ahead of OpenClaw on daily token volume (roughly 224B versus 186B), the moment the challenger overtook the incumbent.

**Shape**: one `AIAgent` loop (`run_agent.py`) serving five entry points (interactive CLI, messaging gateway, ACP adapter for VS Code/Zed/JetBrains, batch runner, API server). Platform differences live in the entry point, not the agent. 70+ tools across ~28 toolsets; terminal execution across seven backends (local, Docker, SSH, Daytona, Modal, Singularity, Vercel Sandbox); sessions in SQLite with **FTS5 full-text search** and lineage tracking across compressions; pluggable single-select memory providers and context engines.

**The differentiator is the learning loop**, a real architectural commitment rather than a slogan:

- After a non-trivial task (roughly 5+ tool calls) the agent writes a **skill** document capturing the approach, the dead ends and the edge cases.
- Skills are **patched during use** when found outdated, incomplete or wrong.
- An **autonomous curator** (`hermes curator`) reviews agent-created skills, consolidates overlaps, archives stale ones, and writes per-run reports, with pinned skills protected.
- Memory holds small durable facts that stay in context; skills hold longer procedures loaded on relevance. Honcho provides dialectic user modelling across sessions.
- Both skill writes and memory writes can be gated: staged under `~/.hermes/pending/`, reviewed with `/skills pending`, `/skills diff`, `/skills approve`, survives restarts.
Also: **cron jobs are first-class agent tasks** (fresh agent, attached skills injected, delivered to any platform), and Hermes exports sessions as **ShareGPT-format trajectories** for training data and RL, with Nous's own Atropos and Tinker integrations. A personal agent that doubles as a tool-calling trajectory factory.

### How this differs from a coding harness

The agent loops are close cousins. Prompt assembly, tool registry, compaction, subagents, MCP, skills: all the same vocabulary, much of it borrowed directly from Claude Code. The differences are structural.

| Axis | Coding harness (Claude Code, Codex) | Personal agent (OpenClaw, Hermes) |
| --- | --- | --- |
| Invocation | You start a session and it ends | Resident daemon; message-triggered, cron-triggered, or self-triggered on a heartbeat |
| State lifetime | One session, plus a memory file you maintain | Months. Persistent memory, searchable session history, a model of you that accretes |
| World | A repo and a terminal | Your accounts: chat, mail, calendar, browser, home automation, payments |
| Interface | Terminal or IDE, developer present | Whatever chat app you already use, often from a phone, often nobody watching |
| Input trust | Mostly yours, plus files you chose to open | Inbound messages and emails from third parties. The input channel is attacker-reachable by design |
| Verification | Compiler, tests, CI, diff review: a real ground-truth signal | Usually none. "Did the agent handle my inbox correctly" has no test suite |
| Undo | Git. Almost everything is revertible | Sent messages, deleted mail, bookings, purchases. Frequently irreversible |
| Permissions | Per-tool approval inside a session, sandboxed cwd | Standing authority over live accounts, granted once at setup |
| Identity | None. The harness is a tool | Named persona (`SOUL.md`, `IDENTITY.md`); users anthropomorphise and delegate accordingly |
| Users | One developer | Multi-user routing, group chats, agents acting on behalf of a person to other people |
| Measurement | SWE-bench, Terminal-Bench: contested but real | No accepted benchmark. OpenClaw ships a "personal agent benchmark pack"; nothing comparable to tbench exists |

**The relationship is layering, not rivalry.** OpenClaw's runtime abstraction drives Claude Code, Codex or Copilot as execution backends; Hermes exposes itself over ACP as the agent inside your editor. The personal agent is the router, scheduler, memory and delivery surface; the coding harness remains the best executor for coding work, so a claw asked to fix a bug should hand that turn to one.

**Three things this category teaches that the coding-harness literature underweights:**

1. **Compaction over months, not hours.** Session lineage across compressions, FTS5 search over old sessions, and a separate durable memory tier are load-bearing when the conversation never ends. Harness compaction research assumes a session boundary exists.
2. **The verifier problem is unavoidable here.** Coding agents get graded for free by the compiler. Everything we know about harness quality leans on that. Personal agents have no verifier, which is why the whole category leans on approval gates and human-in-the-loop confirmations instead of scoring.
3. **Mid-run steering as a first-class primitive.** When input arrives over chat, a message during a run is normal, not exceptional. OpenClaw injects it before the next tool launch. Compare with the batch mentality of a CLI harness.

### Security: the category's open wound

Not a footnote, the defining engineering problem: a resident agent with standing account access, reading attacker-controllable inbound text, is the worst-case prompt-injection surface, and 2026 demonstrated it.

- **OpenClaw** had a rough year: an unauthenticated RCE (reported as CVE-2026-25253, CVSS 8.8) in early February with tens of thousands of unpatched instances exposed, followed by supply-chain campaigns through the ClawHub skill marketplace (over a thousand malicious packages, compromised publisher accounts, auto-update propagation). Its security model treats prompt injection as explicitly out of scope, and defaults assume a trusted single-user environment that does not match how people actually deploy it. In March 2026 Chinese authorities restricted OpenClaw on government and state-enterprise computers. There is also a documented consent incident where a user's agent autonomously created a dating profile and screened matches on their behalf.
- **Hermes** was built after that shock and defaults harder: sandboxing on, read-only root and dropped capabilities in containers, the gateway kept from reaching the runtime directly, scanning of community skills and context files for injection patterns, MCP credential filtering, cross-session isolation, dangerous-command approval, staged skill and memory writes. Not clean either: CVEs for command injection, SSRF, path traversal and prompt injection were disclosed against it around April 2026.
- **The credential that gets stolen is the session, not the password.** In August 2026 Anthropic signed affected Claude users out, cleared saved payment methods and refunded unauthorised charges after infostealer malware on user machines (Vidar, LummaC2, StealC, RedLine and Acreed on Windows, Atomic Stealer on macOS) harvested live Claude sessions and burned usage limits; the tell was limits refilling and draining while nobody was at the keyboard. A resident agent makes this strictly worse, because it holds long-lived sessions for many services on a machine that is always on and nobody is watching for the tell. Rotating a password does not close it, since no password was taken; short-lived tokens plus server-side session revocation do.
- Vendor comparisons in this space are unreliable and their numbers (star counts, CVE tallies, exposed-instance counts) contradict each other freely. Treat every figure above as dated and directional, and check primary advisories before quoting any of them.
The sandboxing and permission engineering that coding harnesses invented for a *watched* session is not sufficient for an *unwatched* one with account access. The problem is not solved, but the design direction now has a shipped instance. Meta's Muse Spark 1.3 architecture assumes a successful prompt injection and moves everything that matters outside the blast radius: the agent never sees credentials, because a credential service outside the runtime cell holds them and a separate agent swaps the real token in as the request leaves the VM; approvals arrive as OS-level system dialogs rather than as messages in the conversation, so text in the context window cannot manufacture consent; and the browser sub-agent reads the accessibility tree rather than page code and cannot run JavaScript. The transferable principle is that enforcement and credentials belong outside the component that can be persuaded, which is weaker than a solution and much stronger than a better detector. Meta has published no classifier accuracy figures, so the parts still resting on judgement are unmeasured. Full treatment in [Topic: agentic-harnesses](summary.md).

### Cross-links

- The harness engineering these borrow from: [Harness engineering: the transferable layer](harness-engineering.md), [Claude Code: deep dive](claude-code.md)
- The runtimes they host: [OpenAI and Google harnesses](openai-and-google-harnesses.md), [Open-source harnesses](open-source-harnesses.md)
- ACP and MCP as the interop layer: [Model Context Protocol (MCP)](../protocols/mcp.md)
- Trajectory export for RL and finetuning (the Hermes angle): [RL for LLMs: RLHF, GRPO, RLVR](../rl/rl-for-llms-rlhf-grpo-rlvr.md), [Synthetic data and post-training data](../data-curation-and-datasets/synthetic-and-post-training-data.md)
