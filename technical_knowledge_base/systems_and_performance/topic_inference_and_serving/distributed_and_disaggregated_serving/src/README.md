# src: Distributed and disaggregated serving

Child of Topic: inference-and-serving (built 2026-10-09/10). `sh build.sh` writes `../index.html` from `parts/`
(HTML: 01_head, 10_header, 20_read_*.html, 3x_tab_*.html; JS: every parts/*.js in its own script, 99_js_tabs.js last).
Ids and classes use the `dd-` prefix in Reading, `pd-`, `ep-`, `m1-` in the tabs; the stored tab key is `dd-tab`.

Shape: the child-page method (`.claude/skills/explainer-page/page-kinds/topic-child.md`): Reading in the subject's own order
(why split, replicas, TP, PP, EP, prefill/decode split, when it pays, the serving layer, choosing and checking,
mistakes, interview questions, corrections), three labs, Further reading. Running example: the parent's chat assistant
(Llama 3.1 70B, FP8 weights, BF16 KV, H200, 2,000-token prompts, 300-token answers).

## Pipeline
| Step | Script | Output |
|---|---|---|
| Planner numbers (TP/PP step times, bytes per token, KV transfer, prefill times, animation inputs) | `recompute.py` (imports `../../src/plan/plan.py`, which imports the hardware root's calculator unchanged) | `out/calc.json` |
| Disaggregation grid: 3 workloads x 15 layouts (colocated, 7 splits x 2 links) x 16 rates, 1,200 requests each | `pd/pd_sim.py` (imports the root's `src/sim/sim.py` unchanged; H100 NIM calibration applied to H200 peak and bandwidth; memory from the planner) | `pd/out/pd_grid.json` |
| Real MoE routing: Granite 3.1 1B-A400M on 64 x 512 tokens of WikiText-2 test, CPU, bfloat16 | `ep/route.py` via `ep/run_route.sh` (uv, torch 2.14.1, transformers 5.19.0; counts kept in scratch) | `counts.json` (scratch) |
| EP balance: default placement vs DeepSeek's eplb.py (copied unchanged, MIT, commit d52c72d) on held-out windows | `ep/balance.py` | `ep/out/balance.json` |
| The page's EPLB port against eplb.py, every layer and setting | `ep/check_ep.mjs` | `ep/out/port_check.json` |
| Laptop runs (2026-10-10/11, bench lock held): llama.cpp RPC one process / layer split / tensor split (2 runs x 3 reps, Qwen3-1.7B Q8_0 and 4B Q4_K_M); two llama-servers handing a KV file over, plus interference (2 runs); vLLM CPU TP 1 / TP 2 / PP 2 with explicit core binding (2 runs each); vLLM ExampleConnector prefill, decode, baseline (runs 2 and 3; run 1 discarded, machine shared) | `exp/*.sh`, `exp/llama_pd.py`, `exp/vllm_pd.py` (raw results in scratch); `exp/summarise.py` | `exp/out/measured.json`, `exp/out/raw/` |
| Page data | `gen_data.py` | `parts/20_js_dd_data.js` |
| Checks | `check_data.py` (embedded data current; 25 prose numbers against the data), `check_ui.mjs` (every control at 390 px dark and 920 px light) | |

Rebuild: `python3 -I recompute.py; (cd pd && python3 -I pd_sim.py); python3 -I gen_data.py; sh build.sh; python3 -I check_data.py; node check_ui.mjs <shots dir>`; then from the repo root `sh html_utils/checkpage.sh <this folder>`.

## Sources read at pinned versions
- vLLM v0.31.0 (commit db9527a4): `vllm/config/parallel.py` (L44-56 all2all backends, L134 data_parallel_size, L172 enable_expert_parallel, L188 enable_eplb), `vllm/engine/arg_utils.py` (L1183-1290 flags), `vllm/config/vllm.py` (L592-602 max_concurrent_batches), `vllm/config/model.py` (L1504-1509 heads divisible by TP), `vllm/distributed/kv_transfer/kv_connector/factory.py` (L153-246, 17 connectors), `docs/features/disagg_prefill.md` (L16), `docs/serving/parallelism_scaling.md`, `examples/disaggregated/example_connector/`.
- SGLang v0.5.21: `python/sglang/srt/arg_groups/choices.py` (L120-127), `arg_groups/fields/disagg.py` (L55-65), `arg_groups/fields/parallel.py` (CLI names).
- llama.cpp b11146 (commit 7fe450e19): `tools/rpc/README.md`, `common/arg.cpp` (L2803 split modes), `src/llama.cpp` (meta device for tensor split), `tools/server/server-context.cpp` (slot save and restore).
- Everything else (Dynamo, NIXL, llm-d, GAIE, TensorRT-LLM, Triton, KServe, Ray, papers, DeepSeek, DeepEP, NVIDIA link specs): GitHub releases API, READMEs, docs and arXiv abstracts, read 2026-10-09 and 2026-10-10, URLs inline on the page; notes in the shared scratch research file (not committed).

## Departures from the method
No `src/live.md`: the old page was already saved by the parent (`../../src/read/old/nvidia_triton_trtllm_dynamo.md`); `coverage.md` checks it claim by claim. The page is wider than the old one (parallelism and disaggregation from zero, as the parent's section 11 planned), so the NVIDIA products became one section (8) of ten.
