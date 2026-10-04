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

## Rejected
- Rebuilding the root's retry-storm and double-charge animation: already on the root (Step 4); linked instead.
- An incident timeline animation (detect, declare, mitigate, communicate): a static flow plus the illustrative postmortem teaches the same; the burn-rate tab covers detection.
- Circuit breaker state-machine animation on its own: folded into the lab (breaker-open strip) and the before/after animation, where its effect on users is visible.
- Hedged-request simulator: low value for LLM calls (doubles GPU cost); the Tail at Scale numbers suffice.
- Measuring with TCP sockets: thousands of short connections exhaust ephemeral ports (TIME_WAIT); Unix domain sockets used instead and stated.

## Calibration and checks
- The engine (parts/22_js_engine.js) and engine.py agree exactly on 8 presets and 30 random settings (node src/check_engine.mjs: 20,572 numbers, 0 differences, including the calculators, rate limiters and SLO tab).
- Measured presets use 28 ms and 103 ms per call (configured 25 and 100 plus ~3 ms overhead read from the baseline p50 of 27.5 ms): by construction for that one input; the six success shares then land within 2.5 points of the measured means and every recovery verdict matches, independently.

## What the methodology lacked
A rule for local measurements whose outcome depends on overhead (asyncio scheduling) that the model omits: here the gap was closed with one calibrated input, stated on the page.
