# Visualisation ideas: Capacity planning and performance

What the text needs the reader to see: (1) that waiting, not work, dominates latency near saturation, and how sharply; (2) that the tail compounds across fan-out; (3) that the balancing policy changes the tail at equal cost; (4) what a cache stampede is and what each defence changes; (5) that a closed-loop load test hides stalls; (6) where real peak factors sit; (7) how forecast, peak, headroom and spares turn into servers.

Scores: teaching value (T), uses real data (R), interaction adds over a static view (I), cost (C, lower is cheaper). Each 1 to 5.

## Built

| # | Idea | Placement | T | R | I | C | Data and formulas |
|---|------|-----------|---|---|---|---|-------------------|
| 1 | Before/after animation: the same Poisson traffic through random, round robin, two choices, least outstanding (8 servers, 90%) with per-server queues, idle-while-waiting counter, running p99 | Reading, Load balancing | 5 | 3 | 5 | 3 | CP.lbSim (model.py twin); same arrivals and work for every policy |
| 2 | Before/after animation: one hot key expiring with no protection, coalescing, XFetch (per-request wait ticks and DB queries in flight) | Reading, Caching | 5 | 2 | 4 | 3 | CP.stampede; counts 60 / 1 / 1 checked in recompute.py; Facebook 17K/s to 1.3K/s quoted |
| 3 | Measured hockey stick: p50/p99/mean against measured utilisation, M/M/1 theory dashed | Reading, Queueing | 5 | 5 | 3 | 3 | Experiment 1 (lab/run_all.py hockey), 9 rates, real service times |
| 4 | Measured coordinated omission: scatter of every request's latency over a 60 s run, three readings (closed as reported, closed corrected, open) | Reading, Load testing | 5 | 5 | 4 | 3 | Experiment 2; closed p99 89 ms vs open 1,400 ms |
| 5 | Measured LB table with the simulation beside it at the measured utilisations | Reading, Load balancing | 4 | 5 | 1 | 2 | Experiment 3; 12 runs; sim within about 10% in units of S |
| 6 | Tail-at-scale fan-out widget (p, n) | Reading, Percentiles | 4 | 3 | 4 | 1 | 1 - (1 - p)^n; reproduces Dean and Barroso 63% and 18% independently |
| 7 | M/M/c + Kingman/Allen-Cunneen explorer (servers, cv, S) with measured dots | Reading, Queueing | 4 | 3 | 4 | 2 | Erlang C (root code), Kingman 1961 |
| 8 | Hit-rate maths widget (reads, hit rate, DB capacity) | Reading, Caching | 4 | 3 | 4 | 1 | (1 - h) lambda; Redis 0.143 ms from Numbers to know |
| 9 | Peak factors from real hourly Wikipedia traffic (three languages, average day shape) | Reading, Capacity planning | 4 | 5 | 2 | 2 | Wikimedia REST API, September 2026 |
| 10 | Capacity planner with presets (forecast, peak, target, N+k, cost) | Reading, Capacity planning | 4 | 3 | 4 | 1 | CP.plan; default reproduces the root simulator's 3 app servers at 50% by construction |
| 11 | Load-test lab: p50/p99/p99.9/mean vs utilisation for five policies; servers, distribution, slow server, theory lines, measured dots | Tab | 5 | 4 | 5 | 4 | CP.lbSim sweeps; M/M/1 and M/M/c theory; Experiment 3 |
| 12 | Tables computed live: M/M/c multipliers, supermarket limit, pool Erlang C, GIL experiment | Reading | 3 | 4 | 1 | 1 | recompute.py |

## Rejected

- **Closed vs open workload toggle inside the lab.** Would double the lab's controls; the measured Experiment 2 makes the point with real data, which is stronger than a simulated toggle.
- **A queue-length-over-time trace in the lab.** Duplicates the Reading animation (idea 1).
- **A flame graph built from a real py-spy run.** py-spy would need sudo on macOS to attach; an illustrative flame graph labelled as such teaches how to read one; real profiling is a tool skill, not a visual.
- **Consistent hashing ring animation.** Standard and well covered elsewhere; the text with nginx's and HAProxy's own wording carries it; Distributed systems fundamentals owns partitioning.
- **Cost-per-request against utilisation chart.** The planner already shows cost and utilisation side by side.
- **Rebuilding the root's Scale simulator or Numbers to know.** Linked by name instead (method rule).

## Inspiration
- The root's Scale simulator (M/M/c per component, fix chains) and Reliability engineering's measured retry storm (real local service, model checked against measurement).
- wrk2's README example (1.4 s pause, p99 6 ms vs 1.27 s) suggested Experiment 2's design.
- Mitzenmacher's Table 1 (supermarket model simulations) suggested the lab's theory comparison.

## What the methodology lacked for this page
- Guidance for local load experiments whose nominal parameters differ from the realised ones (sleep overshoot): the rule adopted here is to log the realised service time server-side and report measured utilisation everywhere.

## Added 2026-10-24 (teaching-contract rebuild)
| Idea | Placement | Why |
|---|---|---|
| Hero: mean time in the system at 50/80/90/95% busy, work against waiting to scale | Reading, top | The core sentence as a picture; static, from W = S/(1 - rho) |
| Little's law sizing three holders (cores 29, connections 3.5, model streams 2,315), log bars | Reading, Queueing 2 | Little's law had no visual; shows the same law across six orders of magnitude |
| Busy-hour LLM demand against one provider tier (RPM, ITPM, ITPM cached, OTPM) | Reading, LLM-backed services | Shows output tokens bind first and caching frees input; dated limits |
| Real images: Wikipedia production flame graph (CC BY-SA 4.0), one request in time order (CC0) | Reading, Profiling | A real profile teaches what to look for; the pair shows x is not time against x is time |

Rejected 2026-10-24: a latency-budget waterfall for the chat request (no sourced per-hop numbers for the model call; the fan-out widget carries the budget rule); moving the Load-test lab inline (a workbench used by three sections). The illustrative 640 px SVG flame graph became HTML bars in a closed block (legible at phone width).

## 2026-11-07: the split-layout rollout (renderer v2 stages)

Built as 3D stages (`parts/29_js_sc_*.js`, renderer `28_js_s3.js`, shared pieces `28b_js_sc_kit.js`), each with an `ol.sx` step list:
- **Fig. 1, one server under load** (replaces the 2D hero bars): the mean queue (Lq = rho^2 / (1 - rho)) as cubes in front of the server and W = S / (1 - rho) as a bar, at 50, 80, 90 and 95% busy, then Experiment 1's measured run at 94.7% (Little's law from the achieved rate and mean latency).
- **Fig. 2, four balancing policies** (replaces idea 1's 2D animation, 81 frames): the same CP.lbSim run grouped into four explained stretches of 10 S (the long-replay rule), every request a dot flying to the server it was sent to, then Experiment 3's measured p99 at 96% busy as bars. A copy of the simulation keeps each request's server; `check_stages.mjs` proves it returns CP.lbSim's latencies.
- **Fig. 3, what a cache does to the database** (new): the hit-rate widget's defaults at 90% and 99% hits and an empty cache, then Facebook's stampede peaks without and with leases. The hit-rate widget stays 2D beside the consequences.
- **Fig. 4, sizing a connection pool** (new): Little's law's 3.47 connections busy, then Erlang C's waiting share at 6, 8 and 10 connections. Holding against borrowing is linked to Building a backend API's Fig. 3, not redrawn.

Kept 2D, because each is a number on an axis or a table: the fan-out curve, the measured hockey stick (log axis), Little's law's three holders (log bars), the Kingman explorer, the supermarket and Erlang tables, the coordinated-omission scatter, the Wikipedia peak curves, the planner, the LLM demand-against-limit bars, the GIL table, and the Load-test lab (a reader-driven tool, full width). Rejected for 3D: the LLM section (GPU batch slots and the KV cache are owned by the serving pages; the client-side question is three numbers against three limits), and M/M/c against eight separate queues (Fig. 2's random mode already shows the eight separate queues).
