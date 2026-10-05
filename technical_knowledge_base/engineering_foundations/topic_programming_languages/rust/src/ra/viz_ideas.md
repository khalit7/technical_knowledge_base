# Visualisation ideas for Part 1 (Rust for Python programmers)

What the text needs to be understood: (1) what a move, a borrow, growth and a clone do to memory; (2) why the borrow
checker refuses a program, read off its error; (3) practice turning Python habits into Rust; (4) evidence that
iterators are zero-cost. Scores are 1 to 5 (teaching value, uses real data, not already on the root or a sibling).

| Rank | Idea | Score | Placement | Data |
|---|---|---|---|---|
| 1 | Ownership animation: one `Vec` borrowed, grown, borrowed mutably, moved, cloned, dropped, drawn as stack slots and heap blocks at the addresses a real run printed; toggle to the same steps in Python (names, one object, refcount) | 5, 5, 4 | own tab `t-ra-own` | `out/l_own_anim.txt`, `out/l_own_anim_py.txt` |
| 2 | Borrow-checker lab: 15 scenarios, predict (compile error, panic, runs), the real error, "read it" notes, the fix and its output | 5, 5, 5 | own tab `t-ra-bc` | `code/bc/`, `out/bc_*` |
| 3 | Python to Rust drill: 12 Python snippets, three Rust candidates, pick the one that behaves the same; all three revealed with real results | 5, 5, 5 | own tab `t-ra-drill` | `code/drill/`, `out/dr_*` |
| 4 | Borrow timeline (before/after): the "gate" program with each borrow drawn as a bar from creation to last use, conflict in red; toggles to "last use moved up" and "copy the value", each with its real compiler result | 4, 4, 5 | inline, Reading section 5 | `out/l_gate_*` |
| 5 | Measured iterator bars: five Rust versions of one loop and two CPython versions, ns per element, log scale | 4, 5, 4 | inline, Reading section 11 | `out/t_iterbench*.txt` |

Animation rules followed: RD.anim controls (play, pause, step, scrub, speed), animating only on screen and in the visible
tab, paused under `prefers-reduced-motion`; redraws registered on this part's own tab ids (RD.anim registers on `t-read`,
which this page does not have).

## Rejected
- A dangling-reference animation (C++ runs, Rust refuses, Python keeps alive): the root page's Reading section 5 has it;
  linked instead.
- A memory-layout view of `Vec<Record>` against a Python list: the root's section 5 has it with real addresses.
- A monomorphisation diagram: the symbol table from `nm` (four `biggest::<T>` functions) shows it more honestly as text.
- A lifetimes diagram with nested scope boxes: the borrow timeline plus the real E0597 output teach the same thing.
- Timing `dyn` against generics in isolation: kept inside the iterator benchmark, where its effect (no inlining, no
  vectorisation) is visible. An earlier run where the optimiser devirtualised the visible-target `&dyn Fn` (same speed as
  generic) was not reproducible across builds, so only the hidden-target version (via `black_box`) is shown.

## What the methodology lacked for this page
Language-teaching pages need "real output" as the data unit (compiler errors, panics) rather than numbers; the pipeline
(`gen.py` directives and a check that the page embeds exactly the recorded files) is the adaptation, borrowed from the C++
page's Part 1.
