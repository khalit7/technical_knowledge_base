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
