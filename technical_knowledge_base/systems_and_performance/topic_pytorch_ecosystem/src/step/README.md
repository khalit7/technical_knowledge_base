# Inside one step (tab `t-step`): sources and how to rebuild

Owns `parts/31_tab_step.html`, `parts/31_stp_main.js`, `parts/31_stp_data.js` (generated) and `../model/` (the topic's running example; see its README).

## Rebuild

With the shared venv's python (torch 2.14.1) as `PY`:

```sh
PY record_step.py --device cpu --out inputs/step_cpu.json
PY record_step.py --device cpu --checkpoint --out inputs/step_cpu_ckpt.json
PY record_step.py --device mps --out inputs/step_mps.json
PY record_step.py --device cpu --mode no_grad --out inputs/fwd_cpu_nograd.json
PY record_step.py --device cpu --mode inference_mode --out inputs/fwd_cpu_infer.json
PY basics.py > inputs/basics.json
PY time_step.py > inputs/timing.json          # under the bench lock
PY time_step.py opt > inputs/timing_opt.json  # under the bench lock
python3 build_data.py                          # writes ../parts/31_stp_data.js
sh ../build.sh && python3 check_page.py        # embedded data == inputs; prose numbers == data
```

Everything except the two timing files is deterministic (same op lists, bytes and graph on every run).

## What each script records

- `record_step.py`: one training step (step 1, after a warm-up step) through a `TorchDispatchMode`: every ATen call below autograd with shapes, strides, offsets, dtypes, new-storage bytes; live bytes per storage via `weakref.finalize` on storage objects (on MPS also `torch.mps.current_allocated_memory()`); the dispatch route reconstructed from tensor key sets, grad/inference mode and `torch._C._dispatch_has_kernel_for_dispatch_key`; the autograd graph (nodes, edges, `_saved_*` tensors) and backward order from node pre-hooks; forward ops matched to the nodes they created (135 of 135).
- `basics.py`: the 3 x 4 view demo, dispatch tables (`torch._C._dispatch_dump_table`, kernel kinds only, file paths dropped), the hand-derived gradient of `blocks.0.mlp.fc` and its GELU against autograd, `gradcheck` on a small Block, checkpointed against plain gradients (identical), and the first step's optimizer op counts.
- `time_step.py`: phase times (CPU 4 threads, MPS with synchronize), 5 trials x 20 steps after 5 warm-up; forward with grad, no_grad, inference_mode; one profiled CPU step; `opt` mode: AdamW for-loop, foreach, fused.

## Findings worth reusing (also in the shared FACTS file)

- Calls: forward 142, backward 295, optimizer 486 (CPU); MPS forward 191, backward 224. Profiler events: 473 / 807 / 1,442.
- Graph: 187 nodes (135 + 52 AccumulateGrad); saved activations 34,761,220 B = live after forward minus before, less the logits (88,064 B) and loss (4 B).
- Checkpointing: live after forward +34.85 MB to +3.33 MB; backward calls 295 to 555 (112 recompute; 12 of 16 addmm because of early stop); CPU step 22.5 to 31.6 ms.
- `.contiguous()` after attention: 0 bytes on CPU (flash kernel output already (B, T, H, hd) in memory), 524,288 B per layer on MPS (math path).
- On CPU `aten::linear` is a math kernel (decomposes to `t` + `addmm`); on MPS it has its own kernel and autograd kernel. `_scaled_dot_product_flash_attention_for_cpu` has no MPS kernel.
- AdamW default on CPU and MPS at 2.14.1 is the for-loop; fused is 2.7x faster on CPU and 4.1x on MPS for this model's optimizer phase.
- Dispatch key numbers on the wheel: Python 13, Functionalize 15, ADInplaceOrView 19, AutogradFunctionality 21, AutocastCPU 24 (higher runs first).

Timing caveat: the machine had load average 10 to 17 from other agents during the runs; numbers carry the load in the page.
