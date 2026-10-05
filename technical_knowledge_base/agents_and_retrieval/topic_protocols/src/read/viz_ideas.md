# Reading tab: visual ideas (2026-10-05)

The question the topic keeps returning to: **what does each layer add to one request (round trips, bytes, guarantees), and where does it break?**

## Built
| Id | Idea | Why it earns its place | Data |
|---|---|---|---|
| rd-lay | Layers: the running request wrapped by HTTP, TLS, TCP, IP, Ethernet, one bar per layer drawn to scale, then unwrapped on arrival; toggle to one streamed token ("The": 3 bytes in a 216-byte frame) | Before/after on the same input (Khalid's pattern); makes header overhead and "each layer reads only its own header" visible | JSON/HTTP/TLS measured (`code/out/tls.json`), TCP/IP/Ethernet sizes from RFC 9293, 7323, 791, IEEE 802.3 |
| rd-tcp | One 96-segment transfer, segment 20 lost, one row per RTT; window 8 against window 32; counters for time, delivered, average and the W/RTT ceiling; plus a window/RTT/link calculator | Shows why throughput is window over RTT and why loss halves it; the calculator reproduces 5.2 Mbit/s for 64 KiB at 100 ms (RFC 7323 s2, by construction of the formula) | Simplified Reno, labelled illustrative |
| rd-tls | The recorded TLS 1.3 handshake record by record with three columns (client knows, eavesdropper sees, server knows); toggle to the same request in plain HTTP with the API key highlighted | Real bytes; shows what TLS hides and what it leaks (SNI, sizes, token timing) | `code/r2_tls_wire.py` (MemoryBIO capture), OpenSSL 3.5.9 with X25519MLKEM768 |
| rd-mcp | One MCP tool call through host, client and server as recorded HTTP + JSON-RPC (2026-07-28, stateless), toggle to the JS/TS page's 2025-11-25 recording (initialize, session); injected instruction highlighted where it enters the model's context | Before/after of the stateless redesign on real messages, and the trust boundary made concrete | `code/r6_mcp/` (Python SDK 2.3.0), JS/TS `src/tl/outputs/g3_mcp_http.json` |
| Tables | Symptom to layer to command (sections 2 to 6 and 10); which protocol when | The debugging goal | sourced per row |

## Rejected
- **dig +trace output** as the DNS visual: the build laptop's DNS filter answers every query, so a trace shows no delegation. Replaced by real NS lookups plus the interception check, which became a teaching point.
- **Packet capture of TCP/IP headers**: needs root; header sizes are quoted from the specs and labelled.
- **Re-implementing HTTP/1.1 vs 2 vs 3 timings in the Reading**: owned by On the wire; the Reading quotes its measured deltas and links the tab.
- **A live JWT decoder with user input**: the recorded token and three verification results teach the same points without a widget.
- **Animated DNS walk**: a numbered list with real server names says it in less space.

## What the method lacked
A rule for recordings that drift between runs (TTLs, record sizes, timings): the prose numbers are now asserted against the embedded recording by `check_embed.py`, so a re-run that changes them fails loudly.
