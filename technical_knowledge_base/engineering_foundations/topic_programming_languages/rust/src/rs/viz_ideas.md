# Part 3 (rs) visualisations

| # | Idea | Score (teach / data / cost) | Placement | Data |
|---|---|---|---|---|
| 1 | Async replay: jobs A, B, C on tokio, asyncio and Node, five modes, playhead over a measured time axis, caption per event, state when idle | 5 / 5 measured / medium | tab t-rs-async | out/a2_trace.json, out/cmp_trace_py.json (the Python page's a2_trace.py re-run), out/cmp_trace_js.json |
| 2 | A request's life: 6 requests on 2 async workers, counting inline vs spawn_blocking (before/after), measured counters | 5 / schedule modelled from measured cost C = 2 / inline throughput; counters measured / medium | Reading, Async 6 | bench/results/bench_run2_B.json |
| 3 | Service benchmark: axum vs FastAPI, 4 configs x 5 loads x 4 metrics, median bars with min-max whiskers, every run listed, Experiment B table | 4 / measured / low | tab t-rs-bench | bench/results/bench_run1.json |
| 4 | CLI replay: 11 recorded sessions typed out, predict the exit code, score | 4 / recorded / low | tab t-rs-cli | out/cli_*.txt via cli_sessions.py |
| 5 | Predict-then-reveal blocks for every compiler error and run (14) | 4 / recorded / low | Reading | out/ |

Rejected: a flame graph of tokserve (adds tooling, little for this reader); a live in-page HTTP simulator (no network in the iframe and would be fake); an image-size bar chart (Docker daemon not running, so no measured images; a table with sourced base sizes instead).

Methodology gaps: shared-laptop measurements need median + spread + load average beside every number; the methodology says nothing about a second benchmark silently measuring rejections (the 2 MB body limit): add "check status-code distributions of every load run".
