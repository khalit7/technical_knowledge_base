# Roofline lab: visual ideas

Central question: for this op at this shape on this chip, is the time set by arithmetic or by memory, and how far below the ceiling does a real kernel land?

## Built (score out of 16; reproduce and computable count double)
1. **Interactive roofline** (15): chip, precision, op, shape, GQA group or layer width; computed AI, ridge, attainable, time at roof; overlay of all chips; measured M1 kernels with trial spread; the measured value when the shape matches a run. Defaults: H100 BF16 linear layer at batch 1.
2. **One layer crossing the ridge, animated** (14): the 8192 x 8192 fp16 layer at batch 1 to 2048, measured on the M1 Pro, toggle to the same shapes on the H100's published roof. Before/after on one input (batch 1 against batch 64 and beyond); captions per step, counters (time per call, per token, achieved). Shows a real anomaly (batch 2 slower than the roof predicts) explained from MLX source.
3. **Measured kernel table** (12): every kernel's AI, achieved, bytes/s, share of the roof, limited by.
4. **Same op, three kernels** (11): naive, tiled, library against the peak, with the no-cache intensity of each; tiled lands on its 4 FLOP/byte bound.
5. **MFU section** (11): measured MFU of a matmul against measured and theoretical peak; Llama 3 Table 4 printed against recomputed (40.4% against printed 41% shown); calculator whose defaults reproduce 43% by construction.
6. **Predict-then-check** (4 questions) and six interview questions with short answers.

## Rejected
- Roofline with cache levels (L1, L2, SLC ceilings): no counters here to place kernels on them; would be drawn from guesses.
- Peak via `simdgroup_matrix` kernel: compiler hoisted the product, result impossible.
- Profiling NVIDIA kernels: no NVIDIA GPU available; the sibling CUDA root owns compiler-only evidence.
- Sparse tensor peaks on the roofline: misleading for training; dense figures only, sparsity noted in each chip's source line.
- Energy roofline (FLOPs per joule): no power counters readable without sudo.

## What the methodology lacked
- A rule for measured roofs exceeded by a kernel (168 against 165 GB/s): we keep the measured roof and say it is a lower bound rather than redefining the roof after the fact.
