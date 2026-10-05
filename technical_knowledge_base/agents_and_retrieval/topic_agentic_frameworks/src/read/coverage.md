# Coverage of the old pages (Reading tab)

The old root and its four children are saved verbatim in `old/` (Notion fetch, read only, 6 Oct 2026; the root was last edited 23 Sep 2026, the children 22 Sep 2026). The old pages are treated as unverified notes. Each claim is marked **verified** (primary source found, carried with its link), **corrected** (carried with the correction), **unconfirmed** (no primary source found; shown as UNCONFIRMED or dropped), or **moved** (belongs to a child page or another tab; listed there). Verification runs: `scratchpad/agents/afread/verify_orch.md`, `verify_ops.md`, `verify_multi.md` (6 Oct 2026, direct fetches of primary URLs), plus `scratchpad/agents/FACTS.md`.

The root also carries a narrated video block (`<video src="notion-file-block://3e45c17b-0d0d-81a6-93dd-c0d0b576c3f1/...topic_agentic_frameworks_overview.mp4">`, 6 min, "one axis: how much of the agent loop do you own?") and four `<page>` tags (the children). Both stay on the Notion page; the video describes the old page (ask Khalid whether to keep it).

## Root

| Claim | Status | Where |
|---|---|---|
| Four layers: orchestration, gateways, observability, memory; one axis "how much of the loop you own" | verified as framing | s0 map and ownership axis |
| Four orchestration schools and their members | verified | s2 |
| LangGraph: nodes over typed state, checkpointer, durable execution, HITL, time travel | verified (docs) | s2, s3 |
| LangGraph "most-installed agent framework" | unconfirmed (no download source fetched) | dropped |
| LangChain 1.0 create_agent runs on the LangGraph runtime | verified (blog, 22 Oct 2025) | s2 |
| LlamaIndex Workflows event-driven | verified | s2 |
| CrewAI role, goal, backstory; sequential or hierarchical | verified; Flows added | s2 |
| AutoGen conversation model; maintenance mode; AG2 "community fork" | maintenance mode verified; **corrected**: AG2 calls itself "AG2 (formerly AutoGen)", no primary source for "fork" | s2 |
| Microsoft Agent Framework "generally available April 2026", successor to AutoGen and Semantic Kernel | verified: 1.0 tags python-1.0.0 and dotnet-1.0.0 on 2 Apr 2026; successor per Microsoft Learn | s2 |
| "Peer-to-peer chat swarm ... proved undebuggable in production" | unconfirmed (opinion, no source) | dropped; s5 cites MAST and Cognition instead |
| Pydantic AI type hints, validation, ModelRetry | verified | s2, s4 |
| smolagents code actions in a sandbox, fewer round trips | verified (CodeAct "up to 20% higher success rate"); "fewer steps" not checked in the paper body | s2 |
| OpenAI Agents SDK: five primitives over Runner.run, production Swarm | verified (agents, tools, handoffs, guardrails, sessions; "production-ready upgrade" of Swarm); tracing on by default added | s2 |
| Google ADK in Python, TypeScript, Java, Go; A2A; deploys to Vertex AI Agent Engine | **corrected**: Python, TypeScript, Go, Java and Kotlin; docs now name "Agent Runtime on Agent Platform", Cloud Run, GKE (page says "deploys to Google Cloud"); A2A verified, now a Linux Foundation project (23 Jun 2025) | s2 |
| Claude Agent SDK ships the Claude Code loop | verified; rename date 29 Sep 2025 added | s2 |
| LiteLLM: one OpenAI-format endpoint over 100+ providers, virtual keys, budgets, fallbacks, cooldowns, logging callback | verified | s6 |
| Khalid runs LiteLLM at work | carried as the old page's statement | s6 |
| OpenRouter 300+ models, 60+ providers | **corrected**: "400+ AI models" (19 Aug 2026); no provider count found, dropped | s6 |
| OpenRouter pricing "margin on every token" | **corrected**: passes through provider prices "without any markup"; 5.5% fee (min $0.80) on card credit purchases | s6 |
| Stripe acquired OpenRouter, confirmed 19 Aug 2026, above $7B | **corrected**: announced 19 Aug 2026 ("joining forces with Stripe"), subject to closing conditions; price not disclosed, "$7B" unconfirmed | s6 |
| Sakana Fugu Max and Fugu Ultra v2, Sep 10 to 11, learned orchestrator behind an OpenAI-compatible API | verified; **corrected** date to 11 Sep 2026 | s6 |
| Observability data model: trace, spans, generations | verified | s7 |
| Langfuse MIT, self-hostable, LiteLLM callback | verified; precise licence (MIT outside ee folders) | s7 |
| LangSmith, Braintrust (experiment = dataset x scorer x prompt version), Phoenix OTel-native, OpenLLMetry | verified; Braintrust's parts are data, task, evaluators; **corrected**: Phoenix is Elastic License 2.0 (source-available), not open source in the OSI sense | s7 |
| OTel gen_ai.* conventions becoming the wire format | verified as status "Development"; spec moved to its own repository | s7 |
| Mem0 layered facts | verified (scopes user_id, agent_id, run_id); paper numbers added, labelled vendor-run | s8 |
| Zep temporal graph with validity intervals | verified (valid_at, invalid_at) | s8 |
| Zep "holds the strongest published LongMemEval numbers" | unconfirmed | s8, marked UNCONFIRMED |
| Letta MemGPT-style paging | verified | s8 |
| Building effective agents: workflows vs agents, five patterns | verified (19 Dec 2024) | s1 |
| 12-factor agents: own prompts, own control flow, stateless function | verified; all twelve titles quoted | s10 |
| OpenAI Agents API since September 2026 with managed sessions and sandboxes | verified: public beta 10 Sep 2026 | s9 |
| Anthropic Managed Agents "since September 2026" move permission evaluation to the server | **corrected**: Managed Agents public beta 8 Apr 2026; the auto permission policy arrived 10 Sep 2026 | s9 |
| Rule of thumb: direct calls behind a gateway, adopt a framework for a named capability; Khalid's DAG engine is the workflow half | carried (argument, attributed) | s10 |
| ReAct paper summary | moved: linked to the ReAct paper page | s1 |
| Best resources (Building effective agents, 12-factor, Langfuse comparison, Cognition vs Anthropic) | links checked; Langfuse 2025 comparison not carried (not re-read) | Further reading |

## Claude Agent SDK (child)

| Claim | Status | Where |
|---|---|---|
| Packages the Claude Code harness; renamed from the Claude Code SDK "late 2025" | verified; date 29 Sep 2025 | s2 |
| query() and ClaudeSDKClient; @tool in-process MCP; can_use_tool; hooks; subagents; MCP client | verified (Python reference) | s2 |
| Skills, compaction, sessions | carried in the ownership axis (harness as library); depth moved to the proposed child | s0, s11 |
| Managed Agents and OpenAI Agents API "on the same day" in September 2026 | **corrected**: Managed Agents beta 8 Apr 2026; the auto policy and the Agents API beta both 10 Sep 2026 | s9 |
| Comparison table against the OpenAI Agents SDK | moved to the proposed child page | s11 |

## LangChain and LangGraph (child)

| Claim | Status | Where |
|---|---|---|
| Three eras; v1.0 on 2025-10-22; create_agent; middleware | verified (v1.0 date, create_agent, middleware) | s2 |
| Checkpointers SQLite/Postgres/Redis | **corrected**: official docs list SQLite and Postgres; Redis is a separate package maintained by Redis | coverage only; moved to child |
| interrupt() + Command(resume=...), time travel | verified; resumed node re-runs from its first line (FACTS) | s3 |
| "Tens of millions of monthly downloads; Uber, LinkedIn, Klarna, Replit; AWS Pizza Bot" | unconfirmed | dropped |
| Criticisms: Octomind, Hamel Husain | verified; Octomind's site is gone, archived copy linked, published June 2024 (exact day unconfirmed) | s10, Further reading |

## Multi-agent patterns (child)

| Claim | Status | Where |
|---|---|---|
| Orchestrator-workers, handoffs, fan-out, debate, blackboard | verified as patterns | s5 |
| Anthropic 90.2%, about 15x tokens, 80% of variance | verified (13 Jun 2025) | s5 |
| Cognition principles | verified (12 Jun 2025) | s5 |
| Debate matched by self-consistency in "2025-2026 work" | **corrected**: Smit et al. 2023, Wang et al. 2024, Debate or Vote Aug 2025 | s5 |
| "Parallelize reads, never writes" as LangChain's framing | verified (LangChain 16 Jun 2025; Schmid 20 Jun 2025) | s5 |
| Agora: 12 days, 13 workers, 1,703 contributions, 3.39 to 1.899 bpb, 145 commits across 15 accounts, "165 independent reproductions" | verified; **corrected**: 165 verifications of 95 targets | linked to the Agora paper page |
| OpenAI 10,000-agent Navier-Stokes swarm (4.9M messages, 300B tokens, $2m to $22.5m) | unconfirmed (openai.com blocked; no paper found) | dropped |
| Anthropic FLT: 11 days, about 6B output tokens, DAG of theorem statements | verified (4 Sep 2026) | s5 |
| FLT used "about 2% of" the OpenAI swarm's tokens | dropped (depends on the unconfirmed swarm figure) | none |
| Nous Research 1,393 subagents, 19 hours, 34.4%, $19,300, regressions tests missed | verified (Sep 2026); about 65 exception-handling sites added | s5 |
| Five-question checklist before going multi-agent | carried, rewritten | s5 |

## LLM observability (child)

| Claim | Status | Where |
|---|---|---|
| Data model, platform landscape | verified (see root rows) | s7 |
| Langfuse v3 stack: Postgres, ClickHouse, Redis, S3 | verified | s7 |
| Claude Code 2.1.274 OTel effort attributes and managed-settings events | verified (17 Sep 2026) | s7 |
| Hosted loops make trace fidelity a procurement question | carried (argument) | s9 |
| Eval in the loop, cost attribution, prompt registry | carried briefly | s7; depth moved to child |
| Structured output validate-and-retry, cap 2 to 3, retry metric | carried | s4 |
| Gateway fallbacks need evals | carried | s6 |
| Timeouts, budgets, degrade explicitly | moved to the Production stack tab and the proposed child | none |
| Market survey link (marktechpost) | not carried (secondary) | none |
