# Gateways and routing: visual ideas

Central question: what does a gateway actually do to one model call, and does its configuration mean what it says? Every visual is drawn from a recording or from LiteLLM's source at 1.104.0.

## Built
| Idea | Why | Placement |
|---|---|---|
| One request through the proxy, nine stages in source order, three scenarios (miss, cache hit, failing deployment), step animation with captions and counters | before/after on the same request; fixes the order (budget reserved at auth, cache lookup after routing) | Reading, one screen |
| Strategy bars: share of 40 requests per copy and wall time, seven strategy settings | the cost-routing trap is visible as one solid bar | Reading 2 |
| Failure strips: every call that reached the failing copy, four configurations, gaps shaded | 429 vs 503 cooldown regimes and the allowed_fails default trap at a glance | Reading 3 |
| Retry-layer lanes: provider calls per user request, three SDK settings, user error line | calls continuing after the user's error is the lesson | Reading 4 |
| Rate-limit ticks with LiteLLM's anchored windows shaded, burst vs steady | the boundary double burst on a real key | Reading 5 |
| Budget animation: 20 simultaneous calls, budget bar with spend and reservations; reservation off / no max_tokens / max_tokens 16, all recorded | before/after of the same wave under three admission policies | Reading 6 |
| Cache table; translation cards showing the upstream path and body | the outgoing format is the finding | Reading 7, 8 |
| OpenRouter inverse-square shares on real endpoint lists, model picker | "same model" = many prices, precisions, contexts | Reading 9; filters in Routing lab |
| Router quality vs strong-call share, with random line and perfect router | how to judge a router; threshold slider in Routing lab | Reading 10, Routing lab |
| Failure lab: event-by-event replay of 11 recorded cases, lanes, counters, per-request table | lets the reader check every claim of sections 3 and 4 | tab |
| Limits lab: recorded trace vs LiteLLM rule replay (exact) vs calendar window, sliding log, token bucket; limit slider; budget runs per call | the same traffic through four algorithms; algorithms themselves taught on Reliability engineering | tab |
| Routing lab: E1 swimlanes per strategy, OpenRouter filters (quantisation, context, max price, sort), 48-question table with replies | depth for sections 2, 9, 10 | tab |

## Rejected
- A generic animated explainer of the five rate-limiting algorithms: Reliability engineering already has it; linked.
- A semantic-cache threshold lab: Caching has one; linked.
- A gateway simulator of a hundred requests: the parent's Production stack has it.
- A latency-routing simulator with arbitrary latencies: the recording plus the source rule (per-output-token latency, unseen = 0, timeout penalty 1,000) teach it; a simulator would be invented numbers.
- OpenRouter live price history: one dated snapshot is enough; price-history tabs were removed elsewhere in the knowledge base.

## What the methodology lacked
"Reproduce a published figure" became "reproduce the recording from the source rule": the LiteLLM window rule reproduces all 153 recorded rate-limit decisions (with one fitted clock offset), and the budget outcomes follow the reservation rule exactly.
