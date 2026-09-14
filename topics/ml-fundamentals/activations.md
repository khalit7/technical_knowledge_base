# Activation functions

⏱ 3 min read · +2h 5m resources

## Best resources

- [GLU Variants Improve Transformer (Shazeer 2020, arXiv:2002.05202)](https://arxiv.org/abs/2002.05202) (20 min): the 4-page paper behind GEGLU/SwiGLU; ends with the famous "we attribute their success to divine benevolence".
- [GELU paper (Hendrycks & Gimpel 2016, arXiv:1606.08415)](https://arxiv.org/abs/1606.08415) (45 min): original definition and the stochastic-regulariser interpretation.
- [Searching for Activation Functions (Ramachandran et al. 2017, arXiv:1710.05941)](https://arxiv.org/abs/1710.05941) (45 min): the Swish/SiLU search paper.
- [PyTorch nonlinear activation docs](https://pytorch.org/docs/stable/nn.html#non-linear-activations-weighted-sum-nonlinearity) (docs, ~15 min): exact formulas and variants.

## Required properties

1. **Non-linear**: otherwise the whole network collapses to one linear map.
2. **Differentiable** (almost everywhere is enough: ReLU is fine).

## The classics

| Activation | Formula | Pros | Cons |
|---|---|---|---|
| Sigmoid | $1/(1+e^{-x})$ | Output in (0,1): probability interpretation | Saturates both sides: vanishing gradient; not zero-centred |
| Tanh | $\tanh(x)$ | Zero-centred, so gradients can be positive or negative and updates move "more freely" | Still saturates: vanishing gradient |
| ReLU | $\max(0,x)$ | Trivially cheap; no saturation for $x>0$, so no vanishing gradient there | Dead neurons: a unit stuck at 0 has zero gradient and never recovers |
| Leaky ReLU | $\max(\alpha x, x)$ | ReLU benefits, plus gradient on negative inputs: fixes dead neurons | One more hyperparameter $\alpha$ (PReLU learns it instead) |
| Softmax | $e^{x_i}/\sum_j e^{x_j}$ | Sigmoid generalised to $K$ classes; outputs a distribution | Expensive for very large $K$ (LM vocabularies); output-layer only |

## Smooth modern units

| Activation | Formula | Notes |
|---|---|---|
| GELU | $x\cdot\Phi(x)$ ($\Phi$ = Gaussian CDF) | Input weighted by its Gaussian probability: smooth, self-scaling; default in BERT/GPT-era transformers |
| SiLU / Swish | $x\cdot\sigma(x)$ | Nearly identical curve to GELU; found by architecture search, empirically beats ReLU |

Both are smooth ReLU-like curves with a small negative dip; empirically better than ReLU in transformers.

## Gated activations (GLU family)

Two parallel projections; one gates the other elementwise:

| Variant | Formula |
|---|---|
| GLU | $(W_1 x) \odot \sigma(W_2 x)$ |
| GEGLU | $(W_1 x) \odot \text{GELU}(W_2 x)$ |
| SwiGLU | $(W_1 x) \odot \text{SiLU}(W_2 x)$ |

- Pros: learned adaptive slope (the gate sets gradient strength per neuron), very expressive, stable training, balanced mean/variance.
- Cons: extra projection = more compute/params; FFN hidden dim is usually shrunk to $\tfrac{2}{3}\cdot 4d$ to keep parameter count matched.
- GEGLU and SwiGLU are the empirical state of the art for transformer FFNs; SwiGLU is the modern default (Llama, PaLM, Mistral, Qwen).

## Conclusions

- **Hidden layers**: ReLU family (SwiGLU/GELU in transformers).
- **Output layers**: task-dependent. Sigmoid for binary classification, softmax for multiclass, linear (no activation) for regression.

## Modern notes (2026)

- SwiGLU remains the near-universal choice in open LLMs; GELU (often tanh-approximated) persists in ViTs.
- Squared ReLU ($\max(0,x)^2$) shows up in some efficiency-focused LLMs (e.g. Primer-style stacks, some 2024-25 small models) as a cheap SwiGLU alternative.

## Cross-links

- Saturation and dead-ReLU debugging: [debugging-training.md](debugging-training.md)
- Activation choice interacts with initialisation (Xavier vs He): [normalisation-and-initialisation.md](normalisation-and-initialisation.md)
