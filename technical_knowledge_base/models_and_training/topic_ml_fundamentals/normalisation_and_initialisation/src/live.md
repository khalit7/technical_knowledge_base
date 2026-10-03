<!-- Notion fetch of https://app.notion.com/p/3c65c17b0d0d81369e1cc38ed4e11d48 as of 2026-09-22T02:17:16.932Z (page_last_edited_at), fetched 2026-10-03. Parent: Topic: ml-fundamentals. No child pages, databases or video. -->
⏱ 5 min read · +3h 45m resources
## Best resources
- [Batch Normalization paper (Ioffe & Szegedy 2015, arXiv:1502.03167)](https://arxiv.org/abs/1502.03167) (45 min) and [Layer Normalization (Ba et al. 2016, arXiv:1607.06450)](https://arxiv.org/abs/1607.06450) (45 min): the originals.
- [RMSNorm paper (Zhang & Sennrich 2019, arXiv:1910.07467)](https://arxiv.org/abs/1910.07467) (45 min): the LLM-era default norm.
- [Delving Deep into Rectifiers (He et al. 2015, arXiv:1502.01852)](https://arxiv.org/abs/1502.01852) (45 min): He initialisation, derived alongside PReLU.
- [Understanding the difficulty of training deep feedforward networks (Glorot & Bengio 2010)](https://proceedings.mlr.press/v9/glorot10a.html) (45 min): Xavier initialisation.
## Feature scaling (input normalisation)
Purpose: make all features contribute equally, so large-range features do not dominate; also speeds up gradient-descent convergence (rounder loss contours).
<table header-row="true">
<tr>
<td>Method</td>
<td>Formula</td>
<td>Result</td>
</tr>
<tr>
<td>Standardisation (z-score)</td>
<td>$`z = (x-\mu)/\sigma`$</td>
<td>Mean 0, std 1</td>
</tr>
<tr>
<td>Min-max normalisation</td>
<td>$`x' = (x-x_{min})/(x_{max}-x_{min})`$</td>
<td>Range \[0, 1\]</td>
</tr>
</table>
## Batch normalisation
Z-score normalisation applied per layer inside the network, over the batch dimension.
**Training**, per layer, per feature:
1. Compute batch mean $`\mu_B`$ and std $`\sigma_B`$ of each feature across the batch dimension.
2. Normalise: $`\hat x = (x-\mu_B)/\sqrt{\sigma_B^2+\epsilon}`$.
3. Re-scale and re-shift with learnable parameters: $`y = \gamma\hat x + \beta`$ (one $`\gamma,\beta`$ per feature, so num_features of each per layer).
4. Also maintain **moving averages** of $`\mu`$ and $`\sigma`$ (momentum hyperparameter $`\alpha`$) for later use.
**Inference**: a single input has no batch statistics, so use the training-time moving averages as $`\mu,\sigma`$. (Exact full-dataset statistics would be ideal but too expensive to maintain during training.)
Placement: before or after the activation both appear in practice; the original paper put it before.
<table header-row="true">
<tr>
<td>Advantages</td>
<td>Disadvantages</td>
</tr>
<tr>
<td>Centred inputs -\> better gradient flow, faster learning</td>
<td>Sensitive to batch size (small batches -\> noisy statistics)</td>
</tr>
<tr>
<td>Mitigates vanishing/exploding gradients</td>
<td>Awkward for RNNs / variable-length sequences</td>
</tr>
<tr>
<td>Reduces internal covariate shift (the original motivation; later work credits loss-surface smoothing instead)</td>
<td>Train/inference mismatch: must carry moving averages</td>
</tr>
</table>
## Layer normalisation
Same idea, different axis: normalise across the **feature** dimension, per datapoint, so every example is normalised independently. One $`\gamma,\beta`$ vector per layer.
- Fixes all three BatchNorm weaknesses: batch-size independent, works for RNNs/transformers, identical at train and inference (no moving averages).
- Cost: nothing serious; it does not share BatchNorm's mild batch-noise regularisation, and per-token normalisation is extra compute at inference.
- The transformer default (Pre-LN placement in modern stacks).
## RMSNorm (modern extension, 2019 onward)
$`y = \frac{x}{\text{RMS}(x)}\cdot\gamma`$, with $`\text{RMS}(x)=\sqrt{\tfrac1d\sum x_i^2}`$: LayerNorm without mean-centring and without $`\beta`$.
- Re-scaling invariance turns out to be what matters; dropping the mean subtraction saves compute with equal quality.
- Default in essentially every modern LLM (Llama, Mistral, Qwen, DeepSeek). Most also add **QK-norm** (RMSNorm on queries and keys) for attention stability, because at scale the query-key dot products can grow without bound until the softmax saturates and the loss spikes. QK-norm buys that inside the forward pass, changing the model's own computation. Moonshot's **qk-clip** is the alternative that leaves the forward pass untouched and instead rescales a head's query and key projection weights after the optimiser step when its maximum logit crosses a threshold, which is what made a 1T-parameter run on the Muon optimiser stable.
## Initialisation
<table header-row="true">
<tr>
<td>Scheme</td>
<td>Idea</td>
<td>Failure mode / fit</td>
</tr>
<tr>
<td>Constant (naive)</td>
<td>Same value everywhere</td>
<td>Symmetry problem: every neuron in a layer gets the same input and gradient, learns the same function; network cannot diversify</td>
</tr>
<tr>
<td>Plain random</td>
<td>Sample from some distribution</td>
<td>Breaks symmetry, but scale is critical: variance too small -\> signals shrink layer by layer (vanishing gradients); too large -\> activations grow exponentially (exploding gradients)</td>
</tr>
<tr>
<td>Xavier (Glorot)</td>
<td>Scale variance by fan-in/fan-out, $`\text{Var}=2/(n_{in}+n_{out})`$; uniform and normal flavours</td>
<td>For sigmoid/tanh: activations roughly linear and zero-mean around 0</td>
</tr>
<tr>
<td>He (Kaiming)</td>
<td>Xavier modified for ReLU: variance doubled to $`2/n_{in}`$ because ReLU zeroes half the activations (non-zero mean)</td>
<td>The ReLU-family default</td>
</tr>
<tr>
<td>LeCun</td>
<td>$`\text{Var}=1/n_{in}`$</td>
<td>Pairs with SELU (self-normalising networks)</td>
</tr>
</table>
All variance-scaling schemes share one goal: keep activation and gradient variance roughly constant across layers, preventing vanishing/exploding gradients from step one.
## Cross-links
- Vanishing/exploding gradient fixes in practice: <mention-page url="https://app.notion.com/p/3c65c17b0d0d8198857bd8347723ad70"/>
- Why activation choice dictates the init scheme: <mention-page url="https://app.notion.com/p/3c65c17b0d0d819f8049c255e6f206e2"/>
- Attention-logit growth, qk-clip and MuonClip in a frontier run: <mention-page url="https://app.notion.com/p/3c65c17b0d0d81f5abf5dbdbac821a12"/>
