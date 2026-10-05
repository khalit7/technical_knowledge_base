# Part 1 (JavaScript and its runtime): visualisation ideas

Scored on the methodology's axes (teaches the mechanism, uses real data, before/after of one input, interaction earns its place); 0 to 2 each.

| # | Idea | Data | Placement | Score | Status |
|---|---|---|---|---|---|
| 1 | **Event-loop stepper**: six programs stepped line by line with call stack, nextTick queue, microtasks, timers, check phase and pending I/O; 5a/5b toggle runs the same three lines as CommonJS and as an ES module (before/after) | Printed lines: real Node 24.21.0 output, 20 of 20 runs identical; queue contents explained (Node does not expose them) | Own tab `t-ja-loop` | 8 | built |
| 2 | **Three jobs to scale, four modes** (sequential await, Promise.all, a blocking busy-wait, the same work in a worker): the Python page's asyncio replay, same jobs, so the two can be compared | Real events from `i4_trace.mjs` (ms stamps) | Reading section 9 | 8 | built |
| 3 | **SSE chunks through two parsers** (parse per chunk against buffer then parse): the real 9 chunks the client received, a split emoji, live parsers checked against the recorded run | `j1_sse.mjs` recorded chunk lengths; parsers run in the page | Reading section 11 | 8 | built |
| 4 | **Predict-the-output drills with a live runner**: 22 programs, recorded Node output, live run in the browser compared line by line (all 22 identical in headless Chrome) | `code/q/`, `outputs/q_*.txt` | Own tab `t-ja-play` | 7 | built |
| 5 | Start-up bars (Node 22/24/26, Bun, Deno, Python) | `m2_startup.sh`, hyperfine | Reading section 14 | 4 | built (static bars) |
| 6 | Hidden-class transition tree animation | `%HaveSameMap` outputs | Reading section 15 | 3 | rejected: the four-line real output plus the measured 1/4/8-shape timing teaches it; a tree drawn from V8 internals would be illustrative, not real |
| 7 | node_modules tree explorer (npm flat against pnpm symlinks) | `npm ls` outputs | Reading section 13 | 3 | rejected: the real `npm ls debug` and `readlink` outputs carry it in two lines |
| 8 | Prototype-chain lookup animation | none real | Reading section 5 | 3 | rejected: Python's MRO equivalent is on the Python page's Data model tab; the real `Object.getPrototypeOf` output is enough |
| 9 | Live runner for the whole Reading (every snippet editable) | | | 4 | rejected: Node-only APIs (fs, process, http) cannot run in the page; the playground takes any snippet pasted into it |

Inspiration: Jake Archibald's "In the Loop" (task and microtask queues drawn as boxes), Philip Roberts' Loupe, the Python page's `t-pa-loop` replay (same three jobs on purpose).

What the methodology lacked here: a rule for live code execution in a sandboxed page (fallback chain and honesty about what is recorded versus live), and for explanations whose intermediate states cannot be observed (the stepper: only the observable part, the printed order, is verified against real runs).
