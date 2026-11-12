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

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `dd-tab`), `05z_errbox.js.html`. The page's `#t-read .an-ctl` rules skip `.stg-bar`; `build.sh` writes the em-dash detector's character as bytes. No new runs and no change to `recompute.py`, `gen_data.py` or the data: every scene draws from `window.DDC` (planner numbers), and its step-list numbers are checked against it.

New parts: `40_js_sc_00lib.js` (shared GPU board, labels, the fade rule), `40_js_sc_hero.js` (Fig. 1), `41_js_sc_rt.js` (Fig. 2), `42_js_sc_tp.js` (Figs. 3a and 3b), `43_js_sc_ep.js` (Fig. 5), `44_js_sc_pd.js` (Fig. 6), `45_js_sc_stack.js` (Fig. 8). Removed from `23_js_dd_figs.js`: the SVG hero, the router slider chart and the EP layer drawing (each replaced by a stage). `23_js_dd_split.js`: the four-way decode step is now seven explained steps (layout x users) with `#sx-split`, its two mode toggles and caption gone. `24_js_dd_pd.js` (Fig. 7) and the EPLB stepper in `32_js_ep.js` are widgets (`auto:false`, opening on their last frame): long replays whose outcome the reader drives.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | Top (core idea, Fig. 1) | split | **3D** `stg-hero`: five splits on four GPUs, then the serving layer | yes, 6 |
| Reading | You need, terms, running example, five-splits table (closed) | full width | none | no |
| Reading | 1 Why one GPU stops being enough | split | 2D memory to scale | no |
| Reading | 2 Replicas, routing | split | **3D** `stg-rt`: Dynamo's cost on three workers (loads illustrative) | yes, 5 |
| Reading | 2 How to check, DP attention | full width | none | no |
| Reading | 3 Tensor parallel | split | **3D** `stg-tp`: 80 layers cut across 8 GPUs, all-reduces, time bars, two servers | yes, 5 |
| Reading | 4 Pipeline parallel | split | **3D** `stg-pp`: 8 stages, one user, 8 micro-batches, PP 2 across servers | yes, 4 |
| Reading | 4 One decode step, four layouts | split | 2D animation (Fig. 4), autoplays | yes, 7 |
| Reading | 4 Laptop runs (closed) | full width | tables | no |
| Reading | 5 Expert parallel | split | **3D** `stg-ep`: attention home, dispatch, combine, overlap | yes, 4 |
| Reading | 5 The catch, EPLB | split | 2D chart (measured routing) | no |
| Reading | 5 How EPLB decides | split | 2D widget (EPLB stepper, opens on the plan) | no |
| Reading | 5 Production deployment | full width | none | no |
| Reading | 6 Splitting prefill from decode | split | **3D** `stg-pd`: colocated, stall, split, cache built and moved | yes, 6 |
| Reading | 6 Same arrival on a time axis | split | 2D widget (Fig. 7, three settings, live caption) | no |
| Reading | 6 What moving the cache costs | split | 2D calculator (cache per link) | no |
| Reading | 6 How the cache moves, ratio, laptop runs | full width | none, closed tables | no |
| Reading | 7 Goodput, DistServe example | full width | stat boxes | no |
| Reading | 7 The running example, simulated | split | 2D curves and bars | no |
| Reading | 7 Method, published claims | full width | closed tables | no |
| Reading | 8 Serving layer | split | **3D** `stg-stack`: engines, Triton, Dynamo, llm-d with KServe, Ray Serve LLM | yes, 5 |
| Reading | 8 Versions table, claims | full width | table | no |
| Reading | 8 Choosing | split | 2D who-does-what grid | no |
| Reading | 9 Choosing a layout, Depth | full width | table, closed blocks | no |
| Further reading | | unchanged | | |

Kept 2D and why: memory bars, goodput curves, EP load bars, the per-link cache table and the who-does-what grid are numbers on axes or matrices and read best flat; Fig. 4 is a Gantt chart. The "What each one adds" list of section 8 was merged into Fig. 8's step list (same facts, said once).

### Length judgement
| | Before (2026-11-12, audit) | After |
|---|---|---|
| Reading, core (230 words a minute) | 7,456 words, 32 min | 9,027 words, 39 min |
| Reading, closed details | 4,762 words, 21 min | 4,762 words, 21 min |
| Further reading | 769 words, 3 min | 769 words, 3 min |
| Visuals in Reading (audit count) | 11 | 15 (7 of them 3D stages) |

The 1,570 extra core words are the eight step lists (seven stages and Fig. 4) plus one caption sentence per stage; nothing was cut except the duplicated "What each one adds" list. Each list carries the planner's numbers for its step, which the prose before stated only in part. If the page must shrink: the hero list could lose its section pointers, and the Fig. 4 list could drop the 64-user replicas step (the PP step repeats its numbers).

### Knowledge ledger
357 units: core 235, depth 86, fat 31, owned 3, volatile 2 (`ledger.py check`: problems 0). Three keys reworded (59, 115, 344: the old mode buttons and two captions); five units added for the stages (section "added 2026-11-12"). The root's ledger still finds every unit it keys on this page (problems 0).

### Checks (2026-11-12)
`check_data.py` (OK), `check_ui.mjs` (664 controls at 390 dark and 920 light, 0 errors), `checkpage.sh` (fail=0, emdash 0, errbox 1, clipped 0), `check_stages.mjs` (new: autoplay, reduced motion, off-screen redraws, step counts, label overlaps at 1400 px, splits, and every step-list number against `window.DDC`).
