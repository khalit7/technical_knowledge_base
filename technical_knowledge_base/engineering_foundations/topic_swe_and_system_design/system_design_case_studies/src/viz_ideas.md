# Visualisation ideas: System design case studies (2026-10-04)

Central question: given a product, which part is hard, and how do you find it with numbers rather than guess it? Visuals were scored on teach (T), data (D: real or computed), cost (C, higher is cheaper), plus a point for a before/after animation.

| Rank | Idea | T | D | C | Placement | Status |
|---|---|---|---|---|---|---|
| 1 | Build-up diagram per design: the naive design, then each bottleneck the estimate exposes (red) and its fix (green), with counters showing the naive design's value struck through beside the current one on the same load (before/after on every step); one renderer, seven specs; lanes stacked at phone width | 5 | 4 (counters from the estimate defaults) | 3 | Reading, one per design | built (22_js_dia.js, 26_js_designs.js) |
| 2 | Live estimate tables with "10x" and "100x" buttons and editable inputs; rows over a single machine's capacity turn red; formulas are strings evaluated identically by Python and JS | 5 | 4 (root constants, sourced inputs, illustrative labelled) | 4 | Reading, one per design | built (est_spec.json, 24_js_est.js) |
| 3 | Rate-limiter race measured on a real database: check-then-act admitted 117 to 119 against a limit of 100 (32 clients), atomic exactly 100, three runs | 5 | 5 (real) | 4 | Reading, design 2 | built (lab/measure_pg.py) |
| 4 | Fan-out on read against on write measured: 2.9 ms against 0.085 ms median read (34x), fan-out of the top account 117x the median, 766 MB of timelines for a 10,000-user toy | 5 | 5 (real; synthetic Zipf graph, labelled) | 3 | Reading, design 4 | built |
| 5 | Design drill: 12 prompts, 45-minute clock with Xu's phases, step-by-step reveal, self-check lists saved in the browser | 5 | n/a (practice tool) | 3 | Own tab | built (31_js_drill.js) |
| 6 | Celebrity-threshold slider (write amplification against read-time merges on a synthetic follower graph) | 4 | 2 (synthetic) | 3 | Reading, design 4 | rejected: the measured table and the estimate rows make the point with real numbers; a slider on an invented graph adds little |
| 7 | Redis Lua rate limiter measured on a real Redis | 5 | 5 | 2 | Reading, design 2 | rejected for now: no Redis on this machine; building it from source was set aside; PostgreSQL shows the same race and fix |
| 8 | Code-space collision curve (birthday bound) for 6 and 7 characters | 3 | 5 | 4 | Reading, design 1 | rejected: the two fill percentages in the estimate say it; a curve adds a chart without a decision |
| 9 | Animated message delivery through gateways and channel servers | 3 | 2 | 2 | Reading, design 3 | rejected: the build-up diagram shows the routing; a packet animation would be decoration |
| 10 | A rebuild of the root's Scale simulator or Numbers to know | n/a | | | | rejected: linked by name instead (Part B rule) |
| 11 | Rate-limiting algorithms animated | n/a | | | | rejected: Reliability engineering already animates five limiters on one burst; linked |

What the methodology lacked for this page: a page that applies other pages has few mechanisms of its own to animate; the useful animation turned out to be the design process itself (naive, bottleneck, fix), and the useful interactive was the estimate, because "which part is hard" is the question a number answers.
