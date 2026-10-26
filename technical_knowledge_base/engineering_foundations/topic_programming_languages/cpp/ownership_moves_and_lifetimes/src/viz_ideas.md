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
