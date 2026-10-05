# Production stack: visual ideas

Central question: what does each layer around the loop buy you, and what does it cost, measured on the same inputs?

## Built
| Idea | Why | Placement |
|---|---|---|
| Architecture picture (loop, gateway, primary and backup, collector, evals, memory) | one screen of what the tab covers; stacks vertically under 600 px | Around the loop |
| Gateway replay: client, gateway, primary, backup lanes to scale in seconds, recorded requests; toggle no gateway / through the gateway on the same scripted failure (before/after); captions per event, counters | shows backoff waits, timeouts, abandoned work and the fallback; the hang case shows the gateway making things worse | Gateways |
| Predict then reveal: user wait for a hanging provider (33 s against 20 s direct) | most readers guess 8 or 11 s | Gateways |
| Keys table from recorded requests (budget overshoot, model access 403, rpm 429) | budgets are soft caps; read from real responses | Gateways |
| Gateway simulator: 100 seeded requests, outage, error rate, hangs, rate limit; no gateway and gateway rows on the same provider trace; policy from LiteLLM's source; reproduces the recorded hang run within the drawn jitter | retry storms and the cost of fallback latency are invisible at one request | Gateway simulator |
| Trace viewer: waterfall tree, click for attributes, GenAI keys highlighted; three real traces (hand-written spans, auto-instrumentation only, Claude Code) | before/after on the same task: what auto-instrumentation misses | Tracing |
| Cost attribution bars per Claude Code model call split by token type; sum equals the run's reported cost exactly | turns a bill into a breakdown | Tracing |
| Regression gate over 18 recorded runs with sliders (hidden checks, cost, turns) and a denial toggle; group verdicts against the baseline | shows final-state checks missing an unverified run, and a policy check blocking the best model | Evals |
| Memory build animation: four sessions into three stores side by side (adds, updates, deletes, invalidations with dates) | before/after on the same conversation | Memory |
| Question matrix: five questions by five systems, click for verbatim answers, tokens per answer and write cost | the trade-off in one table | Memory |

## Rejected
- Langfuse or Phoenix screenshots: images of a vendor UI teach less than the spans themselves and would go stale.
- A token-cost calculator for gateways: duplicates the harness root's context lab.
- Animating spans arriving in real time: the waterfall already shows timing; the replay pattern is used on the gateway instead.
- A cooldown demo with two deployments: would need a second fake provider and more recordings for a behaviour the source already documents.

## What the methodology lacked
Recordings are the primary data, so "reproduce a published figure" became: the span-level cost sum equals the result record's total_cost_usd exactly, and the simulator's policy reproduces the recorded hang timing (33.50 s against 33.07 s, difference the jitter actually drawn).
