# HTTP page: visual ideas, built and rejected (2026-10-05)

The question the page keeps returning to: **for one streaming LLM request, what do the bytes cost on each HTTP version, what do the hops in between change, and which timeout or retry decides whether the answer arrives?**

Existing visuals checked first: the root's On the wire tab (waterfall, anatomy stepper with HTTP/2 frame sizes, one lost packet on HTTP/1.1, 2 and 3, TLS 1.2 vs 1.3, cold vs resumed) and Failure lab (413, 429, 502, 504, idle cut, buffering, keep-alive race, max streams, window/RTT); Building a backend API's Wire lab (HTTP exchanges of a FastAPI service); Reliability engineering's Resilience lab (retry storms). None of those is repeated; each is linked by name.

Scores 0 to 2 on: moves with a parameter / reproduces a figure (x2) / computable from public or measured data (x2) / shows what a sentence cannot / corrects a misconception / measures the central question / absent elsewhere / step animation against the old method. Build cost subtracted.

## Built

| # | Idea | Placement | Data | Score |
|---|---|---|---|---|
| H1 | **Header compression, field by field, before/after**: the same headers on request 1 and 2 as HTTP/1.1 text, HPACK and QPACK, three real header sets (running request, `authorization: Bearer`, the Anthropic SDK's real headers); each field's representation and bytes, bars to scale, counters | Reading s5 (animation) | `raw/h2_frames.json`, `raw/hpack_sizes.json` (h2 encoder, hpack_parse checked against hpack) | 15 |
| H2 | **Timeout chain lab**: pick the hop at each position (documented defaults), the generation's think time, token gap, count, pings, streamed or not; replays the bytes against every timer, animated; verdict says which hop fires and what the client sees; **validation table: the model predicts all 8 measured runs** (independently: the measurements are not inputs) | Own tab | `raw/timeouts.json`; defaults from vendor docs (inputs/sources.md); `recompute.py` | 15 |
| H3 | **Frame by frame**: every frame of the running request on HTTP/2 and HTTP/3 (and the root's HTTP/1.1 bytes), stepper plus list, each header field's encoding, SETTINGS, QPACK instructions, GOAWAY; jump to request 1 / 2 / concurrent / close | Own tab | `raw/h2_frames.json`, `raw/h3_frames.json` | 13 |
| H4 | **HTTP-layer head-of-line blocking, before/after**: slow A and fast B on one pipelined HTTP/1.1 connection, two connections, one HTTP/2 connection; measured medians (B: 1,207 ms vs 13 ms) | Reading s4 (animation) | `raw/hol_app.json` | 12 |
| H5 | **HTTP/2 flow control on a real frame log**: 200 KB with 16 KB, 64 KB, 1 MB windows; credit bar, DATA and WINDOW_UPDATE on a time axis; derived stalls x RTT reproduces the measured times (652 / 163 / 2 ms in the committed run; 629 / 155 / 2 in the first) | Reading s5 (animation) | `raw/flow_h2.json` (WINDOW_UPDATE held 50 ms, labelled simulated) | 12 |
| H6 | **What a proxy changes**: client-sent vs backend-received headers through nginx, 4 configurations, diff colouring | Reading s7 | `raw/proxy_rewrite.json` | 10 |
| H7 | **Ambiguous messages table** (smuggling probes) against nginx and hypercorn, plus the two-parser byte picture | Reading s7 | `raw/ambiguous.json`; picture illustrative | 11 (found an RFC 9112 6.3 deviation in hypercorn/h11) |
| H8 | **SDK retries, every attempt the server saw**, 7 failure kinds x 2 SDKs | Reading s9 | `raw/sdk_retries.json` | 11 (corrects "retry only on connection errors"; shows triple execution on read timeout) |
| H9 | Message anatomy (tap a part), measured timeout runs table, public LLM hosts' headers table, SETTINGS table, conditional GET output, four predict-then-reveal drills | Reading | raw/ | small |

## Rejected

- **Packet-level capture (TCP segments, QUIC packets)**: needs root (no BPF, no sudo); the root's On the wire tab sizes them. Said on the Frame by frame tab.
- **One lost packet on HTTP/2 vs HTTP/3**: built by the root (On the wire); linked.
- **Real QUIC 0-RTT and 425**: hypercorn 0.18.0 issues no QUIC session tickets (root's finding); explained from RFC 8470 instead.
- **Rapid Reset reproduction**: an attack tool against local servers adds little to the explanation and risks being mistaken for a recipe; numbers quoted from Cloudflare and Google.
- **Status code explorer tab**: a table in the text carries it; Building a backend API owns API error design.
- **HTTP caching simulator**: the Caching page (databases topic) owns cache layers; one measured 304 exchange is enough here.
- **Retry storm simulation**: owned by Reliability engineering's Resilience lab.
- **HTTP/3 against public LLM hosts with aioquic**: possible (two advertise h3), but more public traffic for a fact Alt-Svc already shows.

## What the methodology lacked for this page

The scoring has no slot for "found a behaviour the docs do not state" (nginx 1.29.7's changed upstream defaults against its own directive page; hypercorn answering a smuggled request on a connection RFC 9112 says to close; SDKs retrying POSTs without idempotency keys). For protocol pages, a local reproduction that can disagree with documentation scored as high as a reproduced figure.
