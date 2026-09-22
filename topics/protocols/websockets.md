# WebSocket protocol (RFC 6455) in depth

⏱ 19 min read · +5h 10m resources

The wire-level companion to [Real-time and event delivery: WebSockets, SSE, webhooks, long polling](realtime-and-events.md) (10 min read · +5h resources), which covers *when* to choose WebSockets over Server-Sent Events (SSE), webhooks, or long polling. This page is *what the protocol is* and how to run it in production.

### Best resources

- [RFC 6455: The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455) (STD 34, December 2011) (1h 45m): the primary source. Sections 1.3 (handshake), 5 (framing), and 7 (closing) are the ones you actually read.
- [MDN: The WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) (30 min) and the [WHATWG HTML living standard](https://html.spec.whatwg.org/multipage/web-sockets.html) (25 min): the browser-side API, which is a deliberately thin wrapper over the protocol.
- [High Performance Browser Networking, WebSocket chapter](https://hpbn.co/websocket/) (free) (40 min): the best explanation of framing, head-of-line behaviour, and deployment hazards.
- [websocket.org protocol guide](https://websocket.org/guides/websocket-protocol/) (35 min) and its [standards index](https://websocket.org/standards/) (15 min): current, well-organised secondary reference including browser and server support tables.
- [PortSwigger: cross-site WebSocket hijacking](https://portswigger.net/web-security/websockets/cross-site-websocket-hijacking) (20 min) plus [Include Security's 2025 CSWSH writeup](https://blog.includesecurity.com/2025/04/cross-site-websocket-hijacking-exploitation-in-2025/) (20 min): the security model and its main failure mode.
- [Autobahn TestSuite](https://github.com/crossbario/autobahn-testsuite) (repo, ~20 min for the README and reports): the conformance suite every serious implementation reports against; useful for judging a library.

### What the protocol is

A WebSocket is a single TCP connection that starts life as an ordinary HTTP request and then stops being HTTP. After the upgrade, both sides can send **messages** (not bytes, not requests) at any time, in either direction, text or binary, with no request/response pairing and no per-message HTTP headers. Overhead per message is 2 to 14 bytes of frame header rather than a few hundred bytes of headers.

That is the whole value proposition, and also the whole cost: you gain a symmetric message channel, and you give up everything HTTP gave you for free (caching, proxies that understand you, statelessness, retries, standard auth, cross-origin resource sharing or CORS).

### The opening handshake

The client sends a normal HTTP/1.1 GET:

```
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: https://example.com
Sec-WebSocket-Protocol: json.v1
Sec-WebSocket-Extensions: permessage-deflate
```

The server answers `101 Switching Protocols` and echoes a proof value:

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
Sec-WebSocket-Protocol: json.v1
```

Points that matter:

- `Sec-WebSocket-Accept` is `base64(SHA1(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))`. The magic GUID is a hard-coded constant in the RFC. It is not authentication and not security; it exists so that a caching proxy or a non-WebSocket server cannot be tricked into looking like it completed an upgrade.
- `Sec-WebSocket-Version: 13` is the only version in use and has been an Internet Standard, stable for over a decade. Earlier drafts (hixie-76 and friends) are dead, and there is no WebSocket 2.
- The handshake is the **only** place you can send HTTP headers, and the browser `WebSocket` constructor will not let you set them. This is the root of most WebSocket auth awkwardness (see Security below).

### Frame format

After the 101, the connection carries frames:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|1|2|3|       |S|             |   (if payload len==126/127)   |
| | | | |       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127  |
+ - - - - - - - - - - - - - - - +-------------------------------+
|                               |Masking-key, if MASK set to 1  |
+-------------------------------+-------------------------------+
|    Masking-key (continued)    |          Payload Data         |
+-------------------------------- - - - - - - - - - - - - - - - +
:                     Payload Data continued ...                :
+---------------------------------------------------------------+
```

| Field | Size | Meaning |
| --- | --- | --- |
| FIN | 1 bit | Last frame of this message. 0 means more fragments follow. |
| RSV1-3 | 3 bits | Must be 0 unless an extension negotiated them. permessage-deflate uses RSV1 to mark a compressed message. |
| Opcode | 4 bits | 0x0 continuation, 0x1 text (UTF-8), 0x2 binary, 0x8 close, 0x9 ping, 0xA pong. Others reserved. |
| MASK | 1 bit | 1 for every client-to-server frame, 0 for every server-to-client frame. |
| Payload len | 7, 7+16, or 7+64 bits | 0-125 inline; 126 means the next 2 bytes are the length; 127 means the next 8 bytes are. |
| Masking key | 4 bytes | Present only when MASK=1. Payload is XORed byte-wise with the repeating key. |

**Messages vs frames.** One message can be split across a first frame carrying the type opcode, zero or more continuation frames (opcode 0x0), and a final frame with FIN=1. Fragmentation lets a sender stream a message of unknown length without buffering it. Control frames may be interleaved between fragments, so a ping can arrive in the middle of a large upload. Application code almost always sees reassembled messages because the library does this for you, but a streaming server-side handler is exactly where you notice the difference.

**Why masking exists.** Not confidentiality: the key is sent in the clear. In 2011 there were intermediaries that could be induced to interpret attacker-chosen plaintext as a second, forged HTTP request, poisoning caches, and randomising every client payload with a fresh key takes away the attacker's control of the bytes on the wire. Consequences today: masking is mandatory for clients and forbidden for servers (violations must fail the connection), and it costs a full XOR pass over every outbound client byte, which is why high-throughput client libraries care about SIMD (single instruction, multiple data) masking. Servers do not mask, so server-to-client throughput is cheaper.

### Control frames and closing

Control frames (close, ping, pong) must have a payload of 125 bytes or fewer and must never be fragmented.

- **Ping/pong** is the protocol-level keepalive. A receiver must answer a ping with a pong carrying the same payload. Unsolicited pongs are legal and are used as one-way heartbeats. Browsers respond to pings automatically and give JavaScript no access to them, so browser clients need an application-level heartbeat message if they want to detect a dead peer themselves.
- **Close** is a two-way handshake: one side sends 0x8 with an optional 2-byte status code plus UTF-8 reason, the peer echoes a close frame, then TCP closes. Half-closing without the echo is what produces the familiar 1006 in logs.

| Code | Meaning | Note |
| --- | --- | --- |
| 1000 | Normal closure | The intended end of a session. |
| 1001 | Going away | Server shutting down, or browser navigating away. |
| 1002 / 1003 | Protocol error / unsupported data | Framing violation, or text sent to a binary-only endpoint. |
| 1006 | Abnormal closure | Never sent on the wire. Synthesised locally when the connection dropped without a close frame. This is what you see for network failures, proxy idle timeouts, and crashes. |
| 1008 / 1011 | Policy violation / internal error | The generic "you did something we refuse" and "we broke" codes. |
| 1009 / 1010 | Message too big / extension missing | 1009 fires when a peer exceeds the configured max message size. |
| 1012, 1013 | Service restart, try again later | IANA-registered, widely used for graceful drain and backpressure. |
| 3000-3999 / 4000-4999 | Library-defined / application-defined | Use the 4000 range for your own semantics. Codes below 3000 are reserved. |

### Subprotocols and extensions

Two different negotiation mechanisms, often confused:

- **Subprotocols** (`Sec-WebSocket-Protocol`) name the *application* message format. The client offers a list, the server picks exactly one or omits the header. This is how MQTT-over-WebSocket, STOMP, WAMP, and `graphql-transport-ws` identify themselves. Version your own with it (`chat.v2`) rather than inventing a version field later.
- **Extensions** (`Sec-WebSocket-Extensions`) change the *framing*. In practice there is one that matters: **permessage-deflate** (RFC 7692), which DEFLATE-compresses message payloads and flags them with RSV1. Parameters control window size and whether the compression context is retained across messages (`client_no_context_takeover`, `server_no_context_takeover`). Context takeover compresses repetitive JSON far better but costs roughly 300 KB of memory per connection at the default window, which is a real number when you hold 100k connections. Compression also reintroduces CRIME-style attacks when a message mixes a secret with attacker-influenced text, and it wastes CPU on already-compressed payloads such as audio or images.

### WebSockets over HTTP/2 and HTTP/3

- **RFC 8441** (2018) bootstraps WebSockets over HTTP/2 using Extended CONNECT with `:protocol = websocket`, so a WebSocket becomes one stream on a multiplexed connection instead of monopolising a TCP connection. Supported in Chrome 67+, Firefox 65+, Safari 14.1+, Edge 79+. It removes the HTTP/1.1 six-connections-per-host ceiling and the extra handshake round trips.
- **RFC 9220** (2022) does the same over HTTP/3 and QUIC. As of early 2026 no major browser or server has shipped a production implementation; Chrome reached "intent to prototype" and stopped. Treat it as not available.
- **WebTransport** (W3C working draft, built on HTTP/3) is the actual successor story: multiplexed independent streams, plus unreliable datagrams, plus 0-RTT. It is shipping in Chrome and Edge 97+, flagged in Firefox, absent in Safari, and blocked in networks that filter UDP. It complements rather than replaces WebSockets, and is worth watching for media-heavy and gaming workloads rather than adopting now.
Plain HTTP/1.1 upgrade remains the norm and is fine. Verify what your load balancer does, since several terminate HTTP/2 to the client and speak HTTP/1.1 upgrade to the origin.

### Client-side API and backpressure

The browser `WebSocket` object is intentionally minimal: `onopen`, `onmessage`, `onerror`, `onclose`, `send()`, `close()`. No headers, no auto-reconnect, no resume, no flow control. Two consequences:

- **Backpressure is manual.** `send()` never blocks; it queues. Watch `bufferedAmount` and stop producing when it grows, otherwise a slow client silently accumulates unbounded memory. `WebSocketStream` (a Chrome-only, non-standard, Streams-based API) solves this properly by making the socket a `ReadableStream`/`WritableStream` pair with automatic backpressure, but it remains experimental and unavailable in Firefox and Safari, so cross-platform code still does it by hand.
- **Reconnect is yours to write**: exponential backoff with jitter, a cap, a resume token, and a server-side replay buffer keyed on last-received sequence number. SSE gives you `Last-Event-ID` for free; WebSockets give you nothing. Every mature WebSocket product ends up reimplementing this, which is most of what `socket.io`, Phoenix Channels, and Ably sell.
Also budget for the reconnect storm: when a node dies, every client it held reconnects at once. Jitter is not optional at scale, and the surviving nodes need headroom for the spike.

### Running them in production

**Cost per connection.** Roughly 2 to 10 KB of memory plus one file descriptor per idle connection in an efficient stack, so 500k idle connections on a 16 GB tuned node is achievable. The binding constraint is rarely CPU at idle; it is fd limits (`ulimit -n`), ephemeral ports on the upstream side, and the memory of whatever per-connection state you keep, including compression contexts.

**Load balancing.** WebSockets are long-lived and stateful, which breaks the assumptions of stateless round-robin. Either use L4 pass-through, or configure L7 proxies to honour the upgrade (nginx needs `proxy_http_version 1.1` plus explicit `Upgrade`/`Connection` headers, and a `proxy_read_timeout` far above the default 60 s). AWS's Application Load Balancer (ALB) and most content delivery networks (CDNs) support upgrades; verify idle-timeout settings, which silently kill connections that do not heartbeat.

**State placement.** Sticky sessions are the easy first move and the thing you later regret: losing a node disconnects every client pinned to it, and rebalancing after scale-out never happens. The durable pattern is stateless nodes plus externalised connection and session state, with a **pub/sub backplane** (Redis, NATS, Kafka) fanning messages to whichever node holds a given client. Scale out at 70 to 80 percent of measured per-node connection capacity, and alarm on reconnect rate as the leading indicator.

**Serverless.** Long-lived sockets are a poor fit for request-scoped compute. The workarounds are AWS API Gateway WebSocket APIs (connection registry in DynamoDB, Lambda per message, `@connections` API to push) and Cloudflare Durable Objects (one addressable stateful object per room or session, with hibernation so idle sockets do not bill for wall time). Both trade latency and per-message cost for not operating a fleet.

**Observability.** Track open connections per node, message rate and size distribution, p99 send latency, `bufferedAmount` high-water marks, close-code histograms (a 1006 spike means an infrastructure timeout, not application logic), and reconnect rate.

### Security

**The same-origin policy does not apply to WebSockets, and neither does CORS.** A page on any origin may open a socket to your endpoint, and the browser will attach cookies. That is cross-site WebSocket hijacking (CSWSH), and it is worse than cross-site request forgery (CSRF) because the attacker also reads the responses.

- **Validate the Origin header server-side during the handshake.** This is the definitive mitigation and it is still, in 2026, the one people skip. Note that non-browser clients can forge `Origin` freely, so it defends browser users, not the endpoint in general.
- `SameSite=Lax` cookie defaults (Chrome since 2020) block the attack incidentally, because a WebSocket handshake is not a top-level navigation, and Firefox's Total Cookie Protection partitions third-party cookies. `SameSite=None` re-opens it. Do not rely on browser defaults as your only control.
- **Prefer not to authenticate with cookies at all.** Since the browser API cannot set headers, the workable options are: a short-lived single-use ticket issued over HTTPS and passed as a query parameter (keep it out of access logs, expire in seconds), or the `Sec-WebSocket-Protocol` header abused as a bearer channel (common, ugly, works), or authenticating with a first message immediately after open while the server refuses everything else until it arrives. OpenAI's Realtime API takes the ticket approach with `POST /v1/realtime/client_secrets` for browser clients.
- **Re-authorise per message.** The handshake proves identity once; a socket can live for hours across a token expiry, a permission revocation, or a logout. Long-lived sockets need periodic re-validation and a server-initiated close when authorisation lapses.
- **Always use wss, never ws.** Beyond confidentiality, TLS is what makes intermediaries pass the upgrade through unmangled.
- **Cap everything**: max message size (else one `send()` of a gigabyte is an out-of-memory crash), max frames per message, per-connection message rate, per-IP connection count. The protocol has no built-in limits, so an unbounded reader is a denial-of-service primitive.
- Validate every message as untrusted input, exactly as you would a REST body. Testing tools skip WebSocket traffic far more often than HTTP, so these paths are systematically under-tested.

### Where WebSockets show up in AI systems

- **Realtime voice and multimodal APIs.** OpenAI's Realtime API offers WebRTC (recommended for browser and mobile clients capturing audio directly), WebSocket (recommended when your *server* already has raw audio from a media pipeline, call system, or worker), and SIP for telephony. Google's Gemini Live API is WebSocket-based. The pattern to internalise: WebRTC for the last mile to a device microphone (it handles jitter, packet loss, and echo cancellation), WebSocket for server-to-provider legs. These channels are **full duplex end to end** as of GPT-Live-1 (September 2026), which listens and speaks at once over all four transports at $0.05 per minute for the voice layer. Barge-in stops being an application trick (detect speech, cancel playback, cancel the generation) and becomes a property of the session: audio flows both ways continuously and there is no turn boundary to manage, which is also what makes the telephony leg a first-class case rather than a bridge you build yourself. The model side is on [Speech and Audio Models](../generative-and-multimodal/speech-and-audio.md).
- **Text LLM streaming is not WebSockets.** Anthropic and OpenAI text streaming is SSE over POST, and the Model Context Protocol (MCP) Streamable HTTP transport is SSE too. If someone proposes WebSockets for token streaming, they are paying the stateful-connection tax for a one-directional stream.
- **Interactive ML tooling** rides on WebSockets everywhere: Jupyter kernel and terminal channels, TensorBoard and Ray dashboard live updates, Gradio and Streamlit event channels, vLLM and Triton demo frontends. When a notebook "loses the kernel" behind a corporate proxy, it is an upgrade or idle-timeout problem, not Python.
- **Agent UIs** that need interruption (barge-in, cancel, tool-approval prompts mid-run) are the genuine bidirectional case, and the one place a WebSocket beats SSE plus a side-channel POST.

### Implementations worth knowing

| Language | Library | Note |
| --- | --- | --- |
| Python | `websockets` | The reference asyncio implementation, Autobahn-clean, good docs. Starlette/FastAPI wrap it or `wsproto` for ASGI endpoints. |
| Node | `ws`, `uWebSockets.js`, `socket.io` | `ws` is the default; `uWebSockets.js` is the throughput option; `socket.io` is a *different protocol* with fallbacks and reconnection built in, not a plain WebSocket client. |
| Go | `coder/websocket`, `gorilla/websocket` | gorilla is stable and ubiquitous; coder/websocket (formerly nhooyr) has the cleaner context-aware API. |
| Rust | `tokio-tungstenite`, `axum`'s extractor | Where the SIMD-masking performance work happens. |
| Elixir | Phoenix Channels | The best-engineered answer to reconnect, presence, and fan-out; worth reading even if you never ship Elixir. |
| Testing | Autobahn TestSuite, `websocat`, `wscat` | Autobahn for conformance, websocat for a netcat-shaped CLI, browser devtools Network panel for a live frame view. |

### Gotchas checklist

- [ ] Server validates `Origin` on handshake
- [ ] Auth is not a long-lived cookie or a long-lived token in a query string
- [ ] Max message size, frame count, and rate limits configured
- [ ] Heartbeat interval set below every proxy and load-balancer idle timeout
- [ ] Client reconnect uses exponential backoff with jitter
- [ ] Resume protocol exists (sequence numbers plus a replay buffer) if message loss matters
- [ ] `bufferedAmount` or equivalent watched for slow consumers
- [ ] Close codes distinguished in metrics, especially 1006
- [ ] permessage-deflate decision made deliberately, with memory per connection measured
- [ ] Graceful drain on deploy (close 1012, staggered, so reconnects do not stampede)

### Connections

- Choosing between WebSockets, SSE, webhooks, and long polling: [Real-time and event delivery: WebSockets, SSE, webhooks, long polling](realtime-and-events.md) (10 min read · +5h resources).
- The DDP (Distributed Data Protocol) sync-engine pattern (WebSocket-based subscribe-and-diff) is on that same page, and is the shape most "live data" products converge on.
- Chunked transfer, timeouts, and proxy buffering: [HTTP: 1.1, 2, 3, and what matters for LLM services](http.md) (12 min read · +19h 40m resources).
- Why MCP chose Streamable HTTP over WebSockets: [Model Context Protocol (MCP)](mcp.md) (13 min read · +4h 55m resources).
- Ticket-based auth, token audience, and why the browser API's header limitation matters: [Auth: OAuth2/OIDC, JWTs, API keys, service-to-service, and the agent era](auth.md) (10 min read · +9h resources).
