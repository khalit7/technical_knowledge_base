# Visualisation ideas: Reliability engineering (2026-10-04)

Scores: teaching value (T), uses real data (R), not already on the root or a sibling (N), each 1 to 5.

## Built
| Idea | Placement | T | R | N | Notes |
|---|---|---|---|---|---|
| A retry storm, measured: six retry policies against the same 5 s slowdown on a real local HTTP service (3 seeds each), with per-second answers, attempts and server queue | Reading, inline card plus table | 5 | 5 | 5 | `src/lab/` (server.py, loadgen.py, run_all.sh, summarize.py), about 14 min of runs. Headline: backoff + jitter alone did not recover; budget and bounded queue did. |
| Before/after animation: the same provider slowdown hitting the chat API without and with timeout + breaker + shedding + fallback (worker strip, queue, per-second outcomes, captions, counters) | Reading, Graceful degradation | 5 | 2 (model) | 5 | RD.anim controller from the root; engine shared with the lab. |
| Resilience lab: 21 controls (traffic, workers, queue limits, patience, dependency slots and latency, timeout, attempts, backoff, budget, breaker, fallback, deadline propagation, seed), 8 presets, 3 charts, measured overlay | Tab | 5 | 4 (calibrated to the measurement) | 4 | Root's Scale simulator has a retry toggle on an M/M/c model; this one is a ms-step discrete-event model with breakers, budgets and deadlines. |
| Five rate limiters on one fixed burst trace (fixed window, sliding log, sliding window counter, token bucket, leaky bucket queue) | Reading, Rate limiting | 4 | 2 (illustrative trace) | 5 | Shows the fixed-window boundary burst (20 in one second), the token bucket burst (15) and the leaky bucket's wait. |
| Error budget and alerts: SLO, traffic, normal error ratio, incident ratio and length against the workbook's multiwindow burn-rate alerts; budget over 28 days | Tab | 5 | 3 (published thresholds) | 5 | Minute-step simulation; compares with the workbook's detection-time formula. |
| Nines table, dependency chain, burn-rate threshold table, fan-out 63% | Reading, computed tables | 3 | 4 | 3 | Numbers to know on the root has an availability calculator; linked rather than rebuilt. |

## Added 2026-10-24 (teaching-contract rebuild)
| Idea | Placement | Kind | Notes |
|---|---|---|---|
| Hero: where each defence acts on one chat request (app, edge, API, provider call) | Top | static annotated diagram | the whiteboard picture the page elaborates |
| Dependency chain multiplying to 99.24% | Section 1 | static diagram | same numbers as the parent's Numbers to know |
| Metastable loop with the two cuts (budget, bounded queue) | Section 2 | static diagram | numbers from the measured run |
| Measured latency histogram, p50, p99.9 and the 100 ms timeout | Section 3 | real data | `gen_lat_js.py` from `inputs/baseline_attempts.txt` |
| Deadline propagation, 10 s budget, 3 s left | Section 3 | static diagram | |
| Retry amplification 1, 3, 9, 27 | Section 4 | static diagram | |
| Jitter before/after on the same 20 clients | Section 4 | before/after toggle | seeded; peak 20 against 7, count 80 both; checked by recompute.py |
| Breaker state machine with resilience4j defaults | Section 7 | static diagram | replaces the HTML flow; the 2026-10-04 rejection was of an animation, this is static |
| Goodput against offered load, bounded and unbounded queue | Section 8 | chart from the verified engine | 13 loads x 2 queues; checked by recompute.py and check_engine.mjs |
| Health probe failure -> action | Section 10 | static diagram | |
| Rollout waves with bake times | Section 11 | static diagram | |
| Streaming reply under three timeout designs | Section 14 | static diagram, illustrative times | |
| Error budget and alerts | moved from its own tab into section 12 | calculator | it explains one mechanism, so it sits beside the claim |

## Rejected
- Rebuilding the root's retry-storm and double-charge animation: already on the root (Step 4); linked instead.
- A photo or real figure: the page is about mechanisms; the SRE book's figures are CC BY-NC-ND (not an allowed licence) and status-page screenshots are third-party branding.
- An incident timeline animation (detect, declare, mitigate, communicate): a static flow plus the illustrative postmortem teaches the same; the burn-rate tab covers detection.
- Circuit breaker state-machine animation on its own: folded into the lab (breaker-open strip) and the before/after animation, where its effect on users is visible.
- Hedged-request simulator: low value for LLM calls (doubles GPU cost); the Tail at Scale numbers suffice.
- Measuring with TCP sockets: thousands of short connections exhaust ephemeral ports (TIME_WAIT); Unix domain sockets used instead and stated.

## Calibration and checks
- The engine (parts/22_js_engine.js) and engine.py agree exactly on 8 presets and 30 random settings (node src/check_engine.mjs: 20,572 numbers, 0 differences, including the calculators, rate limiters and SLO tab).
- Measured presets use 28 ms and 103 ms per call (configured 25 and 100 plus ~3 ms overhead read from the baseline p50 of 27.5 ms): by construction for that one input; the six success shares then land within 2.5 points of the measured means and every recovery verdict matches, independently.

## What the methodology lacked
A rule for local measurements whose outcome depends on overhead (asyncio scheduling) that the model omits: here the gap was closed with one calibrated input, stated on the page.
