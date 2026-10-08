# Serving simulator tab (t-sim): sources, scripts, checks

Built 2026-10-08. The tab's parts are `parts/31_tab_sim.html` and `parts/31_js_sim_*.js` (0core: the engine model; 1data: generated; 2util: helpers and the step-animation controller; 3anim: section 1; 4lab: section 2; 5more: sections 3 and 4; 6val: section 5). Ids and classes use the `sim-` prefix; CSS is scoped under `#t-sim`.

## Files
| File | What it does |
|---|---|
| `sim.py` | Reference simulator: workload generator (mulberry32, same in JS), roofline step time, vLLM-style paged block pool with prefix caching, contiguous first-fit allocator, continuous and static schedulers, recompute and swap preemption, optimistic and reserve admission, replicas, disaggregated prefill/decode, closed-loop clients, metrics. |
| `presets.py` | Model numbers from `inputs/cfg_*.json` (Llama 3.1 8B: 8,030,261,248 parameters; Qwen3-0.6B: 596,049,920). |
| `calibrate_h100.py` | Fits the step model to NVIDIA's NIM table (`inputs/nim_llama31_8b_h100.json`, vendor) and predicts the held-out rows. Four variants were run (`ADMIT` optimistic or reserve, `SKIP` first closed-loop wave or not); `optimistic_0` was kept because it predicts the held-out rows best (ITL median error 7%, throughput 6%, TTFT 38%); reserve admission (TensorRT-LLM's default) fitted worse (ITL 10%, throughput 11%, TTFT 48% with outliers to 1,400%). |
| `calibrate_m1.py` | Fits the M1 Pro preset to llama.cpp measurements made here by the Engine bench tab (`inputs/m1/ibench_m1.json`, paths stripped) and predicts the llama-server runs. |
| `gen_data.py` | Writes `parts/31_js_sim_1data.js` from `out/*.json`. |
| `check/vllm_harness.py`, `check/make_cases.py` | Runs vLLM v0.31.0's own `Scheduler` and `KVCacheManager` (commit db9527a46873454610df6dbedf79a36d6bf1a7f6; Python only, `VLLM_TARGET_DEVICE=cpu`, source tree on `PYTHONPATH`, a fake model runner) on 10 traces and compares every step with `sim.py`: all 10 identical (2,535 steps, 39 preemptions). |
| `check/dump_ref.py`, `check/check_core.mjs` | The JS engine against the Python one on 22 configurations covering every mode: identical requests, step logs (rows, preemptions, step times, KV maps) and metrics (9,920 steps). |
| `check/check_embed.py` | The page embeds exactly the generated data; prose numbers agree with data and sources. |
| `check/check_ui.mjs`, `check/shots.mjs` | Clicks every control (both animation toggles and steps, every hardware x traffic x Compare button, stall modes, sweep, check toggles) at 390 dark and 920 light; fails on errors, NaN, undefined, Infinity or sideways scroll. Element screenshots. |
| `run_all.sh` | Everything above in order. |

## Two details found by the vLLM comparison
1. Admission needs the whole prompt to fit in free blocks (`scheduler_reserve_full_isl`, default True, `vllm/config/scheduler.py`), not just the first chunk.
2. `BlockPool.free_blocks` puts freed blocks with no cached content at the front of the free queue (reused first) and cached ones at the back (evicted least recently used); a plain append put one prefix-cache hit block in the wrong place and broke 2 of 10 traces until fixed.

## Sources
- vLLM v0.31.0 source: `vllm/v1/core/sched/scheduler.py` (schedule(): running loop, preempt the last running request, waiting loop only when nothing was preempted), `vllm/v1/core/kv_cache_manager.py` (allocate_slots), `vllm/v1/core/block_pool.py` (free_blocks), `vllm/engine/arg_utils.py` (H100-class defaults for the API server: max_num_batched_tokens 8192, max_num_seqs 1024), `vllm/config/cache.py` (block size 16), `vllm/config/vllm.py` (async scheduling on unless disabled by a feature).
- TensorRT-LLM v1.2.1 `tensorrt_llm/llmapi/llm_args.py`: capacity_scheduler_policy GUARANTEED_NO_EVICT (line 1468), free_gpu_memory_fraction 0.9 (line 1650), enable_chunked_prefill False (line 2006).
- NVIDIA NIM benchmarking, Llama-3.1-8b-instruct, H100 80G FP8 TP1, NIM 1.8.0, page updated 2026-04-01, fetched 2026-10-08: https://docs.nvidia.com/nim/benchmarking/llm/1.0.0/performance.html (vendor).
- Chip peaks: https://www.nvidia.com/en-us/data-center/h100/ ; Apple M1 Pro newsroom (200 GB/s) https://www.apple.com/newsroom/2021/10/introducing-m1-pro-and-m1-max-the-most-powerful-chips-apple-has-ever-built/ ; https://github.com/philipturner/metal-benchmarks (5,308 GFLOPS).
- Papers: Orca (Yu et al., OSDI 2022), PagedAttention (Kwon et al., SOSP 2023), Sarathi-Serve (Agrawal et al., OSDI 2024), DistServe and Splitwise for disaggregation (designs only; not run).

## Departures from the method
The tab is a simulator, not a comparison grid: it carries its own validation section because a simulator a reader cannot check would not meet the "every number sourced" rule.
