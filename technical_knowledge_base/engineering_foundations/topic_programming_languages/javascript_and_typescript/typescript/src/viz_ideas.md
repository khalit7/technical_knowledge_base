# Visuals on this page

Kept from the language page's Part 2 (scores and the rejected ideas are in `tb/viz_ideas.md`):
1. **Narrowing stepper**, now inline in section 4 beside the narrowing table (one mechanism, so not a tab). Before/after on the same code.
2. **Erasure stepper**, section 1: the same file through Node's stripping and through tsc's emit.
3. **LLM JSON lab**, inline in section 7: ten real replies by four readers, the evidence for "a cast checks nothing".
4. **tsc 7 against 6 bars**, section 8.
5. **Predictions**: the old predict-then-reveal boxes plus the 20 drills, inline; each reveal is a closed details element.

New:
6. **Hero** (static SVG): compile time above a dashed erasure line, run time below; a cast as a dashed red path that checks nothing, a zod schema straddling the line (z.infer feeds tsc, parse runs at run time). Static because it is a structure, not a process.

Rejected: a separate hero animation of erasure (the erasure stepper already shows it in section 1); a tab for the drills (they teach the section they sit in).

## 2026-11-07: split layout and two 3D stages (renderer v2)
- **Hero, Fig. 1 (3D, replaces the static SVG):** two plates, compile time (glass, above) and run time (the floor). app.ts carries a layer of type syntax sized by demo.ts's real share (83 of 214 non-blank characters, from Node's stripped output); it drops to run time and the layer stays behind. The ten recorded replies of the zod lab then arrive from an LLM: through a cast (nothing stands at the boundary: 4 correct, 2 wrong data, 4 crashes) and through a zod schema, a glass plate standing on both plates (z.infer flows up to tsc; 4 pass, 6 rejected). Depth earns its place: "above and below the erasure line" is a spatial claim, and the schema is the one object that spans both.
- **Narrowing, Fig. 2 (3D, replaces the 2D chip stepper):** a type drawn as the set of its union members, one block each on a glass plate; each probed line sinks the members tsc ruled out; the "before" version on a second plate behind, same line. Data: TB.narrow (tsc 7.0.2's own answers). The code stays text, beside the step list.
- **Structural typing (2D static, new):** four unrelated values fit HasLength; a branded OrderId does not fit UserId. Flat because it is a matching diagram, not a spatial one.
- **Kept 2D:** the erasure stepper (code is text; the point is which characters vanish and where the lines go), the LLM JSON lab grid (a table the reader clicks), the tsc 7 against 6 bars (a number on an axis).
- **Rejected as 3D:** structural typing as shapes fitting slots (decoration: the matching is by member names, which a flat list shows exactly); a 3D erasure of code text (canvas text in perspective is harder to read than the 2D stepper).
