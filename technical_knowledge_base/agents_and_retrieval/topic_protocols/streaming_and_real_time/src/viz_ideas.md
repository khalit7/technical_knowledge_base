# Visualisation ideas: Streaming and real-time

What the text needs to be understood: (1) how the four push mechanisms differ in latency and cost on the same answer;
(2) what an SSE event is, byte by byte, and how parsers read it; (3) what happens when a stream is cut, with and
without ids; (4) what a WebSocket frame is and why clients mask; (5) why webhooks need dedupe and order-independence.

## Built (score out of 10: teaching value, real data, uniqueness against the root and siblings)

| Idea | Score | Where | Data |
|---|---|---|---|
| One answer, four ways: polling, long polling, SSE, WebSocket on one clock, RTT toggle 50/100 ms, counters for text, requests and bytes | 9 | Reading s1 (before/after animation) | measured: four_ways_rtt50/100.json (relay.py adds delay, counts bytes; median run of 7) |
| Cut mid-answer: Chrome EventSource reconnect replay, no ids against ids against ids + retry + 204, repeated tokens highlighted | 9 | Reading s6 (before/after animation) | measured: reconnect.json (Chrome 148) |
| Webhook deliveries replayed: naive receiver against careful receiver, side by side, counters for work runs and stored status | 8 | Reading s10 (before/after animation) | measured: webhooks.json |
| Parser test: 18 byte streams x 8 parsers, predict then reveal, full matrix | 8 | tab t-parse | measured: parsers.jsonl |
| WebSocket bytes: recorded session frame by frame, bytes coloured by field, unmasking animated, header-size calculator | 8 | tab t-ws | measured: ws_bytes.json |
| SSE event anatomy, click a line | 6 | Reading s3 | the running example's bytes |
| Proxy failure matrix for WebSockets (three clients x five cases) | 7 | Reading s9 (table) | measured: ws_proxy*.json, nginx log, curl |
| Cancellation table (naive vs careful, think vs tokens) | 7 | Reading s6 (table) | measured: cancel.json |

## Rejected
- Re-drawing the SSE chunk-parsing lab: the JS/TS page Part 1 owns it; linked.
- A Nagle/token clumping timeline: Networking foundations owns it (section 7, TCP timeline tab); linked.
- A proxy timeout chain builder: the HTTP page's Timeout chain tab owns it; linked.
- Buffering-proxy and SSE idle-cut demos: the root's Failure lab cases; linked by name.
- An interactive webhook simulator with sliders (handler time, timeout, failure rate): the measured replay teaches the same with real data; a simulator would be illustrative only.
- Voice bandwidth calculator: three derived numbers fit in a formula box.
- WebSocket over HTTP/2 (RFC 8441) demo: support not verified in the tools at hand; said so on the page.

## What the methodology lacked
Nothing for this page; the "predict, then reveal" drills and the per-case parser predictions came from the reader brief (interviews and debugging), not from the visualisation scoring.
