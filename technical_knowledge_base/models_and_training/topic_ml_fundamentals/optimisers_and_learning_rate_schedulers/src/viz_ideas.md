# Optimisers and learning-rate schedulers: visualisation ideas

Central question: how does each rule turn a gradient into a step, how does the schedule set the step size over a run, and what evidence says which to use? A visual earns its place when it makes "what this rule does to the step" measurable on one input, or "what the evidence says" checkable.

Existing visuals elsewhere (linked, not rebuilt): the parent root's Reading tab (one real 64 x 176 gradient turned into an update by SGD, Adam and Muon's Newton-Schulz iterations; schedules with a movable end: step, inverse sqrt, cosine, WSD; Adam with L2 against AdamW on the same noise), its Training lab (SGD, momentum, Adam, AdamW, Muon trained live with step, cosine, WSD), its Defaults across models tab (betas, eps, LR, schedules for 21 models); Pretraining (speedrun records, Muon's history, anneal toy); the WSM paper page (merge against decay, trained live); Kimi (MuonClip, QK-Clip); the Transformer paper page (Eq. 3 control).

## Scoring (0 to 2 each; reproduces and computable count double; +1 for a step-by-step before/after animation; build cost subtracted)

| # | Idea | Param | Repro x2 | Computable x2 | Beyond a sentence | Misconception | Central | Absent elsewhere | Anim | Cost | Score | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| O1 | **Optimiser race**: 13 exact update rules (SGD, momentum, Nesterov, AdaGrad, RMSProp, Adam, AdamW, Lion, Shampoo order-1, SOAP, Muon on a 1x2 matrix, schedule-free SGD and AdamW) on 5 surfaces (ravine, rotated ravine, Rosenbrock, saddle, noisy ravine), tuned rates, LR multiplier, schedule, seed; checked against PyTorch | 2 | 1 (x2) | 2 (x2) | 2 | 2 (diagonal adaptivity needs axis-aligned curvature; constant LR has a noise floor) | 2 | 1 (common in blogs, never with exact checked rules or rotation) | 1 | -2 | 15 | built, own tab |
| O2 | **Adam bias correction, before/after**: three gradient streams through 40 steps with and without correction, beta2 0.999 or 0.95, bars to scale, counters, step/lr chart | 1 | 2 (x2: the 3.16, 6.57 at t=12, 3.24 at 100 numbers and the paper's section 6.4 warning) | 2 (x2) | 2 | 2 (correction removes bias, not variance: warmup still needed) | 2 | 2 | 1 | -1 | 17 | built, Reading section 3 |
| O3 | **Optimiser state memory** from four real config.json files (SmolLM3, OLMo 2, Llama 3.1 405B, Kimi K2) for 8 optimisers incl. SOAP with soap.py defaults | 1 | 2 (x2: ZeRO's 16 bytes by construction; parameter recounts reproduce published totals independently) | 2 (x2) | 2 | 2 (SOAP's state is 9x K2's parameters; Muon saves close to half, not exactly) | 1 | 2 | 0 | -1 | 14 | built, Reading section 4 |
| O4 | **Three endpoints, three ways** (cosine re-run per length, WSD branches, schedule-free) on the exact noisy quadratic model, step counter 1,750 / 1,150 / 1,000 | 1 | 1 (x2: exact expectation, Monte Carlo check against torch and schedulefree) | 2 (x2) | 2 | 1 | 2 | 2 | 1 | -1 | 14 | built, Reading section 7 |
| O5 | **Claimed against independent speed-ups** (Muon, SOAP, Shampoo, schedule-free, Sophia, Lion) with AlgoPerf scores, Wen et al., Semenov et al., Kaddour et al. | 0 | 1 (x2) | 2 (x2) | 1 | 2 | 2 | 2 | 0 | 0 | 13 | built, Reading section 6 (table with bars) |
| O6 | **Schedule sparklines** for all 13 shapes, PyTorch-checked | 0 | 1 (x2) | 2 (x2) | 1 | 0 | 1 | 1 | 0 | 0 | 8 | built, in the shapes table |
| O7 | LR range test (Smith) on a toy trained live | 2 | 0 | 2 | 1 | 1 | 1 | 2 | 0 | -2 | 7 | rejected: a toy range test checks nothing published, and the parent's Training lab already lets a reader sweep rates; described in text with Smith's words |
| O8 | Muon's singular values through Newton-Schulz | 1 | 2 | 2 | 2 | 1 | 2 | 0 (parent root) | 1 | -1 | n/a | rejected: on the parent page; linked |
| O9 | Schedules with a movable end (cosine against WSD) | 2 | 0 | 2 | 2 | 1 | 2 | 0 (parent root, WSM page) | 0 | -1 | n/a | rejected: on the parent page and the WSM page; O4 adds the compute side |
| O10 | Adam L2 against AdamW on noise | 1 | 2 | 2 | 2 | 2 | 1 | 0 (parent root thread 4) | 1 | -1 | n/a | rejected: on the parent page; linked |
| O11 | Schedule-free against cosine on a real small network (digits MLP), several seeds | 2 | 0 | 2 | 1 | 1 | 2 | 2 | 0 | -2 | 8 | rejected for O4: the exact NQM gives expectations without seed noise and is checkable; a toy MLP would show seed noise larger than the effect at this scale |
| O12 | WSM merge weights calculator | 1 | 2 | 2 | 1 | 0 | 1 | 0 (WSM page) | 0 | -1 | n/a | rejected: owned by the WSM paper page |

## Data and formulas
- Update rules: `parts/30_js_engine.js`; references: torch.optim (SGD, Adagrad, RMSprop, Adam, AdamW, Muon), lion-pytorch, soap.py (github.com/nikhilvyas/SOAP, eigenbasis in float64 for the check), schedulefree 1.x, Shampoo order-1 from Gupta et al. section 4.2. `checks/torch_ref.py`: 350 runs, max relative difference 1e-13 except chaotic runs, each within the reference's own sensitivity to a 1e-12 nudge (`checks/torch_ref_result.json`). torch.optim.Muon's default bfloat16 Newton-Schulz differs by up to 0.38 absolute on chaotic runs; the page uses float64.
- Default rates: `checks/tune.mjs` (log grid 10^(k/4), mean log10 loss, path must stay in the plotted box). Quoted race numbers: `checks/race_facts.mjs` (`checks/race_facts.json`).
- Noisy quadratic: Zhang et al. 2019; d = 10, h_i = 10^(-2i/9), sigma^2 = 0.09, x0 = 1; exact recursions in `parts/32_js_nqm.js`; Monte Carlo check `checks/nqm_check.py` (16 comparisons, largest |z| 2.1, `checks/nqm_check_output.txt`). Endpoint values `checks/endpoints_output.txt`.
- Memory: `recompute.py` from `inputs/cfg_*.json` (copied from the parent's defaults inputs); soap.py defaults max_precond_dim 10000, precondition_1d False.
- Schedules: `parts/43_js_sched.js`; `checks/sched_check.py` against torch.optim.lr_scheduler (max difference 5e-16).
- Every quoted source: `inputs/extracts.txt` (verbatim quotes with URLs).

## Reproductions
- Adam no-correction numbers (3.16, 6.57 at t = 12, 3.24 at 100, 1.26 at 1,000; beta2 0.95: 0.45, within 10% from step 6): by formula, `recompute.py`.
- ZeRO 16 bytes per parameter: by construction. Muon FLOP overhead 0.7% and 0.5%: Jordan's arithmetic reproduced. Transformer peak 6.99e-4: derived. Parameter totals from configs: SmolLM3 3.08B, OLMo 2 7.30B, Llama 3.1 405.85B, Kimi K2 1,026.41B (Hugging Face 1,026,408,235,864; 3,416 short): independently.
- Polyak's sqrt(R) speed-up: not reproduced, because the race uses momentum 0.9 rather than the optimum for the valley; said on the page.

## Inspiration
Distill's "Why Momentum Really Works" (quadratic playground); the DeepSeek MLA explainer pattern (before/after on one input) for O2 and O4; the root's NS singular-value chart; AlgoPerf's leaderboard figures.

## What the methodology lacked for this page
Checking an implementation against a reference on a chaotic surface: a fixed tolerance fails for reasons that are not errors. Rule used: compare to the reference's own divergence when its start is nudged by 1e-12, and report the steps that agree to 1e-9. Second: choosing a toy's default hyperparameters should follow a stated rule (best of a grid with a stated criterion and constraint), never hand-picking, because the defaults decide what the race "shows".
