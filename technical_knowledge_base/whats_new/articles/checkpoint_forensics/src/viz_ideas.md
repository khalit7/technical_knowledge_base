# Visuals: built and rejected

## Built
- **Hero: the chain of inference as five boxes** (solid: shown; dashed: inferred; struck: not established). The page's central point is scoping, so the hero is the chain, not a chart. HTML, so it wraps at phone width.
- **Table 1 as a timeline**: twelve models on one time axis per lab, coloured by SM reading; tap for the evidence. Shows when each lab switched, which the table hides.
- **Table 2 in its three archived versions** (before/after on the same input): best estimate and range on a log axis. Shows the drift and the width of the ranges.
- **Toy grid with the real generator**: Philox4x32-10 and Box-Muller with a toy thread count; one control (SMs) plus right/wrong seed. Teaches that only the first G positions agree, which the report's static figures do not say.
- **Live replay on released rows**: 1,024 values of one untouched row each for DeepSeek-V3, V4-Flash and Kimi K3, regenerated in the browser for every SM count 100 to 160, with a scatter at the inspected count. The report's Figures 4 and 6, recomputed from real data by the reader's own browser; checked against our Python replay.
- **G table**: machines and settings that share a thread count.

## Rejected
- Embedding the report's PNG figures: no licence stated; the toy and the replay redo them with real numbers.
- A trained-weight trace figure (Figure 5): needs full weight tensors; quoted as a number instead.
- A cost calculator with utilisation and run-length sliders: the report's own estimates are the claim to judge; a calculator would add false precision.
- A map of where chips might be: the method says nothing about location.
- 3D anything: nothing spatial here.
