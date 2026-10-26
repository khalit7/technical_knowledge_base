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
