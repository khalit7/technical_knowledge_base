# src: LLM serving in production

Child of Topic: inference-and-serving. `sh build.sh` writes `../index.html` from `parts/`.

## Layout
| Path | What |
|---|---|
| `parts/` | `01_head`, `10_header` (tabs: Reading, Further reading), Reading `20_read_a` (styles, core idea, hero, terms, nav, decisions table) to `20_read_g` (sections 1 to 8, interview rehearsal closed), `20_read_z` closes the tab; `39_tab_more`. JS: `20_js_pr_data.js` (generated, window.PRD), `21_js_pr_sim.js` (autoscaling simulator, port of `sim/autoscale.py`), `21_js_rd_common.js` (skill template, never autoplays), `22_js_pr_arch.js` (hero), `22_js_pr_cost.js` (s1 cost slider), `23_js_pr_rt.js` (s2 eight-request stepper), `24_js_pr_conv.js` and `24_js_pr_route.js` (s2 trace table, TTFT CDF, replica-count simulation, closed per-request dots and repeats), `25_js_pr_co.js` and `25_js_pr_load.js` (s8 stall animation, closed all-runs block), `26_js_pr_misc.js` (predict buttons, cold, LoRA and structured-output tables), `27_js_pr_scale.js` (s3 autoscaling comparison), `27_js_pr_cold.js` (s4 phase bars), `27_js_pr_lora.js` (s5 adapter-batching toggle), `99_js_tabs.js` (skill template, storage key `pr-tab`) |
| `exp/` | The runs on the M1 Pro. `prtrace.py` (traces: Mooncake conversation sampled by conversation, the parent's 8-request scenario), `route_client.py` (the router and open-loop client), `run_route.sh` (three llama-server replicas per run, fresh caches), `route_sim.py` (routing what-if over 1 to 16 replicas), `cold_start.py` (APFS-clone cold and warm starts), `make_loras.py` (random rank-16 adapters for cost measurement), `cl_client.py` + `run_lora_so.sh` (multi-LoRA) + `run_so.sh` (JSON-schema runs on a server without adapters, and adapters loaded but off), `run_co.sh` (the stall experiment with the parent's `loadgen.py`), `run_vllm.sh` (vLLM 0.31.0 CPU in Docker: start-up phases, LoRA, structured output), `summarize.py` -> `out/measured.json` |
| `sim/` | `autoscale.py` (reference), `gen_ref.py` -> `out/ref.json`, `check_sim.mjs` (the page's JS equals the reference) |
| `gen_data.py` | writes `parts/20_js_pr_data.js` |
| `check_data.py` | the page embeds exactly `measured.json`, `route_sim.json` and the simulator's defaults; every number in the prose agrees with the data; the section 1 cost arithmetic |
| `check_ui.mjs` | puppeteer: every control at 390 px dark and 920 px light, screenshots of each card |
| `check_noplay.mjs` | nothing moves before the reader acts, normal and reduced motion |
| `shot_el.mjs` | screenshots of the Reading figures and closed blocks |
| `ledger.json` | the knowledge ledger (`python3 html_utils/ledger.py check`) |

Large inputs stay outside the repo: Mooncake traces (kvcache-ai/Mooncake main, FAST25-release/traces, fetched 2026-10-10; conversation_trace.jsonl sha256 b8cbb061a85206d729d91cdc2981f43c9e0d99209dce588d3af5f7934408b9df), model files (the shared scratch model store), the adapters (regenerate with `make_loras.py` and llama.cpp's `convert_lora_to_gguf.py` at b11146), raw run files.

## Rebuild
```
python3 -I exp/prtrace.py <traces dir> <trace out dir>
INF_DIR=<scratch> sh exp/run_route.sh <trace.json> <out> "<policies>" <repeats> 3 <cache MiB>   # see the file for the exact calls
python3 -I exp/route_sim.py <conv.json> <raw>/conv/rr_r1.json exp/out/route_sim.json
python3 -I exp/summarize.py <raw dir>
python3 -I sim/gen_ref.py sim/out/ref.json && node sim/check_sim.mjs sim/out/ref.json
python3 -I gen_data.py && sh build.sh && python3 -I check_data.py && node check_ui.mjs <shots dir> && node check_noplay.mjs
```

## The 2026-10-23 rebuild to the teaching contract (editing only, no new runs)
- **Top**: the core idea in one sentence, the request-path diagram as the hero (each box names the section that owns it), "You need" with the running example, six new terms, and the decisions table trimmed to what the evidence says.
- **New section 1, the promise and its bill** (this page owns SLOs, goodput, capacity planning for an endpoint and cost per token, per OWNERS 2026-10-23): TTFT, TPOT and ITL defined with the TPOT formula; DistServe's goodput; capacity from the parent's Capacity planner (2.11 requests/s per H200 within p99 TTFT 2 s and TPOT 50 ms, 10 H200s at 20 requests/s); cost per million tokens with one slider (average traffic as a share of the peak) whose defaults reproduce the parent's $0.54 and $33.12 independently from its inputs, and the derived break-even at 67% of the peak. These units were absorbed from the parent's sections 4 and 10 (ledger tab `absorbed:...`); the planner tool stays on the parent and is linked.
- **The three lab tabs were folded into Reading**, each visual beside the claim it proves: the TTFT distribution and the replica-count simulation in section 2 (per-request dots and all repeats in a closed block), the autoscaling comparison in section 3 (four presets as the variable; custom autoscalers and traffic in a closed block; it opens on the end of the half hour and moves only when stepped or played), every stall run and the wrk2 correction in a closed block of section 8.
- **New visuals**: the cost slider (s1), cold-start phases on one axis (s4: vLLM CPU measured, NVIDIA's Run:ai test, the running example derived before and after vLLM v0.30), and a toggle of one adapter set per batch against a mixed batch (s5, why batching adapters works).
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; mode switches and presets no longer start playback (`check_noplay.mjs`).
- **Moved to closed depth**: other routers and published router gains, the guides' autoscaling thresholds, spot capacity, published start-up times and per-phase fixes, structured-output measurements, the llama-server metric list, tools. Structured output keeps one core paragraph (its mechanism belongs to Sampling and decoding, section 5).
- **Deleted as fat** (41 units, each with a note in the ledger): "The problem." lead-ins and wind-ups, table questions, pointers to the removed tabs, the common-mistakes list (each mistake restated a section; the two that did not, grouping traffic by adapter and the lost CPU/GPU overlap of grammar masks, were moved into sections 5 and 6), four interview answers that restated sections (four design questions stay, closed), and one sentence that contradicted section 4's measurement (llama-server warms up before reporting healthy).

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 7,877 words, 34.2 min | 6,825 words, 29.7 min |
| Reading, closed details | 755 words, 3.3 min | 2,628 words, 11.4 min |
| Lab tabs, core | Router 596, Autoscaling 626, Load test 419: 7.1 min | none (folded in) |
| Further reading | 755 words, 3.3 min | 772 words, 3.4 min |
| Core total, excluding Further reading | 41.3 min | 29.7 min |
| Visuals drawn in Reading | 3 (5 more in lab tabs) | 11 (plus 2 in closed blocks) |

Why 30 minutes is right: the page covers eight production decisions, each with a mechanism, its own measured evidence and a picture, and now also owns the SLO, goodput and cost-per-token arithmetic the parent used to carry; the ledger is overwhelmingly core (293 core against 42 depth units). What made the old page long and scattered (three lab tabs the prose kept sending the reader to, per-source detail, the mistakes and interview lists that restated sections) is folded inline, closed, or cut. The closed time grew because published detail (thresholds, start-up times, other routers, spot) and the moved lab tables now sit in closed blocks rather than in the open prose or other tabs. What could still go: the decisions table at the top (kept as the one-screen map) and the hidden predict answers (they count as core words).

## Ledger
`src/ledger.json`: 377 units (360 drafted from the page as built on 2026-10-19, 12 absorbed from the parent's sections 4 and 10, 5 for new visuals): core 293, depth 42, fat 41, owned 1 (vLLM's `max_lora_rank` knob, on the vLLM page); problems 0.

## Departures from the method
A child page whose subject is a set of production decisions rather than one mechanism: the Reading tab is one section per decision, each with its mechanism, measured evidence on this machine and its picture inline; cost and how to check where they matter. No lab tabs since 2026-10-23: each lab explained one decision, so its visuals sit in that section.

2026-10-26 (final follow-up sweep): the routing depth block adds llm-d's `InferenceObjective` priority and the Virtual Token Counter's fairness bound; the cold-start section adds the vLLM post's "30-100+ seconds per switch" for a full reload. Both absorbed from ML system design, which keeps multi-tenancy as a design question and links here. Three ledger units added.
