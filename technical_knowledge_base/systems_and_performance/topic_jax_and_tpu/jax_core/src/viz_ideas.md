# Visualisation ideas: JAX core (prefix jc)

Central question: what does each transformation do to a program, and what does it cost? Visuals were chosen to make an internal mechanism visible on the running example, with real recorded programs and numbers, never illustrative data.

| # | Idea | What it shows, what the reader does | Data and sources | Placement | Score | Status |
|---|---|---|---|---|---|---|
| jc1 | One primitive through three interpreters, against the same call with none (animation) | `sin` under jit(vmap(jvp)): each process_primitive call highlighted on the trace stack, equations appearing as jit's trace records them; toggle runs the un-transformed call (EvalTrace, one dispatch) | real call log from wrapping every Trace class's process_primitive (`run_trace.py`); source excerpts of bind, TracingContext | Reading, section 2 | 12 | built |
| jc2 | Jaxpr explorer | six real jaxprs; click an equation for primitive, inputs (with producer), outputs, params with sub-jaxprs, Python line, consumers highlighted | `jaxpr_export.py` structured export | own tab | 11 | built |
| jc3 | Autodiff tape (before/after transposition) | MLP of block 0: forward pass filling the tape (JAX residuals or PyTorch saved tensors), then each stage's linear program before and after transposition; forward-mode toggle; counters for equations, tape bytes, gradients, FLOPs | jaxprs of jvp, linearize, linear_transpose, vjp; saved_residuals; torch saved_tensors_hooks; XLA cost analysis | own tab | 13 | built |
| jc4 | Jacobian cost heatmap (k inputs x m outputs) | which of jacfwd and jacrev wins, by how much, from XLA FLOPs | cost_analysis, deterministic (`run_ad.py`) | Reading, section 5 | 12 | built |
| jc5 | Residual and memory bars | MLP and whole model: JAX residuals, PyTorch saved tensors, XLA scratch for loss, grad, grad with checkpoint | saved_residuals, saved_tensors_hooks, memory_analysis | Reading, section 5 | 10 | built |
| jc6 | Promotion table JAX vs NumPy | 12 x 12 real results of x + y, x64 toggle, differences highlighted | `run_array.py`, numpy 2.5.4 | Reading, section 1 | 10 | built |
| jc7 | Annotated jaxpr with hover legend | the grammar (constvars, invars, primitives, params, literals, outvars, sub-jaxprs) on a real jaxpr | `run_trace.py` | Reading, section 3 | 9 | built |
| jc8 | Primitive rules stepper (animation) | multiply_add, rules added one at a time; grid of which transformations work, with JAX's real error for the next failure | `run_prim.py` | Reading, section 10 | 11 | built |
| jc9 | Control-flow chooser + measured loop forms | questions to a recommendation backed by runs; bars of compile, run, HLO lines, equations at n = 10, 100, 1000; cond and while under vmap | `run_cf.py` | own tab | 11 | built |
| jc10 | Custom-derivative sweeps | value and gradient of each variant over x, NaN/inf ticks, reader at x; fixed-point residual bars; clip | `run_custom.py`, float64 NumPy reference | own tab | 11 | built |
| jc11 | Map of the page | boxes linking sections | none | Reading, top | 5 | built (navigation) |
| jc12 | Animated level stack (pre-0.4.36 dispatch) | | | | | rejected: describes deleted machinery; a sentence and links to both Autodidax versions do it |
| jc13 | Per-example gradient timing, toy tracer, recompile drills | | | | | rejected: built in the root's Transforms lab, linked |
| jc14 | Live jaxpr editor (type Python, see jaxpr) | | | | | rejected: no Python in a sandboxed page; recorded programs instead |
| jc15 | TPU vs CPU precision chart | | | | | rejected: no TPU here; CPU result plus the Precision docstring, TPU page linked |

What the methodology lacked for this page: nothing to "reproduce" from a publication; the equivalent discipline was that every visual shows a recorded program or an XLA count, and that prose numbers are checked against the data (`check_data.py`).

## 2026-10-23 rebuild (teaching contract)
| id | Visual | Kind | Decision |
|---|---|---|---|
| jc16 | Hero: one `sin` bound to the current trace, four interpreters | static annotated diagram (structure) | built, top of Reading |
| jc17 | Async dispatch timeline from the recorded times | static diagram (a time relation) | built, section 1 |
| jc18 | jit cache key segments lit by a drill table (root's recorded counts) | static diagram plus explorer | built, section 3; jc13's recompile drills now owned here as data, the root keeps its own drill UI |
| jc19 | Stateful generator against counter-based keys | before/after, static | built, section 10 |
| jc20 | Pytree flatten: leaves against treedef | static diagram | built, section 9 |
| jc21 | Autodiff tape, loop bars, custom-derivative sweeps | existing tab visuals | moved inline (each explained one mechanism) |
| jc22 | Real images | | none: a software page with no physical object to show |

## 2026-11-12 rollout (split layout, 3D stages v2)
| id | Visual | Kind | Decision |
|---|---|---|---|
| jc23 | One sin down a stack of three interpreters (the logged dispatch), with a no-transformation mode | 3D stage, 6 and 2 steps | built, Fig. 1 (hero): replaces jc16 and the 2D dispatch stepper of section 2 |
| jc24 | A jitted call's life: trace into a jaxpr (one plate per equation), lower to StableHLO, compile, cache, hit, retrace on a new shape | 3D stage, 7 steps | built, Fig. 2 (section 3), scan cell at n = 1,000 with its recorded stage times; hit and miss counts from the root lab's drills |
| jc25 | grad as the forward program plus its transposed equations, residuals on a tape, gradients by shape | 3D stage, 8 and 5 steps | built, Fig. 3 (section 6): replaces the 2D tape (jc21's tape part); the before/after equation panes stay as text beside the list |
| jc26 | vmap as per-pair plates merging into one batched dot_general | 3D stage, 4 steps | built, Fig. 4 (section 8), shapes from `run_vmap.py` |
| jc27 | A pytree flattened into leaves and a treedef, keyed, rebuilt | 3D stage, 6 steps | built, Fig. 5 (section 9): replaces jc20 |
| jc28 | Loop forms, cond under vmap, residual bars, Jacobian grid, sweeps, async timeline, promotion table, cache-key drills, PRNG before/after | 2D | kept 2D: numbers on an axis, tables or flat sequences; each now beside its text in a split |
| jc29 | A Python for loop unrolled into 5,000 plates against one scan plate | 3D | rejected for now: the loop bars of section 5 already show it with real counts; Fig. 2 shows one plate per equation for the scan form |
| jc30 | Real images | | none again: no physical object to show |
