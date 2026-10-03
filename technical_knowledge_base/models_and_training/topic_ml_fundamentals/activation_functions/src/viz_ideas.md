# Visualisation ideas: Activation functions (2026-10-03)

Central question: **what does the nonlinearity do to the signal and to the gradient, and what does it actually output in trained networks?**

Already on the parent root (linked by tab name, not rebuilt): step 2 "one batch through five networks" (sigmoid/Xavier, ReLU 1/n, ReLU He, BatchNorm residual, pre-RMSNorm SwiGLU, per-layer variance and gradient); thread 2 (variance pact); Training lab (six activations swapped live); Defaults across models (activation and FFN width of 21 models); When training goes wrong (dead-ReLU plateau with biases at -3, blow-up then dead). Attention Is All You Need's Then and now tab owns the ReLU-to-SwiGLU block morph; Sampling and Decoding's Sampler lab owns temperature on real logits.

Scores: quantity the reader moves (0-2), reproduces a published figure (x2), computable from public data (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, animation against the method it replaced; minus build cost.

| # | Idea | Score | Data and formulas | Placement | Status |
|---|---|---|---|---|---|
| AF1 | **One real token through a plain GELU block and a SwiGLU block, animated** (GPT-2 layer 6 against SmolLM2-135M layer 15, " cat"), widths to scale in units of d, weight matrices to scale (8d² both), gate-function switch (GLU, ReGLU, GEGLU, bilinear on the same pre-activations, labelled illustrative), counters (parameters, multiply-adds, near-zero and negative shares) | 14 | real_models.py forward hooks; GELU and gate products recomputed in JS; Shazeer's 2/3 rule | Reading, Gated units | built |
| AF2 | **Dead units in a real trained network, epoch by epoch**: 384 units of a digits MLP at rate 0.04, 0.08 and leaky 0.08; dead units appear, revive (69 to 43), then a whole layer dies; leaky overflows instead | 13 | dead_relu_toy.py (PyTorch, 5 seeds x 10 rates x 2 activations) | Reading, Dead units | built |
| AF3 | **Learning-rate sweep of dead units**, 100 runs, collapsed and overflowed runs marked | 10 | same | Reading, Dead units | built |
| AF4 | **Activation atlas**: 14 functions and derivatives, saturated (|f'| < eps) and dead (f' = 0) regions shaded, hover readout; normal-input table with variance-preserving gain against torch calculate_gain | 12 | JS checked against torch.nn.functional and autograd (129 checks); reproduces He's sqrt 2, leaky formula and SELU's fixed point independently; tanh 5/3, sigmoid 1, SELU 3/4 shown as PyTorch's heuristics | Own tab | built |
| AF5 | **Inside real models**: OPT-125m, GPT-2, SmolLM2-135M on 283k to 302k WikiText-2 tokens, per layer: near zero (movable threshold), negative, never on (movable activity floor), per-unit activity histogram | 12 | real_models.py; checks Voita et al. qualitatively (dead neurons in OPT's first half) and Mirzadeh et al.'s 90% (OPT-125m: 89.2% in layer 1, 91.3 to 98.8% elsewhere) | Own tab | built |
| AF6 | Shazeer Table 1 to 3 bars with run-to-run spread | 8 | transcribed from the paper's printed tables | Reading, Gated units | built |
| AF7 | 2/3 rule table: Llama's rounding rule against six config.json files, plus departures (PaLM 4d, Gemma, Qwen, Mistral) | 9 | llama/model.py, llama-models sku_list.py, HF configs; all six reproduce independently | Reading, The 2/3 rule | built |
| AF8 | Softmax temperature widget | | | none | rejected: Sampling and Decoding's Sampler lab does it on real logits; linked |
| AF9 | Output-layer chooser quiz | | | none | rejected: a static table says it faster |
| AF10 | Train toy transformers with each GLU variant to redo Shazeer | | | none | rejected: differences of 0.01 to 0.05 nats would drown in seed noise at toy scale; the paper's table with its spread is shown instead |
| AF11 | Per-layer variance through 16 layers for each activation | | | none | rejected: the parent's "one batch through five networks" owns it; the atlas table gives the one-layer factors |
| AF12 | Qwen2.5-0.5B or a Llama as a fourth real model | | | none | rejected for budget: SmolLM2 already covers SwiGLU; noted as an easy extension in real_models.py |

What the methodology lacked here: a rule for "real data from a released model" when the claim is qualitative (Voita's per-layer values exist only as a plot): measure the same quantity on the smallest family member, say "qualitatively", and never read the curve.
Rule proposed: when a failure mode has two symptoms (dead network or overflow), show both arms of the same sweep; the activation often decides only which symptom appears.
