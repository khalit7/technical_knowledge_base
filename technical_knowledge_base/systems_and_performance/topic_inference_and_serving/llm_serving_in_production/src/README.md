# src: LLM serving in production

Child of Topic: inference-and-serving. `sh build.sh` writes `../index.html` from `parts/`.

## Layout
| Path | What |
|---|---|
| `parts/` | `01_head`, `10_header`, Reading `20_read_a..g` (+ `20_read_z` closes the tab), labs `32_tab_scale` (Autoscaling), `33_tab_route` (Router), `34_tab_load` (Load test), `39_tab_more`; JS: `20_js_pr_data.js` (generated, window.PRD), `21_js_rd_common.js` (step-animation controller, copied from the parent, with a tab argument), `22`..`26` Reading visuals, `31_js_sc_core.js` (autoscaling simulator, port of `sim/autoscale.py`), `32`..`34` labs, `99_js_tabs.js` (storage key `pr-tab`) |
| `exp/` | The runs on the M1 Pro. `prtrace.py` (traces: Mooncake conversation sampled by conversation, the parent's 8-request scenario), `route_client.py` (the router and open-loop client), `run_route.sh` (three llama-server replicas per run, fresh caches), `route_sim.py` (routing what-if over 1 to 16 replicas), `cold_start.py` (APFS-clone cold and warm starts), `make_loras.py` (random rank-16 adapters for cost measurement), `cl_client.py` + `run_lora_so.sh` (multi-LoRA) + `run_so.sh` (JSON-schema runs on a server without adapters, and adapters loaded but off), `run_co.sh` (the stall experiment with the parent's `loadgen.py`), `run_vllm.sh` (vLLM 0.31.0 CPU in Docker: start-up phases, LoRA, structured output), `summarize.py` -> `out/measured.json` |
| `sim/` | `autoscale.py` (reference), `gen_ref.py` -> `out/ref.json`, `check_sim.mjs` (the page's JS equals the reference) |
| `gen_data.py` | writes `parts/20_js_pr_data.js` |
| `check_data.py` | the page embeds exactly `measured.json`, `route_sim.json` and the simulator's defaults; every number in the prose agrees with the data |
| `check_ui.mjs` | puppeteer: every control at 390 px dark and 920 px light |

Large inputs stay outside the repo: Mooncake traces (kvcache-ai/Mooncake main, FAST25-release/traces, fetched 2026-10-10; conversation_trace.jsonl sha256 b8cbb061a85206d729d91cdc2981f43c9e0d99209dce588d3af5f7934408b9df), model files (the shared scratch model store), the adapters (regenerate with `make_loras.py` and llama.cpp's `convert_lora_to_gguf.py` at b11146), raw run files.

## Rebuild
```
python3 -I exp/prtrace.py <traces dir> <trace out dir>
INF_DIR=<scratch> sh exp/run_route.sh <trace.json> <out> "<policies>" <repeats> 3 <cache MiB>   # see the file for the exact calls
python3 -I exp/route_sim.py <conv.json> <raw>/conv/rr_r1.json exp/out/route_sim.json
python3 -I exp/summarize.py <raw dir>
python3 -I sim/gen_ref.py sim/out/ref.json && node sim/check_sim.mjs sim/out/ref.json
python3 -I gen_data.py && sh build.sh && python3 -I check_data.py && node check_ui.mjs <shots dir>
```

## Departures from the method
A child page whose subject is a set of production decisions rather than one mechanism: the Reading tab is one section per decision, each with problem, mechanism, measured evidence on this machine, cost, and how to check. Three labs instead of one because each decision has its own evidence (real routing runs, a simulator, a load-test experiment).
