# ML System Design: LLM and ML Services

⏱ 12 min read · +24h 25m resources

Last updated: 2026-08-24

### Best resources

- [AI Engineering](https://huyenchip.com/books/) (book, ~13h): Chip Huyen, O'Reilly 2025; the current best single book on serving foundation models, covering routing, caching, evaluation, and cost end to end
- [Machine Learning Systems Design booklet](https://huyenchip.com/machine-learning-systems-design/toc.html) (~1h 30m): Chip Huyen, free; the canonical interview framing (project setup, data, modelling, serving)
- [Machine Learning System Design Interview](https://bytebytego.com/intro/machine-learning-system-design-interview) (book, ~7h 30m): Aminian and Xu; worked interview cases with the standard structure, pair with Huyen
- [Amazon Builders' Library: Timeouts, retries and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter) (~25 min): the retry discipline every gateway needs
- [Google SRE Book, ch. 4 (SLOs) and ch. 22 (cascading failures)](https://sre.google/sre-book/table-of-contents/) (~1h for those two chapters): degradation and overload patterns that transfer directly to GPU services
- vLLM production stack and llm-d docs (docs, ~1h for the core pages) (see [Topic: inference-and-serving](../inference-and-serving/summary.md)): what the routing layer actually looks like in 2026

### What makes ML serving different

Four properties break the standard web service playbook:

1. **Requests are heavy and long-lived.** An LLM call burns seconds of GPU time and streams for tens of seconds. Connection-count load balancing fails; you balance on in-flight tokens or KV cache occupancy instead (least-outstanding-requests is the floor, KV-aware routing the ceiling).
2. **Capacity is quantized.** You scale in units of GPU replicas with multi-minute cold starts (image pull, weight load, warmup). No scale-to-zero reflexes from serverless CPU land apply.
3. **Outputs are nondeterministic.** Correctness is statistical, so rollout safety comes from evals and shadow traffic, not from unit tests passing.
4. **Unit economics dominate.** Per-request cost is 3-6 orders of magnitude above a CRUD call, so caching, routing to cheaper models, and quota design are architecture, not optimisation.

### The reference architecture

Client -> **gateway** -> **router** -> (realtime pool | batch queue) -> engine (vLLM/SGLang) -> model, with caches at every layer and a metering pipeline off to the side.

**Gateway.** AuthN/Z, per-tenant rate limiting, request validation, idempotency keys, streaming passthrough (SSE), and provider abstraction (one OpenAI-compatible surface over many backends). Open-source gateways: LiteLLM, Envoy AI Gateway, Portkey, Kong AI Gateway. The gateway is also where you record usage events for billing.

**Router.** Decides which model serves the request: tier routing (cheap model for easy queries, frontier for hard ones, via a classifier or heuristics), tenant pinning, region/compliance routing, and failover across providers. Below that, replica-level routing should be cache-aware: send requests sharing a prefix to the replica that already holds the KV blocks (SGLang router, llm-d, Dynamo all do this).

**Batch vs realtime.** Split at the gateway. Realtime: interactive, streaming, tight p99 targets, priority access to capacity. Batch: embeddings backfills, evals, synthetic data, doc pipelines; queue-driven, throughput-optimised (maximise tokens/s per GPU, no latency SLO), run on spot capacity or off-peak, priced at ~50% (the OpenAI/Anthropic batch API pattern: submit a file, poll, 24h window). A common third lane: priority tiers within realtime (flex/standard/priority processing).

**Autoscaling GPU services.** Scale signals that work: queue depth, KV cache utilisation, in-flight requests per replica, token throughput; not CPU. KEDA or custom controllers on Kubernetes; concurrency-based autoscaling in Knative-style platforms. Handle cold starts explicitly: pre-pulled images, weights on local NVMe or streamed (Run:ai model streamer, safetensors + GDS), warm pools, and predictive scaling on daily traffic curves. Overprovision headroom is a cost/SLO dial, not a failure of planning.

### Caching layers

Ordered by where they sit:

- **Exact-match response cache**: hash(model, prompt, params) -> response. Cheap, low hit rate outside repeated system prompts and dedup of retries.
- **Semantic cache**: embed the query, ANN-search past queries, serve the cached answer above a similarity threshold (GPTCache pattern). High leverage for FAQ-like traffic; dangerous for personalised or time-sensitive answers; treat threshold tuning as an eval problem and scope caches per tenant.
- **Prefix/KV cache reuse**: inside and across engine replicas; shared system prompts and few-shot preambles are computed once (RadixAttention, vLLM prefix caching, KV offload to CPU/storage tiers via LMCache or Dynamo). Design prompts so static content is a true prefix (stable ordering, dynamic content last).
- **Provider-side prompt caching**: explicit cache-control breakpoints (Anthropic) or automatic (OpenAI); changes your prompt-assembly code and your cost model.
- **Embedding/retrieval caches** for RAG pipelines.

### Rate limiting, quota, multi-tenancy

- Limit on **tokens per minute** as well as requests per minute: TPM is what maps to GPU capacity. Token bucket per tenant per model; concurrency caps for streaming.
- **Quota** is the billing-period budget (monthly token allowance); rate limits are instantaneous. Enforce both at the gateway; degrade to 429 with Retry-After.
- **Multi-tenancy models**: shared pool with fair scheduling (weighted fair queueing over tenants to stop one tenant starving others), reserved capacity (provisioned throughput, the Bedrock/Azure pattern), or dedicated replicas for the whale tenants.
- **Cost attribution**: emit a usage event per request (tenant, model, input/output/cached tokens, latency) into a stream -> OLAP store (ClickHouse etc.); price input, output, and cached tokens differently. Showback dashboards per team stop the "who spent the GPU budget" fight before it starts.

### Rollout: shadow, canary, progressive

Model changes (new checkpoint, new prompt, new provider) ship like risky code deploys but with statistical acceptance criteria:

1. **Offline evals** gate the candidate (regression suite, see [Testing and Quality for ML Systems](testing-and-quality.md)).
2. **Shadow deployment**: mirror live traffic to the candidate, discard its responses, compare quality (LLM-judge or metric diffs), latency, and cost against the incumbent. Catches distribution shift that offline evals miss; costs double compute on shadowed traffic, so sample.
3. **Canary / progressive rollout**: 1% -> 5% -> 25% -> 100% keyed on request ID or tenant, with automated rollback on metric regression. Interleaved or A/B evaluation where a human/judge preference signal exists.
4. **Pin and version everything**: model ID, prompt version, and params live in config with the rollout state, so rollback is a config flip, not a deploy.

### Failure modes and graceful degradation

- **Provider/pool outage**: failover routing to a second provider or region; keep a smaller self-hosted model as the deep fallback.
- **Overload**: load shedding by priority tier (drop batch first, then free-tier realtime), admission control at the queue, backpressure to clients via 429 + Retry-After. Never queue unboundedly in front of a GPU; queues hide, then amplify, overload (metastable failure).
- **Degradation ladder**: full model -> cheaper model -> truncated context/RAG-off -> cached/templated response -> honest error. Decide the ladder in design review, not during the incident.
- **Timeouts**: per-hop deadlines with jitter on retries; only retry idempotent calls, and cap retries so a brownout does not become a retry storm.
- **Partial failures specific to LLMs**: mid-stream disconnects (resume vs restart), malformed structured output (validate + one retry with error feedback), context overflow (truncation policy), guardrail trips (safe fallback response).

### The interview structure

The classic ML system design loop expects roughly this walk, spending real time on each block and quantifying wherever possible:

1. **Requirements**: users, scale (QPS, tokens/s), latency targets (p50/p99, TTFT vs full-response), cost envelope, online vs batch, personalisation, compliance. Clarify before designing; state assumptions out loud.
2. **Metrics**: offline (task metrics, eval-suite scores) and online (CTR, task completion, thumbs-up rate, escalation rate), plus system SLOs (availability, TTFT, tokens/s) and guardrail metrics (cost/request, safety violation rate).
3. **Data**: sources, labelling or feedback loops, freshness, feature/embedding pipelines, train/serve skew prevention, privacy boundaries.
4. **Model**: build vs API, model tier and size, fine-tune vs prompt vs RAG, context strategy; justify against the latency and cost budget from step 1.
5. **Serving**: the reference architecture above; batching, caching, autoscaling, multi-region; do the capacity math (tokens/s per GPU x replicas vs demand).
6. **Monitoring and iteration**: drift and quality dashboards, online evals, feedback capture, shadow/canary loop for the next model version, cost tracking.
Interviewers at frontier labs increasingly swap steps 3-4 for LLM-native depth: expect follow-ups on KV cache math, prefill/decode disaggregation, and what breaks at 10x scale. The differentiator is quantified trade-offs, not component name-drops.
