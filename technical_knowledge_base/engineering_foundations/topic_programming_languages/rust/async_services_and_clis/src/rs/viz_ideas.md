# Visuals (this page; carried from the Rust page's Part 3 and re-placed 2026-10-26)

| # | Visual | Kind | Placement | Data |
|---|---|---|---|---|
| 0 | Hero: one request through tokserve (tower layers, handler task, worker lanes switching at .await, a CPU loop holding a worker, I/O driver and timers waking tasks, the blocking pool) | static annotated diagram | Reading, top | hand-built SVG |
| 1 | Async replay: jobs A, B, C on tokio in five modes, playhead over the measured time axis, caption per event | stepper over a measured trace | Reading, Blocking section (was its own tab; asyncio and Node lanes dropped: those runtimes have their own pages) | out/a2_trace.json |
| 2 | A request's life: 6 requests on 2 async workers, inline vs spawn_blocking (before/after), measured counters, plus the Experiment B table | before/after stepper | Reading, Blocking section | bench/results/bench_run2_B.json |
| 3 | Service benchmark: axum vs FastAPI, 4 configs x 5 loads x 4 metrics, median bars with min-max whiskers; every run and the caveats in closed blocks | one chart, two selectors | Reading, Measured section (was its own tab) | bench/results/bench_run1.json |
| 4 | CLI replay: 11 recorded sessions, predict the exit code | stepper with prediction | Reading, CLI section (was its own tab) | out/cli_*.txt via cli_sessions.py |
| 5 | Predict-then-reveal blocks for compiler errors and service responses | prediction prompts | Reading | out/ |

Rejected: a flame graph of tokserve (adds tooling, little for this reader); a live in-page HTTP simulator (no network, would be fake); an image-size bar chart (no images built; a sourced table instead); keeping the three-runtime replay (the comparison belongs to the topic root's concurrency axis and the Python and JavaScript children).
No visual autoplays: mode switches reset to step 1 (the language page played them), the CLI replay draws its first session still.
