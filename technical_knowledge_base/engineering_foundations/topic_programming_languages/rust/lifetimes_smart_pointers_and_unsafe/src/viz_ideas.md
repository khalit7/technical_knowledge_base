# Visuals: built and rejected

| Visual | Kind (teaching contract) | Where | Data |
|---|---|---|---|
| Hero: one rule, four places it is checked (compiler for references, compiler across threads, run time, you inside unsafe) and what a violation becomes in each | static annotated diagram | top | the page's own recorded errors and panic |
| Lifetime bars, before/after: life_err2.rs (use after b's block, E0597) against life.rs (use inside it) | before/after on the same function | section 1 | line numbers of the two programs and their recorded results |
| Rc stepper: handles and one heap block, strong count 1, 2, 3, 2, 0 | stepper (a process) | section 2 | smart.rs lines 31 to 38; counts 3 and 2 are printed values |
| Rc cycle against Weak back edge | before/after, static | section 2 | leak.rs's printed counts and drop lines |
| Send and Sync table, every cell compiled | table generated and checked by gen.py | section 3 | sendsync.rs (25 yes) and sendsync_err.rs (9 refusals) |
| split_at_mut: two disjoint &mut halves and the invariant | static annotated diagram | section 4 | unsafe_ok.rs output |
| Release build against Miri on the same UB program | before/after, real outputs side by side | section 4 | l_ub_run, l_ub_miri |

## Rejected
- An animated data race (two threads interleaving loads and stores): the OS concurrency page owns races as interleavings; linked.
- A RefCell borrow-flag animation: the panic line from a real run says it more plainly than a counter drawing; the hero names it.
- Redrawing the borrow timeline of the essentials page's section 5: linked instead.
- A Miri run on the Rc cycle and on an aliasing violation: would need the nightly toolchain installed; the README's list is quoted and marked not run here.

## 2026-11-07: the split layout and 3D stages
Built (renderer v2, each with a step list, all values from `LSP_DATA`, which `ra/gen.py` reads from the sources and recordings):
| Stage | Replaces | Why depth helps |
|---|---|---|
| Lifetimes as slabs along the lines of `main`, stacked by scope, the borrow on top; the use after the block overhangs (6 steps) | the 2D before/after toggle | height carries "rests on": a borrow must be supported by its owners along its whole length; the overhang is the error, visible without reading the bars' ends |
| Box, Rc and Rc<RefCell<T>>: handles on a stack plate, blocks and count towers on the heap floor (7 steps) | the 2D Rc stepper | the two regions and the pointers between them are spatial; the count is a physical tower that rises and falls; same layout as the C++ ownership page, so the two compare directly |
| threads.rs: main in front, threads on an arc, the shared value in the middle (8 steps) | the toolbox table | many threads around one shared value is spatial; flows show who reaches the value (one at a time under the lock, all at once with the atomic) |
| unsafe: stack plate, a glass `unsafe { }` gate, heap cells with byte offsets (6 steps) | the static split_at_mut diagram | pointers crossing a boundary into memory; the read past the end lands on a cell outside the allocation, where Miri's wall stands |

Kept 2D: the hero (a four-column map, flat by nature), the Rc cycle before/after (two states read at a glance; the C++ page's 3D stage replays the same cycle and is linked), the Send and Sync table (a table). Rejected for 3D: the Miri before/after (real text outputs side by side are the evidence), the elision rules (a table), the race errors (compiler text).
