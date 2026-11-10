# Mixture of experts: page source

`sh build.sh` writes `../index.html`, the whole Notion page "Mixture of experts: routers, load balancing, fine-grained and
shared experts, expert parallelism" (https://app.notion.com/p/3fd5c17b0d0d81fda06bf955af7c2b58), a child of Topic:
llm-architecture. Built 2026-10-18 with the explainer-page skill (`page-kinds/topic-child.md`); floor: the Topic: llms
"Deeper: inside an MoE" tab (`topic_llms/src/parts/35_*`), every claim accounted for in `coverage.md`.

## Tabs (since the 2026-10-23 rebuild)
| Tab | id | What |
|---|---|---|
| Reading | `t-read` | top (core sentence, hero, you need, new terms, the design-choices table closed, measured box), 1 total and active (to-scale card, dense-twin stepper), 2 the router (8-token stepper, softmax/sigmoid widget, gradient check, group limits, drill; code, routing styles and what routes where closed), 3 collapse and balancing (collapse animation, aux loss, bias, scope, z-loss, drill; held-out loads, heat map, curves and transformers checks closed), 4 capacity and drops, 5 fine-grained and shared (static figure), 6 measured dense vs MoE, 7 expert parallelism (four-rank stepper), 8 serving (experts-touched slider), 9 configs (table and totals closed), design questions closed |
| Dense vs MoE calculator | `t-calc` | `window.CC` (the root's Config calculator core, injected unchanged by build.sh) on 20 configs |
| Further reading | `t-more` | |

Parts: `02_split.html` (template), `20_read_a` to `20_read_h`, `20_read_z`; JS `21_js_rd_common.js` and `99_js_tabs.js` (skill templates, storage key `mx-tab`), `22_js_mx_0data.js`, `23_js_mx_core.js`, `24_js_mx_read.js`, `25_js_rd_route.js` (was the Router tab), `26_js_rd_load.js` (was the Expert load tab), `27_js_rd_new.js` (hero, twin stepper, fine-grained figure, EP stepper, decode slider), `33_*` (calculator). `retired/` keeps the pre-rebuild Reading and tab parts.

## How it is built
- `build.sh`: `make_page_data.py` (data part `parts/22_js_mx_0data.js` and `page_text.json` from the recorded outputs in
  `src/`, never from scratch), concatenates parts, injects the root's `33_js_cc_1core.js`, expands `{{text|link}}`, then
  `fill.py` resolves `[[...]]` placeholders in the HTML: `[[ref:key]]` file:line from `code/out/code_refs.json`,
  `[[snip:key]]` code excerpts with their real line numbers, `[[f:key|fmt]]` facts and `[[name]]` text blocks from
  `page_text.json` (written by `page_text.py`). Every measured number in prose therefore comes from the data.
- Runs: `runs/queue.sh` with `runs/runs.txt` (one run per bench-lock hold, MPS cap, `nice`), logs copied into
  `runs/logs/` by `runs/collect.py`. MoE presets train through `runs/fast_moe.py`: the root's `train.py` unchanged with
  `tiny_gpt.MoE.forward` replaced by a batched forward that is the same arithmetic (`runs/check_fast.py`: same choices,
  drops, bias updates and gradients, logits within 2e-6, and the same parameters left without gradient). Reason: the
  per-expert Python loop calls `nonzero()` per expert per layer, each a GPU sync on MPS; the first moe8top2 run had
  not reached step 125 after 5 minutes (killed; `mx_probe_loop` against `mx_probe_fast` measures the two).
- Analyses (CPU, inference only): `analysis/analyse.py` (held-out loss and loads on the train script's 20 fixed
  validation batches, router outputs on the running sequence, capacity-factor and batch-size sweeps, top-k at inference,
  masking the top expert, the shared expert off, expert-to-token tables; it re-implements `MoE.forward` with these
  interventions and checks the plain case equals the original exactly), `code/grad_check.py`, `code/hf_aux_check.py`,
  `code/hf_checks.py`, `ep/ep_alltoall.py` (four gloo processes), `inputs/moe_configs.py` (router fields of the root
  map's configs), `analysis/router_8tok.py` (the root's 8-token file: `analysis/out/router_probs_8tok.json`, moe8top2, block 2, chosen as the layer with the most distinct first choices among tokens 1 to 8).
- `finish.sh` runs all of the above after the GPU queue and builds.
- Reading time is measured with `html_utils/audit_pages.mjs` and written into `parts/10_header.html` by hand.
- Checks: `check_controls.mjs` (every control, 390 px dark, 920 px light, reduced motion), `check_data.py` (the page
  embeds exactly the recorded data; prose numbers match), the repo's `html_utils/checkpage.sh`.

## Departures from the child-page shape, and why
- The Reading tab holds the measured comparison (section 6) rather than a separate runs tab: the runs are few and each
  belongs to the mechanism it measures (collapse in 3, drops in 4, shared experts in 5).
- The network side of expert parallelism (all-to-all algorithms, NVLink and InfiniBand, layouts) is linked, not
  repeated: Interconnects and scaling and Distributed Training own it. This page keeps what the MoE design controls
  (dispatch shapes, k and d, group-limited routing, imbalance) and runs a real expert-parallel layer.
- Training uses an equivalent batched MoE forward (above), stated on the page; the tiny GPT's own code is what is quoted
  because it defines the arithmetic.

## The 2026-10-23 rebuild: what changed and why
- **Top**: the core idea in one sentence and a static hero drawn from recorded data (token "Once", layer 1 of moe8top2: 8 scores, 2 experts, gates 0.82 and 0.18, stored against computed); "You need"; eight new terms. The design-choices table is a closed reference block.
- **Lab tabs folded into Reading.** The Router tab's 8-token stepper is now section 2's process visual; the Expert load tab's before/after animation is section 3's (the change over training is the point); their heat map, curves, coloured sequence and expert-to-token table are closed depth. Both tabs are gone; the calculator stays as a tool used across sections 1, 5, 7 and 8.
- **Absorbed from the root**: the Config calculator's dense-twin stepper (section 1, rewritten on this page's configs and `window.CC`) and the capacity rounding note (1.25 x 8 x 2 / 8 = 2.5, rounded up to 3 by `math.ceil`, under the router stepper). The root can now drop its `33_js_cc_3moe.js` and link here.
- **New visuals** where a mechanism had none: the fine-grained/shared figure (section 5), the four-rank expert-parallel stepper from the recorded send matrix (section 7, replacing a five-item list; code and output closed), the experts-touched slider (section 8, defaults on DeepSeek-V3 at B = 32: 163 of 256).
- **No autoplay**: template `21_js_rd_common.js`; `check_controls.mjs` now scrolls every animation into view and fails if any plays or leaves step 0 before an action (normal and reduced motion).
- **Depth closed, not deleted**: routing styles and lineage, code and the three top-k softmax forms, the sigmoid evidence, the bias and global-batch evidence, device-level losses, the transformers checks, capacity quotes, latent experts, run protocol, EP code, the config table and the two totals rebuilt.
- **Deleted as fat**: headings and wind-ups, the Mistakes list (each mistake now sits in the section or closed block that shows it), eight interview answers that restated sections (the two design questions and the sigmoid-plus-bias point stay, closed), pointers to removed tabs.

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 9,472 words, 41 min | 6,493 words, 28 min |
| Reading, closed details | 1,151 words, 5 min | 4,616 words, 20 min |
| Other tabs, core | Router 731, Expert load 254, calculator 580, Further reading 926: 11 min | calculator 580 (3 min), Further reading 879 (4 min) |
| Visuals drawn in Reading | 4 (plus 6 in the lab tabs) | 12 |

Why 28 minutes is right: the page owns six mechanisms (total against active, routing, balancing, capacity, granularity and sharing, expert parallelism) plus serving cost, and each needs its numbers, its picture and its formula; the ledger's core units are those. About a fifth of the core is captions, predict prompts and the recorded measurements beside the visuals. The core of the whole subject fell from about 48 minutes (Reading plus the two lab tabs it sent the reader to) to 31 including the calculator; closed time grew because evidence, quotes and checks moved there rather than being cut.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
386 units: core 243, depth 90, fat 53, owned 0, volatile 0. 376 drafted by `ledger.py init` from the page as built before the rebuild; keys found by script (a phrase of at least five words, else a number) and the residue labelled by hand; 10 added by hand for script-rendered visuals and tables and for the two units absorbed from the root (section "absorbed:..."). Fat units carry a `note`.

2026-10-26 (final follow-up sweep): the global-batch evidence block adds Qiu et al.'s under 3% extra latency and links the Qwen page's micro-batch against global-batch toy.

## 2026-11-09: split layout, seven 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html`, `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `05z_errbox.js.html`, `99_js_tabs.js` (key `mx-tab`). `build.sh` keeps its own data step, root calculator injection and `fill.py`, and now adds `02_split.html` after `01_head.html`, lists parts in C-locale order and writes the em-dash test as bytes. The page's `.an-ctl` rules exclude the stage bar (`:not(.stg-bar)`), which they had wrapped on phones.
- **Seven stages**, one scene file each on `40_js_sc0kit.js` (`MXS`: the page's expert colours, label hand-over at mid-transition, the recorded router outputs of tokens 1 to n). Every number comes from `window.MXD`; each stage has an `ol.sx` list and no per-step caption:
  - Fig. 1 `stg-hero` (5 steps, `41_js_sc_hero.js`): "Once", layer 1, moe8top2: router plate, softmax bars, top 2, flows to the experts and back weighted by the gates, stored against computed. Replaces the static SVG hero.
  - Fig. 2 `stg-scale` (5, `42_js_sc_scale.js`): blocks with footprint proportional to weights for the three presets, stored and per-token columns, whole-model totals from `param_groups()`, a DeepSeek-V3 layer (its 8 lit experts illustrative). Replaces the "drawn to scale" card.
  - Fig. 3 `stg-rt` (6, `43_js_sc_route.js`): tokens 1 to 8 by 8 experts as a score field, top 2, dispatch along each expert's column into stacks, the mean sheet, combine with the recorded gates; model and layer chips replay it. Replaces the 7-step SVG stepper; its capacity step moved to Fig. 5.
  - Fig. 4 `stg-ld` (6, `44_js_sc_load.js`): the no-balancing run against a chosen scheme as two plates (layers by experts, height the share of the logged batch), 151 logged frames in five stretches (0; 0 to 100; 100 to 300; 300 to 800; 800 to 1,500) then held-out loads. Was a 151-frame replay at 180 ms a frame (against the long-replay rule).
  - Fig. 5 `stg-cap` (6, `45_js_sc_cap.js`): new. The 64 recorded assignments of tokens 1 to 32 in layer 1 against buffers at CF 2.0, 1.25, 1.0 and 0.5 (C = ceil(CF x 32 x 2 / 8)), first come first served as in the tiny GPT; padding as empty slots, overflow above the line; then dropless. Exposes `window.MXCAP` for the check.
  - Fig. 6 `stg-fg` (4, `46_js_sc_fine.js`): widths to scale, the 8 experts splitting into 16, the shared expert, DeepSeek-V3. Replaces the static strip figure.
  - Fig. 9 `stg-ep` (6, `47_js_sc_ep.js`): four rank plates, assignments stacked by destination, the send matrix (top-down view), all-to-all flows proportional to the recorded counts, uneven receives, the reverse all-to-all. Replaces the 2D stepper.
- **2D kept, each in a split**: the dense twin (RD.anim with its list `sx-twin`, items filled per model, plays in view), the softmax/sigmoid widget, the CF sweep chart, the dense-vs-MoE chart and table, the experts-touched slider; on the calculator tab the decode-read and m-way sections. Full width: the presets table, formulas, every closed block, section 9's config table, design questions, the calculator's parameter and EP sections (no prose beside them).
- Removed code: the SVG hero, scale card, router stepper, load replay, fine-grained figure and EP stepper (`24_`, `25_`, `26_`, `27_js_*`); their closed-block companions (sequence colouring, expert-to-token table, heat map, curves) stay.
- `check_stages.mjs` (new, from LLM Architecture Gallery's): the seven stages play in view, step to the end with one list item per step, stop off screen, never move under reduced motion; splits are two columns at 1400 px and one below 1100; about 40 numbers the step lists write are recomputed from `window.MXD`. `check_controls.mjs`: its never-autoplay assertion is inverted (the twin must play in view; nothing plays under reduced motion).
- **Real images**: none; the page is about mechanisms with no physical object, and no openly licensed figure adds what the stages do not.

### Length judgement (2026-11-09)
| | Before (audit before this pass) | After |
|---|---|---|
| Reading, core (230 words a minute) | 6,575 words, 28.6 min | 8,038 words, 34.9 min |
| Reading, closed details | 4,691 words, 20.4 min | 4,691 words, 20.4 min |
| Calculator / Further reading | 580 / 911 words | 580 / 911 words |
| Visuals counted in Reading | 12 | 13 (7 stages, 6 2D) |

The added words are the 40 step-list items that explain the seven stages and the dense twin (the twin's six were script-written captions before and are now counted). 35 minutes is right because each list is the explanation its figure needs and carries recorded numbers the prose did not; nothing was cut, and the closed time is unchanged.

### Knowledge ledger (2026-11-09; `python3 html_utils/ledger.py check`: problems 0)
394 units: core 251, depth 90, fat 53. Seven core units added for the stages (keys in their step lists); units 154, 200, 293, 294 and 295 re-keyed where their sentences moved into step lists; the Further reading units 328, 338, 339, 340, 342, 346 and 349 re-keyed on their descriptions, never the minutes; notes on 200, 295, 377 and 378 record where each figure now sits.
