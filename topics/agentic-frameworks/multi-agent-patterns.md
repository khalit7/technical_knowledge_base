# Multi-agent patterns

⏱ 7 min read · +1h 30m resources

Last reviewed: 2026-09-21 (acronyms expanded on first use; no dated sections or repo-shaped references found)

### Best resources

- [Don't Build Multi-Agents](https://cognition.com/blog/dont-build-multi-agents) (Cognition, Jun 2025) (15 min): the strongest case against; context sharing and decision conflict as the core failure modes.
- [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) (Anthropic, Jun 2025) (25 min): the strongest case for; orchestrator + parallel subagents beating single-agent by 90.2% on internal research evals.
- [How and when to build multi-agent systems](https://www.langchain.com/blog/how-and-when-to-build-multi-agent-systems) (LangChain) (15 min): reconciles the two; read-heavy vs write-heavy framing.
- [Single vs multi-agent systems](https://www.philschmid.de/single-vs-multi-agents) (Philipp Schmid) (10 min): compact decision guide.
- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) (25 min): defines orchestrator-workers and evaluator-optimizer as workflows before "multi-agent" branding existed.

### The patterns

**Orchestrator-workers (supervisor).** A lead agent decomposes the task, spawns worker agents with scoped briefs, and synthesises their reports. Workers run in isolated context windows and return summaries, not transcripts. This is Anthropic's Research system, Claude Code subagents, `langgraph-supervisor`, and the dominant production pattern in 2026. Its real payoff is **context isolation and parallel token budget**: N workers can burn N context windows on exploration while the orchestrator's context stays clean. Anthropic found token spend explains ~80% of performance variance on their research evals; multi-agent is a way to spend more tokens effectively, at roughly 15x the tokens of a chat interaction.

**Handoffs (peer transfer).** Control passes wholly from one agent to another (triage -> billing -> escalation); the conversation continues under a new system prompt and tool set. OpenAI Agents SDK's native primitive; `langgraph-swarm`; natural for customer-support routing where exactly one specialist should own the conversation at a time. Contrast with orchestrator-workers: no synthesis step, no parallelism, state is the shared conversation itself.

**Parallel fan-out.** The same or different prompts run concurrently and results are aggregated: sectioning (independent subtasks), sampling (N attempts, pick best), map-reduce over documents. A workflow, not really "agents", and often the highest return-on-investment pattern of all; LangGraph's Send API and reducer-merged state, or `asyncio.gather` in a directed acyclic graph (DAG) engine, implement it.

**Debate / judge panels.** Multiple agents argue or independently answer; a judge (or vote) selects. Useful for evals (LLM-as-judge ensembles reduce single-judge bias; see [Topic: evaluation-and-llm-judges](../evaluation-and-llm-judges/summary.md)) and for high-stakes single decisions. Research support is mixed: gains on some reasoning benchmarks, but 2025-2026 work repeatedly finds self-consistency (sample N from one model, majority-vote) matches multi-model debate at equal token budget. Pay for it only when diversity of prompts/models demonstrably beats sampling diversity.

**Shared state / blackboard.** Agents coordinate by reading and writing a common store (LangGraph shared state channels, a scratch filesystem, a DB) rather than messaging each other. The oldest multi-agent architecture (1980s blackboard systems). Filesystem-as-blackboard is quietly standard now: Claude Code subagents and Anthropic's research workers leave artifacts on disk for the orchestrator.

### When multi-agent helps vs hurts

Cognition's argument: agents act on implicit decisions; parallel agents that cannot see each other's full traces make **conflicting decisions** (two subagents building mismatched components), and messaging summaries between them loses exactly the context that mattered. Principles: share full traces, not summaries; single-threaded by default; compress context with a dedicated model before you shard work across agents. Reliability compounds badly: per-step error rates multiply across agents.

Anthropic's counter-case: for **read-heavy, parallelizable research**, isolated workers with separate context windows outperform any single context. But their write-up is candid about costs: 15x tokens, prompt engineering the orchestrator's delegation quality is the hard part, debugging emergent behavior needs full tracing, and small changes cascade (they ship rainbow deploys for agent versions).

The synthesis (LangChain's framing, now conventional wisdom): **parallelize reads, never writes**. Research, search, review, evaluation: fan out. Code, documents, any artifact with global consistency constraints: keep one writer with full context. Note both camps converged on the same architecture, one orchestrator with ephemeral isolated subagents returning reports; what died in the debate was peer-to-peer agent swarms chatting via message passing (the original AutoGen vision).

Decision checklist before going multi-agent:

1. Is the bottleneck context capacity or exploration breadth? If not, stay single.
2. Are subtasks independent (no shared mutable artifact)? If not, stay single.
3. Is the task's value worth ~15x tokens? If not, stay single.
4. Can you trace and eval it? Without observability, multi-agent is undebuggable.
5. Would a workflow (fixed DAG of LLM calls) do? A DAG with parallel branches captures most of the win with none of the emergent behavior.

### Cross-links

- ReAct, the single-agent loop being composed: [ReAct: Synergizing Reasoning and Acting in Language Models](../../papers/2022-10_react/summary.md)
- Subgraphs/supervisor mechanics: [LangChain and LangGraph](langchain-and-langgraph.md)
- Subagents in the Claude Agent SDK: [Claude Agent SDK](claude-agent-sdk.md)
- Judge design and failure modes: [LLM-as-judge: design, biases, calibration, reliability](../evaluation-and-llm-judges/llm-as-judge.md)
