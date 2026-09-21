# Pretraining

⏱ 8 min read · +15h 35m resources

### Best resources

- [HuggingFace Ultra-Scale Playbook](https://huggingface.co/spaces/nanotron/ultrascale-playbook) (~8h): interactive book distilling 4000+ scaling experiments on up to 512 GPUs; covers memory anatomy, all parallelism strategies, and how to pick a configuration. The single best modern reference.
- [OLMo 2 blog](https://allenai.org/blog/olmo2) (~30 min) and [OLMo 3 blog](https://allenai.org/blog/olmo3) (~30 min): fully open recipes (data, code, checkpoints, logs); OLMo 3 adds a 9.3T-token Dolma 3 corpus and RL-Zero checkpoints.
- [Karpathy's nanoGPT](https://github.com/karpathy/nanoGPT) (repo, ~30 min for the core files) and [modded-nanogpt speedrun](https://github.com/KellerJordan/modded-nanogpt) (repo, ~30 min for the entry path): minimal GPT training and the community leaderboard that stress-tests every training trick.
- [How the NanoGPT speedrun WR dropped 20% in 3 months (LessWrong)](https://www.lesswrong.com/posts/j3gp8tebQiFJqzBgg/how-the-nanogpt-speedrun-wr-dropped-by-20-in-3-months) (~35 min): what actually moves the loss curve.
- Papers: [Scaling Laws for Neural Language Models](../../papers/2020-01_scaling-laws/summary.md), [Training Compute-Optimal Large Language Models (Chinchilla)](../../papers/2022-03_chinchilla/summary.md), [The Llama 3 Herd of Models](../../papers/2024-07_llama-3/summary.md), [2 OLMo 2 Furious (OLMo 2)](../../papers/2025-01_olmo-2/summary.md).

### Objective

Pretraining is self-supervised next-token prediction: maximise the log-likelihood of

each token given its prefix (cross-entropy loss over the vocabulary). Variants:

- **Causal LM** (GPT lineage): the universal choice for generative LLMs.
- **Masked LM** (BERT): predict masked tokens; better for encoders, not generation.
- **Span corruption / UL2**: T5-style denoising; mostly historical for LLMs now.
  What the objective actually does is sample 15% of tokens, replace

  each contiguous run of them with a single sentinel token unique to that example, and

  train the decoder to emit only the dropped spans, each prefixed by its sentinel. The

  difference from BERT's masked LM is the target: you predict the missing text rather

  than reconstruct the whole sequence, so decoder sequences stay short and a step is

  cheaper. **UL2 (Unifying Language Learning)** generalised this into a mixture of

  denoisers, varying corruption rate and span length and prefixing each example with a

  mode token so one model learns short-span denoising, long-span denoising and prefix

  LM at once. Still the default when you pretrain an encoder-decoder; see

  [Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer (T5)](../../papers/2019-10_t5/summary.md) (11 min read · +4h 12m resources).

- **Fill-in-the-middle (FIM)**: rearrange (prefix, middle, suffix) so a causal model
  learns infilling; standard for code models.

Loss is reported as per-token cross entropy or perplexity; downstream ability tracks

loss smoothly (which is what makes scaling laws work).

**How much the choice of objective is worth, measured.** T5 ran the

comparison properly, holding architecture, data, compute and evaluation fixed and moving

only the objective. The finding that matters is the shape of the result rather than the

numbers: the gap between objective *families* is large (denoising beats causal LM beats

deshuffling, and a plain causal LM trails badly on understanding tasks, GLUE 74.70 against

83.28), while the gap *within* the denoising family is close to nothing. BERT-style masking,

MASS-style masking, sentinel replacement and outright token dropping all land within noise of

each other; corruption rates of 10%, 15% and 25% are indistinguishable and only 50% hurts;

mean span lengths of 2, 3 and 5 are indistinguishable and 10 is slightly worse. The practical

conclusion, and the reason this section is short rather than long: pick a denoising variant on

computational cost, not on quality, and do not expect further tuning in this space to pay.

The same paper is also why the field's architecture default is worth knowing as a measured

result and not a habit, since at matched compute the encoder-decoder beat the decoder-only

prefix LM and the field went decoder-only anyway, for reasons about in-context learning and

serving cost that the comparison did not test.

### Scaling laws

- **Kaplan et al. 2020**: loss follows power laws in model size N, dataset size D,
  and compute C; concluded you should scale N faster than D. See [Scaling Laws for Neural Language Models](../../papers/2020-01_scaling-laws/summary.md).

- **Chinchilla (Hoffmann et al. 2022)**: fixed Kaplan's learning-rate-schedule
  artefact; compute-optimal training scales N and D equally, roughly

  **D ~ 20 tokens per parameter** at a given compute budget. Chinchilla (70B, 1.4T

  tokens) beat Gopher (280B) at equal compute. See [Training Compute-Optimal Large Language Models (Chinchilla)](../../papers/2022-03_chinchilla/summary.md).

- **Post-Chinchilla practice**: everyone deliberately "overtrains" far past
  compute-optimal (Llama 3 8B: ~1,875 tokens/param) because inference cost dominates

  the lifetime economics; a smaller model trained longer is cheaper to serve.

- Loss curves are also used prescriptively: fit a scaling law on small runs, then
  predict the big run's loss and pick hyperparameters (muP / muTransfer makes LR and

  init transfer across widths; used by many 2024+ labs).

### Data and curriculum

Modern pretraining is multi-stage, not one homogeneous pass:

1. **Stage 1 (bulk, ~90% of tokens)**: filtered web (FineWeb/DCLM-style), code,
   papers. OLMo 2 uses OLMo-Mix (~3.9T tokens from DCLM, Dolma, Starcoder,

   Proof Pile II).

2. **Mid-training / anneal**: as LR decays, up-weight high-quality data (curated
   math, instruction-like text, synthetic data). OLMo 2's Dolmino mix during the

   anneal gives outsized benchmark gains; Llama 3 does similar.

3. **Long-context extension**: short-context pretraining for most tokens, then a
   final phase at 32k-128k+ with upsampled long documents and RoPE rescaling

   (see [Positional Encodings](positional-encodings.md)).

Data quality work (dedup, filtering, mixing) lives in

[Topic: data-curation-and-datasets](../data-curation-and-datasets/summary.md). Key idea: data mixture is now the main open

lever; architecture is largely converged (pre-norm decoder, RMSNorm, SwiGLU, RoPE,

GQA; MoE for the compute-rich).

### Current open recipes (2026)

- **OLMo 2 / OLMo 3 (Ai2)**: the gold standard for full openness: data, code,
  intermediate checkpoints, training logs. OLMo 2 32B trained to 6T tokens,

  post-trained with Tulu 3.1. OLMo 3 (7B/32B) adds an explicit "model flow":

  base -> think/instruct variants with RL-Zero checkpoints released.

- **SmolLM3 (HuggingFace)**: 3B model with the full engineering blueprint published
  (architecture ablations, 11T-token data mixture, post-training); the companion

  [Smol Training Playbook](https://huggingface.co/spaces/HuggingFaceTB/smol-training-playbook) (~5h)

  documents the decisions.

- **nanoGPT speedrun lineage**: Karpathy's nanoGPT -> llm.c -> Keller Jordan's
  modded-nanogpt. Community record for GPT-2 (124M) quality fell from 45 min

  (8xH100) to under 2.5 minutes by late 2025. Innovations that graduated to real

  training runs: the **Muon optimizer** (orthogonalised momentum, now used in

  frontier-scale runs like Kimi K2), untied embeddings tweaks, careful init,

  FlexAttention with sliding windows, value-embedding skip connections.

- **Semi-open reports** worth reading: [The Llama 3 Herd of Models](../../papers/2024-07_llama-3/summary.md) (data mix, scaling, infra failures), [DeepSeek-V3 Technical Report](../../papers/2024-12_deepseek-v3/summary.md) (fp8 training, MoE at scale), [Qwen3 Technical Report](../../papers/2025-05_qwen3/summary.md).

### Practical notes (what matters in a run)

- **Batch size**: use the critical batch size heuristic; ramp batch size during
  training (common in 2025+ recipes) rather than fixing it.

- **LR schedule**: warmup + cosine is classic; WSD (warmup-stable-decay) is now
  popular because you can branch anneals off the stable plateau without committing

  to a total token count. The full family comparison (shapes,

  cooldown length and curve, decay-free options like schedule-free and WSM) lives in

  [Optimisers and learning-rate schedulers](../ml-fundamentals/optimisers-and-schedulers.md).

- **Stability**: z-loss or logit soft-capping, QK-norm (OLMo 2 moved to QK-norm +
  reordered norms specifically for stability), bf16 with fp32 master weights,

  gradient clipping at 1.0, watch for loss spikes correlated with bad data shards.

- **Eval during training**: track a fixed loss eval suite plus few-shot benchmarks
  at checkpoints; loss on held-out high-quality sets predicts downstream better

  than train loss.
