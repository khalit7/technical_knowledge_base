# Visuals: built and rejected (MoE child page, 2026-10-18)

Scores 0 to 2 on the eight questions of `visuals/choosing.md` (movable quantity; defaults reproduce a source (x2); public
inputs (x2); shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere;
step-by-step before/after), minus build cost. Central question: what an expert layer buys and what it costs (balance,
drops, communication, memory).

## Built
| Visual | Where | Kind | Score | Why |
|---|---|---|---|---|
| Same 8 tokens through the router under no balancing, aux loss, bias (7 steps, CF 1.25 drops) | Router tab | before/after animation on one input (type 1) | 14 | recorded router scores of three trained models; replaces the floor's illustrative batch animation; feeds the root's Reading animation (router_probs_8tok.json) |
| Expert load per layer, before/after balancing, animated over training | Expert load tab | before/after animation (type 1) over 151 logged steps | 13 | collapse is a process, not an end state; from training logs |
| Running sequence coloured by first-choice expert, tap for all layers | Router tab | token map (type 7) | 11 | Mixtral Figure 8 done on our own model; answers "do experts specialise by topic" with real data |
| Expert to token table on held-out text, with determinism | Router tab | inspector (type 9) | 10 | token-level specialisation measured |
| Drawn-to-scale stored vs used weights (dense, 8e, 16+1, DeepSeek-V3 layer) | Reading s1 | drawn to scale (type 11) | 10 | the total/active split as area |
| One real token through softmax and sigmoid, with dilution as experts are added | Reading s2 | toy on real logits | 9 | floor's toy rebuilt on recorded logits |
| Loads after training, per layer, per scheme, with MaxVio | Reading s3 | bar chart | 10 | the measured end state that s3 discusses |
| Held-out loss against capacity factor at inference (and dropped fraction) | Reading s4 | parameter sweep over recorded evaluations (type 4) | 11 | a failure the reader will hit; train vs inference regimes |
| Dense vs MoE loss curves and table | Reading s6 | measured comparison | 9 | equal active compute, seeds for spread |
| 23 real MoE configs, sortable | Reading s9 | explorer (type 9) | 12 | every field verbatim from configs; the 2023 to 2026 trends |
| Dense vs MoE calculator: parameters (window.CC), memory, bytes read per decode step vs batch, all-to-all bytes, fine-grained split | Calculator tab | calculator (type 8) | 13 | defaults reproduce DeepSeek-V3's 671B/37B and Mixtral's 46.7B/12.9B (independently, from configs); the decode crossover is the serving question |
| Four-process expert-parallel run output (send matrix) | Reading s7 | real code that ran | 8 | counts, bytes and equality from a trained layer |
| Predict drills: top-k at inference, bias magnitude, all-to-all balance | Reading s2, s3, s7 | predict-then-reveal (type 10) | 8 each | answers are measured |

## Rejected
| Idea | Reason |
|---|---|
| "Same routing judged at two scopes" (floor's illustrative interactive) | illustrative only; the published numbers carry it; would need a domain-labelled corpus to measure honestly |
| Rebuilding Switch's live layer, Mixtral's decode roofline animation, V3's balancing tables | owned by the Switch, Mixtral and DeepSeek-V3 paper pages: linked |
| Network-level all-to-all simulator (NVLink vs IB, PXN) | owned by Interconnects and scaling (Collective simulator) |
| Parallelism layout per GPU | owned by Distributed Training (Layout calculator) |
| Expert grid Qwen3 vs Qwen3-Next to scale | on the Alibaba: Qwen page; the DeepSeek-V3 layer view here covers the idea |
| Timeline of MoE releases | the root's Architecture map has the lineage timeline; the config table sorted by date suffices |
| Animated decode step roofline | Mixtral paper page; replaced here by the bytes-read-per-step curve over any config |
| Training the MoE at several aux coefficients (alpha sweep) | cost about 5 to 7 minutes per run each; Wang et al. publish the sweep (Figure 2) and the page quotes it; kept the four balancing schemes that show the mechanism |
| A z-loss run | the tiny GPT never shows router-logit instability at this size (no spikes in any log), so a run would show nothing; ST-MoE's Table 4 is quoted |

## Rebuild of 2026-10-23 (teaching contract)
| Visual | Where now | Kind | Why |
|---|---|---|---|
| One recorded token through one MoE layer (8 stored, 2 computed, gate weights) | Reading top, hero | static annotated diagram | the whiteboard picture the page elaborates; real logits of "Once", layer 1, moe8top2 |
| Dense twin to MoE in six steps (from the root's Config calculator) | Reading s1 | stepper | absorbed: the root kept it until this page carried it |
| 8 tokens through the router (was the Router tab) | Reading s2 | stepper | it explains one mechanism, so it sits beside the claim |
| Collapse over training, no balancing against a scheme (was the Expert load tab) | Reading s3 | animation, paused until played | the change over time is the point |
| Held-out loads, heat map, MaxVio/aux/drop curves, sequence coloured by expert, expert-to-token table | closed blocks in s2 and s3 | depth | evidence, not needed on first read |
| Fine-grained and shared experts at equal compute (28, 1,820, 560 sets) | Reading s5 | static diagram | s5 had no visual |
| Expert-parallel dispatch over four ranks, recorded counts | Reading s7 | stepper | the five EP steps were a list; the code and output moved to a closed block |
| Experts touched against batch, DeepSeek-V3 | Reading s8 | one slider, defaults on B = 32 (163 of 256) | the parameter dependence s8 states |
Removed: the Router and Expert load tabs (content moved as above).

## Layout rollout of 2026-11-09 (split layout, 3D stages, explained and autoplaying animations)
| Visual | Where now | Kind | Why |
|---|---|---|---|
| Fig. 1 one recorded token through one layer (`41_js_sc_hero.js`) | top, split | 3D stage, 5 steps | replaces the static hero: router plate, score bars, top 2, flows out and back, stored against computed |
| Fig. 2 stored against computed, to scale (`42_js_sc_scale.js`) | s1, split | 3D stage, 5 steps | replaces the 2D "drawn to scale" card and its mode buttons; whole-model totals and a DeepSeek-V3 layer added as steps |
| Dense twin (`27_js_rd_new.js`) | s1, split | 2D RD.anim with a step list | bars and an expert grid read best flat; the per-step caption moved into the list |
| Fig. 3 eight real tokens through the router (`43_js_sc_route.js`) | s2, split | 3D stage, 6 steps | a tokens-by-experts score field is a matrix as heights; dispatch as flows into per-expert stacks; its old capacity step moved to Fig. 5 |
| Fig. 4 loads over training (`44_js_sc_load.js`) | s3, split | 3D stage, 6 stretches | was a 151-frame replay at 180 ms a frame (against the long-replay rule): now five explained stretches plus held-out, two plates side by side |
| Fig. 5 capacity on 64 recorded assignments (`45_js_sc_cap.js`) | s4, split | 3D stage, 6 steps | new: the buffer as a slot rack, padding and overflow visible, then dropless |
| Fig. 6 finer experts at equal compute (`46_js_sc_fine.js`) | s5, split | 3D stage, 4 steps | replaces the static strip figure: blocks split, a shared one added, DeepSeek-V3 |
| Fig. 9 one layer over four ranks (`47_js_sc_ep.js`) | s7, split | 3D stage, 6 steps | replaces the 2D stepper: rank plates, the send matrix, all-to-all flows proportional to the recorded counts |
| Softmax against sigmoid widget, CF sweep chart, dense-vs-MoE chart and table, experts-touched slider | s2, s4, s6, s8, each a split with the card on the right | 2D | a widget, line charts, a table and a one-variable grid read best flat |
| Calculator: decode reads and the m-way split | Dense vs MoE calculator, splits | 2D | reader-driven tools; the other two calculator sections have no prose and stay full width |
Rejected: a 3D version of the experts-touched slider (a 256-square grid whose only variable is B reads best flat); a 3D held-out heat map (a heat map).
