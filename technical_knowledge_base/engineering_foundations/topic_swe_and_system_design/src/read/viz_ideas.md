# Reading tab: visual ideas built and rejected (Topic: swe-and-system-design root)

The page's question: *as one product grows from 1 user to 10 million, what breaks next, what fixes it, and what does the fix cost?* Each step gets one before/after animation of the same traffic through the old and new design (Khalid's preferred MLA-explainer pattern), built on `21_js_rd_common.js` (RD.anim: play, pause, step, scrub, speed; on-screen only; paused under reduced motion). Every animation's numbers are recomputed in `recompute.py` and compared with the page's JavaScript by `check_read.mjs` (all match).

## Built
| # | Where | Idea | Before / after | Why it earns its place | Data |
|---|---|---|---|---|---|
| R0 | One screen | The architecture at 1 user and at 10M side by side, each box tagged with the step that introduces it | n/a (static, laid out by measured width) | The whole journey in one picture, as the brief asks; doubles as the page's map | none |
| R1 | Step 1 | Requests piling on one server against spread by a load balancer over 3 | 1 server at 400 req/s vs LB + 3 | Shows "waiting grows without bound" when arrivals exceed capacity, the law behind every later step | illustrative arrivals 5 to 8 dots/s, 1 dot = 100 req |
| R2 | Step 2 | Every read to the database against cache-aside, with the hit rate warming, an invalidation and a TTL expiry | 1,000 reads/s vs DB capacity 600 | The DB backlog vanishes at ~90% hits; shows invalidation and TTL costs as visible misses | illustrative hit-rate sequence (labelled an assumption) |
| R3 | Step 3 | Slow uploads inside the request against a queue and 2 workers | 4 slots, 3 chats/s, 5 uploads of 4 s | Chat wait goes from up to 3 s to 0; uploads wait in the queue instead | illustrative |
| R4 | Step 4 | Two scenarios in one card: retry storm (retry at once vs exponential backoff with full jitter) and double charge (no key vs idempotency key) | metastable overload persisting 16 s after a 3 s outage vs recovery by second 12 | The two most important failure mechanics; the storm shows a short outage becoming a lasting one | illustrative overload model (0.3 wasted work per excess request, floor 8), stated on the page; seeded LCG identical in JS and Python |
| R5 | Step 5 | Static against continuous batching on a 4-slot GPU | 21 steps, 50% slot use vs 13 steps, 80.8% | The core serving idea, as a Gantt of slots | illustrative lengths; Orca, Anyscale cited |
| R6 | Step 6 | The back-of-the-envelope estimate as a step-by-step table, ending in a 24-hour demand chart against fleet capacity | sized for the average (29 GPUs, 14 hours over capacity) vs the peak with 20% headroom (70 GPUs, 986 of 1,680 GPU-hours idle) | Teaches the method and the "peak sets the size; idle costs" lesson | every input labelled; 2,000 tok/s per GPU anchored to TensorRT-LLM's 70B FP8 figure (4,181 tok/s on 2 H100s, vendor) |

## Rejected
- A request-path waterfall with real millisecond timings (DNS, TCP, TLS, server, DB): latency figures belong to the Numbers to know tab; Reading uses a plain flow strip and links there.
- A CAP/partition animation: the trade-off is clearer as one sentence plus a per-data example (credits vs sidebar order); an animation would add little for a root.
- Sharding / consistent-hashing animation: depth for Topic: databases or a child page.
- Circuit breaker state machine animation: one animation per step was the brief; the retry storm teaches more for Step 4.
- Prefix-cache hit animation: the PagedAttention paper page already simulates the KV cache; linked instead.
- A live calculator for the estimate: the Scale simulator tab owns interactive sizing; the Reading animation walks the method.

## What the methodology lacked here
The reader starts from zero, so the usual scoring ("reproduces a published figure") rarely applies: most mechanisms in system design have no single published number. Animations were therefore labelled illustrative throughout, with sourced numbers used only where they exist (H100 bandwidth, TensorRT-LLM throughput, Brooker's 243x, SRE quotes), and every simulation checked by script.
