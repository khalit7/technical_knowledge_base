# TPU and Pallas lab: visual ideas (2026-10-15)

Question the tab keeps returning to: what does the TPU do with the shapes my JAX program has, and how do I write and check a kernel for it without one?

## Built
| # | Idea | Why it earns its place | Data | Placement |
|---|---|---|---|---|
| 1 | TensorCore drawing per generation (HBM, DMA, VMEM, vregs, VPU, MXUs, SMEM, ICI) | Sizes a Pallas programmer budgets against, from JAX's own table | tpu_info.py (run), Cloud pages | s1 |
| 2 | Generation table with JAX devices per chip, VMEM per core, and a disagreements box | Megacore vs 7x's two devices, and four source disagreements, shown with both numbers | specs.json | s1 |
| 3 | MXU tile animation, the same matmul on a 128 and a 256 array (before/after) | Padding waste of the running example's head (51% / 13%) and head_dim 32 (25% / 6%) seen tile by tile | roofline.json ops (99 dot_generals, measured) | s2 |
| 4 | Roofline calculator, 5 generations, running example's 12 matmul shapes plus a 7B-class point with a token slider | All 12 shapes memory-bound on every chip; batching rule from the ridge | roofline.json, MaxText llama2-7b.yml | s3 |
| 5 | create_device_mesh on mock slices (v5e, v5p, TPU7x), torus picture coloured by the last logical axis | JAX's real placement code run without a TPU; which meshes fail and why | torus.json | s4 |
| 6 | ICI collective calculator (scaling book model), wraparound before/after | Reproduces the book's 377 us example; latency floor | specs.json sb fields | s4 |
| 7 | Pallas grid/BlockSpec animator: whole arrays (before) vs tiles; copies skipped; 2-core order recorded by the TPU interpreter | The one mental model of Pallas, with the real traversal | pallas.json walk, traffic | s5 |
| 8 | Bug table: three broken kernels under both interpreters | Shows what interpret mode does and does not catch, with real outcomes | pallas.json bugs | s6 |
| 9 | Real Mosaic module lowered for "tpu" on the CPU, and the tiling error | What libtpu receives; catches illegal blocks before renting a TPU | pallas.json mosaic | s6 |
| 10 | Block size table: HBM traffic vs VMEM, fits per generation | The autotuning trade in one table | pallas.json traffic | s7 |
| 11 | Predict-then-reveal x3, mistakes, interview Q&A | Required drills | | s1, s3, s8, s11 |

## Rejected
- Cycle-level systolic wavefront: owned by the Hardware topic's TPU page (its simulator), linked instead.
- Timings of Pallas vs XLA as a chart: interpret-mode speed means nothing about TPU speed; kept as two numbers with the caveat.
- Pod/OCS drawing: Hardware page owns it.
- VMEM roofline (22x HBM): only one source sentence (v5e), no per-generation number; the quote is kept in out/specs.json, not drawn.
- Real TPU compile or profile: needs libtpu and a TPU; not run.
