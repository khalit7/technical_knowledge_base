<page url="https://app.notion.com/p/3c65c17b0d0d819f8049c255e6f206e2">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81d796ccc0a293218c57" title="Topic: ml-fundamentals"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Activation functions"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 3 min read · +2h 5m resources
## Best resources
- [GLU Variants Improve Transformer (Shazeer 2020, arXiv:2002.05202)](https://arxiv.org/abs/2002.05202) (20 min): the 4-page paper behind GEGLU/SwiGLU; ends with the famous "we attribute their success to divine benevolence".
- [GELU paper (Hendrycks & Gimpel 2016, arXiv:1606.08415)](https://arxiv.org/abs/1606.08415) (45 min): original definition and the stochastic-regulariser interpretation.
- [Searching for Activation Functions (Ramachandran et al. 2017, arXiv:1710.05941)](https://arxiv.org/abs/1710.05941) (45 min): the Swish/SiLU search paper.
- [PyTorch nonlinear activation docs](https://pytorch.org/docs/stable/nn.html#non-linear-activations-weighted-sum-nonlinearity) (docs, \~15 min): exact formulas and variants.
## Required properties
1. **Non-linear**: otherwise the whole network collapses to one linear map.
2. **Differentiable** (almost everywhere is enough: ReLU is fine).
## The classics
<table header-row="true">
<tr>
<td>Activation</td>
<td>Formula</td>
<td>Pros</td>
<td>Cons</td>
</tr>
<tr>
<td>Sigmoid</td>
<td>$`1/(1+e^{-x})`$</td>
<td>Output in (0,1): probability interpretation</td>
<td>Saturates both sides: vanishing gradient; not zero-centred</td>
</tr>
<tr>
<td>Tanh</td>
<td>$`\tanh(x)`$</td>
<td>Zero-centred, so gradients can be positive or negative and updates move "more freely"</td>
<td>Still saturates: vanishing gradient</td>
</tr>
<tr>
<td>ReLU</td>
<td>$`\max(0,x)`$</td>
<td>Trivially cheap; no saturation for $`x>0`$, so no vanishing gradient there</td>
<td>Dead neurons: a unit stuck at 0 has zero gradient and never recovers</td>
</tr>
<tr>
<td>Leaky ReLU</td>
<td>$`\max(\alpha x, x)`$</td>
<td>ReLU benefits, plus gradient on negative inputs: fixes dead neurons</td>
<td>One more hyperparameter $`\alpha`$ (PReLU learns it instead)</td>
</tr>
<tr>
<td>Softmax</td>
<td>$`e^{x_i}/\sum_j e^{x_j}`$</td>
<td>Sigmoid generalised to $`K`$ classes; outputs a distribution</td>
<td>Expensive for very large $`K`$ (LM vocabularies); output-layer only</td>
</tr>
</table>
## Smooth modern units
<table header-row="true">
<tr>
<td>Activation</td>
<td>Formula</td>
<td>Notes</td>
</tr>
<tr>
<td>GELU</td>
<td>$`x\cdot\Phi(x)`$ ($`\Phi`$ = Gaussian CDF)</td>
<td>Input weighted by its Gaussian probability: smooth, self-scaling; default in BERT/GPT-era transformers</td>
</tr>
<tr>
<td>SiLU / Swish</td>
<td>$`x\cdot\sigma(x)`$</td>
<td>Nearly identical curve to GELU; found by architecture search, empirically beats ReLU</td>
</tr>
</table>
Both are smooth ReLU-like curves with a small negative dip; empirically better than ReLU in transformers.
## Gated activations (GLU family)
Two parallel projections; one gates the other elementwise:
<table header-row="true">
<tr>
<td>Variant</td>
<td>Formula</td>
</tr>
<tr>
<td>GLU</td>
<td>$`(W_1 x) \odot \sigma(W_2 x)`$</td>
</tr>
<tr>
<td>GEGLU</td>
<td>$`(W_1 x) \odot \text{GELU}(W_2 x)`$</td>
</tr>
<tr>
<td>SwiGLU</td>
<td>$`(W_1 x) \odot \text{SiLU}(W_2 x)`$</td>
</tr>
</table>
- Pros: learned adaptive slope (the gate sets gradient strength per neuron), very expressive, stable training, balanced mean/variance.
- Cons: extra projection = more compute/params; FFN hidden dim is usually shrunk to $`\tfrac{2}{3}\cdot 4d`$ to keep parameter count matched.
- GEGLU and SwiGLU are the empirical state of the art for transformer FFNs; SwiGLU is the modern default (Llama, PaLM, Mistral, Qwen).
## Conclusions
- **Hidden layers**: ReLU family (SwiGLU/GELU in transformers).
- **Output layers**: task-dependent. Sigmoid for binary classification, softmax for multiclass, linear (no activation) for regression.
## Modern notes (2026)
- SwiGLU remains the near-universal choice in open LLMs; GELU (often tanh-approximated) persists in ViTs.
- Squared ReLU ($`\max(0,x)^2`$) shows up in some efficiency-focused LLMs (e.g. Primer-style stacks, some 2024-25 small models) as a cheap SwiGLU alternative.
## Cross-links
- Saturation and dead-ReLU debugging: <mention-page url="https://app.notion.com/p/3c65c17b0d0d8198857bd8347723ad70"/>
- Activation choice interacts with initialisation (Xavier vs He): <mention-page url="https://app.notion.com/p/3c65c17b0d0d81369e1cc38ed4e11d48"/>
</content>
</page>
