# Visuals: built and rejected (2026-10-26)

Built
- Hero (`24_js_ci_hero.js`): a list of pointers to separate float objects and the evaluation loop, against one contiguous NumPy buffer, with the measured times as bars on one scale. Structure plus the cost it causes; static.
- Speed-up ladder under the hero: the JIT on 3.15, the profile-guided fix, the loop moved into NumPy, each measured on this page.
- Object layouts (section 2): C int64, float, int 1, int 2**60 drawn to scale in bytes, from `sys.getsizeof`.
- Bytecode stepper (section 1, from the language page's Reading): three real `dis` listings, changed rows highlighted; steps only when the reader acts.
- Profile bars (section 3): the slow program with and without cProfile, and the fix.
- NumPy bars (section 4, from the language page): four sizes, four ways.
- JIT table (section 5, from the language page's Reading) and every run (the Runtime lab's part 3, now a closed block).
- Release lines (section 6, moved from the Version explorer tab into the Reading) and the UTF-8 run on 3.14 and 3.15 as a terminal.
- Lazy-import stepper and wall-time bars (section 7, from the language page); a mode switch now resets instead of playing.
- Version explorer tab: kept as a tab (a lookup tool with a minimum-version filter, kind chips, a grid of 105 runs and a drill), not an explanation of one mechanism.
- Prediction prompts: specialisation, profiler overhead, NumPy at 10 elements, the JIT; the two "internals" drills of the old Predict tab (integer caching, float arithmetic) as reveals.

Rejected
- An animated evaluation loop executing bytecode instruction by instruction: the stepper over real listings shows what changes; a per-instruction animation would be illustrative only.
- A memory chart of the cycle collector: Memory allocators section 7 owns the memory behaviour.

## 2026-11-07 (split layout and 3D stages)
Built
- Fig. 1 hero as a 3D stage (list of pointers to boxed floats, the evaluation loop plate, NumPy's buffer and four C passes, the measured times).
- Fig. 3 evaluation loop as a 3D stage: frame, value stack and the six real loop instructions, values moving on flows, then the in-place rewrites. The 2026-10-26 "rejected" entry (an animated evaluation loop would be illustrative only) is answered by driving it from the real listing, the real stack effects and the script's own warm-up values.
- Fig. 4 objects to scale in 3D with a byte ruler; Fig. 5 reference counting replayed from the recorded run (new).
- Lazy imports regrouped into explained stretches with step lists.
Kept 2D: every bar chart, the JIT table and the release lines (numbers on an axis or a table).
Rejected
- A 3D stage for the copy-and-patch JIT (stencils stitched into a trace): it would be illustrative only; the page has no recorded trace or stencil to drive it.
- A 3D list over-allocation scene: at one scale the 312-byte list next to 8-byte ints would dwarf the rest; the sizes stay in text and the closed block.
- Real images: CPython has no physical object to photograph; none added.
