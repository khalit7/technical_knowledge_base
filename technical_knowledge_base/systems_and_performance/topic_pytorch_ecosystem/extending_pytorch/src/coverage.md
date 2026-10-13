# Coverage and corrections

New page: no old child page. Claims about extension points in the old root (`../src/read/old/root.md`) and old children, checked here:

| Old claim | Verdict | Where |
|---|---|---|
| The dispatcher is the extension point for every backend, custom op and tensor subclass | verified (dispatch dumps, key sets, traces) | R0, R1, R5 |
| Helion compiles to Triton, CuTeDSL and Pallas | verified in helion 1.4.0 source (settings.py L610-614), and corrected: a fourth backend, Metal, exists and ran here | R4.3 |
| "one source targets NVIDIA, AMD and TPU" | not checked beyond the backend list; not repeated | |
| Prebuilt Helion kernels ship on the HF Kernels Hub | unconfirmed: kernels 0.17.2 only lists helion as an allowed dependency | R4.3 |
| Root: "DTensor works the same way" (as a __torch_dispatch__ subclass) | refined: at 2.14.1 DTensor's constructor and op dispatch run in C++ (fast path), Python __torch_dispatch__ only for DTensor subclasses | R5.5 |
| Root: custom_op gives 1 graph / 0 breaks vs 3 / 2 | verified and extended on the whole model (4 graphs / 3 breaks; export) | R2.1 |
| Root: torchao Int8Tensor holds int8 qdata and a float32 scale per row | verified; also a zero_point int8 [1024, 1] | R5.5 |
| Old performance page: torchao "built on tensor subclasses" | verified (NF4, Int8, Float8 flattened here) | R5.5 |

New findings recorded in FACTS.md under `ext`: the late-registration and AOTAutograd-cache traps, duplicate TORCH_LIBRARY abort, Metal lacks erf, FlopCounterMode misses CPU SDPA, opcheck's autograd test passes without a formula.
