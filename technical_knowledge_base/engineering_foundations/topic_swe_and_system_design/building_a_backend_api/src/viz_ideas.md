# Visual ideas built and rejected (Building a backend API)

The page's question: *what exactly goes over the wire when a client calls a backend, and which design rules make that contract safe to call, retry and change?* The reader has never built a backend API, so the strongest visuals are **real bytes** (captured from a FastAPI service run for the page) and **before/after animations of one request** with the server's database state at every step. All Reading animations use `RD.anim` (play, pause, step, scrub, speed; on screen only; paused under reduced motion), copied from the root.

## Built
| # | Where | Idea | Before / after | Why it earns its place | Data |
|---|---|---|---|---|---|
| B1 | Reading s-http | One real exchange, four outcomes (201, 422, 401, 404); click any line of request or response for its meaning | n/a | HTTP stops being abstract: the reader sees every header, the blank line, the body | captured, `inputs/exchanges.json` |
| B2 | Reading s-svc, s-val, s-idem, s-auth | Code excerpts rendered from the real `app.py` by marker, with real line numbers, each followed by a line-by-line walk | n/a | The code shown is the code that produced the captures, so they cannot drift apart | `service/app.py` |
| B3 | Reading s-val | FastAPI's default 422 beside the RFC 9457 version of the same failure | default vs problem details | One glance shows why a custom handler is worth 12 lines | captured |
| B4 | Reading s-page | Measured offset vs keyset time for one page at 6 depths, log bars | offset vs cursor | Turns "offset is slow at depth" into 0.03 ms vs about 200 ms on a real Postgres | `service/measure_pagination.py` -> `inputs/pagination_pg.json` (Postgres 16.2, 1M rows, median of 7 EXPLAIN ANALYZE runs) |
| B5 | Reading s-page | Page drift animation: the same user paging while one chat is created and one deleted | offset (F shown twice, C never shown, 17 rows read) vs cursor (each chat once, 8 rows read) | The correctness argument for cursors, which no measurement shows | illustrative 8 rows, checked in recompute.py |
| B6 | Reading s-idem | **Main animation**: one message, a lost reply and a retry, with messages, credits and idempotency_keys tables step by step; three scenarios (reply lost, concurrent retry, same key different body) | no key (20 credits, two messages) vs Idempotency-Key (10 credits, replay; 409; 422) | The suggested before/after; ends on the real captured 201 replay, 409 and 422 bodies | demo code paths; captured bodies |
| B7 | Reading s-auth | A real HS256 JWT decoded and verified in the page (SHA-256 and HMAC in plain JS); tampered payload and "alg: none" forgery, judged by a careless and a correct verifier | careless vs correct verifier | Shows that a JWT is readable, and why pinning the algorithm matters (RFC 8725) | token made by `gen_data.py` with the standard library |
| B8 | Reading s-hook | Live webhook signature verifier: edit the body or timestamp and the HMAC fails | signed vs tampered | Signing stops being a word; the raw-bytes rule becomes obvious | signature made by the demo's `sign_webhook`, recomputed in Python and JS (match) |
| B9 | Reading s-sse | Replay of the captured SSE stream at its real arrival times: raw chunked bytes beside the text the user sees | n/a | Shows chunked encoding and SSE framing that a browser hides | captured arrival times (about 50 ms apart) |
| B10 | Reading s-ver | Stripe-style dated versions: one core response walked back through change modules for three pinned dates | newest vs older pins | The mechanism of the "gold standard" in one picture | illustrative versions, labelled |
| T1 | Wire lab tab | All 20 captured exchanges grouped by topic, every line explained, the equivalent curl command | n/a | A reference the reader returns to; too big for the Reading tab | captured |
| T2 | Breaking or not? tab | 15 proposed changes to the chat API; answer, then see the rule and source | n/a | Compatibility is judgement; a quiz trains it faster than a list | AIP-180, Anthropic, Stripe, Zalando |

## Rejected
- A TCP/TLS handshake waterfall: the root's Step 1 and Topic: protocols own it.
- A rate-limiter token bucket animation: the root's Step 5 owns the algorithm; this page covers the client-facing headers with real captures.
- A load test of the demo with many workers: belongs to Capacity planning and performance; only a single-connection latency measurement is shown, to make the "framework is not the bottleneck" point.
- An OAuth authorisation-code flow sequence animation: tempting, but the reader's job as a resource server is token verification; the JWT verifier teaches that directly. Candidate for a later deep page if Khalid wants it.
- A gRPC vs JSON payload size comparison: would need a protobuf toolchain for one number; Topic: protocols is the place.
- Resumable streams (Last-Event-ID) demo: most LLM APIs do not resume; described in text only.

## What the methodology lacked here
Most API design rules have no published number to reproduce. The substitute was real artefacts: bytes captured from a running service, a local Postgres measurement, and cryptographic checks recomputed in two languages (`recompute.py` and `check_page.mjs` agree on every value).
