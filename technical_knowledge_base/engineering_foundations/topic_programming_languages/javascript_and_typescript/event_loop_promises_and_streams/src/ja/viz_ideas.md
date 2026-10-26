# Visualisation ideas (trimmed from the language page's src/ja/viz_ideas.md, 2026-10-26)

| # | Idea | Data | Placement | Status |
|---|---|---|---|---|
| 1 | **Event-loop stepper**: six programs stepped line by line with call stack, nextTick queue, microtasks, timers, check phase and pending I/O; 5a/5b runs the same three lines as CommonJS and as an ES module (before/after) | printed lines: real Node 24.21.0 output, 20 of 20 runs identical; queue contents explained (Node does not expose them) | Reading section 2, inline (was its own tab on the language page: it explains one mechanism) | built |
| 2 | **Three jobs to scale, four modes** (sequential, `Promise.all`, a blocking busy-wait, a worker), the same jobs as the Python child | real events from `i4_trace.mjs` | Reading section 3 | built |
| 3 | **SSE chunks through two parsers**, before/after on the same nine real chunks; parsers run live and are checked against the recording | `j1_sse.mjs` | Reading section 5 | built |
| 4 | **Hero: the queues around one thread** (stack, nextTick, microtasks, one macrotask by phase, libuv below); a row on wide screens, a column on phones | static diagram | top | built 2026-10-26 |
| 5 | **Concurrency-limit bars** (limit 1, 4, 20 against the ideal) | read from the embedded `i9_limit` output | Reading section 4 | built 2026-10-26 |
| 6 | Microtask starvation demo (a promise loop that keeps a timer from ever running) | would need a new run | | not built: the drain rule and program 3 show it; a new run was not in scope of the split |
