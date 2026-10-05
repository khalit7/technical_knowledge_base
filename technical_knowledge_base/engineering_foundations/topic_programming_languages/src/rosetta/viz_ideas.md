# Rosetta tab: visual ideas

Question the tab answers: what does each language make you write, and what does it catch, for the same small real program?

## Built
1. **Annotated code reader** (score: computable 2, misconception 2, central question 2). Program plus six focused tasks, four languages, a note per block with the Python bridge, and a "Python habit that bites here" line per task. Side-by-side mode puts any two languages next to each other with optional notes. Every output block is the real capture from `run_all.sh`. Rittle-Johnson and Star (2007) on comparing worked solutions side by side motivated the two-up mode.
2. **Deliberate-mistakes matrix** (6 bugs x 4 languages, coloured by what really happened: compiler, type checker, crash, silent wrong answer, fine, not possible). Click a cell for code, exact message and explanation. The single most informative view for a Python programmer: it shows where each language moves the error (run time to compile time) with real messages (rustc E0502/E0382/E0499/E0277/E0369/E0609, tsc TS2551/TS2532, clang, mypy, ASan, TSan, CPython tracebacks).
3. **Same numbers in memory, before/after animation**: Python list (pointer array plus scattered 32-byte int objects), the same list reordered, NumPy array, C++ vector, Rust Vec. Drawn from the real addresses the programs print, objects to scale on the heap axis, with counters for bytes read, distinct 64-byte cache lines and pointer hops. Play/pause/step/scrub/speed via the shared RD.anim helper (pauses off screen, no autoplay under reduced motion).

## Rejected
- Timing bars per language: owned by the Benchmark tab.
- A V8 memory drawing: V8 exposes no addresses; the elements kind (PACKED_SMI_ELEMENTS) is shown as text output instead.
- Line-by-line alignment across languages (same row = same step): the programs differ in structure (C++ carries a parser, TS is async), so forced alignment would mislead; blocks with notes instead.
- Async Rust with tokio: adds a large dependency for one snippet; the concurrency axis is covered by threads, and the Reading/Design tabs discuss async.

## What the methodology lacked
Nothing to reproduce from a publication here: the "published figure" rule became "every output is a capture, and a script asserts the four programs agree byte for byte".
