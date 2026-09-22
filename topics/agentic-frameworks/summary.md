# Topic: agentic-frameworks

⏱ 10 min read · +1h 58m resources

Frameworks for BUILDING agents: orchestration libraries, gateways, observability, and

memory layers. Ready-made harnesses (Claude Code, Codex CLI, Cursor, Devin) live in [Topic: agentic-harnesses](../agentic-harnesses/summary.md).

### Taxonomy

```mermaid
graph TD
    AF[Agentic frameworks]

    AF --> ORCH[Orchestration]
    AF --> GW[Gateways / routing]
    AF --> OBS[Observability]
    AF --> MEM[Memory]

    ORCH --> GRAPH["Graph / state machine<br/>LangGraph, LlamaIndex Workflows"]
    ORCH --> ROLE["Role / crew abstractions<br/>CrewAI, AutoGen -> AG2,<br/>Microsoft Agent Framework"]
    ORCH --> MIN["Minimal / typed loops<br/>Pydantic AI, smolagents,<br/>OpenAI Agents SDK, Google ADK"]
    ORCH --> HARN["Harness-as-library<br/>Claude Agent SDK"]

    GW --> LITE["LiteLLM: self-hosted proxy,<br/>keys, budgets, fallbacks"]
    GW --> OR["OpenRouter: managed aggregator,<br/>300+ models, one key<br/>Stripe-owned since Aug 2026"]
    GW --> FUGU["Sakana Fugu: learned orchestrator<br/>sold as one model endpoint"]

    OBS --> LF["Langfuse (OSS, MIT)"]
    OBS --> LS["LangSmith (LangChain-native)"]
    OBS --> BT["Braintrust (evals-first)"]
    OBS --> PHX["Arize Phoenix (OTel-native)"]
    OBS --> OTEL["OpenLLMetry / OTel GenAI semconv"]

    MEM --> M0["Mem0: layered fact memory"]
    MEM --> ZEP["Zep: temporal knowledge graph"]
    MEM --> LETTA["Letta: MemGPT-style runtime,<br/>agent-managed context"]
```

### Map of the space

**Orchestration** is where the real design choice lives. Four schools:

- **Graph/state machine**: **LangGraph** models an agent as a directed graph whose nodes are ordinary functions over a typed state object, with a checkpointer that snapshots that state after every step. The checkpoint is the whole point: durable execution, human-in-the-loop pauses lasting days, and time-travel replay, none of which a hand-rolled while-loop gives you. It is the most-installed agent framework, and LangChain 1.0's `create_agent` is a prebuilt tool-calling loop running on the LangGraph runtime, so the two are a high-level API over a low-level runtime rather than competitors. **LlamaIndex Workflows** is the event-driven equivalent: steps subscribe to and emit typed events instead of declaring edges, which suits fan-out pipelines better and tightly branchy control flow worse. See [LangChain and LangGraph](langchain-and-langgraph.md).
- **Role/crew abstractions**: **CrewAI** describes a system as agents carrying a role, a goal, and a backstory, plus tasks assigned to them and a process (sequential or hierarchical) deciding who runs when; the prompts are generated from those fields, which makes a system fast to sketch and hard to control precisely. **AutoGen** (Microsoft Research) made multi-agent work a *conversation*: agents post messages into a shared chat, a manager picks who speaks next, and a code-executor agent runs whatever the others write. It is in maintenance mode; the community fork **AG2** continues it. The **Microsoft Agent Framework** (generally available April 2026) is the official successor to both, merging AutoGen's orchestration patterns with Semantic Kernel's enterprise plumbing (typed plugins, connectors, telemetry, durable threads). What did not survive the merge is the point: the peer-to-peer chat swarm AutoGen popularised is no longer the default shape, because unconstrained agent-to-agent messaging proved undebuggable in production.
- **Minimal/typed loops**: **Pydantic AI** wraps the loop in Pydantic's validation machinery, so tool signatures and result types are ordinary Python type hints, model output is parsed and validated against them, and a validation failure is fed back to the model as a retry (`ModelRetry`) instead of raised at you. **smolagents** (Hugging Face) changes the *action language*: rather than emitting a JSON tool call, the model writes a short Python snippet that is executed in a sandbox, so several calls plus control flow collapse into one step and the number of model round trips falls, at the cost of needing real sandboxing. **OpenAI Agents SDK** is the productionised Swarm experiment: five primitives (Agent, Tool, Handoff, Guardrail, Session) over a `Runner.run` loop short enough to read end to end. **Google ADK** (Agent Development Kit, in Python, TypeScript, Java and Go) is the same minimal shape with Google's deployment story attached: it speaks **A2A** (Agent2Agent, the cross-vendor protocol by which one agent delegates to another opaque agent it did not write, using published Agent Cards for discovery; see [Topic: protocols](../protocols/summary.md)) and deploys to Vertex AI Agent Engine.
- **Harness-as-library**: the **Claude Agent SDK** ships the entire Claude Code agent loop as an importable library, with its file, shell and search tools, automatic compaction, permission system, hooks, skills, isolated subagents and an MCP (Model Context Protocol) client. You do not write the loop, you configure what it can see and do, which is the inverse of every school above. See [Claude Agent SDK](claude-agent-sdk.md).
**Gateways** sit between your code and the providers so that model choice, credentials, and spend become configuration rather than code. **LiteLLM** is a self-hosted proxy presenting one OpenAI-format endpoint over 100+ providers and translating request and response shapes per provider; its real value is the control side: virtual keys per team with budgets and rate limits attached, a fallback chain with cooldowns so a 429 or a provider outage is absorbed below the application, and a logging callback that ships every request to a tracing backend without touching application code. This is what Khalid runs at work. **OpenRouter** is the managed equivalent: one key and one bill for 300+ models across 60+ providers, with routing and price/latency arbitrage offered as a service, in exchange for a network hop you do not operate and a margin on every token. Stripe acquired it in August 2026, confirmed by OpenRouter on Aug 19 at a reported price above $7B, with the product, name and roadmap all stated as continuing unchanged; the open question before you make it a dependency is whether the largest neutral routing marketplace stays neutral inside a payments company. They compose, since LiteLLM can treat OpenRouter as one more upstream.

A third kind of gateway arrived in September 2026, the **learned orchestrator** sold as a model. Sakana's Fugu Max and Fugu Ultra v2 (Sep 10 to 11) read a query, build an agentic scaffold for it on the fly, and route across a pool of other models behind one OpenAI-compatible API, so what is priced per token is the scaffold rather than the checkpoint; the full treatment is in [Topic: llms](../llms/summary.md). It belongs on the gateway axis because the interface is the same one LiteLLM and OpenRouter present, and it inverts their premise: a self-hosted proxy and a managed aggregator both leave orchestration to you, and this one takes it.

**Observability** here means one **trace** per agent run holding a tree of **spans**, with *generations* as the span type carrying model, prompt, completion, token counts, and cost, so a failed run can be replayed and a bill can be attributed to a user or a feature. They differ by what each puts first: **Langfuse** open-source ownership (MIT, self-hostable), with a LiteLLM callback that traces the whole gateway from one config line; **LangSmith** checkpoint-aware LangGraph debugging; **Braintrust** the experiment (dataset x scorer x prompt version) rather than the trace; **Arize Phoenix** OpenTelemetry-native retrieval and embedding analysis; **OpenLLMetry** instrumentation rather than a backend, so you instrument once and switch backends by changing an exporter URL. Direction of travel: OpenTelemetry's `gen_ai.*` semantic conventions are becoming the common wire format, and vendor SDKs increasingly both emit and ingest OTLP. See [LLM observability](observability.md).

**Memory** libraries all attack the same problem, that a context window is no place to keep anything, and differ in what they choose to store. **Mem0** runs an extraction pass over the conversation, distils it into discrete facts, and files them in layers (conversation, user, organisation) with promotion between layers, so retrieval returns a handful of relevant sentences instead of a transcript. **Zep** stores memory as a temporal knowledge graph: facts are edges carrying validity intervals, so something true in March and false now is superseded rather than overwritten and the graph can be queried as of a point in time. It holds the strongest published LongMemEval numbers. **Letta** (the MemGPT lineage) is a runtime rather than a store: it hands the agent memory-management tools of its own over a small always-resident core, a recall tier of past messages, and an archival tier, and lets the agent page between them the way an operating system pages between RAM and disk.

### Framework vs plain API calls

The "just write the loop" school, canonically Anthropic's [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) (25 min) (Dec 2024, still the reference): most "agents" are better built as **workflows** (prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer) with explicit control flow, and a true agent is just an LLM calling tools in a while-loop on environment feedback. Frameworks earn their keep once you need durable state, checkpointing, human-in-the-loop pauses or fleet-scale observability; they cost you abstraction layers that hide prompts and complicate debugging. [12-factor agents](https://github.com/humanlayer/12-factor-agents) (repo, ~35 min for the twelve factor pages) is the best expansion: own your prompts, own your control flow, treat the LLM as a stateless function.

Since September 2026 there is a third position on this spectrum: buy the loop. OpenAI's **Agents API** runs it on OpenAI's infrastructure with managed sessions and hosted or self-hosted sandboxes, and Anthropic's **Managed Agents** move permission evaluation onto the server, so work this page treats as framework territory is now available as a hosted product. What you give up is precisely what the "own your control flow" argument is about, which makes it the far end of the same spectrum rather than a new school; the harness-side account is in [Topic: agentic-harnesses](../agentic-harnesses/summary.md).

Rule of thumb: start with direct API calls behind your gateway; adopt a framework when a specific capability (checkpointed state, interrupts, replay) would otherwise have to be built by hand. Khalid's DAG (directed acyclic graph) execution engine over LLM calls is the workflow half of this spectrum, hand-rolled.

### Deep dives

| Page | Contents |
| --- | --- |
| [LangChain and LangGraph](langchain-and-langgraph.md) | LangChain's evolution, LangGraph graph/state model, checkpointing, human-in-the-loop pauses, criticisms |
| [Claude Agent SDK](claude-agent-sdk.md) | Agent loop as a library: tools, MCP, skills, subagents, hooks; vs OpenAI Agents SDK |
| [Multi-agent patterns](multi-agent-patterns.md) | Orchestrator-workers, handoffs, debate, fan-out, blackboard; when multi-agent helps vs hurts |
| [LLM observability](observability.md) | Langfuse vs LangSmith vs OTel approaches, evals-in-the-loop, cost attribution, reliability patterns |

### Related papers

- [ReAct: Synergizing Reasoning and Acting in Language Models](../../papers/2022-10_react/summary.md) (Yao et al., 2022): the loop every tool-calling agent descends from. The model alternates a free-text *thought* with an *action* (a tool call) and reads the *observation* the environment returns, so reasoning and acting interleave within one trajectory instead of planning once up front and executing blind. Grounding each reasoning step in a real observation removes most of the hallucinated intermediate steps pure chain-of-thought produces whenever an external source of truth exists.

### Best resources

- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) (Anthropic) (25 min): the canonical workflows-vs-agents essay.
- [12-factor agents](https://github.com/humanlayer/12-factor-agents) (repo, ~35 min for the twelve factor pages): principles for production agents without framework lock-in.
- [Langfuse: comparing open-source agent frameworks](https://langfuse.com/blog/2025-03-19-ai-agent-comparison) (18 min): neutral survey of the orchestration field.
- [Don't Build Multi-Agents](https://cognition.com/blog/dont-build-multi-agents) (Cognition) (15 min) vs [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) (Anthropic) (25 min): the two poles of the multi-agent debate.
- [Claude Agent SDK](claude-agent-sdk.md)
- [LangChain and LangGraph](langchain-and-langgraph.md)
- [Multi-agent patterns](multi-agent-patterns.md)
- [LLM observability](observability.md)
