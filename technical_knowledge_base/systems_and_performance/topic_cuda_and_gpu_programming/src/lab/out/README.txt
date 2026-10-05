Kernel lab measurements for the other tabs (GPU simulator, Compiler explorer, Reading): out/data.json.
cases[]: group (softmax, softmax_long, matmul, fused, attention), step (E, EC, S1..S6, L; M1..M7, M7a, M7nu, L;
U_lib, U_ours, F2, F1; naive, flash, sdpa), name, ms (median of 3 run medians), ms_min, ms_max, run_ms, load,
err (max abs error vs float64 reference), peak_mib, plus shape fields (R, C / n / N, H, d) and flops where defined.
Measured on the Apple M1 Pro GPU, MLX 0.32.3, 2026-10-05. Coalescing: softmax S1 (one thread per row) vs S2;
matmul M1 (uncoalesced) vs M2. Shared-memory tiling: matmul M3 (16x16) and M4 (32x32).
