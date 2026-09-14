# 2026-08-24: WebSocket protocol added

Ad-hoc update requested by Khalid: "add WebSocket protocol to the technical knowledge base".

## What changed

- **[new]** [WebSocket protocol (RFC 6455) in depth](../topics/protocols/websockets.md), a deep-dive child page under **Topic: protocols**. Covers the opening handshake and the Sec-WebSocket-Accept GUID, the frame layout (opcodes, FIN/RSV, payload length encoding), why client masking is mandatory, control frames and the close-code table including the locally synthesised 1006, subprotocols vs extensions and permessage-deflate memory cost, RFC 8441 over HTTP/2 (broad browser support) and RFC 9220 over HTTP/3 (no production implementation as of early 2026), WebTransport as the actual successor track, backpressure and reconnect (bufferedAmount, WebSocketStream, replay tokens), production scaling (2-10 KB per connection, L4 vs L7, sticky sessions vs pub/sub backplane, serverless workarounds), security (CSWSH, Origin validation, SameSite, ticket-based auth, per-message limits), and where WebSockets appear in AI systems (realtime voice APIs vs SSE for text streaming).
- **[update]** [Topic: protocols](../topics/protocols/summary.md): taxonomy now branches WebSockets into framing, extensions, HTTP/2-3 bootstrapping, and scaling/security; Files list and the "which to reach for" table point at the new page.
- **[update]** [Real-time and event delivery](../topics/protocols/realtime-and-events.md): the WebSockets section now opens with a pointer to the deep dive and stays scoped to the choose-between-mechanisms question.
- **[update]** Tracker: unchecked box added at the top of the protocols section, plus this update.

## Placement note

Placement rule applied: no new topic was created. WebSockets already had a home in Topic: protocols, and the existing realtime-and-events page covered the comparison question only, so the protocol itself became a sibling deep dive rather than a new topic or an expansion that would have unbalanced the comparison page.

## Notable facts worth remembering

- RFC 9220 (WebSockets over HTTP/3) has been published since 2022 and still has zero production browser or server implementations as of early 2026.
- SameSite=Lax cookie defaults block CSWSH incidentally, because a WebSocket handshake is not a top-level navigation. Server-side Origin validation is still the only real mitigation.
- OpenAI's Realtime API recommends WebRTC for client-side audio capture and WebSocket only when your server already holds the raw audio; Gemini Live is WebSocket-based. Text LLM streaming remains SSE everywhere, including MCP.
