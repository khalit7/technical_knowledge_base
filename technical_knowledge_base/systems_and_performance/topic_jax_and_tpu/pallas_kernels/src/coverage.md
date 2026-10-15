# Coverage: claims about Pallas on the old Notion page "TPU architecture and Pallas"

The page is new; Pallas moved here from the old TPU page (saved in the root's `src/read/old/tpu_and_pallas.md`). Each claim checked:

| Old claim | Verdict | Where |
|---|---|---|
| Pallas is JAX's kernel language, the Triton analogue; GPU via Triton, TPU via Mosaic | Correct, incomplete: GPU also via Mosaic GPU; Triton is the default when no compiler_params (pallas_call.py:922) | s2 |
| Refs in fast memory, a grid, BlockSpecs; Pallas/Mosaic handle HBM to VMEM double-buffering | Correct; default 2 buffers, trivial windows single-buffered (lowering.py:1220), Buffered(3) rejected in pallas_call | s2, s6 |
| The matmul snippet (full-K blocks, out_shape x.dtype) | Runs and is exact in f32 (error 0); with bf16 inputs its bf16 output is off by 9.0e-4 vs 7.1e-4 with f32 output (pk_old.py) | Mistakes |
| Splash/flash attention on TPU ship as Pallas kernels | Correct (ops/tpu at jax-v0.11.2); flash ran here | s10 |
| MaxText and vLLM-TPU pull kernels from jax.experimental.pallas.ops.tpu | MaxText: correct (attention_op.py:29, root lab). vLLM TPU: not checked here (tpu-inference not cloned); dropped | s10 |
| Tiles should respect (8, 128) | Correct (root lab measured the rejection) | s3, s12, playground |
| dimension_semantics parallel vs arbitrary | Correct; added the accumulation rule and evidence | s4, s8 |
| A distributed flavour drives ICI directly | Correct (make_async_remote_copy, distributed.md); not run here | s1 |
| Kernels are jit/vmap/shard_map compatible but you define custom VJPs | jit and vmap verified (vmap adds a grid axis); grad fails without custom_vjp (measured messages); shard_map not run here | s2, s4 |
| For most training work you never write one | Consistent with Google's matmul guide (Pallas 91.5% vs XLA 92.3% at best) | s1 |
| Resources: Pallas docs (~45 min), TPU pipelining guide (~25 min) | Kept, links checked 2026-10-15 | Further reading |
