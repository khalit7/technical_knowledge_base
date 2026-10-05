# Visual ideas: GPU memory hierarchy

What the text needs: the sector rule applied to patterns the parent does not cover (struct fields, misalignment, width); what the compiler turns memory code into; when registers become local memory; why asynchronous copies help; how to judge one kernel against the hardware.

## Built (score out of 10: teaching value, evidence, not duplicated)
1. **One warp, one load, before/after** (Reading s1; 9): three toggles on the same drawing scale (AoS/SoA, misaligned/aligned, 4-byte/16-byte), step by step with counters. Derived from the 32-byte rule, checked against the Python reference. Inspiration: the DeepSeek MLA explainer's before/after.
2. **Tile pipeline, 1 to 4 stages** (Reading s6; 8): one block's 8-tile loop on one time axis, so the stages visibly shorten the run. Illustrative latency/math inputs, labelled; the schedule is reference-checked.
3. **Register-cap sweep** (Reading s4; 8): real ptxas output for eight caps on three targets, with warps per SM by NVIDIA's allocation rule.
4. **Cache-operator table** (Reading s2; 7): intrinsic, PTX, quoted meaning, real SASS on three targets.
5. **Measured M1 roofline with real kernels placed** (Reading s8; 8) plus a calculator (H100, A100, RTX 5090, M1 measured).
6. **Measured bars**: AoS/SoA, widths, threadgroup strides, local-memory histogram (6 each).
7. **Access lab tab** (8): any global pattern -> sectors, any shared pattern (strided or a 32 x 32 column with plain/padded/XOR layout) -> per-bank passes.
8. **Memory instructions tab** (7): every kernel's ptxas report and memory instructions per target, with its source.

## Rejected
- Re-doing the stride sweep, the 32 x 32 transpose, the occupancy calculator, latency hiding and the tiling animation: the parent's GPU simulator has them (linked).
- A constant-memory measurement on the M1: MLX passes kernel buffers in Metal's device address space; a program-scope constant table behaved differently (slower even for uniform reads) and did not isolate NVIDIA's broadcast/serialise rule. Dropped, said on the page.
- An L2 persistence demo: needs an NVIDIA GPU; code and rules quoted instead.
- A pinned-vs-pageable transfer benchmark: the M1 has no host-device copy (unified memory); the contrast is stated instead.
- An 8-byte shared-memory pass model: the current guide does not document the split; the lab shows only the bank-load floor and says so.

## What the methodology lacked
A rule for "compiler output as evidence": real SASS is exact for what instructions exist, but says nothing about timing; the page labels it "compiled here" and never infers speed from it alone.
