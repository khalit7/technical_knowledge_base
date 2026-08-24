# Normalisation and initialisation

## Best resources

- [Batch Normalization paper (Ioffe & Szegedy 2015, arXiv:1502.03167)](https://arxiv.org/abs/1502.03167) and [Layer Normalization (Ba et al. 2016, arXiv:1607.06450)](https://arxiv.org/abs/1607.06450): the originals.
- [RMSNorm paper (Zhang & Sennrich 2019, arXiv:1910.07467)](https://arxiv.org/abs/1910.07467): the LLM-era default norm.
- [Delving Deep into Rectifiers (He et al. 2015, arXiv:1502.01852)](https://arxiv.org/abs/1502.01852): He initialisation, derived alongside PReLU.
- [Understanding the difficulty of training deep feedforward networks (Glorot & Bengio 2010)](https://proceedings.mlr.press/v9/glorot10a.html): Xavier initialisation.

## Feature scaling (input normalisation)

Purpose: make all features contribute equally, so large-range features do not dominate; also speeds up gradient-descent convergence (rounder loss contours).

| Method | Formula | Result |
|---|---|---|
| Standardisation (z-score) | $z = (x-\mu)/\sigma$ | Mean 0, std 1 |
| Min-max normalisation | $x' = (x-x_{min})/(x_{max}-x_{min})$ | Range [0, 1] |

## Batch normalisation

Z-score normalisation applied per layer inside the network, over the batch dimension.

**Training**, per layer, per feature:
1. Compute batch mean $\mu_B$ and std $\sigma_B$ of each feature across the batch dimension.
2. Normalise: $\hat x = (x-\mu_B)/\sqrt{\sigma_B^2+\epsilon}$.
3. Re-scale and re-shift with learnable parameters: $y = \gamma\hat x + \beta$ (one $\gamma,\beta$ per feature, so num_features of each per layer).
4. Also maintain **moving averages** of $\mu$ and $\sigma$ (momentum hyperparameter $\alpha$) for later use.

**Inference**: a single input has no batch statistics, so use the training-time moving averages as $\mu,\sigma$. (Exact full-dataset statistics would be ideal but too expensive to maintain during training.)

Placement: before or after the activation both appear in practice; the original paper put it before.

| Advantages | Disadvantages |
|---|---|
| Centred inputs -> better gradient flow, faster learning | Sensitive to batch size (small batches -> noisy statistics) |
| Mitigates vanishing/exploding gradients | Awkward for RNNs / variable-length sequences |
| Reduces internal covariate shift (the original motivation; later work credits loss-surface smoothing instead) | Train/inference mismatch: must carry moving averages |

## Layer normalisation

Same idea, different axis: normalise across the **feature** dimension, per datapoint, so every example is normalised independently. One $\gamma,\beta$ vector per layer.

- Fixes all three BatchNorm weaknesses: batch-size independent, works for RNNs/transformers, identical at train and inference (no moving averages).
- Cost: nothing serious; it does not share BatchNorm's mild batch-noise regularisation, and per-token normalisation is extra compute at inference.
- The transformer default (Pre-LN placement in modern stacks).

## RMSNorm (modern extension, 2019 onward)

$y = \frac{x}{\text{RMS}(x)}\cdot\gamma$, with $\text{RMS}(x)=\sqrt{\tfrac1d\sum x_i^2}$: LayerNorm without mean-centring and without $\beta$.

- Re-scaling invariance turns out to be what matters; dropping the mean subtraction saves compute with equal quality.
- Default in essentially every modern LLM (Llama, Mistral, Qwen, DeepSeek). Some 2024-25 models add extra QK-norm (RMSNorm on queries/keys) for attention stability.

## Initialisation

| Scheme | Idea | Failure mode / fit |
|---|---|---|
| Constant (naive) | Same value everywhere | Symmetry problem: every neuron in a layer gets the same input and gradient, learns the same function; network cannot diversify |
| Plain random | Sample from some distribution | Breaks symmetry, but scale is critical: variance too small -> signals shrink layer by layer (vanishing gradients); too large -> activations grow exponentially (exploding gradients) |
| Xavier (Glorot) | Scale variance by fan-in/fan-out, $\text{Var}=2/(n_{in}+n_{out})$; uniform and normal flavours | For sigmoid/tanh: activations roughly linear and zero-mean around 0 |
| He (Kaiming) | Xavier modified for ReLU: variance doubled to $2/n_{in}$ because ReLU zeroes half the activations (non-zero mean) | The ReLU-family default |
| LeCun | $\text{Var}=1/n_{in}$ | Pairs with SELU (self-normalising networks) |

All variance-scaling schemes share one goal: keep activation and gradient variance roughly constant across layers, preventing vanishing/exploding gradients from step one.

## Cross-links

- Vanishing/exploding gradient fixes in practice: [debugging-training.md](debugging-training.md)
- Why activation choice dictates the init scheme: [activations.md](activations.md)
