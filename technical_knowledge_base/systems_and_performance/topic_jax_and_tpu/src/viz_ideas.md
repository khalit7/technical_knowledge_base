# Visuals: built and rejected (Topic: jax-and-tpu)

## Built (2026-11-12, layout rollout)
- **Fig. 1, the map** (`parts/27_js_sc_hero.js`, 3D, renderer v2): one JAX train step along five stations (your code, the jaxpr, XLA, the mesh, the TPU chip), plus a Pallas block grid on the chip, the codebases under every station and PyTorch's eager operators beside. Numbers from `RDJ` (the labs' measured counts) and the page's own tables; each step links the owning child's figure.
- **Fig. 2, eager against jit** (2D lanes, `parts/24_js_rd_trace.js`): now explained by the step list `sx-tr` and playing on view.

## Rejected
- **A 3D stage per Reading section** (the chip, the mesh, fusion): each child now owns that stage (TPU programming and performance Fig. 1, Sharding and scale Fig. 1, XLA and compilation Fig. 2); the root links them instead of re-teaching.
- **3D for the generations table, the strategy table or the MaxText MFU table**: numbers to compare, read best as tables.
- **Grouping the long replays into explained stretches** (the attention trace, vmap, the twins' curves, the ring, the Pallas grid): their per-frame captions explain each frame, and the reader drives them; kept as widgets (rollout rule 3b). A grouped version of the trace (one stretch per Python line) is the natural next step if Khalid wants them to play.
