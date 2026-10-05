# Part 2 (TypeScript): visualisation ideas

Ranked by how much each teaches a reader new to TypeScript (score out of 10).

1. **Narrowing stepper (tab, built, 10).** One function, line by line, with the type tsc reports at each point. Data is real: `gen_narrow.mjs` inserts `expr satisfies never;` at each marker and reads tsc 7.0.2's TS1360 message. Before/after toggle on the same code (boolean helper vs type predicate; tagged union vs optional-field bag; variable never reassigned vs reassigned after the callback), with the other version's type shown under the current one. Final step: tsc's errors underlined on the code, or Node's output.
2. **Erasure animation (Reading, built, 9).** demo.ts through Node's `stripTypeScriptTypes` (types become spaces, columns kept) and through `tsc` emit (new file, new line numbers, hence source maps). Both outputs are recorded.
3. **LLM JSON lab (tab, built, 9).** Ten failure modes of model JSON x four readers (cast, zod, strict, coerce): a coloured matrix of real outcomes (correct, rejected, wrong data, crashed) with per-cell detail. Shows the "silent wrong" outcome a cast produces.
4. **Will it type-check? drills (tab, built, 8).** 20 programs, verdict read from the recorded tsc output (never typed by hand), Node's output when it passes, short why.
5. **Predict-then-reveal boxes in the Reading (built, 8).** Real outputs hidden until answered.
6. **tsc 7 vs 6 bars (Reading, built, 6).** hyperfine on zod's own sources; numbers parsed from the raw output on the page.

Rejected:
- A type-level "evaluator" animation of conditional types: teaches library-author skills the reader does not need yet.
- A live in-page TypeScript checker: no compiler can be embedded within the size budget and without network; Part 1 owns the live JS playground.
- A tsconfig option explorer: the root's Toolchain atlas already walks project setup; the Reading shows each option's real error instead.

What the methodology lacked: a rule for showing a compiler's internal view (here: the type at a program point). The probe trick (`satisfies never`, plus `{} & {[K in keyof T]: T[K]}` to expand aliases) makes it recordable with the real tool.
