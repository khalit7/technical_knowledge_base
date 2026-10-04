# Notes on the five old child pages (fetched read only, 2026-10-04)

Verbatim fetches are in `children/`. These notes keep each page's facts in short form, marked as checked for the Reading tab:
**verified** (checked against a primary source, link given), **corrected** (the old text was wrong or stale; the fix given), **unconfirmed** (not checked, or no primary source found; kept as the old page's claim only). Most facts below are child-level depth: the root does not need to carry them, and the new child structure (proposed after Khalid approves the root) will own them. They are recorded here so nothing is lost.

## ML System Design: LLM and ML Services (3c65c17b0d0d8117b057dc2586836ec8), 12 min read, +24h 25m resources
- Four properties break the web playbook: heavy long-lived requests (seconds of GPU, streams for tens of seconds); capacity quantised in GPU replicas with multi-minute cold starts; nondeterministic outputs (correctness statistical); unit economics (cost per request "3 to 6 orders of magnitude above a CRUD call"). Verified in substance: decode is memory-bound (PagedAttention paper page, KB; H100 3.35 TB/s, nvidia.com); cold start in minutes is an order-of-magnitude estimate, **unconfirmed** as a figure; "3 to 6 orders" **unconfirmed** (Reading gives its own labelled arithmetic instead).
- Load balance on in-flight tokens or KV occupancy, least-outstanding-requests as the floor, KV-aware routing as the ceiling (SGLang router, llm-d, Dynamo). **Unconfirmed** here; belongs to Topic: inference-and-serving.
- Reference architecture: client, gateway, router, realtime pool or batch queue, engine (vLLM/SGLang), caches at every layer, metering off to the side. Used as the shape of the Reading's 10M picture (verified as a common pattern, not a single source).
- Gateway duties: auth, per-tenant rate limits, validation, idempotency keys, SSE passthrough, provider abstraction; open-source gateways LiteLLM, Envoy AI Gateway, Portkey, Kong AI Gateway. **Unconfirmed** list (product names, not checked).
- Router: tier routing (cheap model for easy queries), tenant pinning, region routing, failover; prefix-aware replica routing. Concept carried in Step 5; product claims **unconfirmed**.
- Batch vs realtime split; batch APIs "about 50%" price, 24 h window. **Unconfirmed** this round (vendor docs not fetched); not used in the Reading.
- Autoscale on queue depth, KV utilisation, in-flight requests, tokens/s, not CPU; KEDA, Knative; pre-pulled images, weights on NVMe or streamed, warm pools, predictive scaling. **Unconfirmed** (child depth).
- Caching layers: exact-match response cache, semantic cache (GPTCache pattern; dangerous for personalised answers; scope per tenant), prefix/KV reuse (RadixAttention, vLLM prefix caching, LMCache, Dynamo), provider prompt caching (explicit breakpoints at Anthropic, automatic at OpenAI), embedding/retrieval caches. Provider prompt caching **verified**: Anthropic "costs by up to 90% and latency by up to 85% for long prompts" (claude.com/blog/prompt-caching); OpenAI automatic, minimum 1,024 tokens for GPT-5.6 and later, stable content first (developers.openai.com/api/docs/guides/prompt-caching). vLLM automatic prefix caching docs exist (link checked).
- Rate limits on tokens per minute as well as requests; token bucket per tenant per model; quota vs rate limit; 429 with Retry-After. 429 **verified** (RFC 6585 §4); token bucket **verified** (Stripe, "Scaling your API with rate limiters"); rest **unconfirmed** detail.
- Multi-tenancy: weighted fair queueing, provisioned throughput, dedicated replicas; cost attribution via usage events into an OLAP store. **Unconfirmed** (child depth).
- Rollout: offline evals, shadow, canary 1/5/25/100%, pin model and prompt versions. Owned now by the migrated page Production eval engineering (KB), linked from the Reading.
- Failure modes: failover, load shedding by priority, never queue unboundedly in front of a GPU (metastable failure), degradation ladder (full model, cheaper model, RAG off, cached answer, honest error), per-hop deadlines, retry only idempotent calls, LLM-specific partial failures. Load shedding and metastable failure **verified** (Builders' Library, Yanacek; Bronson et al., HotOS 2021).
- Interview structure: requirements, metrics, data, model, serving, monitoring. Carried in Step 6 (general design method; the ML variant noted).

## Distributed Systems Basics (3c65c17b0d0d8115bc45c31d915b4d33), 11 min read, +18h 55m resources
- DDIA 2nd edition, Kleppmann and Riccomini, O'Reilly, March 2026. **Verified** (martin.kleppmann.com).
- CAP: during a partition choose availability or consistency; when healthy, latency vs consistency (PACELC). **Verified** (Gilbert and Lynch 2002; Abadi 2012).
- Consistency spectrum: linearizable, sequential/causal, eventual; serializable is isolation, strict serializable both. **Verified** against the Jepsen consistency map (jepsen.io/consistency). "Causal+ is the sweet spot for geo-replicated data" is an opinion, **unconfirmed**.
- Idempotency definitions; idempotency key stored with result and replayed (Stripe pattern). **Verified** (RFC 9110 §9.2.2; Stripe blog, Brandur Leach, 2017-02-22; Builders' Library, Featonby: same token with different parameters returns a validation error).
- Unbounded queue turns overload into latency then metastable collapse; bound queues; backpressure; load shedding. **Verified** (Yanacek, "Avoiding insurmountable queue backlogs"; Bronson et al.).
- Retries: exponential backoff with jitter, full jitter the usual winner, capped attempts, retry budgets (~10%), retry at one layer. Full jitter **verified** (Brooker, AWS Architecture Blog, 2015-03-04); layer multiplication **verified** (Brooker, Builders' Library: 243x for five layers of three tries); token-bucket retry limiting **verified** (same essay); "~10%" figure **unconfirmed**.
- Dead-letter queues. Concept standard; **unconfirmed** as a sourced claim (not needed).
- Delivery semantics: at-most-once, at-least-once (default), exactly-once processing = at-least-once plus dedup; Two Generals. **Verified** in substance (DDIA; Kafka docs not fetched).
- Leader election, Raft, leases, fencing tokens. **Unconfirmed** this round; child depth.
- Database classes table: OLTP, OLAP, KV/wide-column, vector; "start with Postgres + S3 + Redis". **Unconfirmed** as advice; Topic: databases owns it.
- Event-driven: outbox, event sourcing, CQRS. **Unconfirmed**; child depth.
- Numbers: ~1 ms same-AZ RTT, 50 to 150 ms cross-region, SSD read ~100 us, fsync ~1 ms, Redis op 100 us to 1 ms, Postgres single-row read ~1 ms, Kafka partition 10s of MB/s. Owned by the Numbers to know tab (src/num); **unconfirmed** here.

## Testing and Quality for ML Systems (3c65c17b0d0d81548848e2ebdd2f63ee), 10 min read, +3h 40m resources
- Three objects to test: code, data, model. Framing **unconfirmed** as sourced (Eugene Yan's essay is the cited inspiration; not fetched).
- Unit tests for transforms, tiny fixtures, invariants, edge inputs, pure functions. Advice; **unconfirmed** (not a factual claim).
- Hypothesis property-based testing; ML properties. Hypothesis docs exist (not fetched).
- Regression suites, CheckList behavioural tests, slicing, prompts as code; merge gate. Overlaps the migrated Production eval engineering page.
- Contract tests for LLM outputs: pydantic, structured outputs, repair loop. **Unconfirmed**.
- CI for ML: ruff, mypy, pytest tiers, GPU CI, training smoke test. **Unconfirmed**.
- Nous Research refactor: 1,393 subagents, ~19 active hours, million-line repo, non-test source cut 34.4%, ~$19,300; review caught removed public APIs. **Unconfirmed** this round (link not fetched); not used in the root.
- General test taste: behaviour through public interface, flakiness is a defect, coverage a floor detector. Advice.
- None of this is in the Reading (testing is out of the six-step spine); it stays with its child and is listed in Further reading.

## API and Code Design (3c65c17b0d0d8190ade6c34e8f653e79), 11 min read, +9h 15m resources
- Versioning, Stripe dated versions with transforms; additive changes non-breaking; tolerant reader. **Unconfirmed** this round (Stripe versioning blog not fetched).
- Cursor pagination over offset; keyset in SQL. **Unconfirmed** (standard).
- Idempotency-Key header on mutating endpoints; conflict on same key with different payload. **Verified** in substance (Builders' Library, Featonby: validation error on parameter mismatch). Used in Step 4.
- Error taxonomy, RFC 9457 problem+json. **Unconfirmed** (RFC exists; not fetched).
- Webhooks: sign, at-least-once, dedupe, no ordering, thin events. **Unconfirmed**.
- Python library design, pydantic at boundaries, Hyrum's law; code review (Google eng-practices); rule of three; abstraction economics. **Unconfirmed**; craft, not system design.

## AI Engineering Skills Map (Andrew Ng, 2026) (3cd5c17b0d0d81b99dd3d1eb12ed5fe0), 5 min read, +10 min resources
- Ng's argument: fundamentals are "steering knowledge"; five pillars (full-stack, managing data, system architectures, secure and reliable, scaling and operating). **Unconfirmed** (x.com post not fetchable without login).
- KB gaps flagged: front-end proper and conventional application security. Opinion of the page.
- Ordering advice: data modelling first, failure design second. Opinion; echoed in the Reading's "how a senior engineer reasons" without attribution to Ng.
- Sean Goedecke, "You have to beat the models at something". Not fetched.
