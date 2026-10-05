# Design space: visual ideas

## Built
1. **Axis by language matrix with short tags** (15 x 5), Python column marked reference; click a cell to open it. The overview that lets a reader scan a whole language (column) or a whole question (row). Scrolls inside its box at 390 px with a sticky axis column.
2. **Cells as expandable cards**: choice in one sentence (summary), buys and costs, the founding value as a clickable chip, one to three real snippets each followed by its real output or compiler error, and for C++ the matching llama.cpp / ggml excerpt (pinned commit, file, lines). Ideas: Rosetta-style side by side was too narrow for code at 920 px, so the side-by-side is a one-line summary row (hidden on phones) above stacked cards.
3. **Three views of one matrix**: by axis (one row, five languages), by language ("the personality of Rust": one column top to bottom), trace a value (matrix dims every cell except those explained by the chosen founding value; lists them and the related false friends). The trace view is the argument of the tab: one value explains many choices (C++ zero overhead: no bounds checks, UB overflow, no GC, no null checks; TS erasure: no runtime checks, so validate LLM JSON with zod).
4. **Founding-values strip**: five cards, each quote verbatim with source link and date; each quote opens its trace.
5. **False friends**: 30 pairs, "what a Python programmer writes" next to "what the other language does", both real runs; filters by language and axis; links to the Rosetta tab where Rosetta owns the same mistake.

## Rejected
- **Animated before/after per cell**: the outputs are the evidence and are short; an animation of a compiler error adds motion without content. The Reading and Rosetta tabs own the animations.
- **Radar or score chart per language** (safety 9, speed 10...): invented scores; nothing to source.
- **Running code in the browser**: the page is a sandboxed iframe without network or toolchains; captured real runs are honest and checkable.
- **Re-running Rosetta's mistakes** (typeof null, NaN in sorts, Rust sort on f64): owned by Rosetta; linked instead.
- **AddressSanitizer / ThreadSanitizer output for C++ cells**: ASan hangs on this machine (macOS 27, Apple clang 17); Rosetta shows sanitizer runs with LLVM clang 23.

## What the methodology lacked
A comparison matrix of categorical choices has no number to reproduce; the equivalent of "defaults reproduce a published figure" here is "every output is a captured run, checked byte for byte by check.py".
