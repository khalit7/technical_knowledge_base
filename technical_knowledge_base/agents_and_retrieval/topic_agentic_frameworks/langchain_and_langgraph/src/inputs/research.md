# Research: LangChain and LangGraph (facts checked 2026-10-06)

Format per item: claim | verdict | quote | URL | date read. All dates read: 2026-10-06.

## PyPI release dates (from https://pypi.org/pypi/<pkg>/json, upload_time UTC of first file)

- langchain first release 0.0.1: 2022-10-25 | verified (Oct 2022) | upload_time 2022-10-25T04:10:02 | https://pypi.org/pypi/langchain/json
- langchain 0.1.0: 2024-01-06 | verified (Jan 2024) | upload_time 2024-01-06T01:18:19 | https://pypi.org/pypi/langchain/json
- langchain 1.0.0: 2025-10-17 (PyPI upload; announcement was 2025-10-22, see item 2) | upload_time 2025-10-17T20:53:18
- langchain 1.1.0: 2025-11-24; 1.2.0: 2025-12-15; latest 1.4.3 (2026-09-28). No 2.x release exists.
- langchain-core first release 0.0.1: 2023-11-20; 0.1.0: 2023-12-12; 1.0.0: 2025-10-17; latest 1.6.7 (2026-10-06). No 2.x. | https://pypi.org/pypi/langchain-core/json
- langchain-community first release 0.0.1rc1 2023-12-08, 0.0.1 2023-12-11; latest 0.4.2 (2026-05-22). Never reached 1.0. | https://pypi.org/pypi/langchain-community/json
- langchain-classic first release 1.0.0a1 2025-10-07; 1.0.0 2025-10-17; latest 1.0.8 (2026-06-10) | https://pypi.org/pypi/langchain-classic/json
- langgraph first release on PyPI 0.0.8: 2024-01-08 (earliest version on PyPI) | verified (Jan 2024) | https://pypi.org/pypi/langgraph/json
- langgraph 0.2.0: 2024-08-07; 1.0.0: 2025-10-17; 1.1.0: 2026-03-10; 1.2.0: 2026-05-12; latest 1.2.14 uploaded 2026-10-06T14:41:18 | verified (1.2.14 released 2026-10-06) | https://pypi.org/pypi/langgraph/json
- langgraph-supervisor: first 0.0.1 2025-02-07; latest 0.0.31 2025-11-19 (no release since) | https://pypi.org/pypi/langgraph-supervisor/json
- langgraph-swarm: first 0.0.1 2025-02-25; latest 0.1.0 2025-12-04 | https://pypi.org/pypi/langgraph-swarm/json
- deepagents: first 0.0.1 2025-07-29; 0.1.0 2025-10-17; latest 0.7.22 (2026-10-05) | https://pypi.org/pypi/deepagents/json

## 12. Downloads (pypistats.org API, read 2026-10-06; "last_month" = trailing 30 days, pypistats excludes mirrors)

- Claim "tens of millions of monthly PyPI downloads" | verified for langgraph (44.8M) and exceeded for langchain (170M)
  - langgraph: last_month 44,769,952; last_week 11,478,074; last_day 1,876,021 | https://pypistats.org/api/packages/langgraph/recent
  - langchain: last_month 170,457,766; last_week 39,881,109 | https://pypistats.org/api/packages/langchain/recent
  - langchain-core: last_month 144,826,657 | https://pypistats.org/api/packages/langchain-core/recent
  - deepagents: last_month 5,660,894 | https://pypistats.org/api/packages/deepagents/recent
  - Comparison (same date): openai-agents 12,449,784; crewai 2,442,764; llama-index 2,937,852 (last_month). pydantic-ai / autogen / claude-agent-sdk not fetched (rate limited).
  - Note: "most-installed agent framework" is supported among these by downloads, but downloads include transitive installs and CI; it is a proxy, not usage. langchain's count is inflated by being a dependency of many packages.

## 2. LangChain 1.0 and LangGraph 1.0

- Claim "shipped together on 2025-10-22" | verified (announcement date; the PyPI 1.0.0 wheels were uploaded 2025-10-17) | post "LangChain and LangGraph Agent Frameworks Reach v1.0 Milestones", dated October 22, 2025, by Sydney Runkle and the LangChain OSS team | https://www.langchain.com/blog/langchain-langgraph-1dot0 (old URL https://blog.langchain.com/langchain-langgraph-1dot0/ 301-redirects here) | 2026-10-06
- LangChain 1.0 purpose | quote: "The fastest way to build an AI agent ... with a standard tool calling architecture, provider agnostic design, and middleware for customization." | same URL
- LangGraph 1.0 purpose | quote: "A lower level framework and runtime, useful for highly custom and controllable agents, designed to support production-grade, long running agents" | same URL
- create_agent built on LangGraph | verified | quote: "The new `create_agent` function uses LangGraph under the hood to run this loop." | same URL
- Stability | verified | quote: "commitment to stability for our open source libraries and no breaking changes until 2.0." | same URL
- langchain-classic | verified | post: legacy functionality moved to langchain-classic for backward compatibility while the main package focuses on core agent abstractions | same URL
- Built-in middleware list (docs page "Prebuilt middleware") | verified, with corrections | intro quote: "LangChain and Deep Agents provide prebuilt middleware for common use cases." | https://docs.langchain.com/oss/python/langchain/middleware/built-in | 2026-10-06
  - Provider-agnostic, from langchain.agents.middleware: ToolErrorMiddleware (new; not in old list), ToolRetryMiddleware, ModelRetryMiddleware, ModelFallbackMiddleware, SummarizationMiddleware, HumanInTheLoopMiddleware, ModelCallLimitMiddleware, ToolCallLimitMiddleware, PIIMiddleware, TodoListMiddleware, LLMToolSelectorMiddleware, ProviderToolSearchMiddleware (new: "Defer tools behind providers' server-side tool search"), ShellToolMiddleware, FilesystemFileSearchMiddleware ("Provide Glob and Grep search tools"), ContextEditingMiddleware (with ClearToolUsesEdit), LLMToolEmulator.
  - Listed on the same page but imported from deepagents: FilesystemMiddleware (deepagents.middleware), SubAgentMiddleware (deepagents.middleware.subagents), RubricMiddleware ("Rubric grading (Beta)", "requires `deepagents>=0.6.5`", LLM-as-a-judge self-evaluation loop).
  - Correct names vs old list: "Todo" is TodoListMiddleware; "FileSearch" is FilesystemFileSearchMiddleware; "ToolEmulator" is LLMToolEmulator (no "Middleware" suffix); "PII" is PIIMiddleware.
  - Provider-specific: Anthropic (prompt caching, bash tool, text editor, memory, file search), AWS (Bedrock prompt caching), OpenAI (content moderation).
- Middleware hook names | verified | the six hooks: before_agent ("Before agent starts (once per invocation)"), before_model ("Before each model call"), after_model ("After each model response"), after_agent ("After agent completes (once per invocation)"), wrap_model_call ("Around each model call"), wrap_tool_call ("Around each tool call") | https://docs.langchain.com/oss/python/langchain/middleware/custom | 2026-10-06
  - Execution order quote: "`before_*` hooks: First to last", "`after_*` hooks: Last to first (reverse)", "Wrap hooks nest like function calls" (middleware1.wrap_model_call wraps middleware2 wraps middleware3 wraps model). Node-style hooks "Return a dict directly. The dict is applied to the agent state using the graph's reducers." | same URL

## 3. LangGraph 1.1 and 1.2 (GitHub release notes, https://github.com/langchain-ai/langgraph/releases, via API; read 2026-10-06)

- Latest langgraph 1.2.14, released 2026-10-06 | verified | PyPI upload 2026-10-06T14:41:18; GitHub release "1.2.14" 2026-10-06T14:41:37Z, notes only "release(langgraph): 1.2.14 (#9215)" | https://pypi.org/pypi/langgraph/json and https://github.com/langchain-ai/langgraph/releases/tag/1.2.14
- langgraph 1.0.0: PyPI 2025-10-17 | release note "release: langgraph + langgraph-prebuilt v1.0.0 (#6300)" and "adding cursory Python 3.14 support"
- langgraph 1.1.0: PyPI 2026-03-10 | verified | release note: "LangGraph 1.1 introduces `version=\"v2\"` ... a new opt-in streaming format that brings full type safety to `stream()`, `astream()`, `invoke()`, and `ainvoke()`." v2: stream yields typed `StreamPart` dicts with `type`, `ns`, `data` (+ `interrupts` for values); invoke returns `GraphOutput` with `.value` and `.interrupts`; Pydantic/dataclass outputs coerced. "Default is still `version=\"v1\"`". Dict-style access on GraphOutput deprecated (`LangGraphDeprecatedSinceV11`), "It will be removed in v3.0". Also "fix: replay behavior for parent + subgraphs". | https://github.com/langchain-ai/langgraph/releases/tag/1.1.0
- 1.1.x follow-ups: 1.1.3 (2026-03-18) "add execution info to runtime"; 1.1.7a1 "graph lifecycle callback handlers"; 1.1.10 (2026-04-27) ToolNode tools may return list[Command | ToolMessage].
- langgraph 1.2.0: PyPI 2026-05-12 | verified | the 1.2.0a6 notes (2026-05-04) describe the release: "finer-grained control over node execution ... timeouts, error recovery, and graceful shutdown ... a new channel type that cuts checkpoint overhead for long-running threads, and a new content-block-centric streaming API (v3)". Features:
  - DeltaChannel (beta): "stores only the incremental delta at each step rather than re-serializing the full accumulated value".
  - Per-node timeouts: `add_node(..., timeout=TimeoutPolicy(run_timeout=..., idle_timeout=...))`; raises `NodeTimeoutError`, "clears any writes from that attempt, and hands off to the retry policy"; "Timeouts apply to async nodes only".
  - Node-level error handlers: `error_handler=` on add_node runs "after all retries are exhausted", receives `NodeError`, can return a `Command` (Saga/compensation). 1.2.0 final adds "durable error-handler resume across host crashes" and `set_node_defaults()`.
  - Graceful shutdown: `RunControl().request_drain(...)`, raises `GraphDrained` after the current superstep, resumable.
  - Streaming v3 (beta): `graph.stream_events(input, version="v3")` returns `GraphRunStream` with typed projections (`run.values`, `run.messages` one `ChatModelStream` per LLM call, `run.lifecycle`, `run.subgraphs`; updates/custom/checkpoints/tasks/debug via transformers). "This is the recommended path for token-level streaming to a UI in 1.2."
  - "All five features require `langgraph>=1.2`. Timeouts and error handlers are Python-only".
  | https://github.com/langchain-ai/langgraph/releases/tag/1.2.0a6 and https://github.com/langchain-ai/langgraph/releases/tag/1.2.0
- Overwrite | corrected: not a 1.1/1.2 feature; added in langgraph 1.0.2 (2025-10-29): "feat(langgraph): add Overwrite to bypass reducer (#6286)" | https://github.com/langchain-ai/langgraph/releases/tag/1.0.2
- response_schema on interrupt | verified, langgraph 1.2.12 (2026-09-21): "feat(langgraph): add response_schema to interrupt() (#8886)" | https://github.com/langchain-ai/langgraph/releases/tag/1.2.12
- trace_policy on add_node: 1.2.10/1.2.11 (July-Aug 2026).

## 4. Checkpointers, pending writes, durability, thread_id

- Persistence overview | verified | "LangGraph's persistence layer gives agents short-term memory through checkpointers and long-term memory through stores." Checkpointer: "Graph state snapshots", scope "A single thread"; Store: "Application-defined key-value data", scope "Across threads". | https://docs.langchain.com/oss/python/langgraph/persistence | 2026-10-06 (note: /durable-execution now redirects to this same page)
- Checkpointer backends in official docs | verified with additions | listed libraries: `langgraph-checkpoint` (BaseCheckpointSaver, SerializerProtocol, InMemorySaver "for experimentation"; ships with LangGraph), `langgraph-checkpoint-sqlite` (SqliteSaver/AsyncSqliteSaver, "Ideal for experimentation and local workflows"), `langgraph-checkpoint-postgres` (PostgresSaver/AsyncPostgresSaver, "used in LangSmith. Ideal for using in production"), `langgraph-checkpoint-mongodb` (MongoDBSaver/AsyncMongoDBSaver), `langchain-azure-cosmosdb` (CosmosDBSaver). Redis is not in this list (Redis appears only as a store, RedisStore). MongoDB is in the official list, so "third-party" is only partly right: it is a separate package, not core. | https://docs.langchain.com/oss/python/langgraph/checkpointers | 2026-10-06
- Pending writes | verified (wording differs slightly from claim) | "When a graph node fails mid-execution at a given super-step, LangGraph stores pending checkpoint writes from any other nodes that completed successfully at that super-step. When you resume graph execution from that super-step you don't re-run the successful nodes." | https://docs.langchain.com/oss/python/langgraph/checkpointers
- Super-step definition | "A super-step is a single \"tick\" of the graph where all nodes scheduled for that step execute (potentially in parallel)." Checkpoint at each super-step boundary; per-task writes go to the `checkpoint_writes` table. | same URL
- Durability modes | verified | "`\"exit\"`: LangGraph persists changes only when graph execution exits ... you cannot recover from system failures (like process crashes) mid-execution." / "`\"async\"`: LangGraph persists changes asynchronously while the next step executes ... small risk that LangGraph does not write checkpoints if the process crashes" / "`\"sync\"`: LangGraph persists changes synchronously before the next step starts." | same URL
- Durability default | verified from source | docstring: "The durability mode for the graph execution, defaults to `\"async\"`." Old `checkpoint_during` is deprecated in favour of `durability`. | https://github.com/langchain-ai/langgraph/blob/main/libs/langgraph/langgraph/pregel/main.py
- thread_id requirement | verified | "When invoking a graph with a checkpointer, you **must** specify a `thread_id` as part of the `configurable` portion of the config" | https://docs.langchain.com/oss/python/langgraph/checkpointers
- Checkpoint encryption: `EncryptedSerializer.from_pycryptodome_aes` reads key from `LANGGRAPH_AES_KEY`. | same URL

## 8. Store

- Store vs checkpointer | verified | "LangGraph stores provide cross-thread long-term memory, complementing per-thread checkpointer persistence." "Unlike checkpointers, which save the full graph state scoped to one thread, stores hold arbitrary key-value data accessible from any thread." | https://docs.langchain.com/oss/python/langgraph/stores | 2026-10-06
- Backends | verified, extended | "InMemoryStore is suitable for development and testing. For production, use a persistent store like `PostgresStore`, `MongoDBStore`, `RedisStore`, or `UpstashStore`. All implementations extend BaseStore" | same URL
- Namespaces | "Memories are namespaced by a `tuple` ... The namespace can be any length"; `namespace_prefix` "matches by prefix, not exactly"; `store.list_namespaces(prefix=..., max_depth=...)` | same URL
- Semantic search | verified | `InMemoryStore(index={"embed": init_embeddings("openai:text-embedding-3-small"), "dims": 1536, "fields": ["food_preference", "$"]})`; per-put override `index=["food_preference"]` or `index=False` | same URL

## 5. Interrupts

- Rules | verified | page: https://docs.langchain.com/oss/python/langgraph/interrupts | 2026-10-06
  - Heading "Do not wrap `interrupt` calls in try/except": "The way that `interrupt` pauses execution at the point of the call is by throwing a special exception. If you wrap the `interrupt` call in a try/except block, you will catch this exception and the interrupt will not be passed back to the graph." (bare except is the problem; specific exception types are fine)
  - Heading "Do not reorder `interrupt` calls within a node": "Whenever execution resumes, it starts at the beginning of the node ... Matching is **strictly index-based**, so the order of interrupt calls within the node is important."
  - Heading "Side effects called before `interrupt` must be idempotent": "Because interrupts work by re-running the nodes they were called from, side effects called before `interrupt` should (ideally) be idempotent."
  - Static interrupts | verified | "Static interrupts are **not** recommended for human-in-the-loop workflows. Use the `interrupt` function instead." Set via `interrupt_before` / `interrupt_after` at compile or invoke time; described as for debugging ("use static interrupts as breakpoints").
  - Requirements: "A **checkpointer** ...", "A **thread ID** in your config", payload "must be JSON-serializable". "The `thread_id` you choose is effectively your persistent cursor."
  - response_schema (since 1.2.12): typed schema (Pydantic, TypedDict, dataclass) makes `interrupt()` return the validated object; invalid resume raises `pydantic.ValidationError`; a raw JSON Schema dict is exposed but "does **not** validate".

## 6. Streaming

- Stream modes | verified | "values" ("Full state after each step"), "updates" ("State updates after each step"), "messages" ("2-tuples of (LLM token, metadata)"), "custom" (via `get_stream_writer`), "checkpoints" ("Requires a checkpointer"), "tasks" ("Task start/finish events ... Requires a checkpointer"), "debug" ("combines `checkpoints` and `tasks` with extra metadata") | https://docs.langchain.com/oss/python/langgraph/streaming | 2026-10-06
- v2 format | verified | "Requires LangGraph 1.1 or later. All examples on this page use `version=\"v2\"`." Every chunk is a `StreamPart` dict. | same URL
- v3 / event streaming | new since 1.2 | tip at top of page: "For new applications, we recommend event streaming, the typed-projection API introduced in LangGraph v1.2." (quote paraphrased around an em-dash in the original) | same URL; docs page https://docs.langchain.com/oss/python/langgraph/event-streaming

## 7. Subgraphs

- Checkpointer inheritance and modes | verified | table on page: Per-invocation `None` (default): "Each call starts fresh and inherits the parent's checkpointer to support interrupts and durable execution within a single call."; Per-thread `True`: "State accumulates across calls on the same thread."; Stateless `False`: "No checkpointing at all". "Per-invocation is the right choice for most applications". "The parent graph must be compiled with a checkpointer for subgraph persistence features ... to work." Caveat: "Per-thread subgraphs do not support parallel tool calls" (checkpoint conflicts, same namespace). | https://docs.langchain.com/oss/python/langgraph/use-subgraphs | 2026-10-06
- Command.PARENT for handoffs | verified | "you can navigate from a node within a subgraph to a different node in the parent graph by specifying `graph=Command.PARENT`" ... "Setting `graph` to `Command.PARENT` will navigate to the closest parent graph." Shared keys need a reducer in the parent. "This is particularly useful when implementing multi-agent handoffs." | https://docs.langchain.com/oss/python/langgraph/graph-api | 2026-10-06

## 9. Functional API

- Docs statements | verified | "The **Functional API** allows you to add LangGraph's key features (persistence, memory, human-in-the-loop, and streaming) to your applications with minimal changes to your existing code." Building blocks: "`@entrypoint`: Marks a function as the starting point of a workflow" and "`@task`: Represents a discrete unit of work ... Tasks return a future-like object". | https://docs.langchain.com/oss/python/langgraph/functional-api | 2026-10-06
- Pregel docs: "Compiling a StateGraph or creating an `@entrypoint` produces a `Pregel` instance" (both APIs share one runtime) | https://docs.langchain.com/oss/python/langgraph/pregel
- Release history (GitHub release notes): 0.2.67 (2025-01-23) added `entrypoint.final`; 0.2.68 (2025-01-28) "Changed Functional API status from \"Experimental\" to \"Beta\""; 0.2.74 (2025-02-19) "Removed \"Beta\" status from the Functional API (`task` and `entrypoint` decorators), indicating it's now considered stable" | https://github.com/langchain-ai/langgraph/releases

## 1b. Name origin

- "inspired by Pregel and Apache Beam" | verified | README and docs overview: "LangGraph is inspired by Pregel and Apache Beam. The public interface draws inspiration from NetworkX. LangGraph is built by LangChain Inc, the creators of LangChain, but can be used without LangChain." | https://github.com/langchain-ai/langgraph (README) and https://docs.langchain.com/oss/python/langgraph/overview | 2026-10-06
- Pregel/BSP in docs | "The `Pregel` runtime is named after Google's Pregel algorithm" ... "Pregel organizes the execution of the application into multiple steps, following the **Pregel Algorithm**/**Bulk Synchronous Parallel** model." | https://docs.langchain.com/oss/python/langgraph/pregel
- Graph API: "Inspired by Google's Pregel system, the program proceeds in discrete \"super-steps.\"" | https://docs.langchain.com/oss/python/langgraph/graph-api
- README customer line (vendor claim): "Trusted by companies shaping the future of agents ... including Klarna, Replit, Elastic, and more" | https://github.com/langchain-ai/langgraph

## 1. History

- LangChain first commit, Harrison Chase, Oct 2022 | verified | GitHub API: oldest commit 18aeb72012 by Harrison Chase, 2022-10-24T21:51:15Z, message "initial commit"; repo created 2022-10-17; first PyPI release 0.0.1 2022-10-25 | https://github.com/langchain-ai/langchain/commit/18aeb72012 and https://pypi.org/pypi/langchain/json | 2026-10-06
- LangGraph repo | GitHub API: first commit d0dbe3994c by Nuno Campos 2023-08-09 ("First commit"); repo created 2023-08-09. So development began Aug 2023; first PyPI release 0.0.8 on 2024-01-08 | https://github.com/langchain-ai/langgraph
- LangGraph announced Jan 2024 | verified | blog "LangGraph", January 17, 2024: "LangGraph is module built on top of LangChain to better enable creation of cyclical graphs, often needed for agent runtimes." | https://www.langchain.com/blog/langgraph (old: https://blog.langchain.com/langgraph) | 2026-10-06. LangGraph was also mentioned in the v0.1.0 post (Jan 8, 2024).
- LCEL introduced Aug 2023 | verified | blog "LangChain Expression Language", August 1, 2023: "a declarative way to truly compose chains - and get streaming, batch, and async support out of the box." | https://www.langchain.com/blog/langchain-expression-language | 2026-10-06
- langchain-core split | verified | blog "Towards LangChain 0.1: LangChain-Core and LangChain-Community", December 12, 2023: langchain-core contains "simple, core abstractions that have emerged as a standard, as well as LangChain Expression Language"; langchain-community houses "all third party integrations". langchain-core 0.0.1 on PyPI 2023-11-20, 0.1.0 on 2023-12-12; langchain-community 0.0.1 2023-12-11 | https://www.langchain.com/blog/the-new-langchain-architecture-langchain-core-v0-1-langchain-community-and-a-path-to-langchain-v0-1
- langchain 0.1.0 Jan 2024 | verified | PyPI 2024-01-06; blog "LangChain v0.1.0" dated January 8, 2024 (first stable version; two architectural changes: separating langchain-core and separating partner packages into langchain-community or standalone packages) | https://www.langchain.com/blog/langchain-v0-1-0
- langchain-classic | verified | created for 1.0: first PyPI 1.0.0a1 2025-10-07, 1.0.0 2025-10-17. Holds: "Legacy chains, retrievers, indexes, hub, embedding helpers such as `CacheBackedEmbeddings`, and community re-exports moved to `langchain-classic`." Migration: "the `langchain` package focuses on agents, messages, tools, chat models, and embeddings." | https://docs.langchain.com/oss/python/migrate/langchain-v1 | 2026-10-06
- Funding (all primary LangChain blog posts):
  - Seed $10M led by Benchmark, April 4, 2023 | https://www.langchain.com/blog/announcing-our-10m-seed-round-led-by-benchmark
  - Series A led by Sequoia Capital, with LangSmith GA, February 15, 2024 ($25M per the post as summarised; amount not independently double-checked) | https://www.langchain.com/blog/langsmith-ga
  - Series B $125M at $1.25B valuation, led by IVP with Sequoia, Benchmark, Amplify, CapitalG, Sapphire Ventures; October 20, 2025 (two days before the 1.0 post) | https://www.langchain.com/blog/series-b
  - Series C: no announcement by LangChain found (only secondary-market reports); unconfirmed.

## 10. LangGraph Platform rename

- "LangGraph Platform became LangSmith Deployment around Oct 2025" | verified | LangSmith changelog, entry "October 13-17, 2025": "LangGraph Platform is now LangSmith Deployment and LangGraph Studio is now LangSmith Studio. LangSmith now spans three services: Observability, Evaluation, and Deployment. Existing deployments, APIs, workflows, pricing, and contracts are unchanged" | https://docs.langchain.com/langsmith/changelog (old URL https://changelog.langchain.com/announcements/product-naming-changes-langsmith-deployment-and-langsmith-studio redirects here) | 2026-10-06
- Server naming | the docs now call it "Agent Server": "LangSmith Deployment's **Agent Server** offers an API for creating and managing agent-based applications. It is built on the concept of assistants ... and includes built-in persistence and a task queue." (formerly LangGraph Server) | https://docs.langchain.com/langsmith/agent-server
- Persistence page: "When using the Agent Server, you do not need to implement or configure checkpointers or stores manually." | https://docs.langchain.com/oss/python/langgraph/persistence
- History: LangGraph Cloud announced with LangGraph v0.1 (https://blog.langchain.com/langgraph-cloud/), renamed LangGraph Platform (GA post https://blog.langchain.com/langgraph-platform-ga/); dates of those posts not re-read here.

## 16. Stability and deprecations

- "1.0 line held API stable since October 2025" | verified | no 2.x of langchain, langchain-core or langgraph on PyPI as of 2026-10-06 (latest langchain 1.4.3, langchain-core 1.6.7, langgraph 1.2.14).
- Release policy | "Breaking changes to the public API will only occur in major version releases (e.g., `2.0.0`)"; "deprecated features will continue to work throughout the entire 1.x release series"; "LangChain 1.0 is designated as an LTS release: Status: ACTIVE until the release of 2.0"; "After 2.0 is released, 1.0 will enter MAINTENANCE mode for at least 1 year"; LangChain 0.3 in MAINTENANCE "Until December 2026"; "We expect to space out **major** releases by at least 6-12 months". | https://docs.langchain.com/oss/python/release-policy | 2026-10-06
- create_react_agent deprecated | verified | "LangGraph v1 is largely backwards compatible with previous versions. The main change is the deprecation of `create_react_agent` in favor of LangChain's new `create_agent` function." Other deprecations: prebuilt AgentState variants, HumanInterruptConfig/ActionRequest/HumanInterrupt, ValidationNode, MessageGraph. | https://docs.langchain.com/oss/python/migrate/langgraph-v1
- Removal in 2.0 | verified from source | create_react_agent is decorated `@deprecated("create_react_agent has been moved to `langchain.agents`...", category=LangGraphDeprecatedSinceV10)`; `LangGraphDeprecationWarning.expected_removal` defaults to `(since[0] + 1, 0)`, i.e. 2.0 | https://github.com/langchain-ai/langgraph/blob/main/libs/prebuilt/langgraph/prebuilt/chat_agent_executor.py and https://github.com/langchain-ai/langgraph/blob/main/libs/langgraph/langgraph/warnings.py

## 11. langgraph-supervisor, langgraph-swarm, Deep Agents

- langgraph-supervisor still recommended? | corrected: no longer recommended for most cases (not formally deprecated) | README note: "We now recommend using the **supervisor pattern directly via tools** rather than this library for most use cases. The tool-calling approach gives you more control over context engineering and is the recommended pattern in the LangChain multi-agent guide." and "We're making this library compatible with LangChain 1.0 to help users upgrade their existing code." Last PyPI release 0.0.31 on 2025-11-19. | https://github.com/langchain-ai/langgraph-supervisor-py | 2026-10-06
- langgraph-swarm | no deprecation note in README; quickstart now uses `from langchain.agents import create_agent`; last PyPI release 0.1.0 on 2025-12-04 (no release in 2026) | https://github.com/langchain-ai/langgraph-swarm-py | 2026-10-06
- Current multi-agent guidance | docs patterns: Subagents ("A main agent coordinates subagents as tools"), Handoffs, Skills, Router, Custom workflow. Tip: "For built-in multi-agent support, use Deep Agents: a higher-level harness built on LangChain that ships with subagents, skills, planning, a virtual filesystem, and context management." Also: "not every complex task requires this approach; a single agent with the right (sometimes dynamic) tools and prompt can often achieve similar results." (original uses an em-dash; rendered with a semicolon here) | https://docs.langchain.com/oss/python/langchain/multi-agent | 2026-10-06
- Deep Agents | verified | blog "Deep Agents", Harrison Chase, July 30, 2025: "Applications like 'Deep Research,' 'Manus,' and 'Claude Code' have gotten around this limitation by implementing a combination of four things: a planning tool, sub agents, access to a file system, and a detailed prompt." | https://www.langchain.com/blog/deep-agents (old https://blog.langchain.com/deep-agents/)
  - deepagents PyPI: 0.0.1 2025-07-29; 0.1.0 2025-10-17 (with the 1.0 wave); latest 0.7.22 2026-10-05; 5.66M downloads last month.
  - README tagline: "The batteries-included agent harness." "Deep Agents is an open source agent harness ... an opinionated agent that runs out of the box." "Production-ready ... built on LangGraph (streaming, persistence, checkpointing)". | https://github.com/langchain-ai/deepagents
  - Docs: "Deep Agents is the easiest way to start building agents and applications that are powered by LLMs, with built-in capabilities for file systems for context management, subagent-spawning, and long-term memory." | https://docs.langchain.com/oss/python/deepagents/overview

## 13. "Uber, LinkedIn, Klarna and Replit run on it"

Verdict: verified, with sourcing labels. Vendor-claimed (LangChain pages) for all four; independent first-party engineering posts found for Uber and LinkedIn; Klarna and Replit only via LangChain-authored case studies.

- LangChain page "built-with-langgraph" (vendor claim): LinkedIn "AI recruiter ... a hierarchal agent system powered by LangGraph"; Uber "Developer Platform team used LangGraph to build a network of agents and automate unit test generation"; Klarna "AI Assistant, powered by LangGraph and LangSmith, handles customer support tasks for 85 million active users"; also Elastic, AppFolio. Replit not on this page. | https://www.langchain.com/built-with-langgraph | 2026-10-06
- LangGraph README (vendor claim): "Trusted by companies shaping the future of agents ... including Klarna, Replit, Elastic, and more" | https://github.com/langchain-ai/langgraph
- Klarna (vendor case study, Feb 12, 2025): "Built on LangGraph and powered by LangSmith, the AI Assistant handles tasks ranging from customer payments, to refunds, to other payment escalations"; "Reduced average customer query resolution time by 80%"; "the work equivalent of 700 full-time staff" | https://www.langchain.com/blog/customers-klarna
- Replit (vendor case study, undated "Breakout Agents" page): "using both the agent framework (LangGraph) and observability tool (LangSmith) together" | https://www.langchain.com/breakoutagents/replit ; also https://blog.langchain.com/customers-replit/ (not re-read)
- Uber (first-party engineering blog):
  - "Enhanced Agentic-RAG", May 29, 2025: "For agent development and workflow orchestration, we used LangChain LangGraph, a scalable yet developer-friendly framework for agentic AI workflows." | https://www.uber.com/us/en/blog/enhanced-agentic-rag/
  - "Unlocking Financial Insights with Finch", July 17, 2025: "We use LangChain Langgraph to construct and orchestrate our agents." | https://www.uber.com/us/en/blog/unlocking-financial-insights-with-finch/
- LinkedIn (first-party engineering blog): "Practical text-to-SQL for data analytics" (SQL Bot), December 9, 2024, Albert Chen et al.: SQL Bot is "a multi-agent system built on top of LangChain and LangGraph." | https://www.linkedin.com/blog/engineering/ai/practical-text-to-sql-for-data-analytics

## 14. AWS Pizza Bot

- Claim "AWS built Pizza Bot, its open-source inbox for background agents, on DeepAgents and LangGraph in September 2026" | verified with a nuance | AWS Open Source Blog "Introducing Pizza Bot, an open source inbox for AI agents that work in the background", September 10, 2026, by Joseph Dolivo and Igor Fil: "DeepAgents builds the agent on LangGraph, an open source framework for stateful agents." Apache-2.0; repo https://github.com/pizza-bot-app/pizza-bot. Nuance: "Pizza Bot is a community project rather than an AWS service, so there's no AWS support or service-level agreement behind it". Secondary reports say it began as an internal Amazon side project ("JoeBot"); not checked in the primary post. So "its" (AWS's product) overstates; better: "released through the AWS Open Source Blog as a community project". | https://aws.amazon.com/blogs/opensource/introducing-pizza-bot-an-open-source-inbox-for-ai-agents-that-work-in-the-background/ | 2026-10-06

## 15. Criticisms

- Octomind, "Why we no longer use LangChain for building our AI agents" | verified (live site dead; Wayback copy) | author Fabian Both (Staff Deep Learning Engineer, Octomind); no publication date in the page; earliest Wayback capture 2024-06-14, so published June 2024 (on or before 14 June). Live URL https://www.octomind.dev/blog/why-we-no-longer-use-langchain-for-building-our-ai-agents returned no HTTP response on 2026-10-06 (connection failed, code 000). Wayback: https://web.archive.org/web/20240614031027/https://www.octomind.dev/blog/why-we-no-longer-use-langchain-for-building-our-ai-agents (also 20240620211903). Quotes: subtitle "When abstractions do more harm than good"; "We used LangChain in production for over 12 months, starting in early 2023 then removing it in 2024."; "because LangChain intentionally abstracts so many details from you, it often wasn't easy or possible to write the lower-level code we needed to."; on the translate example: "All LangChain has achieved is increased the complexity of the code with no perceivable benefits."; "in hindsight, we would've been better off long-term without a framework." Argument: high-level abstractions (prompt templates, output parsers, LCEL chains) for a field in flux; use low-level building blocks instead. The post does not discuss LangGraph. | read 2026-10-06
- Hamel Husain, "Fuck You, Show Me The Prompt." | verified | February 14, 2024 | quote: "The prompts sent by these tools to the LLM is a natural language description of what these tools are doing, and is the fastest way to understand how they work." | https://hamel.dev/blog/posts/prompt/ | 2026-10-06
- Max Woolf, "The Problem With LangChain" | verified | July 14, 2023 | "The problem with LangChain is that it makes simple things relatively complex, and with that unnecessary complexity creates a tribalism which hurts the up-and-coming AI ecosystem as a whole." and "LangChain is one of the few pieces of software that _increases_ overhead in most of its popular use cases." | https://minimaxir.com/2023/07/langchain-problem/ | 2026-10-06
- LangChain blog "How and when to build multi-agent systems" | verified, URL valid | Harrison Chase, June 16, 2025 (response to Cognition's "Don't Build Multi-Agents" and Anthropic's multi-agent research post); "\"Context engineering\" is the next level of this. It is about doing this automatically in a dynamic system." | https://www.langchain.com/blog/how-and-when-to-build-multi-agent-systems (old https://blog.langchain.com/how-and-when-to-build-multi-agent-systems/ 301-redirects to it) | 2026-10-06
- Anthropic "Building effective agents" | verified quote, with a caveat | Dec 19, 2024, Erik Schluntz and Barry Zhang. Quote: "However, they often create extra layers of abstraction that can obscure the underlying prompts and responses, making them harder to debug. They can also make it tempting to add complexity when a simpler setup would suffice. We suggest that developers start by using LLM APIs directly: many patterns can be implemented in a few lines of code." | https://www.anthropic.com/engineering/building-effective-agents (original URL /research/building-effective-agents) | 2026-10-06
  - CAVEAT: the page has been edited. The current version lists "The Claude Agent SDK; Strands Agents SDK by AWS; Rivet ...; and Vellum". The original (Wayback 2024-12-20) listed "LangGraph from LangChain; Amazon Bedrock's AI Agent framework; Rivet ...; and Vellum". So the critique originally named LangGraph explicitly; it no longer does. Wayback: https://web.archive.org/web/20241220084614/https://www.anthropic.com/research/building-effective-agents

## 17. Pregel and BSP citations (Crossref metadata, read 2026-10-06)

- Malewicz, Austern, Bik, Dehnert, Horn, Leiser, Czajkowski. "Pregel: a system for large-scale graph processing." Proceedings of the 2010 ACM SIGMOD International Conference on Management of Data, pp. 135-146, June 2010. DOI 10.1145/1807167.1807184 | verified | https://doi.org/10.1145/1807167.1807184 ; Google page linked from LangGraph docs: https://research.google/pubs/pub37252/
- Valiant, L. G. "A bridging model for parallel computation." Communications of the ACM 33(8):103-111, August 1990. DOI 10.1145/79173.79181 | verified | https://doi.org/10.1145/79173.79181
- Apache Beam: https://beam.apache.org/ (the README names Beam as an inspiration; no specific paper is cited by LangGraph).

## 10b. Studio and pricing (official pages)

- LangGraph Studio | now "LangSmith Studio" (same changelog entry, October 13-17, 2025); docs pages under https://docs.langchain.com/langsmith/studio ; still active (changelog in 2026 has Studio fixes). Docs: Studio can set static interrupts in the UI ("You can use LangSmith Studio to set static interrupts in your graph in the UI", interrupts page).
- Pricing (https://www.langchain.com/pricing, read 2026-10-06, summarised by fetch tool, treat numbers as indicative): Developer plan has no deployment; Plus "$39 / seat per month" with "1 free Serverless (Small) deployment included"; Enterprise custom. Usage metered in "LSU" units for runtime compute/memory and database compute/memory ("Uptime is the duration your deployment's database is live and persisting state"). The old per-node-executed pricing is no longer on the page.

## Summary of verdicts

1 History: verified (first commit 2022-10-24, PyPI 0.0.1 2022-10-25; LCEL 2023-08-01; core split blog 2023-12-12; langchain 0.1.0 2024-01-06/08; LangGraph PyPI 2024-01-08, blog 2024-01-17; langchain-classic 2025-10; Pregel/Beam quote verified).
2 1.0 on 2025-10-22: verified (PyPI wheels 2025-10-17). Middleware list verified with name corrections and additions (ToolError, ProviderToolSearch, Filesystem, SubAgent, Rubric). Hooks verified.
3 langgraph 1.2.14 on 2026-10-06 verified; 1.1.0 2026-03-10 (v2 typed streaming, GraphOutput); 1.2.0 2026-05-12 (TimeoutPolicy, error handlers, graceful shutdown, DeltaChannel beta, v3 event streaming beta); Overwrite corrected to 1.0.2; response_schema 1.2.12.
4 Checkpointers verified (+MongoDB and Azure Cosmos DB official; Redis only as a store); pending writes, durability (default "async"), thread_id verified.
5 Interrupt rules verified. 6 Stream modes verified + v2/v3. 7 Subgraphs verified. 8 Store verified. 9 Functional API verified (beta Jan 2025, stable 0.2.74 on 2025-02-19).
10 Rename verified (Oct 13-17, 2025 changelog); Agent Server naming verified.
11 langgraph-supervisor: README now recommends tool-based supervisor instead (not formally deprecated); swarm: no note, dormant since 2025-12; Deep Agents 2025-07-29/30.
12 Downloads verified: langgraph 44.8M/month, langchain 170.5M/month (2026-10-06).
13 Customers verified with labels (Uber, LinkedIn first-party; Klarna, Replit vendor-only).
14 Pizza Bot verified, but it is a community project published on the AWS Open Source Blog, not an AWS service (2026-09-10).
15 Critiques verified; Anthropic post edited to drop LangGraph from its framework list.
16 No 2.0 shipped; create_react_agent deprecated, removal expected in 2.0 (verified from source and docs).
17 Citations verified via Crossref.
