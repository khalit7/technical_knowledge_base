# HTTP: 1.1, 2, 3, and what matters for LLM services

Updated 2026-08-24.

## Best resources

- [MDN HTTP guide](https://developer.mozilla.org/en-US/docs/Web/HTTP): the canonical reference for semantics, headers, caching, and content negotiation.
- [High Performance Browser Networking](https://hpbn.co/) (Ilya Grigorik, free online): still the best explanation of TCP/TLS/HTTP performance mechanics; pre-HTTP/3 but the fundamentals hold.
- [RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110), [RFC 9112 HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112), [RFC 9113 HTTP/2](https://www.rfc-editor.org/rfc/rfc9113), [RFC 9114 HTTP/3](https://www.rfc-editor.org/rfc/rfc9114): the 2022 re-split of the specs; 9110 is the one to actually read.
- [web.dev: HTTP/3 and QUIC](https://web.dev/articles/content-delivery-networks) and Cloudflare's [HTTP/3 explainer](https://blog.cloudflare.com/http3-the-past-present-and-future/): practical deployment view.
- [Stripe: Designing robust and predictable APIs with idempotency](https://stripe.com/blog/idempotency): the classic treatment of retries plus idempotency keys.

## Version evolution: the one problem each version solved

Each version attacks a different layer of head-of-line (HoL) blocking:

- **HTTP/1.1** (1997, re-spec'd as RFC 9112): text framing, one request at a time per TCP connection. Keep-alive and pipelining exist, but pipelining is unusable in practice (response ordering, broken proxies), so browsers open ~6 parallel connections per host. Chunked transfer encoding (`Transfer-Encoding: chunked`) enables streaming bodies of unknown length; this is still how most LLM SSE streams ride over HTTP/1.1.
- **HTTP/2** (2015, RFC 9113): binary framing, **multiplexing** many streams over one TCP connection, **HPACK** header compression (static + dynamic tables, so repeated headers like `authorization` cost a few bytes), stream prioritization, server push (dead in practice; Chrome removed it). Fixes application-layer HoL blocking, but one lost TCP packet still stalls every stream on the connection (transport-layer HoL blocking), which is worse than HTTP/1.1's 6 connections on lossy links.
- **HTTP/3** (2022, RFC 9114) runs over **QUIC** (RFC 9000), UDP-based with TLS 1.3 baked in. Streams are independent at the transport layer, so packet loss on one stream does not stall others: the transport HoL fix. Other wins: 1-RTT handshake (transport + crypto combined), **0-RTT** resumption (send application data in the first flight; replayable, so servers must restrict 0-RTT to idempotent requests), and connection migration via connection IDs (survives Wi-Fi to cellular handoff). Header compression is QPACK, a HoL-safe HPACK redesign.

Practical guidance: HTTP/3 gains matter most on lossy/mobile networks and at CDN edges. Inside a datacenter or for server-to-server calls, HTTP/2 (or gRPC over it) is typically fine; many backends still terminate HTTP/3 at the load balancer and speak HTTP/1.1 or 2 upstream. `Alt-Svc` headers and DNS HTTPS records advertise HTTP/3 support.

## Semantics (version-independent, RFC 9110)

- **Methods**: GET (safe, idempotent, cacheable), HEAD, OPTIONS (safe); PUT, DELETE (idempotent, not safe); POST, PATCH (neither). Idempotency here is a contract, not a guarantee; retry logic depends on it.
- **Status codes worth knowing precisely**: 200/201/202 (202 = accepted for async processing, the pattern for long ML jobs), 204, 301/302/307/308 (307/308 preserve method; 301/302 historically get rewritten to GET), 304 Not Modified, 400 vs 422 (malformed vs semantically invalid), 401 (unauthenticated) vs 403 (unauthorized), 404, 409 (conflict, e.g. idempotency-key reuse with different body), 412 (failed precondition, optimistic concurrency), 429 (rate limit, read `Retry-After`), 500, 502/503/504 (gateway/overload/timeout; the ones your Lambda behind API Gateway emits when it cold-starts past the timeout).
- **Caching**: `Cache-Control` (max-age, s-maxage, no-store, no-cache = revalidate, stale-while-revalidate, private/public), validators `ETag`/`Last-Modified` with `If-None-Match`/`If-Modified-Since` for cheap 304s, `Vary` to key cache entries on request headers. LLM API responses are almost always `no-store`, but model listings, tokenizer files, and static assets should cache aggressively.
- **Content negotiation**: `Accept`, `Accept-Encoding` (gzip, br, zstd), `Content-Type`. LLM APIs use it to switch JSON vs SSE: `Accept: text/event-stream` vs `application/json`. MCP's Streamable HTTP transport does exactly this on a single endpoint.
- **Compression**: brotli/zstd for text; do not double-compress SSE streams if you need low latency (buffering proxies + compression can break token-by-token delivery; set `Content-Encoding` carefully and disable proxy buffering, e.g. `X-Accel-Buffering: no` for nginx).

## TLS essentials

- TLS 1.3 (RFC 8446) is the baseline: 1-RTT handshake, forward secrecy always, removed weak ciphers, optional 0-RTT resumption (same replay caveat as QUIC). TLS 1.2 survives only for legacy clients.
- SNI routes the handshake to the right cert; ALPN negotiates the protocol (`h2` vs `http/1.1`); HTTP/3 discovery is via `Alt-Svc`/HTTPS DNS records instead.
- Certificates: Let's Encrypt/ACME normalized 90-day automated certs; managed platforms (ALB, API Gateway, CloudFront) handle this for you.
- **mTLS** (client certificates) is the strongest service-to-service authentication and is what service meshes (Istio, App Mesh) automate; see [auth.md](auth.md).

## HTTP as it matters for LLM APIs

This is the part to internalize for production LLM services:

- **Streaming responses**: token streaming is SSE over a normal HTTP response (`Content-Type: text/event-stream`, chunked or HTTP/2 DATA frames). Details in [realtime-and-events.md](realtime-and-events.md). Key infra concerns: disable buffering at every proxy hop, set idle timeouts above inter-token gaps, and remember ALB/API Gateway response streaming limits (Lambda response streaming exists but has payload and duration caps; long generations often need Fargate/ECS or WebSockets instead).
- **Long-lived requests**: a 5-minute generation holds a connection open. Every hop (client SDK, CDN, LB, app server) has its own idle and total timeout; the effective timeout is the minimum. Prefer async job patterns (202 + polling or webhook) for anything beyond a couple of minutes: Anthropic/OpenAI batch APIs are exactly this shape.
- **Retries and idempotency**: retry only on connection errors, 408/429/5xx; never blindly retry a POST that may have side effects. Use exponential backoff with full jitter, honor `Retry-After`. The **Idempotency-Key** header pattern (Stripe popularized it; an IETF draft exists) lets servers dedupe retried POSTs: store key + response, replay the response on repeat, 409/422 if the key is reused with a different body. LLM inference is expensive enough that idempotency keys on generation requests pay for themselves.
- **Timeouts vs streaming interplay**: streaming resets idle timers with every token, which is one reason providers stream even when clients do not need incremental display; it keeps intermediaries from killing slow generations.
- **Rate limiting**: 429 + `Retry-After` + provider-specific headers (`x-ratelimit-remaining-*`, `anthropic-ratelimit-*`). Client SDKs implement token-bucket-aware backoff; your service should propagate 429s upstream rather than retry-storming.
- **Connection reuse**: keep-alive pools matter at scale; TLS handshake per request will dominate latency for chatty services. In Lambda, initialize the HTTP client outside the handler so the pool survives across warm invocations.

## Mental model summary

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Transport | TCP | TCP | QUIC (UDP) |
| Framing | text | binary streams | binary streams |
| Multiplexing | no (6 conns) | yes | yes |
| HoL blocking | app + transport | transport only | none |
| Header compression | none | HPACK | QPACK |
| Handshake | TCP + TLS (2-3 RTT) | same | 1 RTT, 0-RTT resume |
| Where you meet it | origin servers, SSE | gRPC, browsers to CDN | CDN edge, mobile |

See also: [realtime-and-events.md](realtime-and-events.md) for SSE/WebSockets, [rpc-and-apis.md](rpc-and-apis.md) for gRPC on HTTP/2, [mcp.md](mcp.md) for Streamable HTTP.
