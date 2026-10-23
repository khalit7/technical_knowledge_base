# src: Distributed and disaggregated serving

Child of Topic: inference-and-serving (built 2026-10-09/10). `sh build.sh` writes `../index.html` from `parts/`
(HTML: 01_head, 10_header, 20_read_a..h.html, 39_tab_more.html; JS: every parts/*.js in its own script, 99_js_tabs.js last).
Ids and classes use the `dd-` prefix, with `pd-`, `ep-`, `m1-` kept for the blocks moved in from the old lab tabs; the stored tab key is `dd-tab`.

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
| Checks | `check_data.py` (embedded data current; 28 prose numbers against the data), `check_ui.mjs` (every control at 390 px dark and 920 px light), `shot_el.mjs` (screenshots of chosen cards) | |

Rebuild: `python3 -I recompute.py; (cd pd && python3 -I pd_sim.py); python3 -I gen_data.py; sh build.sh; python3 -I check_data.py; node check_ui.mjs <shots dir>`; then from the repo root `sh html_utils/checkpage.sh <this folder>`.

## Sources read at pinned versions
- vLLM v0.31.0 (commit db9527a4): `vllm/config/parallel.py` (L44-56 all2all backends, L134 data_parallel_size, L172 enable_expert_parallel, L188 enable_eplb), `vllm/engine/arg_utils.py` (L1183-1290 flags), `vllm/config/vllm.py` (L592-602 max_concurrent_batches), `vllm/config/model.py` (L1504-1509 heads divisible by TP), `vllm/distributed/kv_transfer/kv_connector/factory.py` (L153-246, 17 connectors), `docs/features/disagg_prefill.md` (L16), `docs/serving/parallelism_scaling.md`, `examples/disaggregated/example_connector/`.
- SGLang v0.5.21: `python/sglang/srt/arg_groups/choices.py` (L120-127), `arg_groups/fields/disagg.py` (L55-65), `arg_groups/fields/parallel.py` (CLI names).
- llama.cpp b11146 (commit 7fe450e19): `tools/rpc/README.md`, `common/arg.cpp` (L2803 split modes), `src/llama.cpp` (meta device for tensor split), `tools/server/server-context.cpp` (slot save and restore).
- Everything else (Dynamo, NIXL, llm-d, GAIE, TensorRT-LLM, Triton, KServe, Ray, papers, DeepSeek, DeepEP, NVIDIA link specs): GitHub releases API, READMEs, docs and arXiv abstracts, read 2026-10-09 and 2026-10-10, URLs inline on the page; notes in the shared scratch research file (not committed).

## Departures from the method
No `src/live.md`: the old page was already saved by the parent (`../../src/read/old/nvidia_triton_trtllm_dynamo.md`); `coverage.md` checks it claim by claim. The page is wider than the old one (parallelism and disaggregation from zero, as the parent's section 11 planned), so the NVIDIA products became one section (8) of ten.

## The 2026-10-23 rebuild to the teaching contract
Editing and moving only; one small addition to `recompute.py` (`mem`: the planner's per-GPU memory split at TP 1 and TP 2, for the section 1 figure; every other value in `out/calc.json` unchanged). No new runs.

- **Ownership.** This page owns serving across GPUs and nodes. The parallelism forms (Megatron's column/row split, what an all-reduce or all-to-all is) are now one sentence plus a link to Distributed Training; sections 3 to 5 teach only what changes at serve time (latency-bound all-reduces at batch 1, KV split by heads and the 8-head limit, no backward pass or 1F1B in pipelines, data-parallel attention with spread experts, imbalance per batch). The MoE layer links to Mixture of experts; KV bytes per token link to Long context's calculator (`#t-kv`).
- **Top**: the core sentence, a static hero (five splits, what crosses per token and over which link, numbers from `DDC`), "You need", nine new terms, the running example. The old "In one screen" table is a closed reference block; the four summary cards were cut (the hero carries them).
- **Visuals inline**, by kind of concept: memory to scale at TP 1 against TP 2 (new, structure); Dynamo's router cost on three workers with one slider (new, parameter, illustrative loads); the four-way decode-step animation (kept); one MoE layer under EP (new, static structure); the Expert balancer's load chart and EPLB stepper (moved from their tab into section 5); the prefill/decode animation and KV transfer table (kept); the disaggregation grid's SLO chart and goodput bars (moved from their tab into section 7); a map of which serving-layer project does which job (new, static).
- **Tabs folded**: Disaggregation lab, Expert balancer and Runs on this laptop each explained one mechanism, so their visuals now sit beside the claim; their method notes, per-run and per-layer tables and the laptop runs are closed blocks in sections 4, 5, 6 and 7. Tabs left: Reading, Further reading.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (`dd-tab` key; the nav id became `rd-nav`); the two animations no longer start on a mode switch. Checked: after scrolling every animation into view with normal motion, all stay on step 0.
- **Closed**: product details of section 8 (parts, versions, history, quotes), vendor and partner claims, the published-claims table, DeepSeek's throughput and margin, the simulation method, tables, the laptop runs, four mistakes that add something, one design question, the corrections to the old page.
- **Deleted as fat** (30 units, each with a note in the ledger): wind-ups, "The problem it solves / How it works" lead-ins, the one-screen cards, lab-tab leads, five mistakes and eight interview answers that restated the core (their facts are keyed to the core sentences that now carry them).

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 7,773 words, 34 min | 7,136 words, 31 min |
| Reading, closed details | 764 words, 3 min | 4,680 words, 20 min |
| Other tabs, core | Disaggregation lab 892, Expert balancer 566, Runs on this laptop 1,907, Further reading 763: 18 min | Further reading 751: 3 min |
| Core total, excluding Further reading | 48 min | 31 min |
| Visuals drawn in Reading | 2 | 11 (plus the interference chart, closed) |

Why 31 minutes is right: the page teaches five distinct ways to spread serving, each with its own cost on the wire, plus routing for the cache, when disaggregation pays (with the only measured answer for the running example) and the serving layer; the ledger is mostly core (228 core against 86 depth units), and about a fifth of the core words are captions, counters and controls of the eleven visuals. What made the old page long for its reader (three lab tabs the Reading kept sending him to, product chronicles, vendor claim lists, mistakes and interview answers restating sections) is now inline, closed or cut. The closed time grew because the lab tabs' method notes and tables and the laptop runs moved into closed blocks rather than being deleted.

## Ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
347 units: core 228, depth 86, fat 30, owned 3 (Megatron's column/row split and head division, at Distributed Training). 340 drafted by `ledger.py init` from the 2026-10-19 build; 7 added by hand for the new figures and the script-rendered section 7 table.
