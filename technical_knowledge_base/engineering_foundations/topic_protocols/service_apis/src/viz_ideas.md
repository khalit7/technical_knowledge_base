# Service APIs page: visual ideas, built and rejected (2026-10-05)

The question the page keeps returning to: **behind the front door of one streaming LLM request, what does an internal call put on the wire, how does it give up, what do its errors mean, and where do its calls land when there are several replicas?**

Existing visuals checked first: the root's On the wire tab and Failure lab ("gRPC behind an L4 load balancer", "Max concurrent streams", "One stream's throughput is capped at window / round trip") and Protocol atlas (REST, gRPC, GraphQL, JSON-RPC entries, the curl health check); HTTP's Frame by frame and Timeout chain tabs; Capacity planning's four balancing policies on eight servers (algorithms) and its two-choices animation; Building a backend API's Wire lab and gRPC-vs-REST table. None is repeated; each is linked by name. This page's visuals all come from its own recordings (`raw/`).

Scores 0 to 2 on: moves with a parameter / reproduces a measurement (x2) / computable from recorded data (x2) / shows what a sentence cannot / corrects a misconception / measures the central question / absent elsewhere / step animation against the method it replaced.

## Built

| # | Idea | Placement | Data | Score |
|---|---|---|---|---|
| S1 | **Balancer lab, before/after**: the same 7 s of calls (one per 50 ms) through L4, L4 + MAX_CONNECTION_AGE, L7 and client round_robin while backend-3 joins at 1.5 s; one tick per real call, counters, play/step/scrub/speed | Own tab | `raw/lb.json` (nginx 1.31.6 stream and grpc_pass, grpcio 1.84.0) | 16 |
| S2 | **Deadlines, four endings of one abandoned request**: client, gateway and inference lanes on one time axis; A propagated, D worker thread (40 tokens for nobody), B plain loop (rescued by CPython freeing the call), C cancel only; counters for wasted tokens and the grpc-timeout the last hop saw | Reading s5 (animation) | `raw/deadline.json` (counts, end times, headers, RST_STREAM measured; tick positions from the configured schedule, labelled) | 15 |
| S3 | **One gRPC call, frame by frame**: every HTTP/2 frame of three calls (server streaming, trailers-only, health), stepper plus clickable list, protobuf decoded inside each DATA frame | Own tab | `raw/frames.json` (logging proxy, hyperframe + hpack) | 13 |
| S4 | **The 49-byte request, clickable**, with a varint encoder checked on load against the library's bytes | Reading s3 | `raw/pb.json` | 11 |
| S5 | **Schema evolution, measured**: add (round-trips byte-identical), reuse with another wire type (silently dropped, max_tokens 0), reuse with the same type (silently 9) | Reading s3 | `raw/pb.json` | 11 (corrects "unknown fields are ignored" into "and misread when numbers are reused") |
| S6 | **Tensor encodings table**: 1M float32 as JSON list, base64-in-JSON, packed floats, bytes field | Reading s3 | `raw/pb.json` | 9 (corrects the old page's "wide margin" over base64) |
| S7 | **Failures as the client sees them**: 11 cases with code, details string and time; keepalive PINGs until GOAWAY too_many_pings; retry attempts with grpc-previous-rpc-attempts | Reading s6, s7 | `raw/status.json` | 12 |
| S8 | **GraphQL N+1 bars and fan-out table**, partial-failure response | Reading s10 | `raw/graphql.json` (toy data, labelled) | 9 |
| S9 | Request path strip, REST+SSE vs gRPC byte table, 17-code table, seven predict-then-reveal drills, six interview questions, generated glossary | Reading | raw/ and specs | small |

## Rejected

- **Envoy in Docker as a second L7 balancer**: nginx grpc_pass already shows per-call balancing; Envoy would add an image pull and nothing a reader could see. Its role (ext_proc to an Endpoint Picker) is explained from the API file instead.
- **Balancing algorithm simulator (least requests, two choices, consistent hashing)**: owned by Capacity planning and performance, with measured runs; linked.
- **KV-cache-aware routing simulation**: would need invented cache-hit numbers; the llm-d figure is quoted as project-reported instead.
- **Packet capture of gRPC**: no sudo; the logging proxy records every frame exactly, which is what the page needs. Said on the tab.
- **Max concurrent streams reproduction**: the root's Failure lab has it with real numbers; linked by name.
- **JSON-RPC exchange recording**: the MCP page and the root's Reading already record real MCP JSON-RPC on the wire; this page shows the spec shapes and links them.
- **Protobuf vs JSON speed race for small messages**: the numbers depend on the language binding far more than on the format; the tensor case, where the format dominates, is measured instead.

## What the methodology lacked here
A rule for recordings whose numbers vary run to run (deadline tick counts, retry backoff, round_robin's starting backend): the page now writes such numbers only through `data-sa` placeholders filled from the embedded recordings, and `check_embed.py` checks only structural claims for them (for example "the downstream service generated all 40 tokens and the client got fewer than 12"), so a rerun cannot leave stale prose.

## 2026-10-24 rebuild to the teaching contract

Placement changes: S1 (Balancer lab) moved from its own tab into Reading section 13; S3 (One gRPC call) moved from its own tab into Reading section 9, replacing the compact HEADERS/DATA table; the request-path strip became the hero; the generated glossary was replaced by a "New terms" list at the top; the 17-code table, the 11 failure cards, tensors, the ML-serving table, debugging table, drills and interview questions moved into closed blocks.

New, built (all in `parts/25_js_figs.js`, drawn at the measured width, never autoplaying):

| # | Idea | Kind | Placement | Data |
|---|---|---|---|---|
| N1 | **Hero**: the running request through three API styles, each hop labelled with the sections that teach it, plus the webhook back to the app | static annotated diagram | top | structure only |
| N2 | **Annotated call**: one request and its 429, seven clickable parts (path version, date header, idempotency key, status, retry-after, request id, error type) | annotated real shape | section 2 | Claude API docs, illustrative values |
| N3 | **Pagination before/after**: offset against cursor on the same eight rows while one row is inserted and one deleted; offset shows c6 twice and never shows c3 | before/after stepper | section 2 | illustrative; measured Postgres cost quoted from `inputs/pagination_pg.json` |
| N4 | **Schema fan-out**: one schema feeding docs, SDKs, validation, mocks and a CI diff | static diagram | section 3 | structure only |
| N5 | **Idempotency before/after**: one message, a lost reply and a retry, with and without the key (two messages and 20 credits against one and 10) | before/after sequence stepper | section 4 | Stripe's mechanism, illustrative values |
| N6 | **Rate-limit headers** before and at the wall | annotated real shape | section 5 | Claude API rate-limits page, RateLimit draft-11 |
| N7 | **Webhook delivery**: sign, slow receiver, timeout, retry, dedupe by webhook-id, then the fast receiver | sequence stepper | section 6 | Standard Webhooks, illustrative ids |
| N8 | **Three LLM API designs on one tool-call round trip** (Chat Completions, Responses, Messages), differences highlighted | before/after toggle | section 7 | OpenAI migration guide, Anthropic tool-use docs |
| N9 | **Status codes to retry decisions** | static diagram | section 11 | statuscodes.md, code.proto |
| N10 | **Where the balancing choice is made**: L4, L7, client pick_first, client round_robin, connections drawn, measured counts on the replicas | static diagram on measured data | section 13 | `raw/lb.json` |

Rejected in this pass: a live HMAC verifier for webhooks (Building a backend API has one built on its demo's captured event; the sequence stepper teaches the delivery contract, which is what this page owns); a retry-amplification slider (a^L is said completely by one sentence with 3 x 3 x 3 = 27); a token-bucket animation for rate limits (owned by Reliability engineering).
