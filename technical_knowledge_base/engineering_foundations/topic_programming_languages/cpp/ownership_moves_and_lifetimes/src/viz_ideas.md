# Visualisation ideas: C++: ownership, moves and object lifetimes

Scored 1 to 5 on teaching value (T), uses real data (D), cost to build (C, 5 = cheap).

| # | Idea | T | D | C | Decision |
|---|---|---|---|---|---|
| 1 | Hero: Python names sharing one counted object beside a C++ owner on the stack, its heap buffer, an observing reference and the closing brace that frees it | 5 | 3 (illustrative layout) | 4 | built (top) |
| 2 | Object-lifetime replay (from the C++ page's Object lifetimes tab): real Tracer output stepped line by line, code line from `std::source_location`, stack and heap columns, counters | 5 | 5 | 5 (reused) | built, now four inline instances beside sections 3, 4, 5 and 6 instead of one tab |
| 3 | Before/after: vector growth with and without a noexcept move (same three push_back) | 5 | 5 | 5 (reused) | built (section 6, with reserve + emplace_back as a third segment) |
| 4 | New scenarios: a shared_ptr cycle that leaks then the weak_ptr fix (shows member destruction order too); a temporary dying at the semicolon against one extended by a const& | 5 | 5 | 4 | built (sections 3 and 4) |
| 5 | Address map from stack_heap.cpp's real addresses, regions grouped, the vector object pointing at its elements | 4 | 5 | 4 | built (section 2) |
| 6 | Owner-cost bars: raw pointer, const unique_ptr&, const shared_ptr&, shared_ptr by value, by value from 4 threads (log scale, measured) | 5 | 5 | 4 | built (section 4) |
| 7 | "When does each object die" table | 5 | 4 | 5 | built (In one screen) |
| 8 | Diagram of a, b, r and p after copy.cpp | 2 | 4 | 4 | rejected: the side-by-side C++ and Python outputs plus the reference/pointer table say it |
| 9 | Animated reference-count and control-block diagram for shared_ptr | 3 | 2 | 3 | rejected: the shared_ptr and cycle replays show the counts' effects on real objects |
| 10 | Object lifetimes as its own tab | 3 | 5 | 5 | rejected: each scenario explains one section, so it moved inline (teaching contract) |

## 2026-11-07: split layout and 3D stages (the 2026-11-06 rollout)
| # | Idea | Decision |
|---|---|---|
| 11 | 3D stage: the stack frame as a raised glass plate above the heap floor; stack_heap.cpp's real addresses on the objects, then a copy (a second buffer), a move (the same buffer, the source empty), the closing brace freeing in reverse order and a pointer left dangling | built (section 2, `31_js_sc_own.js`); replaces the 2D address map, whose addresses it carries. Depth separates the two regions the pointer crosses, which the flat list could only state |
| 12 | 3D stage: unique_ptr moved, shared_ptr with its control block and count rising and falling, a cycle that leaks and the weak_ptr fix, from the unique, shared and cycle logs | built (section 4, `32_js_sc_ptr.js`); replaces the unique_ptr / shared_ptr / cycle replay (idea 9, rejected in October, is now this stage: the control block and counts were the missing picture) |
| 13 | RAII as its own 3D stage: destructors in reverse order at scope exit | not built separately: step 5 of the stack/heap stage draws it, and the Scopes replay shows the real order with the code beside it |
| 14 | The lifetime replays (scopes, temporaries, unwinding; copy and move, calls; vector growth) as 3D | kept 2D: they are code tracers (the source lines, the live objects and the log side by side), which read best flat. Now each step is one explained stretch of the log (at most 6 per scenario, from the step list's `data-l`), and the per-step caption is gone |
| 15 | Hero, owner-cost bars | kept 2D: the hero is a side-by-side comparison; the bars are numbers on a log axis |
