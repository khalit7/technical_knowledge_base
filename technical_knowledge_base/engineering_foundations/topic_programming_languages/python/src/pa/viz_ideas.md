# Visualisation ideas, Part 1 (In depth)

Method: html_utils/interactive-html-ideas.md section 2. The reader writes Python daily but has gaps in the model underneath, so every visual shows a real run (recorded outputs, real object ids, real timestamps, real bytecode), and the favourite form, one input animated before/after, is used wherever a mechanism has a "with and without".

## Built (ranked)

| # | Visual | Where | Before/after | Data | Score (teaches / real data / effort) |
|---|---|---|---|---|---|
| 1 | Event loop replay: three coroutines, four modes, drawn to scale, per-step captions, counters (clock, suspended/ready/done, lateness) | tab `t-pa-loop` | sequential / gather / gather with a blocking call / gather with `to_thread` | `a2_trace.py` timestamps | 5 / 5 / 4 |
| 2 | Data model explorer: 19 expressions, each with the special-method calls in order, logged calls green, C-internal steps grey, the rule at the end | tab `t-pa-dm` | pairs: `A+A` vs `int+A` vs `A+B(subclass)` vs failure; `with` returning False vs True; four attribute lookups | `d2_dispatch.py` traces | 5 / 5 / 3 |
| 3 | Names to objects graph, step by step | Reading 1 | `grid.copy()` vs `copy.deepcopy(grid)` on the same five lines | `n7_graph.py`, labels from `id()` | 4 / 5 / 3 |
| 4 | Eager vs lazy pipeline, item by item, with "items stored in lists" counter | Reading 3 | lists vs generators, same three lines | `g2_order.py` printed trace; peak memory from `g3_memory.py` | 4 / 5 / 3 |
| 5 | Bytecode before and after specialisation | Reading 11 | generic, after ints, after floats (re-specialised) | `i1_dis.py` with `adaptive=True` | 4 / 5 / 2 |
| 6 | Predict-the-output drills (26), self-marked, by topic | tab `t-pa-drill` | n/a | `q_drills.py` | 4 / 5 / 2 |
| 7 | Bars: threads vs processes, GIL vs free-threaded | Reading 9 | GIL build vs 3.14t | `k1_gil.py` | 3 / 5 / 1 |
| 8 | Bars: loop vs map+fsum vs NumPy vs conversion, four sizes | Reading 12 | n = 10 to 1,000,000 | `p2_numpy.py` | 3 / 5 / 1 |

Inline "Predict, then reveal" boxes (`<details>`) on 11 snippets carry the hands-on part inside the Reading.

## Inspiration

- Beazley's "Python Concurrency From the Ground Up" (builds an event loop live): the loop replay shows the same scheduler decisions on real timestamps.
- Python Tutor (pythontutor.com) for the names/objects graph; here the graph is CPython's real sharing from `id()`, not a model.
- The DeepSeek MLA explainer for the play/pause/step/scrub/speed controller (`RD.anim`).

## Rejected

- A GIL "who holds the lock" thread animation: the bars plus the free-threaded comparison say it with real numbers; an animation would be illustrative only.
- An MRO/C3 graph animation: one printed `__mro__` and the cooperative `super()` trace teach it; the Predict tab has the diamond.
- Flame graph of the slow program: py-spy needs root on macOS; cProfile's table and Scalene's summary are shown instead.
- A memory "heap" animation for refcounting: the `weakref.finalize` output shows the moment of death directly.
- Free-threading scaling and JIT on/off charts: owned by Part 2.

## What the methodology lacked

Nothing new needed beyond: for a teaching page, the "real data" rule applies to program behaviour, so traces (event order, call order, object identity) are recorded from runs and replayed, never hand-written. Steps that happen inside C and cannot be logged from Python are drawn differently and say so.
