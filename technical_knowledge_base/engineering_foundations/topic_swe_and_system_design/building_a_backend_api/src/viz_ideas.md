# Visual ideas built and rejected (Building a backend API)

Rebuilt 2026-10-24. The page's question: *what happens to a request inside the service, and which choices decide how many requests it can hold, how it treats the database, and whether it stops cleanly?* The strongest visuals are therefore measurements of a real FastAPI and uvicorn process (`src/service/run_experiments.py`) and steppers over real recorded order and real handler code. All steppers use `RD.anim` from the skill template and wait on step 0.

## Built (2026-10-24)
| # | Section | Visual | Kind | Data |
|---|---|---|---|---|
| H | Top | The service figure: seven stages in a worker process, what the handler borrows, what the process shares, the process's life | static annotated diagram (hero) | the demo's design |
| 1 | 2 | One recorded request stage by stage, with the real ASGI scope and the logged order | stepper | recorded, `inputs/service_runs.json` |
| 2 | 4 | Middleware onion drawn from the recorded order | static diagram | recorded order |
| 3 | 5 | Holding a connection across the model call against borrowing twice; slider on the model call's duration; Little's law counters | before/after with one slider | derived; defaults reproduce Capacity planning's 11,570 by construction |
| 4 | 5 | N+1 against one query, 21 bars against 1, four round-trip presets | before/after with one slider | derived from Query planning and the root's Numbers to know |
| 5 | 6 | 50 requests x 500 ms under async+blocking, async+await, plain def, four workers; per-request bars plus one common-scale summary | before/after toggle, measured | recorded |
| 6 | 7 | Settings precedence ladder | static diagram, measured | recorded with pydantic-settings 2.16.1 |
| 7 | 8 | Inline against BackgroundTasks against a queue, on one time axis | static timeline, two rows measured, one drawn | recorded |
| 8 | 9 | SIGTERM with three things in flight, default against a 1 s graceful timeout | stepper over a recorded timeline | recorded |
| 9 | 10 | The message handler step by step, real code with line numbers, the service figure highlighting the stage | stepper | `service/app.py` |
| 10 | 10 | Replay of the captured stream at its real arrival times | animation with controls (kept) | captured 2026-10-04 |
| 11 | 2 (closed) | The 20 captured exchanges, every line explained (the old Wire lab) | explorer | captured 2026-10-04 |

## Removed in the rebuild (owned elsewhere)
HTTP anatomy (HTTP), offset against keyset bars and the drift animation (Service APIs carries the measurement), the idempotency animation (Service APIs), the JWT verifier (Auth's twelve-token lab), the webhook verifier (Service APIs and Streaming), Stripe-style dated versions and the Breaking or not? quiz (Service APIs; quizzes are out under the teaching contract).

## Rejected
- A load test of the demo across worker counts: Capacity planning owns load testing and the GIL experiment; section 6 shows only the handler-style mechanism.
- Measuring connection cost and N+1 again here: Running Postgres and Query planning already measured them on the same laptop; this page reuses their numbers.
- A Kubernetes shutdown run (kind or minikube with a preStop hook): minutes of setup for a result the Kubernetes docs state; the uvicorn run shows the part the service controls.
- A free-threaded Python comparison: Capacity planning's experiment 4 covers it.
