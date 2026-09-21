# Scaling Laws for Neural Language Models

⏱ 8 min read · +~4h resources

- **Authors/lab**: Kaplan, McCandlish (equal contribution), Henighan, Brown, Chess, Child, Gray, Radford, Wu, Amodei (OpenAI / Johns Hopkins)
- **Date**: January 2020
- **Links**: [arXiv:2001.08361](https://arxiv.org/abs/2001.08361) (~1h 30m, long paper)

### Best resources

- [Scaling Laws, Carefully](https://lilianweng.github.io/posts/2026-06-24-scaling-laws/) (Lilian Weng) (~50 min): modern end-to-end treatment of the scaling-law literature, from Kaplan through Chinchilla to current practice, with the fitting pitfalls spelled out.
- [Scaling Laws for LLM Pretraining](https://www.jonvet.com/blog/llm-scaling-laws) (Jonas Vetterle) (~25 min): accessible walkthrough of the Kaplan and Chinchilla papers side by side, good for building intuition before running a sweep.
- [Resolving Discrepancies in Compute-Optimal Scaling of Language Models](https://arxiv.org/abs/2406.19146) (Porian et al., 2024) (~45 min): the forensic reconciliation of Kaplan vs Chinchilla; identifies exactly which methodological choices moved the exponents.
- [Chinchilla's wild implications](https://www.lesswrong.com/posts/6Fpvch8RR29qLEWNH/chinchilla-s-wild-implications) (nostalgebraist) (~30 min): what the revised laws imply about data as the binding constraint; useful counterpoint to this paper's "big models over big data" conclusion.

### Problem

In early 2020 nobody could say quantitatively how language model loss would improve if you spent 10x more compute, nor how to split that spend between a bigger model, more data, and longer training. Architecture papers tuned shape (depth, width, heads) at fixed scale; nobody had mapped the loss surface across orders of magnitude in model size N, dataset size D, and compute C, or answered the budget-allocation question: given fixed C, what N, D, batch size, and step count minimize loss?

### Method

Train a large family of decoder-only Transformers on WebText2 (22.9B BPE tokens, vocab 50257, context 1024) and fit power laws to the test loss (cross-entropy in nats/token). The sweep: N from 768 to 1.5B non-embedding parameters, D from 22M to 23B tokens, plus variations in depth/width/heads, context length, and batch size; LSTMs trained for comparison. Two accounting choices turn out to be load-bearing:

- **N counts non-embedding parameters only**, N ~= 12 n_layer d_model^2. Including the embedding matrix obscures the trends (depth appears to matter when it does not).
- **C ~= 6NBS** non-embedding FLOPs (2N per token forward, 4N backward) with B the batch size and S the number of steps; equivalently C ~= 6ND for one epoch.
Key fitted forms (WebText2, BPE; the constants N_c, D_c, C_c are tokenizer-dependent, the exponents are the transferable content):

- **Model size** (trained to convergence, unlimited data): L(N) = (N_c/N)^0.076, N_c ~= 8.8e13 params. Doubling N multiplies loss by 2^-0.076 ~= 0.95.
- **Data** (large model, early stopping): L(D) = (D_c/D)^0.095, D_c ~= 5.4e13 tokens.
- **Compute** (optimal N, batch below critical): L(C_min) = (C_c/C_min)^0.050, C_c ~= 3.1e8 PF-days.
- **Joint N, D law**: L(N,D) = [(N_c/N)^(a_N/a_D) + D_c/D]^a_D with a_N = 0.076, a_D = 0.103. This one equation captures overfitting: the loss penalty depends only on the ratio N^0.74/D, so to hold overfitting below run-to-run noise you need **D >~ 5e3 * N^0.74** tokens.
- **Training curves**: L(N,S) = (N_c/N)^a_N + (S_c/S_min)^a_S with a_S ~= 0.76, S_c ~= 2.1e3; lets you extrapolate final loss from the early curve after the warmup transient.
- **Critical batch size** depends only on the loss reached, not on N: B_crit(L) ~= B_star/L^(1/a_B), B_star ~= 2e8 tokens, a_B ~= 0.21 (roughly 1-2M tokens near convergence). Below B_crit you are compute-efficient; above it you buy wall-clock time with wasted FLOPs.
From L(N, S_min) they derive the compute-optimal allocation: N ~ C_min^0.73, B ~ C_min^0.24, S ~ C_min^0.03, D ~ C_min^0.27. In words: a 10x compute increase should go about 5x into model size and only about 2x into data, with serial steps nearly flat. Model shape is a second-order effect: at fixed N, varying aspect ratio 40x moves loss only a few percent.

### Results

- Loss is a smooth power law in each of N, D, C_min across six to eight orders of magnitude, with no deviation at the top end; shape and hyperparameters barely matter next to scale.
- Larger models are strictly more sample-efficient: they reach any target loss in fewer steps and fewer tokens.
- Compute-efficient training therefore means training very large models and **stopping far short of convergence**, the opposite of the then-standard practice of converging small models.
- Transfer to other distributions (Books, Wikipedia, Common Crawl) tracks WebText2 validation loss with a roughly constant offset, so in-distribution loss is a good proxy for general capability.
- Extrapolated far enough, L(C_min) and the data-limited bound L(D(C_min)) intersect at roughly C* ~ 1e4 PF-days, N* ~ 1e12 params, L* ~ 1.7 nats/token, which they flag as where the laws must break down (or where the model has extracted all reliable information from language).

### Why it matters

This paper made scale a quantitative engineering discipline: it justified GPT-3 (trained "significantly short of convergence" per these prescriptions), established loss-vs-compute extrapolation as the planning tool for every subsequent frontier run, and popularized C ~= 6ND, critical batch size, and power-law fitting as standard vocabulary.

Its headline allocation, however, was later revised. **Chinchilla (Hoffmann et al., 2022) redid the sweep with the learning-rate schedule matched to each run's length and found N_opt ~ C^0.5, D_opt ~ C^0.5**: parameters and tokens should scale equally, settling near D ~= 20N tokens per parameter, versus Kaplan's N ~ C^0.73, D ~ C^0.27. The practical consequence was dramatic: Gopher-class models were roughly 4x oversized, and 70B Chinchilla trained on 1.4T tokens beat 280B Gopher at equal compute. The discrepancy is now well understood (Hoffmann et al.; Porian et al. 2024): Kaplan's runs used a fixed 2.5e5-step schedule and fixed warmup regardless of run length (undertraining the small models and flattering large N), counted only non-embedding parameters and FLOPs (which distorts fits at small scale, where embeddings are a large fraction), and did not retune optimizer hyperparameters across scales. Correcting these moves the allocation exponent from ~0.73-0.88 down to ~0.5. For planning a sweep today: use Chinchilla-style D ~= 20N as the compute-optimal starting point (or overtrain well past it when inference cost matters, as Llama-style models do), always decay the LR to near zero exactly at the planned token budget, and fit on total parameters. Kaplan's other findings (power-law form of the loss, shape insensitivity, sample efficiency of large models, critical batch size, the L(N,D) overfitting law) survived the revision and remain the working toolkit.

### Connections

- Chinchilla (2022): the direct successor; revises the compute-optimal allocation to equal N and D scaling (~20 tokens/param).
- GPT-3 (2020): the first frontier model built on these prescriptions (large N, one epoch, stopped short of convergence).
- Attention Is All You Need (2017): the architecture whose parallelism made these compute scales reachable.
- Llama 3 (2024) and DeepSeek-V3 (2024): the modern regime of deliberately overtraining far beyond compute-optimal to cheapen inference.
- Topics: `topics/llm-training-and-post-training` (pretraining, batch size, LR schedules), `topics/data-curation-and-datasets` (data requirements and scaling), `topics/ml-fundamentals` (power-law fitting, overfitting).
