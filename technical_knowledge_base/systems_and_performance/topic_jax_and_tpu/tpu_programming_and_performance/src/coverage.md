# Coverage of the old Notion page "TPU architecture and Pallas" (src/live.md)

Every claim of the old page, with its verdict and where the HTML carries it. Checked 2026-10-15.

| # | Old claim | Verdict | Source | Where |
|---|---|---|---|---|
| 1 | Programming-side view; hardware on the Hardware TPU page | kept | | intro "Who owns what" |
| 2 | Best resources: scaling book ch. 2, Cloud system architecture, Pallas docs and pipelining guide, scaling book profiling, TRC | kept (Pallas links moved to Pallas kernels) | links checked | Further reading |
| 3 | 1 to 2 TensorCores per chip vs ~100+ SMs | verified | Cloud pages | s1 |
| 4 | MXU 128x128 systolic array, "one 128x128 matmul per cycle-ish" | corrected | 256x256 on v6e and TPU7x (tpu_info.py, Cloud); peaks do not reconcile with side^2 MACs per cycle at published clocks for v6e and 7x (root TPU lab): unconfirmed | s1, s4, Old page |
| 5 | Several MXUs per core | verified | 4 (v4, v5e, v5p), 2 (v6e, 7x) | s1 |
| 6 | Pad dims to multiples of 128 and minor tile to 8x128 | verified, made precise | XLA tiled_layout.md (8x128, 2x128 and 4x128 small tiles, bf16 (8,128)(2,1), int8 (8,128)(4,1)) | s4, Tiles tab |
| 7 | VPU for elementwise, reductions, activations | verified, quantified | scaling book: (8,128), ~7e12 FLOP/s per v5p core, ~30x below MXU | s1 |
| 8 | VMEM "tens of MB (128 MB on newer chips)" | corrected | per TensorCore 16 MiB v4, 128 v5e/v6e, 64 v5p/7x (tpu_info.py) | s1, Old page |
| 9 | HBM v5e 16 GB, v5p 95 GB, v6e 32 GB, v7 192 GB | verified (v5p 95 GiB, 7x 192 GiB) | Cloud | s2 |
| 10 | SparseCore: embedding accelerators | verified, extended | Cloud counts (v5p 4, v6e 2, 7x 4); MaxText offloads all-reduce to SparseCores (xla_flags_library.py:121) | s1 |
| 11 | No warps, no occupancy; XLA schedules; rooflines rule | kept | | s1, s3 |
| 12 | v4 2021, 275 TF, 32 GB, 4096 chips, 3D torus + OCS | corrected year | deployed 2020 (root); Cloud page says "3D mesh" with optical wraparound | s2, Old page |
| 13 | v5e 2023, ~197 TF, 16 GB, pods 256; "what Colab/Kaggle give you" | numbers verified; Colab/Kaggle claim unconfirmed | Cloud; Colab FAQ publishes no types | s2, s11 |
| 14 | v5p 2023, 459 TF, 95 GB, 8960 | verified; added: largest single slice 6,144 chips | Cloud v5p page | s2, s7 |
| 15 | v6e "~4.7x v5e", 32 GB, 256 | verified (918/197 = 4.66) | Cloud | s2 |
| 16 | v7 Ironwood "GA Apr 2026", ">4x v6e", 192 GB, FP8, 9216 | GA date unconfirmed; >4x is not bf16 (2.5x bf16, 5.0x fp8 vs bf16) | Cloud TPU7x page; root | s2, Old page |
| 17 | Two tracks e and p | verified | | s2 |
| 18 | HBM 6x with Ironwood | verified (192/32) | | s2 table |
| 19 | ICI 2D torus (v5e/v6e), 3D (v4/v5p/v7), no NICs | verified; wraparound only for full cubes / axes of 16 | Cloud v5p; scaling book | s1, s7 |
| 20 | Tensor/FSDP over hundreds of chips before pipeline | kept as the scaling book's position | | s7 (multislice), Sharding and scale |
| 21 | OCS reconfigure around failures and carve slices | kept, linked | Hardware TPU page | s7 deepnote |
| 22 | v5p-128 = 64 chips; names count TensorCores on some gens | verified | Cloud v4 table (v4-8 = 4 chips), v5p Cores column | s7 |
| 23 | Each host 4 chips (8 for some v5e configs) | corrected | 8 for all v5e and v6e hosts, 4 for v4, v5p, 7x (Cloud) | s1, s7 |
| 24 | Multi-host: one JAX process per host | verified | | s1 |
| 25 | Beyond one pod: DP over DCN, MaxText multislice | verified, quantified | DCN per chip; MaxText dcn_data_parallelism (base.yml:817) | s7 |
| 26 | Pallas section (code, BlockSpec, Mosaic, double buffering, (8,128), dimension_semantics, custom VJP, when to write one) | moved | Pallas kernels child and the root's TPU and Pallas lab | intro, Further reading |
| 27 | Colab free/Pro single v5e chip | corrected (unconfirmed) | Colab FAQ: types vary, limits unpublished, 12 h max | s11 |
| 28 | Kaggle free v5e-8, ~20 h/month, ~9 h sessions | corrected (unconfirmed) | Kaggle page unreadable; third parties say 20 h/week, chip disagrees | s11 |
| 29 | TRC ~30 days, v2-8/v3-8 up to v4/v5e | corrected | TRC pages: no charge, >1,000 devices, temporary quota; no duration or generations | s11 |
| 30 | GCP spot v5e/v6e; queued resources; multislice | kept, priced | Cloud pricing (on demand, DWS Flex-start, commitments) | s11, s2 |
| 31 | Practical loop: CPU, Colab, Kaggle/TRC, XProf | kept | | s11 |
| 32 | Cross-links Hardware, CUDA, Sharding | kept | | Further reading |

Added beyond the old page: low-precision peaks, DCN, PCIe, prices; critical batch per generation; decode step model; attention intensity; ICI threshold; tiling rules; precision measured by emulation; remat policies measured; MaxText's remat and offload options; JAX's placement on every slice shape; the 16x20x28 vs 6,144-chip cross-check; MFU recomputed (non-causal finding); cost per token vs H100; real error messages; interview and design questions.
