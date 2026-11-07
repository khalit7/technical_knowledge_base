# Visualisation ideas (trimmed from the language page's src/ja/viz_ideas.md, 2026-10-26)

| # | Idea | Data | Placement | Status |
|---|---|---|---|---|
| 1 | **Event-loop stepper**: six programs stepped line by line with call stack, nextTick queue, microtasks, timers, check phase and pending I/O; 5a/5b runs the same three lines as CommonJS and as an ES module (before/after) | printed lines: real Node 24.21.0 output, 20 of 20 runs identical; queue contents explained (Node does not expose them) | Reading section 2, inline (was its own tab on the language page: it explains one mechanism) | built |
| 2 | **Three jobs to scale, four modes** (sequential, `Promise.all`, a blocking busy-wait, a worker), the same jobs as the Python child | real events from `i4_trace.mjs` | Reading section 3 | built |
| 3 | **SSE chunks through two parsers**, before/after on the same nine real chunks; parsers run live and are checked against the recording | `j1_sse.mjs` | Reading section 5 | built |
| 4 | **Hero: the queues around one thread** (stack, nextTick, microtasks, one macrotask by phase, libuv below); a row on wide screens, a column on phones | static diagram | top | built 2026-10-26 |
| 5 | **Concurrency-limit bars** (limit 1, 4, 20 against the ideal) | read from the embedded `i9_limit` output | Reading section 4 | built 2026-10-26 |
| 6 | Microtask starvation demo (a promise loop that keeps a timer from ever running) | would need a new run | | not built: the drain rule and program 3 show it; a new run was not in scope of the split |

## 2026-11-07: the split layout and 3D stages (renderer v2)
| # | Idea | Data | Placement | Status |
|---|---|---|---|---|
| 1 | Event-loop stepper as a **3D stage** (Fig. 2): the call stack, the nextTick and microtask queues as lanes, timers, poll and check as a ring of phase plates, libuv on the floor behind; callbacks fly between them with flowing dots, printed lines go to a console | `loop_steps.json` (the stepper's states) and the recorded outputs | Reading section 2, right column; the program stays text on the left, its lines lit per step | built (replaces the 2D stepper) |
| 4 | Hero as a **3D stage** (Fig. 1), five steps introducing the same parts, the last one program 1's real order | recorded output of `l1_basic.mjs` | top | built (replaces the 2D hero) |
| 7 | **Backpressure pipeline** (Fig. 3): source, Transform and sink with their four buffers as stacks of 1 KiB blocks, highWaterMark as a glass plate; `pipeline()` against a loop that ignores `write()`'s false | new run `k1_backpressure.mjs` (Node 20.20.1, Linux), four identical runs | Reading section 5 | built |
| 8 | **Promise chain** of `i2_promises.mjs` (states and values per `.then`) | read from the embedded output | Reading section 1, right column | built (2D: a chain of five boxes is flat) |
| 2, 3 | Timeline and SSE replay in 3D | | | rejected: an ordering trace on a time axis and text chunks read best flat (2D lanes and text); now RD.anim with step lists, the timeline's steps grouped into 4 to 6 stretches per mode |
| 5 | Limit bars in 3D | | | rejected: three numbers on one axis |
