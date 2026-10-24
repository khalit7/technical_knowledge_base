# Sources checked for the Service APIs page (read 2026-10-05)

Primary sources fetched read-only; quotes on the page are verbatim from these.

| Topic | Source | Used for |
|---|---|---|
| gRPC wire format | https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md | path, te: trailers, grpc-timeout units and 8 digits, 5-byte prefix, trailers-only, 415, RST_STREAM mapping, GOAWAY |
| Status codes | https://github.com/grpc/grpc/blob/master/doc/statuscodes.md ; https://github.com/googleapis/googleapis/blob/master/google/rpc/code.proto | 17 codes, library-generated table, "no fixed list" of retryable codes; HTTP mappings |
| Retries | https://github.com/grpc/proposal/blob/master/A6-client-retries.md (last updated 2024-08-23) | maxAttempts cap 5, jitter 0.2, deadline across attempts, transparent retries, hedging, throttling, pushback, grpc-previous-rpc-attempts |
| Connection management | https://github.com/grpc/proposal/blob/master/A9-server-side-conn-mgt.md ; https://github.com/grpc/grpc/blob/master/doc/keepalive.md | MAX_CONNECTION_AGE (+-10% jitter), keepalive defaults (client off, 20 s timeout, 5 min server minimum, 2 strikes, 2 pings without data) |
| Message size defaults | https://github.com/grpc/grpc/blob/v1.84.0/include/grpc/impl/grpc_types.h | send -1 (unlimited), receive 4 MiB |
| Load balancing | https://github.com/grpc/grpc/blob/master/doc/load-balancing.md ; https://github.com/grpc/grpc/blob/master/doc/service_config.md | pick_first default, round_robin, loadBalancingConfig syntax |
| Deadlines | https://grpc.io/docs/guides/deadlines/ | no deadline by default; propagation default in Java and Go, opt-in in C++; server stops its own work |
| Wait for ready | https://grpc.io/docs/guides/wait-for-ready/ | default fail fast |
| gRPC-Web | https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md | trailers in body, 0x80 flag |
| Trace flags | https://github.com/grpc/grpc/blob/v1.84.0/doc/environment_variables.md | GRPC_TRACE, GRPC_VERBOSITY deprecated |
| Protobuf | https://protobuf.dev/programming-guides/encoding/ ; https://protobuf.dev/programming-guides/proto3/ ; https://protobuf.dev/best-practices/dos-donts/ ; https://protobuf.dev/programming-guides/json/ | wire types, tag formula, zigzag, packed default, field number ranges, reuse rules, ProtoJSON camelCase |
| REST | https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm ; https://martinfowler.com/articles/richardsonMaturityModel.html (18 March 2010) ; https://google.aip.dev/136 ; https://google.aip.dev/151 ; https://google.aip.dev/127 ; https://google.aip.dev/193 ; https://www.rfc-editor.org/rfc/rfc10008.html | constraints, levels, custom methods, LRO, transcoding, errors, QUERY |
| Batch API example | https://docs.claude.com/en/docs/build-with-claude/batch-processing | in_progress, ended, 29-day results |
| Connect | https://connectrpc.com/docs/protocol/ ; https://connectrpc.com/ | headers, HTTP/1.1, CNCF sandbox |
| tRPC | https://github.com/trpc/trpc (README; v11.19.0, 2026-09-16 from the releases API) | no schemas or codegen, batching, subscriptions |
| GraphQL | https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api ; https://graphql.github.io/graphql-over-http/draft/ | GitHub limits; GET for queries, 405 for mutations, 400/422 with application/graphql-response+json |
| JSON-RPC | https://www.jsonrpc.org/specification | shapes, notifications, batches, error codes |
| Kubernetes | https://kubernetes.io/docs/concepts/services-networking/service/ (headless) ; https://kubernetes.io/docs/reference/networking/virtual-ips/ (iptables picks at random) ; probes page (gRPC liveness stable since v1.27) | |
| Inference gateways | https://github.com/kubernetes-sigs/gateway-api-inference-extension (README at v1.6.2, release 2026-09-17) ; https://github.com/envoyproxy/envoy/blob/v1.39.2/api/envoy/service/ext_proc/v3/external_processor.proto ; https://github.com/llm-d/llm-d (README at v0.10.0, 2026-09-29) | EPP, ext_proc bidi stream, project-reported routing gains |
| vLLM | https://github.com/vllm-project/vllm/blob/v0.31.0/vllm/entrypoints/launchers/grpc_server.py ; .../serve/utils/api_utils.py (release 2026-10-05) | --grpc mode, server options and their comments, with_cancellation |
| SGLang | release tree v0.5.21 (2026-10-02): python/sglang/srt/entrypoints/grpc_server.py | gRPC entry point exists |
| Triton | quickstart and customization_guide/inference_protocols.md (v2.73.0, 2026-09-30); protocol/extension_binary_data.md | ports, unary recommended, stream pinning, binary tensors |
| Others | TF Serving docker.md (8500/8501); Ray Serve gRPC guide (port 9000); OTLP spec (4317/4318); Qdrant README; AWS ALB gRPC announcement 2020-10-29 | |

Release versions and dates for grpc, protobuf, OpenAPI and the GraphQL spec are the root atlas's (`../../src/atlas/atlas.json`).
Not confirmed and not carried: AWS API Gateway and Lambda gRPC statements, Ray internals and Milvus using gRPC, SageMaker async as an LRO example.

## Added 2026-10-24 (sections 2 to 7, concepts absorbed from Building a backend API)

| Topic | Source | Used for |
|---|---|---|
| LLM API designs | https://developers.openai.com/api/docs/guides/migrate-to-responses (read 2026-10-24) | items, "Responses are stored by default", previous_response_id, function_call / function_call_output, tagging and strict defaults, "Chat Completions remains supported" |
| Tool-call shapes | https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls ; OpenAI function calling guide (as recorded by Building a harness, read 2026-10-06) | tool_use / tool_result, arguments as a JSON string |
| Rate limits | https://platform.claude.com/docs/en/api/rate-limits (read 2026-10-24) | RPM, ITPM, OTPM per model, token bucket, cache-aware ITPM, max_tokens not counted in OTPM, spend-cap 429 without retry-after and its error_code, anthropic-ratelimit-* headers |
| Errors, idempotency, pagination, webhooks, versioning, OpenAPI | as cited by Building a backend API (read 2026-10-04): RFC 9457, Claude API errors and versioning, AIP-158, AIP-180, draft-ietf-httpapi-idempotency-key-header-07 and its datatracker entry, Stripe idempotent requests, advanced error handling, webhooks and API versioning posts, brandur.org/idempotency-keys, RateLimit header draft-11, Standard Webhooks spec, OpenAPI 3.2.0 | the facts of sections 2 to 6 |
| SDK retries | the HTTP page's measured reading of the Anthropic 1.11.0 and OpenAI 3.24.0 Python SDK base client | connection errors, 408, 409, 429, 5xx retried without a key |
| Postgres pagination cost | `inputs/pagination_pg.json`, copied from Building a backend API's `src/inputs/` (its `service/measure_pagination.py`, Postgres 16.2, 1M rows, 2026-10-04) | offset 98.142 ms against cursor 0.032 ms at depth 500,000 |
