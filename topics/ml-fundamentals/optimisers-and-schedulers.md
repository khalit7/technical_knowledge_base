# Optimisers and learning-rate schedulers

## Best resources

- [An overview of gradient descent optimization algorithms (Ruder)](https://www.ruder.io/optimizing-gradient-descent/): the canonical survey, SGD through Adam/Nadam.
- [Why Momentum Really Works (Distill)](https://distill.pub/2017/momentum/): interactive intuition for momentum.
- [Decoupled Weight Decay Regularization (Loshchilov & Hutter, arXiv:1711.05101)](https://arxiv.org/abs/1711.05101): AdamW.
- [Muon: an optimizer for hidden layers (Keller Jordan)](https://kellerjordan.github.io/posts/muon/) and [Deriving Muon (Bernstein)](https://jeremybernste.in/writing/deriving-muon): the modern-optimiser story.

## Loss-landscape geometry

- **Local optimum**: gradient is zero and moving in ANY direction increases the loss.
- **Saddle point**: gradient is zero, but the loss decreases along one dimension and increases along another (horse saddle); second derivative says it is neither maximum nor minimum. Frequent in high dimensions, but not a big problem: escape via the descending dimension is easy-ish, helped by momentum, mini-batch noise, and even float precision errors.
- All parameters update simultaneously: $J(\theta_0,\theta_1)$ is always evaluated at the previous parameters.

## Gradient descent variants

| Variant | Gradient computed on | Trade-off |
|---|---|---|
| Batch GD | Entire training set | Deterministic descent to a (local) minimum, but slow and expensive per step |
| SGD | One random example | Cheap and fast, but noisy; may never settle at the minimum |
| Mini-batch GD | Small batch | Standard in practice: efficient, less noisy than SGD, hardware-friendly |

## Momentum methods

- **SGD + momentum**: $v_t=\beta v_{t-1} + \nabla J$; $\theta \leftarrow \theta - \eta v_t$. Accumulated velocity damps oscillation across ravines and accelerates consistent directions.
- **Nesterov (NAG)**: evaluate the gradient at the look-ahead point $\theta - \eta\beta v_{t-1}$; corrects the step before taking it.

## Adaptive learning-rate methods

Intuition: scale the step per parameter from its gradient history; larger steps where gradients are small and consistent, smaller where large or volatile.

| Optimiser | Idea | Weakness |
|---|---|---|
| AdaGrad | Divide LR by $\sqrt{\text{cumulative sum of squared gradients}}$ | Good for sparse features, but the denominator only grows: LR decays to nothing |
| RMSProp | Replace the sum with an exponentially decaying average of squared gradients | Fixes AdaGrad's dying LR; good for online/non-stationary problems |
| AdaDelta | No global LR at all; step size adapted from a running average of past updates | Rarely used now |
| Adam | RMSProp + momentum + bias correction: $\hat m_t = m_t/(1-\beta_1^t)$, $\hat v_t = v_t/(1-\beta_2^t)$; $\theta \leftarrow \theta - \eta\,\hat m_t/(\sqrt{\hat v_t}+\epsilon)$ | Bias correction matters early, when moment estimates are built from few samples |
| AdamW | Adam with **decoupled** weight decay: decay applied in the update rule ($-\eta\lambda\theta$), not added to the loss | If L2 sits in the loss it gets divided by $\sqrt{\hat v_t}$ like every other gradient component, so high-gradient weights are under-decayed; decoupling fixes this. The LLM default |

## Second-order methods

- **Newton's method**: use the Hessian, $\theta \leftarrow \theta - H^{-1}\nabla J$. Converges in far fewer steps, but the Hessian is $O(n^2)$ memory and $O(n^3)$ to invert: impractical for large networks. Quasi-Newton (L-BFGS) and Hessian-free variants exist; the practical descendants are the structured preconditioners below.

## Schedulers

Schedulers change the base LR $\eta$ over time; adaptive optimisers only rescale relative to it, so both are used together. Core intuition: high LR early to travel fast toward some basin, low LR late to settle at its bottom.

| Scheduler | Shape |
|---|---|
| CosineAnnealingLR | Cosine from $\eta_{max}$ down to $\eta_{min}$ over training |
| CosineAnnealingWarmRestarts | Same cosine, but restart to $\eta_{max}$ every cycle (SGDR, [arXiv:1608.03983](https://arxiv.org/abs/1608.03983)) |
| Warmup + cosine (most popular) | Linear ramp from ~0, then cosine decay |

**Why warmup**: Adam's per-parameter LRs come from first/second-moment estimates; in the first steps those estimates are built from almost no data and are wildly inaccurate, producing artificially large updates and instability. Warmup keeps steps small until the moment statistics are trustworthy, then lets the LR reach its full value.

## Modern optimisers (added 2026-08)

| Optimiser | Idea | Status |
|---|---|---|
| [Muon](https://kellerjordan.github.io/posts/muon/) (2024) | Treat weight matrices as matrices: orthogonalise the momentum update via Newton-Schulz iterations (approx. steepest descent under the spectral norm). Hidden 2D layers only; embeddings/heads/scalars keep AdamW | Roughly 2x sample-efficiency gains reported; used in Kimi (Moonlight/K2) and NanoGPT speedruns; landing in mainstream frameworks |
| [Shampoo](https://arxiv.org/abs/1802.09568) (2018) / [SOAP](https://arxiv.org/abs/2409.11321) (2024) | Kronecker-factored full-matrix preconditioning (practical second-order); SOAP = run Adam in Shampoo's preconditioner eigenbasis, cutting AdamW steps by ~40% in large-batch LM training | Shampoo won the 2024 AlgoPerf benchmark; SOAP adds one hyperparameter (preconditioning frequency) |
| [Lion](https://arxiv.org/abs/2302.06675) (2023) | Symbolically discovered; sign-of-momentum updates, one moment buffer: less memory than Adam | Competitive on vision/LM at lower memory; sensitive to LR/decay tuning |
| [Schedule-free (Defazio et al., arXiv:2405.15682)](https://arxiv.org/abs/2405.15682) (2024) | Replace the LR schedule with principled iterate averaging; no need to know total steps T in advance | NeurIPS 2024 oral; attractive for open-ended training runs |

Takeaway: AdamW + warmup-cosine is still the safe default; Muon (with AdamW for non-matrix params) is the credible 2025-26 challenger for LLM pretraining.

## Cross-links

- Decoupled weight decay from the regularisation side: [regularisation.md](regularisation.md)
- LR-related failure modes (oscillation, NaN, plateaus): [debugging-training.md](debugging-training.md)
