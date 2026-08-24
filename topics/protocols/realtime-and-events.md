# Real-time and event delivery: WebSockets, SSE, webhooks, long polling

Updated 2026-08-24.

## Best resources

- [MDN: Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) and [MDN: WebSockets API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API): mechanics and API surface.
- [High Performance Browser Networking, ch. WebSocket/SSE](https://hpbn.co/): protocol-level detail (framing, deployment hazards).
- [RFC 6455 The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455) and the [WHATWG HTML spec SSE section](https://html.spec.whatwg.org/multipage/server-sent-events.html): the primary sources.
- [Stripe webhooks docs](https://docs.stripe.com/webhooks) and [Svix's webhook security guide](https://www.svix.com/resources/guides/webhook-security-checklist/): the industry-standard patterns for signatures, retries, ordering.
- [Standard Webhooks spec](https://www.standardwebhooks.com/): community standardization of signature/metadata conventions.

## The four mechanisms

| | Direction | Transport | Framing | Best for |
|---|---|---|---|---|
| Long polling | server to client (simulated) | plain HTTP | one response per event batch | legacy fallback |
| SSE | server to client | plain HTTP response | `text/event-stream` lines | LLM token streams, feeds, progress |
| WebSockets | bidirectional | upgraded TCP socket | binary/text messages | chat, collab editing, voice agents |
| Webhooks | server to *your server* | separate HTTP POSTs | one JSON body per event | async job completion, SaaS integration |

### Long polling
Client sends a request; server holds it until an event exists (or timeout), responds, client immediately re-requests. Works through everything, but costs a full request cycle per event batch, has awkward timeout tuning, and per-event latency jitter. Today it is a fallback when proxies break SSE/WebSockets.

### Server-Sent Events (SSE)
A single ordinary HTTP response with `Content-Type: text/event-stream` that never ends; the server writes UTF-8 events separated by blank lines (`data:`, optional `event:`, `id:`, `retry:` fields). Because it is just HTTP: works through most infrastructure, trivially supports auth headers (when using fetch-based clients rather than browser `EventSource`, which cannot set headers), benefits from HTTP/2 multiplexing (the old 6-connection-per-host limit only bites on HTTP/1.1).

Built-in resumability: browser `EventSource` auto-reconnects and sends `Last-Event-ID`, so a server that assigns event IDs can resume a dropped stream. Text only; one direction only.

Deployment hazards: buffering proxies (nginx needs `proxy_buffering off` or `X-Accel-Buffering: no`), idle timeouts (send `: keepalive` comment lines every ~15s), compression middleware that buffers.

**SSE is the LLM streaming standard.** Anthropic/OpenAI streaming responses are SSE over a POST (typed events like `message_start`, `content_block_delta` for Anthropic; `data: [DONE]` sentinel for OpenAI-style). MCP's Streamable HTTP transport is the same move: a POST whose response may be an SSE stream. When building LLM proxies, preserve event boundaries; do not re-chunk naively (split multi-byte UTF-8 or split `data:` lines and clients break).

### WebSockets (RFC 6455)
Starts as HTTP GET with `Upgrade: websocket` (101 Switching Protocols), then becomes a raw full-duplex message protocol over the TCP socket: binary or text frames, ping/pong keepalive, close handshake. Over HTTP/2/3 there are bootstrapping RFCs (8441/9220) but plain HTTP/1.1 upgrade remains the norm.

Wins when you need **client-to-server messages on the same channel** (interruptible voice agents, OpenAI/ Gemini realtime APIs, collaborative editing, games) or binary frames (audio). Costs: no auto-reconnect/resume (you build heartbeats, backoff, replay yourself), stateful connections fight serverless (API Gateway WebSocket API + connection table in DynamoDB is the AWS workaround), some corporate proxies still kill upgrades, load balancing needs connection affinity or a pub/sub backplane (Redis) behind stateless nodes.

Rule of thumb: if the client only receives, use SSE; you get HTTP semantics, auth, retries, and CDN-compatibility for free. Reach for WebSockets only for true bidirectionality or binary. Realtime voice LLM APIs use WebSockets/WebRTC; text LLM APIs use SSE.

### Webhooks
Inverted control: the provider POSTs events to a URL you host. Not a protocol, a convention; correctness lives in the patterns:

- **Delivery is at-least-once**: consumers MUST be idempotent (dedupe on event ID; store processed IDs). Never at-most-once or exactly-once.
- **Ordering is not guaranteed**: retries and fan-out reorder events; treat each event as a hint and re-fetch authoritative state from the API if order matters ("thin payload" pattern, which also reduces data-exposure risk).
- **Retries**: providers retry failed deliveries (non-2xx or timeout) with exponential backoff for hours to days (Stripe: up to 3 days). Respond 2xx fast (<~5-10s): ack, enqueue (SQS), process async. Slow handlers cause duplicate storms.
- **Signatures**: providers sign payloads with a shared secret, HMAC-SHA256 over timestamp + raw body (Stripe `Stripe-Signature`; Standard Webhooks `webhook-signature`; GitHub `X-Hub-Signature-256`). Verify against the **raw** body bytes (JSON re-serialization breaks HMACs), compare in constant time, reject stale timestamps (replay protection, ~5 min tolerance). Never trust unsigned webhooks; the endpoint is a public URL anyone can POST to.
- Endpoint security: HTTPS only, secret rotation support, optionally IP allowlists/mTLS for high-value flows.

In ML systems webhooks are the completion channel for async work: batch inference jobs, fine-tune completion, SageMaker Async Inference (SNS notification, same idea), evaluation pipelines. AWS-native equivalent: EventBridge/SNS -> Lambda, with the same idempotency discipline (Lambda retries deliver duplicates too).

## Choosing, quickly

- LLM token streaming to a client: **SSE**.
- Voice/realtime bidirectional agent: **WebSockets** (or WebRTC for media).
- "Tell me when the job finishes" across service boundaries: **webhook** (or queue/EventBridge inside your own infra).
- Hostile network where nothing else works: **long polling**.
- Server-to-server request/response: not this page; see [rpc-and-apis.md](rpc-and-apis.md).

## SSE in MCP specifically

MCP's Streamable HTTP transport (2025-03-26 onward): client POSTs a JSON-RPC message to one endpoint; server answers either `application/json` (single response) or `text/event-stream` (stream of messages related to that request: progress notifications, then the result). The original 2024 HTTP+SSE transport (separate GET /sse channel + POST endpoint, stateful) is deprecated with a year-long phase-out. The 2026-07-28 stateless core reduces how much long-lived streaming MCP needs at all: server-initiated requests were replaced by Multi Round-Trip Requests, so an SSE stream is now an optimization for progress/streaming results, not a session backbone. Details in [mcp.md](mcp.md).

See also: [http.md](http.md) for chunked transfer, timeouts, and proxy-buffering mechanics that determine whether your stream actually streams.
