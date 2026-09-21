# Optimisers and learning-rate schedulers

⏱ 15 min read · +10h 50m resources

### Best resources

- [An overview of gradient descent optimization algorithms (Ruder)](https://www.ruder.io/optimizing-gradient-descent/) (~40 min): the canonical survey, SGD through Adam/Nadam.
- [Why Momentum Really Works (Distill)](https://distill.pub/2017/momentum/) (~30 min): interactive intuition for momentum.
- [Decoupled Weight Decay Regularization (Loshchilov & Hutter, arXiv:1711.05101)](https://arxiv.org/abs/1711.05101) (45 min): AdamW.
- [Muon: an optimizer for hidden layers (Keller Jordan)](https://kellerjordan.github.io/posts/muon/) (~25 min) and [Deriving Muon (Bernstein)](https://jeremybernste.in/writing/deriving-muon) (~30 min): the modern-optimiser story.
- [Scaling Laws and Compute-Optimal Training Beyond Fixed Training Durations (Hägele et al., arXiv:2405.18392)](https://arxiv.org/abs/2405.18392) (45 min): the constant-LR-plus-cooldown study that made WSD respectable; also the best source on cooldown shape and length.
- [PyTorch ](https://pytorch.org/docs/stable/optim.html)[`torch.optim`](https://pytorch.org/docs/stable/optim.html)[ docs](https://pytorch.org/docs/stable/optim.html) (docs, ~30 min): what is actually implemented, with the exact formulas.

### Loss-landscape geometry

- **Local optimum**: gradient is zero and moving in ANY direction increases the loss.
- **Saddle point**: gradient is zero, but the loss decreases along one dimension and increases along another (horse saddle); second derivative says it is neither maximum nor minimum. Frequent in high dimensions, but not a big problem: escape via the descending dimension is easy-ish, helped by momentum, mini-batch noise, and even float precision errors.
- All parameters update simultaneously: `J(\theta_0,\theta_1)` is always evaluated at the previous parameters.

### Gradient descent variants

| Variant | Gradient computed on | Trade-off |
| --- | --- | --- |
| Batch GD | Entire training set | Deterministic descent to a (local) minimum, but slow and expensive per step |
| SGD | One random example | Cheap and fast, but noisy; may never settle at the minimum |
| Mini-batch GD | Small batch | Standard in practice: efficient, less noisy than SGD, hardware-friendly |

### Momentum methods

- **SGD + momentum**: `v_t=\beta v_{t-1} + \nabla J`; `\theta \leftarrow \theta - \eta v_t`. Accumulated velocity damps oscillation across ravines and accelerates consistent directions.
- **Nesterov (NAG)**: evaluate the gradient at the look-ahead point `\theta - \eta\beta v_{t-1}`; corrects the step before taking it.

### Adaptive learning-rate methods

Intuition: scale the step per parameter from its gradient history; larger steps where gradients are small and consistent, smaller where large or volatile.

| Optimiser | Idea | Weakness |
| --- | --- | --- |
| AdaGrad | Divide LR by `\sqrt{\text{cumulative sum of squared gradients}}` | Good for sparse features, but the denominator only grows: LR decays to nothing |
| RMSProp | Replace the sum with an exponentially decaying average of squared gradients | Fixes AdaGrad's dying LR; good for online/non-stationary problems |
| AdaDelta | No global LR at all; step size adapted from a running average of past updates | Rarely used now |
| Adam | RMSProp + momentum + bias correction: `\hat m_t = m_t/(1-\beta_1^t)`, `\hat v_t = v_t/(1-\beta_2^t)`; `\theta \leftarrow \theta - \eta\,\hat m_t/(\sqrt{\hat v_t}+\epsilon)` | Bias correction matters early, when moment estimates are built from few samples |
| AdamW | Adam with **decoupled** weight decay: decay applied in the update rule (`-\eta\lambda\theta`), not added to the loss | If L2 sits in the loss it gets divided by `\sqrt{\hat v_t}` like every other gradient component, so high-gradient weights are under-decayed; decoupling fixes this. The LLM default |

### Second-order methods

- **Newton's method**: use the Hessian, `\theta \leftarrow \theta - H^{-1}\nabla J`. Converges in far fewer steps, but the Hessian is `O(n^2)` memory and `O(n^3)` to invert: impractical for large networks. Quasi-Newton (L-BFGS) and Hessian-free variants exist; the practical descendants are the structured preconditioners below.

### Schedulers

Schedulers set the base LR `\eta` over time; adaptive optimisers only rescale relative to it, so both are used together. Core intuition: high LR early to travel fast toward some basin, low LR late to settle at its bottom. Two questions separate every family below: **does the schedule need the total step count **`T`** in advance**, and **what shape is the decay**. Expanded 2026-08-31 from a three-row table into the comparison below.

#### The shapes

| Scheduler | Shape | Needs T upfront? | Where it lives |
| --- | --- | --- | --- |
| Constant (after warmup) | Flat at `\eta_{peak}` | No | The base case for every decay-free method; on its own it leaves loss visibly above an annealed run |
| StepLR / MultiStepLR | Multiply by `\gamma` at fixed milestones | Yes (milestones) | ResNet/ImageNet era; still fine for small supervised jobs |
| ExponentialLR | `\eta_t = \eta_0\gamma^t` | No | Convex and fiddly to tune; rarely competitive |
| Inverse square root (Noam) | `\eta \propto 1/\sqrt{t}` after warmup | No | Original Transformer schedule; concave, degrades gracefully if the run is extended |
| Linear decay to zero | Straight line, peak to ~0 | Yes | The SFT and fine-tuning default (HF Trainer) |
| CosineAnnealingLR | Cosine from `\eta_{max}` down to `\eta_{min}` over T | Yes | Classic LLM pretraining: Kaplan, Chinchilla, Llama |
| Warmup + cosine | Linear ramp from ~0, then cosine decay | Yes | Still the single most common recipe overall |
| CosineAnnealingWarmRestarts ([SGDR, arXiv:1608.03983](https://arxiv.org/abs/1608.03983) (45 min)) | Cosine cycles, each restarting at `\eta_{max}` | Per cycle only | Snapshot ensembles and vision; essentially absent from LLM pretraining |
| OneCycleLR ([super-convergence, arXiv:1708.07120](https://arxiv.org/abs/1708.07120) (45 min)) | Ramp to a peak well above normal, then anneal below the starting LR | Yes | Short fine-tuning runs, fastai lineage |
| ReduceLROnPlateau | Cut LR by a factor when a monitored metric stops improving | No | Reactive. Good for small supervised runs; bad for LLM runs (feedback from noisy evals, non-reproducible schedule) |
| WSD / trapezoid ([MiniCPM, arXiv:2404.06395](https://arxiv.org/abs/2404.06395) (90 min)) | Warmup, long constant plateau, short cooldown over the last ~10-20% | No: the decay start is chosen later | DeepSeek-V3, MiniCPM, ERNIE 4.5; the 2025-26 pretraining default |
| Schedule-free ([Defazio et al., arXiv:2405.15682](https://arxiv.org/abs/2405.15682) (45 min)) | Constant LR plus principled iterate averaging instead of a decay curve | No | Open-ended runs; NeurIPS 2024 oral |
| WSM ([arXiv:2507.17634](https://arxiv.org/abs/2507.17634) (45 min)) | Constant LR forever; the decay is emulated afterwards by merging saved checkpoints | No | 2025 decay-free framework from Ant Group's Ling team; see below |

**Why warmup**: Adam's per-parameter LRs come from first/second-moment estimates; in the first steps those estimates are built from almost no data and are wildly inaccurate, producing artificially large updates and instability. Warmup keeps steps small until the moment statistics are trustworthy, then lets the LR reach its full value.

#### Annealing vs LR decay (terminology, )

"Annealing" is used in three different ways in this literature and they are not interchangeable.

| Sense | What it means | Where you meet it |
| --- | --- | --- |
| 1. Classical / optimisation | Lowering the LR, full stop. Borrowed from simulated annealing, where a temperature parameter is reduced so the search settles. Here annealing and LR decay are exact synonyms | "cosine annealing", `CosineAnnealingLR`, `eta_min`; anything pre-2023 |
| 2. Modern LLM pretraining | A training **phase** (final ~10-30% of tokens) defined by two simultaneous changes: the LR decays toward zero **and** the data mixture switches to curated high-quality tokens (math, code, instruction-like, reasoning) | Llama 3's annealing, OLMo 2's Dolmino mid-training mix, MiniCPM's WSD decay phase; "the annealed model" |
| 3. Annealing as an experiment | A cheap evaluation protocol: take a fixed mid-run checkpoint, anneal it on a candidate dataset, compare scores. Used to price a dataset, not to train a final model | Llama 3 and OLMo both evaluate candidate corpora this way |

Why the distinction is worth keeping straight:

- **The two levers are separable, and papers usually pull both at once.** WSD lets you decay the LR with no data change; conversely you can switch to a high-quality mixture while the LR stays flat (WSM's `T_{switch}` does exactly that). Any claim that "annealing gave +X" is a compound of two effects unless the ablation separated them.
- **They work for different reasons that happen to reinforce each other.** Low LR means the model descends into a basin and stops moving much; low gradient noise near the end is also when scarce high-quality tokens stick best rather than being diluted across a 10T-token stream. This is why the data switch is scheduled to coincide with the decay, not because one requires the other.
- **Reading papers**: "decay phase" or "cooldown" means the schedule alone; "anneal" or "annealed checkpoint" almost always implies the data switch too. WSM is a clean example of why the split matters: it removes sense 1 entirely (constant LR forever) while keeping sense 2 (the curated-data switch), and recovers the decay's benefit by merging.
- Unrelated homonyms: simulated annealing proper (a combinatorial optimisation algorithm) and sampling temperature at inference (see [Sampling and Decoding](../llm-training-and-post-training/sampling-and-decoding.md)) share the metaphor but nothing else.
Data-side detail on what goes into the anneal mixture: [Data mixing: domain weights, curricula, and continued-pretraining ratios](../data-curation-and-datasets/data-mixing.md). Schedule-side: the WSD and WSM entries above.

#### How they compare

- **Final quality at a fixed budget is a near-tie.** Cosine, WSD, and 1-sqrt cooldowns land within noise of each other once T is known and each is tuned. Hägele et al. (2024) showed constant-LR-plus-cooldown scales as predictably as cosine, which is why WSD spread so fast.
- **Cosine's real cost is optionality, not loss.** Every intermediate checkpoint of a cosine run is mistuned (the LR is still high there), so you cannot stop early, extend the run, or reuse it at another length. This artefact is exactly what Chinchilla had to correct in Kaplan's scaling laws, and it forces one full run per training duration.
- **Cooldown shape has a stable ordering**: concave (1-sqrt) is at least as good as linear, and both beat convex (exponential, EMA-like). Convex curves linger at high LR and then collapse too fast.
- **Cooldown length**: roughly 10-20% of tokens. Longer helps, with clear diminishing returns.
- **Final LR matters**: decaying to ~10% of peak is the usual heuristic. Going nearer to zero improves loss but can hurt some downstream benchmarks.
- **The cooldown is also a data lever**: labs up-weight curated math, code, and instruction-like data during it. The schedule and the data anneal are one decision, not two (see [Pretraining](../llm-training-and-post-training/pretraining.md) and [Data mixing: domain weights, curricula, and continued-pretraining ratios](../data-curation-and-datasets/data-mixing.md)).
- **Weight averaging substitutes for part of the decay.** Averaging along the trajectory (SWA/EMA) improves checkpoints at no training cost, which is the observation WSM turns into a full framework.

#### Choosing one

- LLM pretraining, budget unknown or likely to be extended: **WSD**, 1-sqrt cooldown over the last 10-20%.
- LLM pretraining, budget fixed and final: **warmup + cosine** to ~10% of peak.
- SFT or fine-tuning: **linear or cosine to zero**, 3-5% warmup.
- Small supervised model with cheap, low-variance eval: **ReduceLROnPlateau** or MultiStep.
- No schedule at all: **schedule-free** or **WSM**.

#### Decay-free schedules: WSM ()

WSD removed the need to know T, but not the decay itself: you still choose when to start decaying, over how many tokens, and with which curve, and extending training after the decay has begun means rolling back to the pre-decay state. **WSM (Warmup-Stable and Merge)** removes the decay phase entirely. The LR warms up, then stays constant forever; checkpoints are saved periodically, and a weighted merge of the last `n` of them stands in for the annealed model.

The link is exact rather than heuristic. Merging checkpoints with weights `c_j` is algebraically the same as applying per-step gradient weights `w_i=\sum_{j\ge i} c_j` to the updates after the base checkpoint, so any monotone decay curve can be inverted into merge weights (`c_k=w_k`, `c_j=w_j-w_{j+1}`, `c_0=1-w_1`). Mean averaging corresponds to linear decay, EMA to a convex decay, and cosine or 1-sqrt curves can be constructed directly. The framework is optimiser-agnostic and needs no change to the training loop.

Empirically (16.3B/1.4B-active MoE, 400B tokens branched off a 10.2T constant-LR checkpoint) WSM beat a matched WSD decay by ~1.3 points on average, and merge duration mattered far more than checkpoint interval or the number of checkpoints merged. EMA merging was the weakest, mirroring the convex-is-worse ordering above. Full summary: [WSM: Decay-Free Learning Rate Schedule via Checkpoint Merging for LLM Pre-training](../../papers/2025-07_wsm/summary.md).

Practical read: the storage cost is real (one checkpoint per interval) but small next to a pretraining budget, and the payoff is that a merge is a cheap, repeatable proxy for "how good would this model be if I annealed now", removing the need to launch throwaway decay runs to gauge progress.

### Cross-links

- Decoupled weight decay from the regularisation side: [Regularisation](regularisation.md)
- LR-related failure modes (oscillation, NaN, plateaus): [Debugging training](debugging-training.md)
- How schedules interact with data curricula and anneals: [Pretraining](../llm-training-and-post-training/pretraining.md), [Data mixing: domain weights, curricula, and continued-pretraining ratios](../data-curation-and-datasets/data-mixing.md)

### Modern optimisers ()

| Optimiser | Idea | Status |
| --- | --- | --- |
| [Muon](https://kellerjordan.github.io/posts/muon/) (~25 min) (2024) | Treat weight matrices as matrices: orthogonalise the momentum update via Newton-Schulz iterations (approx. steepest descent under the spectral norm). Hidden 2D layers only; embeddings/heads/scalars keep AdamW | Roughly 2x sample-efficiency gains reported; used in Kimi (Moonlight/K2) and NanoGPT speedruns; landing in mainstream frameworks |
| [Shampoo](https://arxiv.org/abs/1802.09568) (45 min) (2018) / [SOAP](https://arxiv.org/abs/2409.11321) (45 min) (2024) | Kronecker-factored full-matrix preconditioning (practical second-order); SOAP = run Adam in Shampoo's preconditioner eigenbasis, cutting AdamW steps by ~40% in large-batch LM training | Shampoo won the 2024 AlgoPerf benchmark; SOAP adds one hyperparameter (preconditioning frequency) |
| [Lion](https://arxiv.org/abs/2302.06675) (45 min) (2023) | Symbolically discovered; sign-of-momentum updates, one moment buffer: less memory than Adam | Competitive on vision/LM at lower memory; sensitive to LR/decay tuning |
| [Schedule-free (Defazio et al., arXiv:2405.15682)](https://arxiv.org/abs/2405.15682) (45 min) (2024) | Replace the LR schedule with principled iterate averaging; no need to know total steps T in advance | NeurIPS 2024 oral; attractive for open-ended training runs |

Takeaway: AdamW + warmup-cosine is still the safe default; Muon (with AdamW for non-matrix params) is the credible 2025-26 challenger for LLM pretraining.
