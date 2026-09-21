# WSM: Decay-Free Learning Rate Schedule via Checkpoint Merging for LLM Pre-training

⏱ 8 min read · +~1h 30m resources

Changxin Tian, Jiapeng Wang, Qian Zhao, Kunlong Chen, Jia Liu, Ziqi Liu, Jiaxin Mao, Wayne Xin Zhao, Zhiqiang Zhang, Jun Zhou (Ling Team, Ant Group; Gaoling School of AI, Renmin University). arXiv 23 July 2025, v2 11 August 2025. Added to the KB 2026-08-31 on request.

- [arXiv abstract](https://arxiv.org/abs/2507.17634) (~45 min) | [PDF](https://arxiv.org/pdf/2507.17634) (same paper) | [HTML](https://arxiv.org/html/2507.17634v2) (same paper)
- Topics: llm-training-and-post-training, ml-fundamentals

### Best resources

- [The paper itself (HTML)](https://arxiv.org/html/2507.17634v2) (~45 min): short, and Figure 2 (merge-weight distributions next to their equivalent decay curves) carries the whole idea.
- Background on why the decay phase is worth attacking: [Scaling Laws and Compute-Optimal Training Beyond Fixed Training Durations (Hägele et al., arXiv:2405.18392)](https://arxiv.org/abs/2405.18392) (~45 min).
- The concurrent, purely empirical take on merging during pretraining: Li et al. 2025 (WMA/SMA/EMA heuristics), cited as reference 36 in the paper.

### Problem

Every mainstream LR schedule ends in a decay phase, and the decay phase is where the scheduling pain lives.

- **Cosine** needs the total token count up front. Extending a run means restarting to recalibrate the curve.
- **WSD** fixes that by inserting a constant plateau, but you must still pick the decay start, the decay length, and the decay function. Once decay has begun, extending training means rolling back to the pre-decay state and redesigning the anneal.
So even WSD is not a fully autonomous, continuously extendable training process. Prior decay-free work (schedule-free optimisers, EWA-style weight averaging) mostly aimed to *match* WSD, and each averaging scheme hard-codes one annealing path.

### Method

**WSM (Warmup-Stable and Merge)**: warm up, then hold the LR constant indefinitely. No decay, ever. Checkpoints are saved every `T_{cpt}` steps, and an asynchronous process merges the most recent `n` of them into `W_{merged}`, which is the model you evaluate or ship. Training itself never pauses.

The contribution is that this is not a heuristic. Write a merge as `\hat\theta_{n+k}=\sum_j c_j\theta_{n+j}` and expand each checkpoint into its base plus accumulated gradient updates; the double sum rearranges into

`\hat\theta_{n+k}=\theta_n-\sum_i w_i g_{n+i-1}` with `w_i=\sum_{j\ge i} c_j`.

Merging with weights `c_j` is therefore *identical* to having applied a synthetic decay schedule `w_i` to the gradients since the base checkpoint. Theorem 3.1 inverts the map: for any monotonically non-increasing target curve `\{w_i\}`, the checkpoint weights are uniquely `c_k=w_k`, `c_j=w_j-w_{j+1}`, `c_0=1-w_1`.

Consequences:

- Mean averaging is (approximately) **linear decay**. EMA is a **convex** decay. Cosine and 1-sqrt curves can be constructed explicitly.
- Optimiser-agnostic: nothing in the training loop changes, so it composes with SGD, Adam, or anything else.
- Offline merging (keep the checkpoint history) is the exploration mode: one training run, many simulated anneals of different shapes and durations. Once a winner is found it can be run online as a fixed sliding window, which is what EMA forces you to commit to from step one.
- A data anneal can still be layered on: after a switch step `T_{switch}` the run moves to a curated high-quality mixture, with the LR still flat.

### Results

Setup: Ling-mini, a 16.3B-total / 1.4B-active MoE (256 experts, top-8 plus one shared), AdamW, peak LR 4.78e-4, batch 2048. Start from a shared checkpoint pretrained on 10.2T tokens at constant LR, then branch 400B tokens two ways: a conventional WSD decay (baseline) versus constant LR plus merging (WSM). Checkpoint every 25B tokens.

- **WSM beats WSD**, on best-checkpoint comparison: +1.3 points average across benchmark categories (62.67 to 63.95 overall). Abstract-level highlights: +3.5% MATH, +2.9% HumanEval, +5.5% MMLU-Pro relative; professional knowledge gained the most (+4.8% relative).
- **The gain survives post-training.** After identical 5-epoch SFT, the WSM-derived instruct model leads 64.07 to 62.90 average, winning on language, knowledge, math, reasoning, and agent, and losing narrowly on code.
- **Merge duration is the dominant hyperparameter**, ahead of checkpoint interval and the number of checkpoints merged. Longer merge windows are better with diminishing returns, exactly mirroring how more annealing data behaves in a real decay.
- **Merge algorithm follows the decay-shape hierarchy**: 1-sqrt-derived weights are slightly ahead of mean, and both are clearly ahead of EMA. EMA also shows no useful trend with window size, reinforcing that convex decay curves are the wrong shape.
- **Finer checkpoint granularity helps** (a closer approximation of the true curve), traded against storage.
- **Robust mid-run**: merging four checkpoints across a 100B-token window at the 2T, 4T, 6T, 8T, and 10T milestones closely tracks what a real 100B-token decay run would have produced. The gains over WSD are smaller here than when switching to high-quality data, but the fidelity is the point.

### Why it matters

Two distinct things, worth separating:

1. **As a schedule.** It is the first decay-free method reported to beat WSD rather than merely match it, and it makes training genuinely open-ended: no decay start, no decay length, no rollback if you decide to train longer.
2. **As an evaluation tool, which may be the bigger deal in practice.** Merging is a cheap, high-fidelity proxy for a model's post-anneal potential at any point in a run. That removes the standard tax of launching expensive throwaway decay runs just to find out whether the base model is on track.
Costs and caveats: storage for the checkpoint history (small relative to a pretraining budget, and avoidable via an online sliding window of ~12 checkpoints); results come from one model family and one 400B-token branch, so the +1.3 should be read as a strong signal rather than a settled constant; and the merged model is a separate artifact from the live training weights, which is an extra thing for a training pipeline to track.

### Connections

- Sits alongside the rest of the LR-schedule family in Optimisers and learning-rate schedulers (ml-fundamentals), where the WSD-versus-WSM comparison lives.
- The decay-shape ordering it depends on (concave beats linear beats convex) comes from Hägele et al. 2024, the same work that made constant-plus-cooldown a credible cosine replacement.
- Its data-anneal switch step is the same lever as the mid-training anneal in Pretraining and Data mixing (Dolmino, Llama 3 annealing).
- Complements schedule-free optimisation (Defazio et al. 2024): both delete the schedule, one via iterate averaging inside the optimiser, the other via checkpoint merging outside it.
- The merge machinery is ordinary model merging (see also model souping in the OLMo 2 recipe), reframed as scheduling rather than as ensembling.
