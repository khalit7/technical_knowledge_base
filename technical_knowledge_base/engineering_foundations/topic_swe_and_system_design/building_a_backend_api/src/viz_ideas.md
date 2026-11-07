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

## 2026-11-07: the split layout and renderer v2 stages (the 2026-11-06 rollout)
| Section | Visual now | Kind | Replaces |
|---|---|---|---|
| Top | Fig. 1 `stg-hero` (5 steps): the stages as glass plates across the request's path, the handler's borrowed resources (the pool drawn as 5 open + 10 overflow slots), the loop as a ring with flowing dots, 40 thread posts, the process's life along the front | 3D stage | H (the static service figure; its caption became the step list) |
| 2 | Fig. 2 `stg-life` (7 steps): the recorded request travels plate by plate, the logged order written on each, the camera moving in close per stage; the step's artefact (scope, log lines, code) under the stage | 3D stage | 1 |
| 5 | Fig. 3 `stg-pool` (5 steps): one pool, 20 pods against `max_connections` as bars on plinths, a deploy doubling it, then holding against borrowing twice (schematic, labelled) | 3D stage | new (the arithmetic was prose only) |
| 6 | Fig. 4 `stg-conc` (4 modes, 3 to 4 steps): every recorded request as a ball at its send time, waiting on the loop, in a thread or on its worker, flying to "answered" at its recorded answer time; each step plays a stretch of the run's clock; the four-on-one-scale summary under it | 3D stage replaying the recording | 5 (the 50-bar timelines; the summary is kept in 2D) |
| 9 | Fig. 5 `stg-shut` (2 modes, 6 and 5 steps): the listening socket as a plate that closes, the three clients and their connections, the handler and job filling over 3 s, the pool closing, the run's clock along the front | 3D stage replaying the recording | 8 (the lane stepper) |
| 10 | The handler stepper and the stream replay keep their 2D cards; their captions became step lists (`sx-llm`, `sx-sse`) and the service figure in the handler card became a one-line stage label | 2D animations | 9, 10 |

Kept 2D, and why: the onion (a nesting, flat by nature), the validation before/after (two JSON bodies), the hold and N+1 sliders (one number against one parameter), the settings ladder (an ordered list), the background-work timeline (three rows on one time axis), the four-style summary (four bars on one scale), every table and code block, and the closed exchanges explorer. No real image: nothing physical here that a photo would show better.
