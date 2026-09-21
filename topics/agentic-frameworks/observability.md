# LLM observability

⏱ 8 min read · +2h 15m resources

Last reviewed: 2026-09-21 (acronyms expanded on first use; no dated sections or repo-shaped references found)

### Best resources

- [Langfuse docs](https://langfuse.com/docs) (docs, ~40 min for the core pages): tracing data model (traces/observations/scores), software development kits (SDKs), self-hosting; the best-documented open option.
- [LangSmith docs](https://docs.langchain.com/langsmith/home) (docs, ~40 min for the core pages): tracing + evals + prompt hub for the LangChain/LangGraph stack.
- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) (25 min): the emerging standard attribute names for LLM spans.
- [OpenLLMetry](https://github.com/traceloop/openllmetry) (repo, ~15 min for the README): vendor-neutral OpenTelemetry (OTel) instrumentation most backends ingest.
- [Top LLM observability platforms compared, 2026](https://www.marktechpost.com/2026/08/09/top-llm-observability-and-evaluation-platforms-in-2026-langfuse-langsmith-braintrust-arize-and-more-compared/) (15 min): current market survey.

### The data model

Every serious tool converges on the same shape: a **trace** per request/agent-run, containing a tree of **spans** (any timed unit: retrieval, tool call, subagent), with **generations** as a specialised span type carrying model, prompt, completion, token counts, and cost. Langfuse calls span-tree nodes "observations" (span/generation/event); LangSmith calls them "runs"; OTel-based tools use plain spans with `gen_ai.*` attributes. Attach **scores** (from users, rules, or LLM judges) to traces or spans, and group traces by `session_id` and `user_id`. Agent traces are deep trees: one run of a tool-calling agent is a root span with alternating generation and tool spans, recursing into subagent subtrees.

### Platform landscape (2026)

- **Langfuse**: open source (MIT), self-hostable (the v3 stack: Postgres + ClickHouse + Redis + S3), tracing + evals + datasets + prompt management in one. Native LiteLLM integration: point the proxy's logging callback at Langfuse and every gateway request is traced with cost, no app changes. OTel endpoint accepts GenAI-convention spans. The default when you want ownership; the Khalid-at-work stack (LiteLLM + Langfuse) is the canonical open pairing.
- **LangSmith**: commercial, deepest LangGraph integration (checkpoint-aware traces, Studio debugging), strong eval runner and prompt hub. Wins when LangGraph anchors the app; less compelling otherwise since tracing arbitrary code means adopting their SDK anyway.
- **Braintrust**: evals-first; the primary object is the experiment (dataset x scorer x prompt version), with tracing in service of eval loops. Popular with teams whose bottleneck is "is v3 better than v2", not debugging.
- **Arize Phoenix**: open source, OTel-native (OpenInference conventions), strong retrieval-augmented generation (RAG) and embedding analysis; Arize AX is the commercial tier.
- **OpenLLMetry (Traceloop)**: not a backend but instrumentation; auto-patches OpenAI/Anthropic/LangChain/LlamaIndex calls into OTel spans exportable to Langfuse, LangSmith, Phoenix, Datadog, or any OTLP (OpenTelemetry Protocol) collector. The safest choice for portability: instrument once, switch backends by changing an exporter URL.
Direction of travel: OTel's `gen_ai.*` semantic conventions are becoming the wire format; vendor SDKs increasingly both emit and ingest OTLP. Prefer OTel-compatible instrumentation for anything long-lived; reserve vendor SDKs for their value-add features (evals, prompt management).

### What to actually build

- **Trace everything from day one**: sampling can come later; you cannot debug an agent from logs. For deep agent trees, name spans by role (plan, retrieve, tool:<name>, judge) so waterfall views stay readable.
- **Eval-in-the-loop**: run LLM-judge and rule-based scorers on a sample of production traces (online evals), and turn interesting traces into dataset items for offline regression runs before prompt changes. The trace store doubling as an eval dataset source is the main argument for an integrated platform over plain OTel. Details in [Production eval engineering: gates, golden sets, statistics, gold-label auditing](../evaluation-and-llm-judges/production-eval-engineering.md).
- **Cost attribution**: capture token usage per generation, price it (platforms ship model price tables; override for negotiated rates), and roll up by user, feature, session via trace metadata. Doing this at the gateway (LiteLLM virtual keys, budgets per team) and at the trace level, then reconciling, catches both runaway agents and mispriced models.
- **Prompt registry**: version prompts outside code (Langfuse prompt management, LangSmith hub), reference by name + label (production/staging), and log which prompt version produced each generation so regressions are attributable. Treat prompt changes like deploys: eval gate first, then promote the label.

### Production reliability patterns

- **Structured output: validate and retry.** Never trust model JSON. Constrained decoding / native structured-output modes where available; otherwise validate against a Pydantic schema and on failure retry, feeding validation errors back to the model (Pydantic AI's `ModelRetry` and `instructor` both automate this loop). Cap retries at 2-3 and emit a metric on every retry: a rising retry rate is a prompt or model regression signal caught for free by tracing.
- **Fallbacks at the gateway.** Encode a fallback chain (primary -> same family smaller -> other provider) in LiteLLM config with cooldowns, timeouts, and retry policy, so the app never handles a 429/500 directly. Test fallback prompts too: the same prompt can behave differently across providers, so a fallback that has never been evaled is a silent quality cliff.
- **Timeouts and budget caps per agent run**: a max step count, max token spend, and wall-clock limit on every agentic loop; kill and surface partial results rather than looping forever. Alert on p95 steps-per-run drift.
- **Degrade explicitly**: when all fallbacks fail, return a typed error the product layer can render, and trace the failure with the same trace id so the incident is one query away.

### Cross-links

- Gateway layer that feeds tracing: LiteLLM in [Topic: agentic-frameworks](summary.md)
- Judge design for online evals: [LLM-as-judge: design, biases, calibration, reliability](../evaluation-and-llm-judges/llm-as-judge.md)
- LangSmith's home stack: [LangChain and LangGraph](langchain-and-langgraph.md)
