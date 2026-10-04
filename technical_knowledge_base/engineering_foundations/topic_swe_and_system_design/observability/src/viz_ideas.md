# Visualisation ideas: Observability (child of Topic: swe-and-system-design)

Method: html_utils/interactive-html-ideas.md section 2. Scores are teaching value (T), uses real data (R), interaction earns its place (I), 1 to 5. Built ones first.

## What the text needs to be understood
1. That an average can move a little while the tail moves a lot (and the median not at all).
2. How a percentile comes out of bucket counts, and why the answer can be wrong.
3. Why one label can multiply cost.
4. What a trace is, and how it crosses a process boundary (the traceparent header).
5. Head against tail sampling, in numbers.
6. Why a toolkit of percentiles and traces finds a cause that averages and logs cannot (the before/after).
7. Why the workbook's sixth alerting rule beats the first five (precision, recall, detection, reset).
8. What telemetry costs a service (CPU) and a budget (money).

## Built
| # | Idea | T | R | I | Placement | Data and formula |
|---|------|---|---|---|-----------|------------------|
| 1 | **One incident, debugged two ways** (before/after animation, 6 steps each, toggle): average-latency line plus log stream and error search, against p50/p99 lines, an exemplar dot, the slow trace's waterfall, the error trace (retrieval still working after the 1 s timeout) and the group-by-replica table | 5 | 5 | 5 | Reading, section 8 | Prometheus range queries over the real run; real traces, logs; replica stats from all 1,564 retrieval spans. Captions are the page's reasoning; numbers come from DEMO. |
| 2 | **Alert lab** tab: the workbook's six rules on 7 incident shapes at 5 SLOs; timeline with error ratio (log) and six firing lanes (page red, ticket amber); per-rule detection, budget at detection, reset, notifications; precision and recall matrix with a significance threshold; generated PromQL | 5 | 3 | 5 | Tab | Rules and thresholds verbatim from SRE workbook ch. 5; 10-second steps over 7 days; prefix sums; incidents illustrative. JS checked against src/alertlab.py on all 35 runs (check_ui.mjs); workbook figures reproduced by construction (recompute.py). |
| 3 | **Real telemetry** tab: scatter of all 2,109 requests with 39 ringed traces; click for waterfall, span attributes and both services' log lines; metric text in Prometheus and OpenMetrics formats; PromQL over time; tested rules and validated collector config | 4 | 5 | 4 | Tab | Everything from the run (src/inputs). |
| 4 | **Distribution with avg, p50, p99 markers**, normal against incident toggle | 5 | 5 | 4 | Reading, percentiles | Load generator's exact durations, last 60 s of each phase; nearest-rank percentile identical to analyze.py. |
| 5 | **histogram_quantile by hand**: real bucket counts of the incident minute, slider for phi, the interpolation formula filled in, estimate against the exact value | 5 | 5 | 4 | Reading | Prometheus classic algorithm; reproduces Prometheus's own 1.4619 s (recompute.py). |
| 6 | **traceparent decoder**: the real header, click each field; paste box validating per spec (case, all-zero IDs, version ff) | 4 | 5 | 4 | Reading | W3C Trace Context Level 1 and Level 2 (random flag); parent-id checked against the recorded CLIENT span ID. |
| 7 | **Cardinality calculator** with label presets (model, tenant, user) | 4 | 2 | 4 | Reading | series = (buckets+2) x routes x statuses x instances x extra; 1.5 bytes per sample (Prometheus storage docs say 1 to 2). |
| 8 | **Head against tail sampling bars** on the real incident trace IDs | 4 | 5 | 2 | Reading | TraceIdRatioBased rule (lower 64 bits); tail = error or > 1 s or 5%. |
| 9 | **Flame graph** of emitting one request's telemetry, from a 1 ms sampling profiler, plus per-call cost tiles | 4 | 5 | 2 | Reading, profiling | bench.py, best of 5 x 20,000 calls; 694 stack samples. |
| 10 | **Dashboard first row** (RED plus a dependency panel) from the real range queries, incident shaded | 3 | 5 | 1 | Reading, dashboards | Shows the missing-series gap on the error panel, a real lesson. |
| 11 | Trace waterfall (shared renderer) for the typical trace | 4 | 5 | 3 | Reading, traces | Real spans, both processes. |

## Considered and rejected
- **Burn-rate budget-spending tab**: the sibling Reliability engineering already has "Error budget and alerts" (SLO, traffic, incident, final multiwindow rules). Built instead the six-approach comparison it lacks, and linked the sibling.
- **LLM metrics (TTFT, TPOT, vLLM metric names)**: owned by ML system design section 12; linked.
- **Live log tail animation** (lines scrolling): pretty, teaches less than the static 14-line stream plus the animation's search step.
- **A full Grafana-like dashboard tab**: one row in the Reading makes the point; a whole tab would repeat the Real telemetry tab's PromQL view.
- **Precision/recall curve over a threshold sweep**: the matrix with a significance selector shows the same with less abstraction.
- **Cost calculator across vendors**: prices for Grafana Cloud could not be captured (JavaScript-rendered page); a table of pricing units plus one worked sizing is honest; a calculator would imply precision that list prices do not have.

## What the methodology lacked for this page
- A rule for **own-run measurements that reveal a bug in the demo itself** (the traceparent case bug): the page reports it as a lesson; worth adding to the methodology as "keep and show the mistakes your measurement made".
- Guidance on **mixed real and illustrative inputs inside one visual** (the Alert lab's rules are verbatim, its incidents illustrative): labelled at the top of the tab.
