# Part 1 (The language): visualisation ideas

What the reader (Python, C++ basics) needs to see rather than read: when objects are born and die; that a build has
stages and which stage an error comes from; that UB makes the same source behave differently by optimisation level.

| Rank | Idea | Score (teaches / real data / effort) | Placement | Status |
|---|---|---|---|---|
| 1 | Object-lifetime replay: the real Tracer output of nine functions stepped line by line, code line highlighted from `std::source_location`, stack and heap columns, counters | 5 / 5 / 3 | Tab "Object lifetimes" | built |
| 2 | Before/after: vector growth with a `noexcept` move vs without (the same three push_back, moves become copies) | 5 / 5 / 1 (reuses 1) | Inline in Reading section 6, and in the tab | built |
| 3 | Build pipeline: sources, translation units (bars to scale by line count: 7 lines become 55,693), object files with their nm tables, link; scenarios: correct, missing object, ODR violation, incremental rebuild | 5 / 5 / 3 | Tab "Build pipeline" | built |
| 4 | UB gallery: ten cases, each -O0 vs -O2 side by side plus the sanitizer, warning or hardened-library run | 5 / 5 / 2 | Tab "UB gallery" | built |
| 5 | Predict the output drills whose answers are recorded outputs; gates with worked answers | 4 / 5 / 2 | Tab "Predict the output"; inline "Predict, then reveal" boxes | built |
| 6 | Template instantiation view (one template, nm shows three functions) | 3 / 5 / 1 | Inline output in section 8 | built as output, no animation |
| 7 | Animated vtable dispatch (pointer to vtable to function) | 3 / 2 / 3 | | rejected: the measured virtual-call cost and sizeof teach the consequence; the mechanism belongs to Part 2's codegen |
| 8 | Error message length chart (std::sort 308 lines vs ranges::sort 34) | 2 / 5 / 1 | | rejected as a chart: one sentence and the recorded count carry it |

Inspiration: the root page's Reading animations (RD.anim controller reused), the DeepSeek MLA before/after pattern
(same input, a toggle for the mechanism that was replaced), Compiler Explorer's side-by-side optimisation levels.

What the methodology lacked here: for a language page the "data" is program output, so the rule "every displayed
output is generated from a recording" (gen.py, check.mjs) replaces the usual recompute.py.
