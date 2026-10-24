# Protocol atlas: visualisation ideas (2026-10-05)

Question the tab answers: "for any protocol I meet, what does it sit on, what does it cost, how does it break, and what do I use instead?"

## Built
1. **Stack map with dependency lines** (score: high). Rows are layers; clicking a protocol draws green lines down to what it runs on and purple dashed lines up to what it carries, dims the rest, and opens the full entry. Lines are drawn from measured chip positions, so the map wraps at 390 px without clipping. Answers "what runs on what" in one click.
2. **Path walk animation** (before/after). One message goes down the stack one layer per step, each step saying what that layer adds; a path selector reruns it over another path of the same protocol (HTTP/2 on TCP against HTTP/3 on QUIC on UDP; TLS against h2c). Play, pause, step, scrub, speed; pauses off screen or in a hidden tab; starts paused under reduced motion.
3. **Which protocol when** chooser: up to four questions (who talks to whom, how the answer comes back, where the two ends are, browser or not), ordered rules, a recommendation with why, what to avoid, how to authenticate, the protocols and the wire path, and a link into Compare.
4. **Timeline** of 82 dated events (RFC months from RFC Editor metadata, releases from GitHub), a density strip sized by measured width, filters by layer and by period.
5. **Compare two**: every field side by side, the layers both paths share, and a one-paragraph note for 16 common pairs.
6. **Seen on the wire** in every entry: 30 real recordings (curl, openssl, dig, nc, ssh, a local gRPC and SSE server), including the RFC 6455 sample key reproduced by a live server and a DoH request caught by a device-management filter.
7. **Old notes checked**: 23 old claims with verdicts, also shown inside each entry.

## Rejected
- A force-directed graph of all protocols: unreadable at 390 px and the layer order is the point.
- Adoption charts (HTTP/3 share, IPv6 share, post-quantum share): figures not confirmed against primary sources this round (unconfirmed.md).
- A latency calculator for round trips per protocol stack: belongs to the On the wire tab, which measures real handshakes.
- Packet captures: no tcpdump without sudo; curl, openssl and library-level output used instead.

## What the methodology lacked
A rule for categorical reference data whose "numbers" are dates and versions: here every date is generated from fetched metadata (RFC Editor, Datatracker, GitHub releases), which made the timeline checkable by script.
