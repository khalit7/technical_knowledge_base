# src: LLM serving in production

Child of Topic: inference-and-serving. `sh build.sh` writes `../index.html` from `parts/`.

## Layout
| Path | What |
|---|---|
| `parts/` | `01_head`, `02_split` (the split layout, skill template), `10_header` (tabs: Reading, Further reading), Reading `20_read_a` (styles, Fig. 1 hero split: core idea, step list, You need, terms; then nav and decisions table) to `20_read_g` (sections 1 to 8, interview rehearsal closed), `20_read_z` closes the tab; `39_tab_more`. JS: `20_js_pr_data.js` (generated, window.PRD), `21_js_pr_sim.js` (autoscaling simulator, port of `sim/autoscale.py`; since 2026-11-12 it also returns `starts`, the decision time of every replica started, which only the Fig. 3 stage reads), `21_js_rd_common.js` (skill template: autoplay on view, step lists), `22_js_pr_cost.js` (s1 cost slider), `23_js_pr_rt.js` (s2 eight-request widget, every policy and scenario, in a closed block), `24_js_pr_conv.js` and `24_js_pr_route.js` (s2 trace table, TTFT CDF, replica-count simulation, closed per-request dots and repeats), `25_js_pr_co.js` (Fig. 5, s8 freeze animation in five stretches) and `25_js_pr_load.js` (closed all-runs block), `25_js_s3.js` (skill template, renderer v2), `26_js_pr_misc.js` (predict buttons, cold, LoRA and structured-output tables), `27_js_pr_scale.js` (s3 autoscaling comparison widget), `27_js_pr_cold.js` (s4 phase bars), `40_js_sc_hero.js` to `43_js_sc_lora.js` (the four 3D scenes), `99_js_tabs.js` (skill template, storage key `pr-tab`) |
| `exp/` | The runs on the M1 Pro. `prtrace.py` (traces: Mooncake conversation sampled by conversation, the parent's 8-request scenario), `route_client.py` (the router and open-loop client), `run_route.sh` (three llama-server replicas per run, fresh caches), `route_sim.py` (routing what-if over 1 to 16 replicas), `cold_start.py` (APFS-clone cold and warm starts), `make_loras.py` (random rank-16 adapters for cost measurement), `cl_client.py` + `run_lora_so.sh` (multi-LoRA) + `run_so.sh` (JSON-schema runs on a server without adapters, and adapters loaded but off), `run_co.sh` (the stall experiment with the parent's `loadgen.py`), `run_vllm.sh` (vLLM 0.31.0 CPU in Docker: start-up phases, LoRA, structured output), `summarize.py` -> `out/measured.json` |
| `sim/` | `autoscale.py` (reference), `gen_ref.py` -> `out/ref.json`, `check_sim.mjs` (the page's JS equals the reference) |
| `gen_data.py` | writes `parts/20_js_pr_data.js` |
| `check_data.py` | the page embeds exactly `measured.json`, `route_sim.json` and the simulator's defaults; every number in the prose agrees with the data; the section 1 cost arithmetic |
| `check_ui.mjs` | puppeteer: every control at 390 px dark and 920 px light, screenshots of each card |
| `check_stages.mjs` | the rollout checks (2026-11-12): stages and the step animation play when scrolled into view, step lists match steps in every mode, widgets never play, nothing moves under reduced motion, splits, label overlaps, step-list numbers against PRD and PRSIM (`check_noplay.mjs` is gone: its rule is inverted) |
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
python3 -I gen_data.py && sh build.sh && python3 -I check_data.py && node check_ui.mjs <shots dir> && node check_stages.mjs <shots dir>
```

## The 2026-10-23 rebuild to the teaching contract (editing only, no new runs)
- **Top**: the core idea in one sentence, the request-path diagram as the hero (each box names the section that owns it), "You need" with the running example, six new terms, and the decisions table trimmed to what the evidence says.
- **New section 1, the promise and its bill** (this page owns SLOs, goodput, capacity planning for an endpoint and cost per token, per OWNERS 2026-10-23): TTFT, TPOT and ITL defined with the TPOT formula; DistServe's goodput; capacity from the parent's Capacity planner (2.11 requests/s per H200 within p99 TTFT 2 s and TPOT 50 ms, 10 H200s at 20 requests/s); cost per million tokens with one slider (average traffic as a share of the peak) whose defaults reproduce the parent's $0.54 and $33.12 independently from its inputs, and the derived break-even at 67% of the peak. These units were absorbed from the parent's sections 4 and 10 (ledger tab `absorbed:...`); the planner tool stays on the parent and is linked.
- **The three lab tabs were folded into Reading**, each visual beside the claim it proves: the TTFT distribution and the replica-count simulation in section 2 (per-request dots and all repeats in a closed block), the autoscaling comparison in section 3 (four presets as the variable; custom autoscalers and traffic in a closed block; it opens on the end of the half hour and moves only when stepped or played), every stall run and the wrk2 correction in a closed block of section 8.
- **New visuals**: the cost slider (s1), cold-start phases on one axis (s4: vLLM CPU measured, NVIDIA's Run:ai test, the running example derived before and after vLLM v0.30), and a toggle of one adapter set per batch against a mixed batch (s5, why batching adapters works).
- **No autoplay** (2026-10-23; superseded on 2026-11-12, see the rollout section below).
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

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (key `pr-tab`), `05z_errbox.js.html`. The page's `#t-read .an-ctl` rules skip `.stg-bar`; `build.sh` writes the em-dash detector's character as bytes. Removed: `22_js_pr_arch.js` (the SVG hero, now Fig. 1), `27_js_pr_lora.js` (the adapter toggle, now Fig. 4), `check_noplay.mjs`.

**No new runs.** Fig. 2 draws `PRD.route_detail` (the measured eight-request runs: round robin and SGLang's rules with a 1.5 GiB cache, the weighted scorer with two bursts). Fig. 3 runs the page's own simulator (`PRSIM`, the comparison chart's defaults, 44.5 s cold start) in the browser; the one addition, `starts`, does not change any field `sim/check_sim.mjs` compares (24 cases, 26,088 numbers, 0 differences). Fig. 5 cuts the measured freeze runs (`PRD.co`) into five stretches. Fig. 1 and Fig. 4 are schematic and say so. `check_stages.mjs` recomputes every number in the step lists from PRD and PRSIM.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | Top: core idea, You need, terms | split | **3D** `stg-hero` (Fig. 1): one request's path, schematic | yes, 6 |
| Reading | Nav, decisions table | full width | table | no |
| Reading | 1 The promise and its bill | split | 2D cost slider (widget) | no |
| Reading | 2 Routing: families, the experiment | split | **3D** `stg-rt` (Fig. 2): eight measured requests, three modes | yes, 9 + 9 + 4 |
| Reading | 2 Every policy in every scenario | closed block | 2D widget (opens on its last request) | no |
| Reading | 2 A real multi-turn trace | split | 2D TTFT CDF (log axis) | no |
| Reading | 2 Scaled out | split | 2D replica-count simulation | no |
| Reading | 2 Per-request dots, cost, other routers | full width (closed blocks) | 2D dots in a closed block | no |
| Reading | 3 What to scale on | split | **3D** `stg-as` (Fig. 3): the pool over half an hour, simulated, two modes | yes, 6 + 4 |
| Reading | 3 The cost of reacting, signals that fail | split | 2D comparison chart (widget, 121 frames, opens on the end) | no |
| Reading | 3 Guides, spot, how to check | full width | none | no |
| Reading | 4 Cold starts | split | 2D phase bars | no |
| Reading | 4 Mitigations, published times | full width | none | no |
| Reading | 5 Multi-LoRA | split | **3D** `stg-lora` (Fig. 4): adapters in one layer, schematic, two modes | yes, 4 + 4 |
| Reading | 5 Measured | split | 2D bars | no |
| Reading | 6 Structured output, 7 Metrics | full width | table | no |
| Reading | 8 Load testing | split | 2D animation (Fig. 5), two modes | yes, 5 + 5 |
| Reading | 8 The rest of an honest test, tools, interview | full width | none | no |
| Further reading | | unchanged | | |

Kept 2D and why: the cost curve, the TTFT CDF on a log axis, the replica-count curves, the cold-start phase bars and the LoRA throughput bars are numbers on an axis; the freeze scatter is latency (log axis) against send time, which depth would only blur; the autoscaling comparison chart (two runs, replicas and p90 TTFT against time) is the quantitative partner of Fig. 3 and reads best flat. The two long replays (the eight-request widget, 9 frames times 15 combinations, and the 121-frame autoscaling chart) are widgets (long-replay rule b). The brief's "load test ramping concurrency" stage was not built: this page's load-test evidence is the freeze experiment, and a concurrency sweep lives on the parent's Engine bench.

### Length judgement
| | Before (2026-10-23) | After (2026-11-12) |
|---|---|---|
| Reading, core (230 words a minute) | 6,852 words, 30 min | 8,432 words, 37 min |
| Reading, closed details | 2,812 words, 12 min | 2,952 words, 13 min |
| Visuals in Reading (audit count) | 11 | 13 (4 of them 3D stages) |

The 1,580 extra core words are the step lists: about 870 in the lists shown by default (Fig. 1, 2, 3, 4, 5) and 714 in the other modes' lists, which stay hidden until their mode is chosen (so a reader sees about 34 minutes). Each list replaces a caption that was written by script (the eight-request stepper, the freeze animation, the adapter toggle) or the hero's caption; the burst numbers moved from the "What it shows" paragraph into the burst list. Nothing was cut. If the page must shrink: the round-robin and cache-aware lists could group their four first turns into one step each.

### Knowledge ledger
387 units: core 300, depth 44, fat 42, owned 1 (`ledger.py check`: problems 0). Seven units added for the stages (section "added 2026-11-12"); four keys reworded (58, 59, 173, 377). The root's ledger still finds every unit it keys on this page (problems 0).
