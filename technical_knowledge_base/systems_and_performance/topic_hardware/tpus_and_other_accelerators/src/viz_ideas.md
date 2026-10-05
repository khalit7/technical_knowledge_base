# Visualisation ideas: TPUs and other accelerators

The question the page keeps returning to: **how many times is each operand fetched per multiply-add, and what does each design give up to make that number small?** Scored 0 to 2 on the Methodology's questions (parameter to move; reproduces a published figure (x2); computable from public data (x2); shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere; animation against the method it replaced), minus build cost.

## Built
| # | Idea | Placement | Score | Data and checks |
|---|---|---|---|---|
| 1 | **One 5x4 by 4x4 matmul through a 4x4 weight-stationary systolic array, against 16 scalar lanes (before/after)**: cells to scale, skewed input queue, partial sums per cell, outputs leaving the bottom; counters for cycles, multiply-adds, storage reads, neighbour hand-offs, utilisation; play/pause/step/scrub/speed, on-screen only, paused under reduced motion | Reading s1 | 15 | Cycle-level simulator `sim/systolic.py`, ported to `parts/22_js_sys_core.js`; 7 shapes checked against the exact product and M+K+N-2; JS = Python on all (check_sim.mjs). Energy framing from Horowitz ISSCC 2014 (labelled illustrative) |
| 2 | **Systolic array lab**: any M, K, N and array side; utilisation, tiles, padding share, reads per multiply-add; sweeps (K = N padding sawtooth; M batch knee) for 128 and 256 arrays; any small tile simulated cycle by cycle with a correctness check | Own tab | 13 | Tiled model with double-buffered weights shifted one row per cycle (TPU v1's 256-cycle tile load); assumption labelled |
| 3 | **Peak reproduced from the arrays**: cores x MXUs x side^2 x 2 x clock for v1 to v6e | Reading s2 table | 12 | Reproduces v1-v5e independently within 0.3% (CACM 2020, TPU v4 paper, Cloud docs, scaling book); v5p needs 1.75 GHz (unpublished); v6e needs 3.5 GHz with the docs' 2 MXUs of 256: shown as not reconciling |
| 4 | **Hops on an 8x8 slice, torus against mesh**: click a chip, see hop counts; farthest and average | Reading s4 | 9 | Exact shortest paths |
| 5 | **Pod builder**: v4 / v5p / TPU7x, X x Y x Z slice; cubes, hosts, optical links, wraparound per axis, diameter, bisection links, all-reduce time over chosen axes; layer-by-layer picture | Own tab | 11 | Scaling book rules (wraparound only for whole cubes; 2V / sum W; 1 us per hop), TPU v4 paper (96 optical links per cube); default reproduces the Reading's 0.178 s |
| 6 | **Chips needed to hold the weights** (Llama 3.1 8B/70B/405B, bf16 or 8-bit) for Groq TSP, Groq 3 LPU, WSE-3, H100, B200, MI355X, TPU7x | Reading s7 | 11 | HF safetensors parameter counts; reproduces Cerebras's "70B models fit on as few as four systems" independently (141.1 GB / 44 GB -> 4) |
| 7 | Predict-then-reveal: fetches per weight (8,192), QK^T head-dim 128 on a 256 array (half) | Reading | 7 | Derived |

## Rejected
- **Output-stationary and row-stationary dataflow toggles** (Eyeriss): would teach dataflow taxonomy but the page's chips are all weight-stationary per their docs; adds a second mechanism with no published figure to reproduce.
- **A TPU-vs-GPU spec comparison tab**: the root's Chip atlas already holds every chip, dense and sparse, with prices; linked instead.
- **Twisted-torus bandwidth calculator**: the TPU v4 paper gives measured all-to-all gains only as bars in Figure 6; no formula or printed values to reproduce.
- **Measured run on the M1 GPU**: nothing on this page has an M1 analogue that teaches TPU, Trainium, Groq or Cerebras behaviour; the systolic array is simulated and validated instead. Measured rooflines are the root's Roofline lab.
- **Cerebras weight-streaming animation**: tempting, but the docs give no timing or bandwidth numbers to draw to scale; explained in prose.
- **Groq deterministic-schedule animation**: no published schedule to draw from; prose only.
- **Price-per-FLOP tab**: a pattern Khalid removed elsewhere; the root's Reading s9 covers prices.

## What the Methodology lacked for this page
A rule for vendor documents that disagree with themselves (TPU v6e MXU count, Trainium3 link bandwidth, Trainium2 peak): shown as boxes with the arithmetic, never resolved silently.
