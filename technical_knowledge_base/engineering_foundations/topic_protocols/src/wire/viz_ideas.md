# On the wire tab: visual ideas, built and rejected (2026-10-05)

The question the tab keeps returning to: where do the bytes and the milliseconds of one streaming LLM request go, layer by layer, and what changes when the path is long or a packet is lost?

## Built
- **Raw request and response bytes** with an "invisible bytes" toggle (CR LF shown) and the HTTP/1.1 chunk sizes highlighted; a strip of the arrival time of each `recv()`. Teaches that HTTP/1.1 is text and SSE is just more text.
- **Measured waterfall** (DNS, TCP, TLS, request to first byte, first-token wait, streaming) for HTTP/1.1, 2, 3 on loopback and on a 50 ms emulated path, plus public hosts (median of 5 or the cold first run). Zoom "until the first byte". Tap a bar for every run; curl -w cross-check table.
- **Anatomy stepper** (15 steps, shared RD.anim controller): client and server layer stacks, the arrow of each exchange, and a panel with the real bytes: dig answer and TTL, connect() timing and local port, the parsed ClientHello (SNI, ALPN, key shares incl. X25519MLKEM768) and ServerHello, the encrypted flight with sizes, the real certificate chain of api.anthropic.com, HTTP/2 frames with sizes, session tickets, one token drawn to scale layer by layer.
- **One token in HTTP/1.1, 2, 3 to scale** (measured TLS record and QUIC packet sizes; TCP/UDP/IP from the RFCs, labelled).
- **Head-of-line blocking before/after**: three requests x three protocols, tokens appearing at their measured times, the lost packet marked, late tokens coloured with a ghost at the no-loss time; table of who waited.
- **TLS 1.2 vs 1.3 ladder diagrams** from OpenSSL's message callback, animated flight by flight, slopes showing the one-way delay; table emulated vs www.cloudflare.com, cold vs resumed, bytes.
- **Cold vs resumed vs kept-alive** growing bars to the first byte, with HTTP/3 cold.

## Rejected or not possible
- **Real TCP SYN/SYN-ACK/ACK bytes**: packet capture needs root (no BPF access, no sudo). Shown as connect() timing plus RFC header layout, labelled.
- **Anatomy stepper per HTTP version** (h1/h3 toggles): would triple the steps for little gain; the to-scale token comparison carries the per-version difference, and the HOL animation the behavioural one.
- **QUIC resumption and 0-RTT measured**: hypercorn 0.18.0 issues no QUIC session tickets; reconnections were full handshakes (recorded in raw/h3_resume_netem.json, raw/h3_0rtt_netem.json). Would need a custom aioquic server with a ticket store.
- **Real TCP loss**: a userspace proxy cannot drop a TCP segment (kernels retransmit below it); simulated by holding the chunk for the measured QUIC recovery time. Kernel-level loss (dummynet, tc netem) needs root.
- **Bandwidth-delay product / congestion window chart**: belongs to the Reading's TCP section or Failure lab (slow transfers); our 1 KB response cannot show it.
- **Log-scale waterfall**: rejected for a zoom toggle; log scales mislead readers new to the topic.
