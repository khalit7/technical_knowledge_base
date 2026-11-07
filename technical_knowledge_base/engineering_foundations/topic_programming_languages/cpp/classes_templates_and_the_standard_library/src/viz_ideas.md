# Visual ideas: built and rejected

## 2026-11-07 (split layout, renderer v2)
Built as 3D stages:
- **A virtual call followed through memory** (section 2, `31_js_sc_vt.js`): Plain (8 B) and Virtual (16 B) to scale from `sizeof`, the shared vtable as a glass plate, the call as three flows (load vptr, load f, jump); then the benchmark's vector of pointers with its first eight real objects (`first_shapes.cpp`), one class, mixed, sorted, scattered. Depth separates the four places a call touches (call site, object, vtable, code), which a flat figure stacked as text before. Replaces the static object-layout figure.
- **std::vector growing** (section 4, `32_js_sc_vec.js`): each reallocation as a new block, the elements flowing across, the old block freed, a pointer left dangling, then `reserve`. Driven by the recorded growth and `sizeof(std::vector<int>)`. Replaces the 2D capacity staircase: the staircase showed the doubling numbers, which the step list now states, but not the moves or the dangling pointer, which are the point.

Kept 2D (in the right column of their section), and why:
- Hero (three lanes with their measured costs): a comparison of three decisions and five numbers; nothing spatial.
- Dispatch bars, exception rate slider, depth bars, diagnostic-length bars: numbers on (log) axes.
- One template, three functions: a one-to-many mapping of signatures; the signatures are the content and read best as text. A 3D "stamp" was considered and rejected as decoration.
- SSO and closure-object figures: byte layouts the page itself calls simplified or described (libc++'s short form, std::function's internals), so drawing them to scale in 3D would claim more than the page measured.
- Lazy ranges pipeline: a row of seven counts and a log; flat reads completely. Converted to an autoplaying stepper with a step list (`sx-rng`).

Rejected: iterator and container relationships as a 3D structure (the page does not teach iterators beyond invalidation, which the vector stage shows); exception unwinding through frames (the ownership page owns the replay).
