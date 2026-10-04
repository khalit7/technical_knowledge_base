Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d81048ae0dd14ac399b4d as of 2026-09-23T08:48:14.273Z:
<page url="https://app.notion.com/p/3c65c17b0d0d81048ae0dd14ac399b4d" icon="📐">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-2-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Topic: swe-and-system-design"}
</properties>
<iconMetadata>{"type":"emoji","emoji":"📐"}</iconMetadata>
<content>
# Video
A narrated 7-minute explainer derived from this page. The page stays canonical: the video is a derived representation, and every figure it states comes from here.
<video src="https://prod-files-secure.s3.us-west-2.amazonaws.com/13e79c56-ebab-4528-83aa-967a204b1f04/38625d0c-6d27-4e5d-9503-b373a7a10889/topic_swe_and_system_design_overview.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466Q76ZOUMW%2F20261004%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261004T180843Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEAEaCXVzLXdlc3QtMiJHMEUCIQDw2s%2F0DfkRHV2UQqPrypzQLe5cktpP93Ppg%2B9Eeeg6iwIgBHME8uDChY9xNB6nvPZF%2BAer6lT8I0jz8CEzfM98OjMqiAQIyv%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw2Mzc0MjMxODM4MDUiDE6dKKWFUixhmh46PircA3EqsnM1fs%2B6txTTciaDSU69llMU6Xj2dpKF8vHA3%2Bemkq5z8iYLKA8Ghm2lTkKOfa8u4phgbCvLzO%2Faqe%2F12HIxfhz9JP8dVW78fq31Wj0%2F%2F0y65D5EbxlMO8YcixzKBuP3fS8H5eUf0%2FX5zsYKRbP0SIQD2djBq83XazC90efITqi6ER0Jf7jtZoRLGs532C7AZHUQHxnJhQMxN7hQA1OtN198CFlRulUSwIgiX7lmUBItB%2BbzXwNR7j9jwzPLzCp1xA5IpH0BVgxi5GHXn%2Fpxjk3soeEH2xmlWbpiu03IhQ5b%2FGXUAnjR3bpyIXUDpatyyJbuBAZgAIT1hlKUoL33sE7aAPCRbju65yHUt8g8sNTdEuJXj%2BjMr7xmh0DbzTeSHnWNZkO2BhtWBQQ0U53l8SkKRRNz%2FyJEMS8jXfcTvD8kkxQsJ%2FBSTSGqJEWcX4s9fTifTV3l0SMvgVrysyBQocHw4ofdCw5BQs2FUgcqJ5i2Nwn5v6HZw9WKmTxPH4OdU3DFktdOc4PKE5S60t%2FhYYjZJFurto13uJi7Vbl8m0v5vgDY1%2FXOq9iquNIgoQ8CPGwGsERQFO15u8vcoabWTiR5LM7jWiMgLe%2FMkld9iipF6rOYaTI%2Bw%2FJ3MJ6IitYGOqUB5iAQxYO1HkNhnZFe4TFZNhtkkbcy3k%2Fq0CTG6GhLaiRiXCYvUaamM64L3rYkwpZLnAmxkBce2EDCGrrW2ISuq%2FVp5VlWzVHQVhmp6lCbsFQ8d0zBAXiOnaCyvtiW%2FKPQZAgIQsJ%2FMNv6xRSYAWO4ijByEYEts5Lrs8Tzp8WN%2BfRzW3pEth1q1VjNRAhx3OcEtnGetQvFqyzXEq7nGfT6nMosRt3T&X-Amz-Signature=01d95f5efa9ca1956e24095475da969365b4d66ec8ff748adbcb3f670f8c8d44&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.3e45c17b-0d0d-814e-91fd-fb87d06f73e0.13e79c56-ebab-4528-83aa-967a204b1f04">Topic: swe-and-system-design: where a model bends ordinary engineering</video>
⏱ 6 min read · +44h resources
The engineering substrate under every ML service. Three pillars: **system design**
(general distributed systems plus the ML-specific serving layer), **software craft**
(testing, API design, code quality), and **systems fundamentals** (OS, networking,
databases; OSTEP territory). For an ML engineer they compose in one direction: the
fundamentals bound what a design can promise, the design shapes what code you write,
and the craft determines whether the whole thing survives contact with production.
```mermaid
graph TD
    A[SWE + system design] --> B[System design]
    A --> C[Software craft]
    A --> D[Systems fundamentals]

    B --> B1[General distributed systems<br/>CAP, queues, retries, idempotency]
    B --> B2[ML-specific design<br/>gateways, GPU autoscaling, caching]
    B --> B3[Interview structure<br/>requirements to monitoring]

    C --> C1[Testing<br/>unit, property-based, regression, contract]
    C --> C2[API design<br/>versioning, pagination, errors, webhooks]
    C --> C3[Code quality<br/>review taste, abstraction economics]

    D --> D1[OS<br/>OSTEP: processes, memory, IO]
    D --> D2[Networking<br/>HTTP, gRPC, SSE, webhooks]
    D --> D3[Databases<br/>OLTP vs OLAP vs KV vs vector]

    B1 --> E[ML service in production]
    B2 --> E
    C1 --> E
    C2 --> E
    D3 --> E
```
## The map, briefly
**System design.** Two layers. The general layer is classic distributed systems:
consistency models, idempotency, backpressure, delivery semantics, database
selection. The ML layer sits on top and adds what makes model serving different from
CRUD: requests are expensive and long-lived (seconds of GPU time, streaming
responses), capacity is quantized in GPUs rather than fluid vCPUs, outputs are
nondeterministic so correctness is statistical, and cost per request is high enough
that caching, routing, and quota design dominate the architecture.
**Software craft.** Testing ML systems means testing three different things: code
(deterministic, unit-testable), data (schema and distribution checks), and model
behaviour (regression suites, LLM contract tests). API and library design is where
production experience shows: versioning discipline, idempotency keys, typed pydantic
contracts, and knowing when an abstraction earns its keep.
**Systems fundamentals.** Already largely covered elsewhere in this KB: OSTEP for OS, <mention-page url="https://app.notion.com/p/3c65c17b0d0d81ec9355f4eecd6eed02"/> for networking, and the database taxonomy in <mention-page url="https://app.notion.com/p/3c65c17b0d0d8115bc45c31d915b4d33">Distributed Systems Basics</mention-page> and <mention-page url="https://app.notion.com/p/3cd5c17b0d0d815d8841ec845f5f3324"/>.
The fundamentals matter in interviews mostly as justification: you defend a design
choice by naming the bottleneck (fsync latency, TCP slow start, page cache, GPU
memory bandwidth) rather than by pattern-matching.
The same order runs the other way in production: when a service misbehaves, the
layer below the one you are looking at is usually where the explanation is.
## What the named ideas actually are
Each term is defined where it is used: CAP and consistency models, idempotency, backpressure, delivery semantics and database selection in <mention-page url="https://app.notion.com/p/3c65c17b0d0d8115bc45c31d915b4d33">Distributed Systems Basics</mention-page>; property-based testing, model regression suites and LLM contract tests in <mention-page url="https://app.notion.com/p/3c65c17b0d0d81548848e2ebdd2f63ee">Testing and Quality for ML Systems</mention-page>; pydantic contracts, API versioning discipline and idempotency keys in <mention-page url="https://app.notion.com/p/3c65c17b0d0d8190ade6c34e8f653e79">API and Code Design</mention-page>. Two that no deep dive owns:
**OSTEP.** Operating Systems: Three Easy Pieces, the free Wisconsin textbook organised around virtualisation, concurrency and persistence. It is the reference for the OS layer of the fundamentals, and it earns the time because its three-way split reappears in GPU serving almost directly: address spaces and paging map onto KV cache block management, and scheduling onto continuous batching.
**The bottlenecks worth being able to name.** **fsync latency**, roughly a millisecond, is what a durable write costs when it must actually reach stable storage, and it caps write throughput per transaction. **TCP slow start** is the congestion window ramping up from small on a new connection, which is why short-lived connections underuse the link and why connection reuse and HTTP/2 multiplexing pay. The **page cache** is the OS holding recently used file pages in RAM, which is why a "disk read" is often free and why memory pressure surfaces as unexplained IO. **GPU memory bandwidth** is the ceiling on decode throughput, because generating one token reads the whole weight set once and is memory-bound rather than compute-bound, which is the physical fact behind continuous batching, KV cache design, and quantisation.
## How they compose for an ML engineer
A representative production question: "serve an LLM feature to 10k tenants."
The answer walks all three pillars in order:
1. **Fundamentals** set the physics: one 70B model replica needs N GPUs, holds M concurrent KV caches, and cold-starts in minutes not milliseconds.
2. **General design** handles the traffic: gateway, queue with backpressure, retries with jitter and idempotency keys, per-tenant rate limits, OLTP store for state and OLAP store for usage analytics.
3. **ML design** handles the model: routing across model tiers, semantic and prefix caching, batch vs realtime split, shadow deployment for the new checkpoint, degradation ladder for when the GPU pool saturates.
4. **Craft** keeps it alive: contract tests on model outputs, regression evals in CI, API versioning so tenants survive the model swap.
That walk is also, almost verbatim, the ML system design interview.
## Deep dives
<table header-row="true">
<tr>
<td>Page</td>
<td>What it covers</td>
</tr>
<tr>
<td><mention-page url="https://app.notion.com/p/3c65c17b0d0d8117b057dc2586836ec8">ML System Design: LLM and ML Services</mention-page> (12 min read · +24h 25m resources)</td>
<td>Designing LLM/ML services end to end: gateways, batch vs realtime, GPU autoscaling, caching, rate limiting, multi-tenancy, progressive rollout, failure modes; the interview structure</td>
</tr>
<tr>
<td><mention-page url="https://app.notion.com/p/3c65c17b0d0d8115bc45c31d915b4d33">Distributed Systems Basics</mention-page> (11 min read · +18h 55m resources)</td>
<td>CAP and consistency models, idempotency, queues and backpressure, retries, delivery semantics, leader election, database taxonomy, event-driven architecture; DDIA as anchor</td>
</tr>
<tr>
<td><mention-page url="https://app.notion.com/p/3c65c17b0d0d81548848e2ebdd2f63ee">Testing and Quality for ML Systems</mention-page> (10 min read · +3h 40m resources)</td>
<td>Testing ML systems: data transform units, property-based testing with Hypothesis, model regression suites, LLM contract tests, CI gates, GPU CI, general test taste</td>
</tr>
<tr>
<td><mention-page url="https://app.notion.com/p/3c65c17b0d0d8190ade6c34e8f653e79">API and Code Design</mention-page> (11 min read · +9h 15m resources)</td>
<td>API design (versioning, pagination, idempotency keys, errors, webhooks), Python library design, code review taste, when abstraction pays</td>
</tr>
</table>
Also under this topic, outside the table above: the <mention-page url="https://app.notion.com/p/3cd5c17b0d0d81b99dd3d1eb12ed5fe0">AI Engineering Skills Map: software engineering fundamentals (Andrew Ng, 2026)</mention-page> (5 min read · +10 min resources), which maps Andrew Ng's five software-fundamentals pillars onto where this KB covers each one and flags the two gaps (front-end proper, and conventional application security).
## Related topics
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81ec9355f4eecd6eed02"/>: HTTP, gRPC, SSE, webhooks; the wire formats these designs run on
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81c08b3bc95ff45c7b13"/>: the engine layer below the service layer designed here
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b5925bfd1d8665dd4b"/>: Kubernetes, Terraform, monitoring; how these designs get deployed
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8181b351e1b8fc6a1546"/>: the eval harnesses that back model regression testing
- <mention-page url="https://app.notion.com/p/3cd5c17b0d0d815d8841ec845f5f3324"/>: the storage layer these designs sit on, the database families compared directly, and caching (every layer from CPU to CDN, plus the LLM caches) as a deep dive under it
## Best resources (topic-wide)
- [Designing Data-Intensive Applications, 2nd ed.](https://dataintensive.net/) (book, \~15h): Kleppmann and Riccomini, O'Reilly, March 2026; the anchor book for the whole topic
- [The System Design Primer](https://github.com/donnemartin/system-design-primer) (repo, \~2h for the core sections): 366k-star GitHub repo; the standard general system design interview prep
- [AI Engineering](https://huyenchip.com/books/) (book, \~13h): Chip Huyen, O'Reilly 2025; the ML-specific serving and evaluation layer
- [Amazon Builders' Library](https://aws.amazon.com/builders-library/) (essay collection, \~2h for the core essays): short, battle-tested essays on retries, timeouts, backpressure, deployment safety
- [Google SRE Book](https://sre.google/sre-book/table-of-contents/) (book, \~12h; \~1h for ch. 4 and 22 alone): SLOs, error budgets, and the operational vocabulary interviews expect
<page url="https://app.notion.com/p/3c65c17b0d0d8117b057dc2586836ec8">ML System Design: LLM and ML Services</page>
<page url="https://app.notion.com/p/3c65c17b0d0d8115bc45c31d915b4d33">Distributed Systems Basics</page>
<page url="https://app.notion.com/p/3c65c17b0d0d81548848e2ebdd2f63ee">Testing and Quality for ML Systems</page>
<page url="https://app.notion.com/p/3c65c17b0d0d8190ade6c34e8f653e79">API and Code Design</page>
<page url="https://app.notion.com/p/3cd5c17b0d0d81b99dd3d1eb12ed5fe0">AI Engineering Skills Map: software engineering fundamentals (Andrew Ng, 2026)</page>
</content>
</page>