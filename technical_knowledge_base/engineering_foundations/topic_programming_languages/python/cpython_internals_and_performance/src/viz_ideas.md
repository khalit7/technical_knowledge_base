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
