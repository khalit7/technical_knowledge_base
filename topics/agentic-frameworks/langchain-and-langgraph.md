# LangChain and LangGraph

⏱ 8 min read · +1h 34m resources

Last reviewed: 2026-09-21 (acronyms expanded on first use; no dated sections or repo-shaped references found)

### Best resources

- [LangChain and LangGraph reach v1.0](https://blog.langchain.com/langchain-langgraph-1dot0/) (12 min): the Oct 2025 joint release post; what each package is now for.
- [LangGraph docs: overview and concepts](https://docs.langchain.com/oss/python/langgraph/overview) (docs, ~45 min for the core pages): graph model, state, checkpointing, interrupts; the primary reference.
- [How and when to build multi-agent systems](https://www.langchain.com/blog/how-and-when-to-build-multi-agent-systems) (LangChain) (15 min): their own synthesis of the Cognition/Anthropic debate.
- [Why we no longer use LangChain for building our AI agents](https://www.octomind.dev/blog/why-we-no-longer-use-langchain-for-building-our-ai-agents) (Octomind) (10 min): the most-cited critique, from a team that ran it in production for a year.
- [Fuck You, Show Me The Prompt](https://hamel.dev/blog/posts/prompt/) (Hamel Husain) (12 min): the case for intercepting what frameworks actually send to the model.

### LangChain's evolution

Three distinct eras:

1. **2022-2023, the kitchen sink**: chains, agents, retrievers, hundreds of integrations, deeply nested abstractions (`ConversationalRetrievalChain` etc.). This is the era the criticism attaches to: unstable APIs, abstraction over abstraction, prompts buried five layers deep.
2. **2024, decomposition**: split into `langchain-core` (interfaces and LCEL, the LangChain Expression Language, runnables), provider packages (`langchain-openai`, `langchain-anthropic`), and `langchain` proper; legacy code exiled to `langchain-community` and `langchain-classic`. LCEL (the `|` pipe syntax) was the composition story, and was itself widely disliked.
3. **Oct 2025, v1.0**: LangChain 1.0 and LangGraph 1.0 shipped together (2025-10-22). LangChain is now a thin, stable layer: standard chat-model interface across providers, `create_agent` (a production ReAct-style tool-calling loop), and **middleware** (before/after model-call hooks for context editing, guardrails, summarisation). Crucially, `create_agent` runs ON the LangGraph runtime, so a LangChain agent can be dropped into a LangGraph graph and inherits persistence.
Practical consequence: "LangChain vs LangGraph" is no longer a fork in the road. LangChain is the high-level API, LangGraph is the low-level runtime; most production teams touch both, and the ecosystem's real center of gravity is LangGraph (most-installed agent framework, tens of millions of monthly PyPI downloads; Uber, LinkedIn, Klarna, Replit run on it).

### LangGraph's model

A LangGraph app is a **StateGraph**: you declare a state schema (TypedDict or Pydantic model), nodes (plain Python functions taking state and returning a partial state update), and edges (static, or conditional functions routing on state). The compiled graph is a Pregel-style message-passing runtime executed in supersteps.

Key mechanics:

- **State and reducers**: each state key can have a reducer (e.g. `add_messages` appends rather than overwrites). Nodes return deltas; reducers merge them. This is what makes parallel branches (fan-out/fan-in) safe: concurrent node outputs are merged by reducer instead of last-write-wins.
- **Command objects**: a node can return `Command(goto=..., update=...)` to combine a state update with dynamic routing, including `goto` into a subgraph or another agent; this is how LangGraph implements handoffs.
- **Checkpointing**: a checkpointer (SQLite/Postgres/Redis backends) snapshots the full state after every superstep, keyed by `thread_id`. Gives you: resumable conversations, crash recovery mid-workflow (v1.0 markets this as "durable execution"), time travel (fork from any past checkpoint), and replay for debugging. This is the single strongest reason to adopt LangGraph over a hand-rolled loop.
- **Human-in-the-loop**: `interrupt()` pauses the graph, persists state via the checkpointer, and surfaces a payload to the caller; execution resumes, possibly days later, with `Command(resume=value)`. Approval gates, tool-call review, and state editing before resume all build on this one primitive.
- **Subgraphs and multi-agent**: graphs compose as nodes of other graphs; the supervisor and swarm patterns ship as prebuilt libraries (`langgraph-supervisor`, `langgraph-swarm`). See [Multi-agent patterns](multi-agent-patterns.md).
- **Streaming**: token-level and state-update-level streaming out of any node.
Around the open-source core sits the commercial platform: LangSmith (tracing and evals, see [LLM observability](observability.md)), LangGraph Platform (deployment of stateful graphs as APIs), and Studio (visual debugger over traces and checkpoints).

### Criticisms, and when it earns its keep

The standing critiques:

- **Abstraction tax** (Octomind): early LangChain made simple things one line and everything else a fight with framework internals; when requirements moved past the demo, teams shipped faster after removing it. Post-1.0 this criticism lands mostly on the legacy layer, but the instinct (check what the abstraction hides) is still right.
- **Prompt opacity** (Hamel Husain): frameworks inject templates you did not write; always trace the literal request. Mitigated today by LangSmith or Langfuse tracing, but the burden of looking is on you.
- **Graph ceremony**: for a linear tool loop, StateGraph boilerplate (schema, nodes, edges, compile) is overhead over a 30-line while-loop; the "just write the loop" school (see [Topic: agentic-frameworks](summary.md)) exists because that loop is genuinely easy.
- **Churn risk**: the 0.x years burned trust with breaking changes; 1.0's stability promise is recent history, not a track record.
When it does earn its keep:

- Long-running, resumable workflows where a crash mid-run must not lose work.
- Human approval gates measured in hours or days (interrupt + checkpoint is the cleanest implementation available anywhere).
- Genuinely branchy control flow: cycles, conditional routing, parallel fan-out with merge semantics, i.e. exactly the directed acyclic graph (DAG) engine shape; LangGraph is roughly "your DAG engine, plus persistence, streaming, and time travel".
- Teams already paying for LangSmith, where the integration is zero-effort.
If none of those apply, direct API calls behind LiteLLM plus Langfuse tracing remain the simpler system.

### Cross-links

- ReAct, the pattern `create_agent` productises: [ReAct: Synergizing Reasoning and Acting in Language Models](../../papers/2022-10_react/summary.md)
- Multi-agent patterns on LangGraph: [Multi-agent patterns](multi-agent-patterns.md)
- LangSmith in context: [LLM observability](observability.md)
