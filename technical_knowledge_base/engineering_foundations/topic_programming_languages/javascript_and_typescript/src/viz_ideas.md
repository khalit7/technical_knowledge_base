# Visuals of "JavaScript and TypeScript: the essentials" (2026-10-26)

| Visual | Kind | Where | Status |
|---|---|---|---|
| Hero: `count.ts` erased to `count.js`, then run on one thread (call stack, microtask queue, task queue, the loop), with libuv and worker threads beside it | static annotated diagram in HTML boxes (reflows to one column at phone width) | top | built |
| Heartbeat bars: worst timer gap with the prime count on the main thread against in a worker (438 against 14 ms) | static bars from `k6_workers.txt` | section 2 | built |
| Memory bars: streamed against whole file (71 against 347 MB) | static bars from `m3_memory.txt` | section 2 | built |
| Start-up bars: Node 22, 24, 26, Bun, Deno, CPython | static bars from `m2_startup.txt` (were drawn by script on the old page) | section 3 | built |
| Install bars: npm, pnpm, Bun reinstall from lockfile | static bars from `l2_pnpm.txt` | section 3, closed block | built |
| Runtimes and packages as one table | table | section 3 | built (the plan's condensation of old sections 12 to 14) |
| Event-loop stepper, three-jobs timeline, SSE replay | steppers | | not here: owned by the event-loop child (linked from the hero caption and the traps table) |
| Type erasure stepper | stepper | | not here: owned by the TypeScript child |
| `node_modules` tree explorer (npm flat against pnpm links) | | | rejected (as on the old page): the table row and the real `npm ls debug` and `readlink` outputs carry it |

No widget on this page: every figure is static, so nothing can move before the reader acts.
