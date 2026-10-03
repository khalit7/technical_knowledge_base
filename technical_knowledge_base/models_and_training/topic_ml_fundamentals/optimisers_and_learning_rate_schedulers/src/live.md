Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d817080bbc90954681d09 as of 2026-09-22T02:17:04.004Z:
<page url="https://app.notion.com/p/3c65c17b0d0d817080bbc90954681d09">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81d796ccc0a293218c57" title="Topic: ml-fundamentals"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Optimisers and learning-rate schedulers"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 15 min read · +10h 50m resources
## Best resources
- [An overview of gradient descent optimization algorithms (Ruder)](https://www.ruder.io/optimizing-gradient-descent/) (\~40 min): the canonical survey, SGD through Adam/Nadam.
- [Why Momentum Really Works (Distill)](https://distill.pub/2017/momentum/) (\~30 min): interactive intuition for momentum.
- [Decoupled Weight Decay Regularization (Loshchilov & Hutter, arXiv:1711.05101)](https://arxiv.org/abs/1711.05101) (45 min): AdamW.
- [Muon: an optimizer for hidden layers (Keller Jordan)](https://kellerjordan.github.io/posts/muon/) (\~25 min) and [Deriving Muon (Bernstein)](https://jeremybernste.in/writing/deriving-muon) (\~30 min): the modern-optimiser story.
- [Scaling Laws and Compute-Optimal Training Beyond Fixed Training Durations (Hägele et al., arXiv:2405.18392)](https://arxiv.org/abs/2405.18392) (45 min): the constant-LR-plus-cooldown study that made WSD respectable; also the best source on cooldown shape and length.
- [PyTorch ](https://pytorch.org/docs/stable/optim.html)[`torch.optim`](https://pytorch.org/docs/stable/optim.html)[ docs](https://pytorch.org/docs/stable/optim.html) (docs, \~30 min): what is actually implemented, with the exact formulas.
## Loss-landscape geometry
- **Local optimum**: gradient is zero and moving in ANY direction increases the loss.
- **Saddle point**: gradient is zero, but the loss decreases along one dimension and increases along another (horse saddle); second derivative says it is neither maximum nor minimum. Frequent in high dimensions, but not a big problem: escape via the descending dimension is easy-ish, helped by momentum, mini-batch noise, and even float precision errors.
- All parameters update simultaneously: $`J(\theta_0,\theta_1)`$ is always evaluated at the previous parameters.
## Gradient descent variants
<table header-row="true">
<tr>
<td>Variant</td>
<td>Gradient computed on</td>
<td>Trade-off</td>
</tr>
<tr>
<td>Batch GD</td>
<td>Entire training set</td>
<td>Deterministic descent to a (local) minimum, but slow and expensive per step</td>
</tr>
<tr>
<td>SGD</td>
<td>One random example</td>
<td>Cheap and fast, but noisy; may never settle at the minimum</td>
</tr>
<tr>
<td>Mini-batch GD</td>
<td>Small batch</td>
<td>Standard in practice: efficient, less noisy than SGD, hardware-friendly</td>
</tr>
</table>
## Momentum methods
- **SGD + momentum**: $`v_t=\beta v_{t-1} + \nabla J`$; $`\theta \leftarrow \theta - \eta v_t`$. Accumulated velocity damps oscillation across ravines and accelerates consistent directions.
- **Nesterov (NAG)**: evaluate the gradient at the look-ahead point $`\theta - \eta\beta v_{t-1}`$; corrects the step before taking it.
## Adaptive learning-rate methods
Intuition: scale the step per parameter from its gradient history; larger steps where gradients are small and consistent, smaller where large or volatile.
<table header-row="true">
<tr>
<td>Optimiser</td>
<td>Idea</td>
<td>Weakness</td>
</tr>
<tr>
<td>AdaGrad</td>
<td>Divide LR by $`\sqrt{\text{cumulative sum of squared gradients}}`$</td>
<td>Good for sparse features, but the denominator only grows: LR decays to nothing</td>
</tr>
<tr>
<td>RMSProp</td>
<td>Replace the sum with an exponentially decaying average of squared gradients</td>
<td>Fixes AdaGrad's dying LR; good for online/non-stationary problems</td>
</tr>
<tr>
<td>AdaDelta</td>
<td>No global LR at all; step size adapted from a running average of past updates</td>
<td>Rarely used now</td>
</tr>
<tr>
<td>Adam</td>
<td>RMSProp + momentum + bias correction: $`\hat m_t = m_t/(1-\beta_1^t)`$, $`\hat v_t = v_t/(1-\beta_2^t)`$; $`\theta \leftarrow \theta - \eta\,\hat m_t/(\sqrt{\hat v_t}+\epsilon)`$</td>
<td>Bias correction matters early, when moment estimates are built from few samples</td>
</tr>
<tr>
<td>AdamW</td>
<td>Adam with **decoupled** weight decay: decay applied in the update rule ($`-\eta\lambda\theta`$), not added to the loss</td>
<td>If L2 sits in the loss it gets divided by $`\sqrt{\hat v_t}`$ like every other gradient component, so high-gradient weights are under-decayed; decoupling fixes this. The LLM default</td>
</tr>
</table>
## Second-order methods
- **Newton's method**: use the Hessian, $`\theta \leftarrow \theta - H^{-1}\nabla J`$. Converges in far fewer steps, but the Hessian is $`O(n^2)`$ memory and $`O(n^3)`$ to invert: impractical for large networks. Quasi-Newton (L-BFGS) and Hessian-free variants exist; the practical descendants are the structured preconditioners below.
## Schedulers
Schedulers set the base LR $`\eta`$ over time; adaptive optimisers only rescale relative to it, so both are used together. High LR early to travel fast toward some basin, low LR late to settle at its bottom. Two questions separate every family below: **does the schedule need the total step count **$`T`$** in advance**, and **what shape is the decay**.
### The shapes
<table header-row="true">
<tr>
<td>Scheduler</td>
<td>Shape</td>
<td>Needs T upfront?</td>
<td>Where it lives</td>
</tr>
<tr>
<td>Constant (after warmup)</td>
<td>Flat at $`\eta_{peak}`$</td>
<td>No</td>
<td>The base case for every decay-free method; on its own it leaves loss visibly above an annealed run</td>
</tr>
<tr>
<td>StepLR / MultiStepLR</td>
<td>Multiply by $`\gamma`$ at fixed milestones</td>
<td>Yes (milestones)</td>
<td>ResNet/ImageNet era; still fine for small supervised jobs</td>
</tr>
<tr>
<td>ExponentialLR</td>
<td>$`\eta_t = \eta_0\gamma^t`$</td>
<td>No</td>
<td>Convex and fiddly to tune; rarely competitive</td>
</tr>
<tr>
<td>Inverse square root (Noam)</td>
<td>$`\eta \propto 1/\sqrt{t}`$ after warmup</td>
<td>No</td>
<td>Original Transformer schedule; concave, degrades gracefully if the run is extended</td>
</tr>
<tr>
<td>Linear decay to zero</td>
<td>Straight line, peak to \~0</td>
<td>Yes</td>
<td>The SFT and fine-tuning default (HF Trainer)</td>
</tr>
<tr>
<td>CosineAnnealingLR</td>
<td>Cosine from $`\eta_{max}`$ down to $`\eta_{min}`$ over T</td>
<td>Yes</td>
<td>Classic LLM pretraining: Kaplan, Chinchilla, Llama</td>
</tr>
<tr>
<td>Warmup + cosine</td>
<td>Linear ramp from \~0, then cosine decay</td>
<td>Yes</td>
<td>Still the single most common recipe overall</td>
</tr>
<tr>
<td>CosineAnnealingWarmRestarts ([SGDR, arXiv:1608.03983](https://arxiv.org/abs/1608.03983) (45 min))</td>
<td>Cosine cycles, each restarting at $`\eta_{max}`$</td>
<td>Per cycle only</td>
<td>Snapshot ensembles and vision; essentially absent from LLM pretraining</td>
</tr>
<tr>
<td>OneCycleLR ([super-convergence, arXiv:1708.07120](https://arxiv.org/abs/1708.07120) (45 min))</td>
<td>Ramp to a peak well above normal, then anneal below the starting LR</td>
<td>Yes</td>
<td>Short fine-tuning runs, fastai lineage</td>
</tr>
<tr>
<td>ReduceLROnPlateau</td>
<td>Cut LR by a factor when a monitored metric stops improving</td>
<td>No</td>
<td>Reactive. Good for small supervised runs; bad for LLM runs (feedback from noisy evals, non-reproducible schedule)</td>
</tr>
<tr>
<td>WSD / trapezoid ([MiniCPM, arXiv:2404.06395](https://arxiv.org/abs/2404.06395) (90 min))</td>
<td>Warmup, long constant plateau, short cooldown over the last \~10-20%</td>
<td>No: the decay start is chosen later</td>
<td>DeepSeek-V3, MiniCPM, ERNIE 4.5; the 2025-26 pretraining default</td>
</tr>
<tr>
<td>Schedule-free ([Defazio et al., arXiv:2405.15682](https://arxiv.org/abs/2405.15682) (45 min))</td>
<td>Constant LR plus principled iterate averaging instead of a decay curve</td>
<td>No</td>
<td>Open-ended runs; NeurIPS 2024 oral</td>
</tr>
<tr>
<td>WSM ([arXiv:2507.17634](https://arxiv.org/abs/2507.17634) (45 min))</td>
<td>Constant LR forever; the decay is emulated afterwards by merging saved checkpoints</td>
<td>No</td>
<td>2025 decay-free framework from Ant Group's Ling team; see below</td>
</tr>
</table>
**Why warmup**: Adam's per-parameter LRs come from first/second-moment estimates; in the first steps those estimates are built from almost no data and are wildly inaccurate, producing artificially large updates and instability. Warmup keeps steps small until the moment statistics are trustworthy, then lets the LR reach its full value.
### Annealing vs LR decay (terminology)
"Annealing" is used in three different ways in this literature and they are not interchangeable.
<table header-row="true">
<tr>
<td>Sense</td>
<td>What it means</td>
<td>Where you meet it</td>
</tr>
<tr>
<td>1. Classical / optimisation</td>
<td>Lowering the LR, full stop. Borrowed from simulated annealing, where a temperature parameter is reduced so the search settles. Here annealing and LR decay are exact synonyms</td>
<td>"cosine annealing", `CosineAnnealingLR`, `eta_min`; anything pre-2023</td>
</tr>
<tr>
<td>2. Modern LLM pretraining</td>
<td>A training **phase** (final \~10-30% of tokens) defined by two simultaneous changes: the LR decays toward zero **and** the data mixture switches to curated high-quality tokens (math, code, instruction-like, reasoning)</td>
<td>Llama 3's annealing, OLMo 2's Dolmino mid-training mix, MiniCPM's WSD decay phase; "the annealed model"</td>
</tr>
<tr>
<td>3. Annealing as an experiment</td>
<td>A cheap evaluation protocol: take a fixed mid-run checkpoint, anneal it on a candidate dataset, compare scores. Used to price a dataset, not to train a final model</td>
<td>Llama 3 and OLMo both evaluate candidate corpora this way</td>
</tr>
</table>
Why the distinction is worth keeping straight:
- **The two levers are separable, and papers usually pull both at once.** WSD lets you decay the LR with no data change; conversely you can switch to a high-quality mixture while the LR stays flat (WSM's $`T_{switch}`$ does exactly that). Any claim that "annealing gave +X" is a compound of two effects unless the ablation separated them.
- **They work for different reasons that happen to reinforce each other.** Low LR means the model descends into a basin and stops moving much; low gradient noise near the end is also when scarce high-quality tokens stick best rather than being diluted across a 10T-token stream. This is why the data switch is scheduled to coincide with the decay, not because one requires the other.
- **Reading papers**: "decay phase" or "cooldown" means the schedule alone; "anneal" or "annealed checkpoint" almost always implies the data switch too. WSM is a clean example of why the split matters: it removes sense 1 entirely (constant LR forever) while keeping sense 2 (the curated-data switch), and recovers the decay's benefit by merging.
- Unrelated homonyms: simulated annealing proper (a combinatorial optimisation algorithm) and sampling temperature at inference (see <mention-page url="https://app.notion.com/p/3c65c17b0d0d8115bafcda29a2c7086e"/>) share the metaphor but nothing else.
Data-side detail on what goes into the anneal mixture: <mention-page url="https://app.notion.com/p/3c65c17b0d0d819ea5d6c59471e66875"/>.
### How they compare
- **Final quality at a fixed budget is a near-tie.** Cosine, WSD, and 1-sqrt cooldowns land within noise of each other once T is known and each is tuned. Hägele et al. (2024) showed constant-LR-plus-cooldown scales as predictably as cosine, which is why WSD spread so fast.
- **Cosine's real cost is optionality, not loss.** Every intermediate checkpoint of a cosine run is mistuned (the LR is still high there), so you cannot stop early, extend the run, or reuse it at another length. This artefact is exactly what Chinchilla had to correct in Kaplan's scaling laws, and it forces one full run per training duration.
- **Cooldown shape has a stable ordering**: concave (1-sqrt) is at least as good as linear, and both beat convex (exponential, EMA-like). Convex curves linger at high LR and then collapse too fast.
- **Cooldown length**: roughly 10-20% of tokens. Longer helps, with clear diminishing returns.
- **Final LR matters**: decaying to \~10% of peak is the usual heuristic. Going nearer to zero improves loss but can hurt some downstream benchmarks.
- **The cooldown is also a data lever**: labs up-weight curated math, code and instruction-like data during it, so the schedule and the data anneal are one decision (see <mention-page url="https://app.notion.com/p/3c65c17b0d0d814f82cffd0d5c0dd5ba"/> and <mention-page url="https://app.notion.com/p/3c65c17b0d0d819ea5d6c59471e66875"/>).
- **Weight averaging substitutes for part of the decay.** Averaging along the trajectory (SWA/EMA) improves checkpoints at no training cost, which is the observation WSM turns into a full framework.
### Choosing one
- LLM pretraining, budget unknown or likely to be extended: **WSD**, 1-sqrt cooldown over the last 10-20%.
- LLM pretraining, budget fixed and final: **warmup + cosine** to \~10% of peak.
- SFT or fine-tuning: **linear or cosine to zero**, 3-5% warmup.
- Small supervised model with cheap, low-variance eval: **ReduceLROnPlateau** or MultiStep.
- No schedule at all: **schedule-free** or **WSM**.
### Decay-free schedules: WSM
WSD removed the need to know T, but not the decay itself: you still choose when to start decaying, over how many tokens, and with which curve, and extending training after the decay has begun means rolling back to the pre-decay state. **WSM (Warmup-Stable and Merge)** removes the decay phase entirely. The LR warms up, then stays constant forever; checkpoints are saved periodically, and a weighted merge of the last $`n`$ of them stands in for the annealed model.
The link is exact rather than heuristic. Merging checkpoints with weights $`c_j`$ is algebraically the same as applying per-step gradient weights $`w_i=\sum_{j\ge i} c_j`$ to the updates after the base checkpoint, so any monotone decay curve can be inverted into merge weights ($`c_k=w_k`$, $`c_j=w_j-w_{j+1}`$, $`c_0=1-w_1`$). Mean averaging corresponds to linear decay, EMA to a convex decay, and cosine or 1-sqrt curves can be constructed directly. The framework is optimiser-agnostic and needs no change to the training loop.
Empirically (16.3B/1.4B-active MoE, 400B tokens branched off a 10.2T constant-LR checkpoint) WSM beat a matched WSD decay by \~1.3 points on average, and merge duration mattered far more than checkpoint interval or the number of checkpoints merged. EMA merging was the weakest, mirroring the convex-is-worse ordering above. Full summary: <mention-page url="https://app.notion.com/p/3c75c17b0d0d8105b452d2c1bc1d087a"/>.
Practical read: the storage cost (one checkpoint per interval) is small next to a pretraining budget, and a merge is a cheap, repeatable proxy for "how good would this model be if I annealed now", removing the need to launch throwaway decay runs to gauge progress.
## Cross-links
- Decoupled weight decay from the regularisation side: <mention-page url="https://app.notion.com/p/3c65c17b0d0d81e988b5c3cb5e197f98"/>
- LR-related failure modes (oscillation, NaN, plateaus): <mention-page url="https://app.notion.com/p/3c65c17b0d0d8198857bd8347723ad70"/>
- How schedules interact with data curricula and anneals: <mention-page url="https://app.notion.com/p/3c65c17b0d0d814f82cffd0d5c0dd5ba"/>, <mention-page url="https://app.notion.com/p/3c65c17b0d0d819ea5d6c59471e66875"/>
- Hessians, Newton's method and conditioning as mathematics: <mention-page url="https://app.notion.com/p/3c65c17b0d0d81eb8b49ed6a0f897f3b"/>
- Muon and qk-clip at trillion scale, and what they cost to run: <mention-page url="https://app.notion.com/p/3c65c17b0d0d81f5abf5dbdbac821a12"/>
## Modern optimisers
<table header-row="true">
<tr>
<td>Optimiser</td>
<td>Idea</td>
<td>Status</td>
</tr>
<tr>
<td>[Muon](https://kellerjordan.github.io/posts/muon/) (\~25 min) (2024)</td>
<td>Treat weight matrices as matrices: orthogonalise the momentum update via Newton-Schulz iterations (approx. steepest descent under the spectral norm), so the step pushes across the whole spectrum instead of being dominated by a few large singular directions. Hidden 2D layers only; embeddings/heads/scalars keep AdamW. Momentum only, so less optimiser state than AdamW's two moment buffers</td>
<td>Roughly 2x sample-efficiency gains reported, and now proven at trillion scale rather than only in NanoGPT speedruns: **MuonClip** (Muon plus **qk-clip**, which rescales a head's query and key projections after the optimiser step whenever its maximum attention logit crosses a threshold) carried Moonshot's 1T-parameter Kimi K2 through 15.5T tokens with no loss spikes, and Zhipu's GLM line runs Muon-family optimisers too. The awkward part is that orthogonalisation wants a whole matrix while a large run has it sharded, which is why Moonshot published a distributed version; a stock transformation in JAX's optax</td>
</tr>
<tr>
<td>[Shampoo](https://arxiv.org/abs/1802.09568) (45 min) (2018) / [SOAP](https://arxiv.org/abs/2409.11321) (45 min) (2024)</td>
<td>Kronecker-factored full-matrix preconditioning (practical second-order); SOAP = run Adam in Shampoo's preconditioner eigenbasis, cutting AdamW steps by \~40% in large-batch LM training</td>
<td>Shampoo won the 2024 AlgoPerf benchmark; SOAP adds one hyperparameter (preconditioning frequency)</td>
</tr>
<tr>
<td>[Lion](https://arxiv.org/abs/2302.06675) (45 min) (2023)</td>
<td>Symbolically discovered; sign-of-momentum updates, one moment buffer: less memory than Adam</td>
<td>Competitive on vision/LM at lower memory; sensitive to LR/decay tuning</td>
</tr>
<tr>
<td>[Schedule-free (Defazio et al., arXiv:2405.15682)](https://arxiv.org/abs/2405.15682) (45 min) (2024)</td>
<td>Replace the LR schedule with principled iterate averaging; no need to know total steps T in advance</td>
<td>NeurIPS 2024 oral; attractive for open-ended training runs</td>
</tr>
</table>
Takeaway: AdamW + warmup-cosine is still the safe default; Muon (with AdamW for non-matrix params) is the challenger with frontier-scale evidence behind it, and the only one of these routinely used to pretrain a trillion-parameter model.
</content>
</page>