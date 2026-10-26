# Visualisation ideas for this page

| # | Idea | Data | Placement | Status |
|---|---|---|---|---|
| 1 | Hero: primitives against objects, with three prototype or closure chains (`c` through `Counter.prototype`, `msg`, a closure) | the page's own examples (e1, c1, d2) | top | built (HTML boxes, reflow at phone width) |
| 2 | Double probe: type an integer or pick a preset, see what the double keeps, what is lost and how far apart neighbouring doubles are | live `Number()` and `BigInt()`; presets checked against the recorded `b1_numbers` | section 1 | built (one control, a prediction prompt) |
| 3 | "héllo 🚀" as UTF-16 units, code points and UTF-8 bytes | computed at build time by `gen.py`; equals the recorded `b3_strings` | section 1 | built (static) |
| 4 | The `==` triangle (0, "", "0") | recorded `b6_equality` line 2 | section 1 | built (static SVG) |
| 5 | Alias, shallow and deep copy after one push | recorded `c4_copy` (2 2 1) | section 2 | built (static SVG) |
| 6 | `var` against `let` closures, before/after | recorded `d2_closures` | section 3 | built (static SVG) |
| 7 | How the call sets `this` (table beside the run) | recorded `d3_this` | section 3 | built |
| 8 | Module system per file and the interop cases | recorded `f_mod` | section 5 | built (HTML boxes) |
| 9 | V8 tier stepper over the real `--trace-opt --trace-deopt` lines | recorded `n3_deopt` | section 8 | built (stepper, never autoplays) |
| 10 | Shape bars, 1/4/8 hidden classes | recorded `n2_shapes_bench` | section 8 | built (static bars) |
| 11 | JS playground: 22 drills with recorded output and a live runner | `code/q`, `outputs/q_*` | own tab | kept from the language page (a tool used across the page) |
| 12 | Hidden-class transition tree | `%HaveSameMap` outputs | section 8 | rejected (as on the language page): the real four-line output and the measured bars carry it; a drawn tree would be illustrative |
| 13 | Prototype lookup animation | none real | section 4 | rejected: the hero's static chain with the lookup caption says it |
