# torch.compile from the user's side: visual ideas (built and rejected)

The question the page keeps returning to: when does compile pay, what does it cost, and how do you see what it did?

## Built
| Idea | Where | Why it earns its place | Data |
|---|---|---|---|
| One MLP call instruction by instruction, Dynamo tracing against CPython running it (before/after on the same input): bytecode, VariableTracker stack, FX graph growing, guards, kernels run | Reading 1 | Makes "symbolic evaluation of bytecode" concrete: the same instructions, nothing computed on one side, 9 ATen calls on the other. The Compile lab rejected a bytecode walk as belonging to The compiler stack page, but that page shows logs of small programs, not a stepper on the running example | walk.py (Dynamo's step() wrapped; TorchDispatchMode with the executing frame's f_lasti) |
| Guard tree excerpt and leaf kinds | Reading 2 | Turns "549 guards" into what they check | TORCH_LOGS=guards |
| Nested graph breaks on 4 programs; break kinds table with Dynamo's reason and fix | Reading 3 | Measured surprise: nested_graph_breaks does nothing inside a for loop | nested.py, fixer.py |
| Graph-break fixer: 9 lines x 12 fixes, code side by side, one forward played broken and fixed | Tab | The brief's lab; shows the uncompiled outer frame | fixer.py |
| Dynamic shapes: the same six lengths under five strategies, compiles per call and the failing guard | Reading 4 | One table answers "how many compiles will I get" | dynamic.py |
| Recompile limit stats and the real warning; unbacked graphs; PGO with and without a job id | Reading 4 | Silent eager fallback and PGO's job-id requirement are both easy to miss | dynamic.py, pgo.sh |
| Partitioner bars: bytes saved vs backward ops for five cuts; predict the recompute cost | Reading 5 | The memory/compute trade on one block, with eager as a check | aot.py, time_steady.py |
| Partitioner explorer: 144-op joint graph coloured per cut, animated from default to budget 0.0, tap a node | Tab | The brief's lab; shows which ops cross the cut and which are recomputed | aot.py |
| Fusion animation: 16 scheduler nodes, 6 fusions, 27 rejections, 4 kernels | Reading 6 | Before/after of the scheduler on the real block | inductor.py (TORCH_LOGS=fusion parsed) |
| C++ vs Triton vs wrapper for the same fused GELU | Reading 6 | Same decisions, two back ends; Triton generated without a GPU | inductor.py, triton_gen.py (Docker) |
| Modes table from list_mode_options; compiled autograd table; DDPOptimizer graph counts per bucket size | Reading 7, 8 | Each a recorded fact otherwise only described | probe, ca.py, ddp_compile.py |
| Cold compile bars, whole vs per block vs nested region at 4 and 8 blocks; cold/warm/mega bars | Reading 9, 10 | The two compile-time levers, measured | time_compile.sh |
| Compile time and caches tab: first step played back to scale with phases; every run with cache hits and load | Tab | The brief's timed lab | time_compile.jsonl |
| torch.export outcomes table (dynamic specs, wrong specs, control flow) | Reading 11 | Each error message is the lesson | export.py |
| tlparse compile-id table; minifier session stats and final repro | Reading 12 | Shows what the tools give you on a real run | trace_run.py + tlparse, minify.py |

## Rebuild of 2026-10-23
| Idea | Where | Why |
|---|---|---|
| Hero: three compilers on the first call, the guard check on every later call, graph-break and recompile off-ramps, measured numbers in each box | top | The whiteboard picture the page elaborates; static annotated diagram (structure) |
| Dynamic-shapes grid: six calls x five strategies, compiled / reused / error, totals | section 4 | One picture answers "how many compiles will I get" for every strategy at once; replaced the per-strategy call table |
| Partitioner trade-off: bytes kept against backward ops, five cuts | section 5 | Memory bought with recompute is a trade-off curve, not a list of bars |
| Phase bars for regional compilation and for caches (static) | sections 9, 10 | Replaced the tab's time playback: where the seconds go is the point, not watching them pass |
| Graph-break lane as SVG, one row per block | section 3 | The fixer moved inline; a lane per block shows the eager gaps where they are |
| Moved inline: fixer, joint-graph explorer | sections 3, 5 | Each explains one mechanism, so it sits beside its claim (teaching contract) |

## Rejected
- Max-fusion-size knob (max_fusion_size=1) in the knobs list: it reduced backward kernels from 9 to 5 instead of increasing them; not understood, so not shown (data kept in inputs/inductor.json).
- A compile-time extrapolation to 32 or 80 blocks: only 4 and 8 were measured; the flat regional line is shown, no fit.
- GPU speed-up charts: no NVIDIA GPU; the vendor figure is quoted and labelled.
- A full 59-node FX graph drawing: the walk and the fusion strip carry the structure at phone width.
- Running Triton kernels on a CPU interpreter: Triton has no macOS wheel; generated source only, in Docker.
- A break-even calculator: the Compile lab already has one.

## What the methodology lacked
Recording a tracer's internal state (Dynamo's stack per instruction) needs a wrapped internal function, not a public API; that is said on the page. Timings on a shared laptop needed load averages per run and medians of fresh processes.
