# Compile lab (tab `t-comp`): sources and how to rebuild

Owns `parts/32_tab_comp_a.html`, `_b.html`, `_c.html` (the tab), `parts/32_cmp_main.js` (helpers, head, pipeline, fusion animation), `parts/32_cmp_more.js` (everything else) and `parts/32_cmp_data.js` (generated). Imports the running example from `../model/` (never copies it).

## Rebuild

With the shared venv's python (torch 2.14.1) as `PY`, and `TORCHINDUCTOR_CACHE_DIR` pointing at a scratch directory (never inside the repo):

```sh
PY trace_model.py cpu ; PY trace_model.py mps    # inputs/model_<dev>.json, code_<dev>_{fwd,bwd}.py.txt
PY fusion.py                                     # inputs/fusion.json
PY breaks.py                                     # inputs/breaks.json
PY export_aoti.py <scratch dir>                  # inputs/export.json (the .pt2 package stays in scratch)
PY autotune_check.py                             # inputs/autotune.json
# timed, under the shared bench lock:
PY time_comp.py step cpu > inputs/time_step_cpu.json      # also: step mps, phases cpu|mps, fusion cpu|mps,
PY time_comp.py breaks > inputs/time_breaks.json          # infer <pkg.pt2>, seq (warm cache and an empty one: time_seq_cold.json)
TORCHINDUCTOR_CACHE_DIR=<new empty dir> PY time_comp.py first   # 3 cold and 3 warm runs, one JSON line each -> inputs/time_first.jsonl (with "kind")
python3 build_data.py                            # writes ../parts/32_cmp_data.js
sh ../build.sh
node dumptext.mjs <index.html> <out.txt>         # rendered tab text from a headless browser (dumptext.mjs, puppeteer from html_utils)
python3 check_page.py <out.txt>                  # embedded data == parts file; prose numbers == inputs
```

Everything except the `time_*` files is deterministic. `inputs/time_phases_run1.json` holds the first run of `time_comp.py phases`, copied from the script's console output before run 2 overwrote the file (labelled in the file).

## What each script records

- `trace_model.py`: eager dispatcher calls (a `TorchDispatchMode`), `torch._dynamo.explain` (graphs, breaks, FX nodes), guards from `TORCH_LOGS=guards` (counted by kind, paths removed), the forward and backward graphs after AOTAutograd's partitioner (captured by `compile_fx(..., inner_compile=...)` with the FX-graph and AOTAutograd caches off), what backward's graph takes as saved inputs, Inductor's code via `run_and_get_code` (launches parsed from the wrapper's `call()`), and three training steps eager against compiled.
- `fusion.py`: GPT-2's tanh GELU on (8, 64, 1024) and residual add + LayerNorm on (8, 64, 256): eager ops with bytes read and written, the compiled launches and kernel.
- `breaks.py`: four graph-break variants of `Block.forward` (patched at run time), with explain's reasons, the compiled pieces and how many run per forward (a counting backend), the `fullgraph=True` error; the recompile sequence under three dynamic-shape strategies with the failing guard; scalar arguments (float, int, 0-d tensor).
- `export_aoti.py`: `torch.export` with a dynamic batch, `run_decompositions()`, `aoti_compile_and_package`, load and compare.
- `autotune_check.py`: what `mode="max-autotune"` chose on the CPU.
- `time_comp.py`: all timings (5 trials x 20 steps after 5 warm-up, medians and ranges; MPS synchronised).

## Findings worth reusing (also in the shared FACTS file)

- CPU, 4 threads: compiled step 23.2 ms against eager 22.8 ms (no gain; max-autotune 23.9, reduce-overhead 23.9, compiled optimizer 22.3, eager fused AdamW 19.1). MPS: 19.2 eager, 16.3 compiled, 10.4 compiled with fused AdamW.
- Forward: 142 eager dispatcher calls to 35 launches on CPU (14 generated C++ kernel launches from 11 kernels, 17 BLAS, 4 SDPA fallbacks); backward 295 to 60. MPS forward 191 to 62.
- One graph, 59 ops, 0 breaks, 549 guards. AOTAutograd saved 34.81 MB of activations (eager 34.76 MB): no memory saving on this model.
- A `print` in `Block.forward` leaves `GPT.forward` uncompiled: 2 compiled pieces, 8 per forward, embeddings and loss in Python; +7 to 9% step time.
- Cold compile of the training step 9.0 to 10.0 s, warm cache 0.86 to 1.04 s; each shape recompile 7.2 to 8.6 s cold.
- mark_dynamic on `idx` alone still recompiles on `targets`; floats and ints become symbolic after one recompile; `eval()` under `no_grad` recompiles (GLOBAL_STATE grad_mode).
- Fused tanh GELU: 9x fewer bytes, 1.3x faster on CPU, 3x on MPS; fused add + LayerNorm slower than ATen on CPU.

Timing caveat: other agents were running; load averages from about 2.7 to 30 are stored in each timing file.

## Departure from the methods

This is a lab tab of a root page, so it measures rather than compares; it owns the running example's compile story and links the compiler stack page for the mechanics on small programs instead of repeating them.
