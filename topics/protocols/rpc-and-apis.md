# RPC and API styles: REST, gRPC, GraphQL

⏱ 12 min read · +6h 45m resources

Updated 2026-09-21 (doubled "REST in practice" coverage merged into REST as practiced; acronyms expanded on first use).

### Best resources

- [gRPC docs: core concepts](https://grpc.io/docs/what-is-grpc/core-concepts/) (30 min) and [Protocol Buffers guide](https://protobuf.dev/programming-guides/proto3/) (50 min): primary sources, well written.
- [Google API Improvement Proposals (AIPs)](https://google.aip.dev/) (docs, ~2h for the core AIPs): the most rigorous public catalog of resource-oriented API design decisions (naming, pagination, long-running operations, errors).
- [Stripe API reference](https://docs.stripe.com/api) (docs, ~1h for the core resources) plus their [idempotency post](https://stripe.com/blog/idempotency) (15 min): the de facto REST style guide by example (expansion, pagination, versioning).
- [Richardson Maturity Model (Fowler)](https://martinfowler.com/articles/richardsonMaturityModel.html) (15 min): the classic framing of "how RESTful".
- [gRPC performance best practices](https://grpc.io/docs/guides/performance/) (15 min) and [deadlines guide](https://grpc.io/docs/guides/deadlines/) (10 min): what actually bites in production.
- [GraphQL docs](https://graphql.org/learn/) (docs, ~1h 30m for the learn track): sufficient for the working knowledge an ML engineer needs.

### REST

#### What REST actually is

REST (Representational State Transfer) is not a protocol or a spec: it is an architectural style Roy Fielding distilled in chapter 5 of his 2000 PhD thesis to explain why the web scaled. The constraints:

- **Resources, not functions**: anything nameable gets a stable identifier (URI); you never "call an endpoint's function", you transfer representations of a resource.
- **Representations**: the client holds a representation of resource state (JSON, HTML); state changes by transferring new representations (PUT a new version of the resource).
- **Uniform interface**: a small fixed verb set with universal semantics (GET is safe and cacheable, PUT/DELETE are idempotent, POST is neither) instead of a per-API method vocabulary. This is the deepest difference from RPC styles.
- **Statelessness**: every request carries all context (auth, cursors); no server-side session. This is what makes horizontal scaling and shared caching work.
- **Cacheability and layered system**: intermediaries can cache and route because the request semantics are visible in the method and headers.
- **HATEOAS** (hypermedia as the engine of application state): responses carry links to the next possible actions, so clients navigate rather than hardcode URL structures. The least-followed constraint; the human web (HTML links and forms) is its only mass deployment.

#### REST as practiced

REST as practiced = resource-oriented HTTP + JSON, not Fielding-complete REST; "HTTP API" is the honest term when someone is being pedantic. The Richardson maturity ladder: L0 (one POST endpoint, RPC-in-JSON), L1 (resources with URLs), L2 (HTTP verbs + status codes used correctly: where almost everyone sensibly stops), L3 (HATEOAS hypermedia links: rare outside academia). Aim for honest L2: nouns for resources, verbs from HTTP, correct status codes, idempotent PUT/DELETE, `:verb` custom-action escape hatch for the genuinely non-CRUD (Google AIP-136 style, e.g. `POST /models/m1:deploy`).

Patterns that separate good APIs from bad:

- **Pagination**: cursor-based (`page_token`/`next_cursor`) over offset-based (offsets skew under concurrent writes and get slow deep in the list). Return an opaque cursor plus `has_more`. Every list endpoint paginates from day one; retrofitting breaks clients.
- **Idempotency**: `Idempotency-Key` header on POSTs; server stores key + first response, replays on retry, errors on same-key-different-body. Essential for payment-like and inference-cost-like operations. See [HTTP: 1.1, 2, 3, and what matters for LLM services](http.md).
- **Versioning**: URL major versions (`/v1/`) are the pragmatic default; header/date-based versioning (Stripe's per-account API version pinning) is the deluxe option. Rules that matter more than the mechanism: additive changes are non-breaking (clients must tolerate unknown fields), removals/renames/type changes are breaking, and you need a deprecation policy with dates. Anthropic's `anthropic-version` header is date-based versioning.
- **Errors**: machine-readable error envelope (`type`/`code`, `message`, request ID); RFC 9457 `application/problem+json` is the standard shape if you want one.
- **Long-running operations**: `202 Accepted` + operation resource to poll (`GET /operations/{id}`), or webhook on completion. Google AIP-151 long-running operation (LRO) pattern; SageMaker Async Inference and LLM batch APIs are this.

### gRPC

RPC framework over HTTP/2: you define services and messages in **protobuf** (`.proto`), codegen strongly-typed clients/servers for ~a dozen languages, and get an efficient binary wire format (field numbers, varints; unknown fields ignored, which is what makes schema evolution safe: never reuse or renumber field numbers, use `reserved`).

- **Four streaming modes**: unary, server-streaming (model streams predictions), client-streaming (upload audio chunks), bidirectional streaming (realtime pipelines). All ride HTTP/2 streams on one connection.
- **Deadlines, not timeouts**: caller sets an absolute deadline that propagates across hops in metadata; every service in the chain can check `context` and abort work already past its deadline. Make deadline propagation a habit; it prevents wasted GPU time on abandoned requests.
- **Status codes**: its own set (`UNAVAILABLE`, `DEADLINE_EXCEEDED`, `RESOURCE_EXHAUSTED`, `INVALID_ARGUMENT`...); retry policy is per-code and configurable in service config; only `UNAVAILABLE`-class errors are safely retryable by default.
- **Load balancing gotcha**: a gRPC channel is one long-lived HTTP/2 connection, so a layer-4 (L4) load balancer pins all traffic to one backend. You need layer-7 (L7)/gRPC-aware balancing (Envoy, ALB gRPC mode, service mesh) or client-side LB (xDS, `round_robin` over resolved endpoints). This is the number-one gRPC production surprise.
- Extras: interceptors (auth, logging), TLS/mTLS native, `grpc-web`/Connect for browsers (browsers cannot speak raw gRPC), server reflection, health-checking protocol.
- When: internal service-to-service where you control both ends, polyglot fleets, high-QPS (queries per second) or streaming links, tight latency budgets. When not: public APIs for arbitrary clients, browser-first apps, teams without proto tooling appetite.

### tRPC, and its relation to gRPC

Despite the name, tRPC has no relationship to gRPC beyond both being RPC: no protobuf, no HTTP/2 streams, no codegen, no shared lineage. The "t" is TypeScript.

- **What it is**: end-to-end typesafe RPC for TypeScript monorepos. The server defines procedures (`query` / `mutation` / `subscription`) in plain TS, usually with zod input validators; the client imports the router's *type* and gets fully typed, autocompleted calls. No schema files, no code generation: the TypeScript compiler is the contract.
- **On the wire** it is ordinary HTTP/JSON (batched GETs/POSTs; subscriptions ride SSE or WebSockets), so there is nothing protocol-novel: the innovation is entirely in the type-level developer experience.
- **The catch**: the contract exists only at compile time and only in TypeScript. Client and server must live in one codebase and deploy roughly together; there is no language-neutral artifact another team or language can consume.

|  | tRPC | gRPC |
| --- | --- | --- |
| Contract | TS types, compile time | `.proto` schema, wire-enforced |
| Codegen | none | required, ~a dozen languages |
| Consumers | your own TS frontend | arbitrary polyglot services |
| Wire | JSON over HTTP/1.1+ | protobuf over HTTP/2 |
| Streaming | subscriptions (SSE/WS) | native 4-mode HTTP/2 streaming |
| Evolution | refactor the monorepo | field-number rules, `reserved` |

When: tRPC for TS full-stack apps (the Next.js world) where the frontend is the only client; gRPC for internal polyglot service-to-service. If a system needs both, put REST or gRPC at the public boundary and keep tRPC as internal frontend glue. ML relevance is thin: you meet tRPC in the TS dashboards of ML products, not in serving infra.

### GraphQL (briefly)

Client-specified queries over a typed schema; one endpoint; resolvers stitch backends. Solves over/under-fetching and mobile round-trips; costs: caching is hard (everything is a POST), N+1 resolver amplification (dataloaders), query-cost limiting needed to avoid DoS, and the schema layer is real work. Sweet spot: product APIs with many heterogeneous UI clients (GitHub's public API). Rarely the right choice for ML serving; you will mostly *consume* it (e.g. GitHub GraphQL for tooling).

### Where each shows up in ML serving

- **gRPC**: the internal lingua franca of inference infra. NVIDIA **Triton** exposes HTTP and gRPC endpoints (KServe v2 predict protocol; gRPC preferred for tensors, streaming, and lower overhead). **Ray**/Ray Serve internals, TF Serving, vector DBs (Qdrant, Milvus), and OpenTelemetry export (OTLP) all speak gRPC. Tensor payloads in protobuf beat base64-in-JSON by a wide margin.
- **REST + SSE**: the external face of LLM APIs (Anthropic, OpenAI: resource-ish REST, POST for inference, SSE for streaming, date/header versioning, idempotency and rate-limit headers). Simple, curl-able, works from every client.
- **Mixed pattern**: public REST façade, gRPC behind the gateway (Envoy/ALB transcoding or a thin proxy). vLLM and SGLang serve OpenAI-compatible REST because ecosystem compatibility beats wire efficiency at the edge.
- **AWS specifics**: SageMaker real-time endpoints are HTTPS/JSON (or your container's protocol behind `/invocations`); API Gateway supports REST and WebSocket but not gRPC; ALB does gRPC. Lambda is request/response JSON: gRPC servers do not fit Lambda; use Fargate/EKS for gRPC services.
- **A2A/MCP**: agent protocols chose JSON-RPC over HTTP (+SSE) rather than gRPC, prioritizing web-native reach over binary efficiency; see [Model Context Protocol (MCP)](mcp.md) and [Topic: protocols](summary.md).

### Choosing, quickly

- Public API, unknown clients: REST (L2) + SSE where streaming.
- Internal, both ends yours, performance or streaming matters: gRPC.
- Many UI clients aggregating many backends: GraphQL, if you accept the operational tax.
- Agent-to-tool or agent-to-agent: MCP / A2A (JSON-RPC), not a bespoke REST API, if an LLM is the consumer.
See also: [HTTP: 1.1, 2, 3, and what matters for LLM services](http.md) (semantics, retries), [Real-time and event delivery: WebSockets, SSE, webhooks, long polling](realtime-and-events.md) (SSE vs WebSockets), [Auth: OAuth2/OIDC, JWTs, API keys, service-to-service, and the agent era](auth.md) (mTLS, SigV4, OAuth for services).
