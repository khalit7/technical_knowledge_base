# Normalisation, residuals and stability: verified facts (also appended to the topic's shared FACTS.md under "ns")

## Published, read 2026-10-19
- Xiong et al. 2020, "On Layer Normalization in the Transformer Architecture" (arXiv 2002.04745): post-norm's expected
  gradients near the output are large at initialisation, warmup "practically helpful"; pre-norm gradients
  "well-behaved at initialization", warmup removable (as quoted and checked on the ML-fundamentals Normalisation page,
  2026-10-03; Theorem 1, Lemma 2).
- Zhang and Sennrich 2019, RMSNorm (arXiv 1910.07467, NeurIPS 2019) abstract: "re-centering invariance in LayerNorm is
  dispensable"; "RMSNorm achieves comparable performance against LayerNorm but reduces the running time by 7%~64% on
  different models."
- Dehghani et al. 2023, ViT-22B (arXiv 2302.05442) section 2 "QK Normalization": "we observed divergent training loss
  after a few thousand steps"; "observed for models with around 8B parameters"; "caused by extremely large values in
  attention logits", "(almost one-hot) attention weights with near-zero entropy"; fix "applies LayerNorm to the queries
  and keys before the dot-product attention computation" (after Gilmer et al.); "all LayerNorms were applied without
  bias and centering".
- Wortsman et al. 2023, "Small-scale proxies for large-scale Transformer training instabilities" (arXiv 2309.14322 v2,
  2023-10-16): instabilities "also appear in small models when training at high learning rates"; attention logit
  growth: "the attention weights collapse to one-hot vectors", fixed by qk-layernorm (section 3.1.1); output logit
  divergence, "logits diverge and become very negative", z-loss log^2 Z "with coefficient 1e-4" (3.1.2); LR sensitivity
  = expected deviation of final loss from optimal over LR range 3e-4 to 3e-1 (2.2); "a longer warm-up period reduces LR
  sensitivity" (3.2.1); independent weight decay reduces LR sensitivity (3.2.2); muParam stabilises the optimal LR but
  "does not improve loss or reduce LR sensitivity" (3.2.4); AdamW default epsilon too large at scale, 1e-15 better at
  4.8B (3.4); predicted 4.8B unstable at LR 1e-2 and it diverged; "all points with attention logits above 1e4 diverged"
  (3.3).
- PaLM (Chowdhery et al. 2022, arXiv 2204.02311) section 5: "auxiliary loss of z loss = 10^-4 . log^2 Z to encourage the
  softmax normalizer log(Z) to be close to 0, which we found increases the stability of training"; global-norm
  clipping 1.0. Section 5.1: "spikes in the loss roughly 20 times during training, despite the fact that gradient
  clipping was enabled"; "not observed when training the smaller models"; restart "roughly 100 steps before the spike"
  and skip "roughly 200-500 data batches" (PDF prints an en dash); "spikes only occur due to the combination of specific
  data batches with a particular model parameter state". Read from the PDF with pdftotext.
- Gemma 2 report (arXiv 2408.00118) section 2: "We cap logits ... in each attention layer and the final layer";
  logits <- soft_cap * tanh(logits / soft_cap); "soft_cap parameter to 50.0 for the self-attention layers and to 30.0
  for the final layer"; RMSNorm "to normalize the input and output of each transformer sub-layer".
- Gemma 3 report (arXiv 2503.19786) section 2: "we replace the soft-capping of Gemma 2 with QK-norm" (quoted and
  checked on the ML-fundamentals Normalisation page).
- Sun et al. 2024, "Massive Activations in Large Language Models" (arXiv 2402.17762 v2, 2024-08-14): LLaMA2-7B largest
  activation about 2,000 (Table 1: 2622.0) "approximately 10,000 times larger than the median magnitude (about 0.2)";
  appear from layer 2, "nearly constant values until layer 30"; at the starting token and the first period or newline;
  two dimensions (1415 and 2533); setting them to zero: perplexity inf, zero-shot 68.95% to 36.75%; to their mean:
  negligible change (WikiText 5.47); GPT-2 with explicit attention biases: "massive activations disappear" (4.3).
- Zhai et al. 2023, "Stabilizing Transformer Training by Preventing Attention Entropy Collapse" (arXiv 2303.06296 v2):
  low attention entropy ("entropy collapse") coincides with instability; sigma-Reparam (spectral normalisation of
  every linear layer plus a learned scalar); entropy lower bound falls exponentially with the spectral norm of the
  attention logits.
- Kim et al. 2025, Peri-LN (arXiv 2502.02732 v3, 2025-06-06): Post-LN y = Norm(x + F(x)), Pre-LN y = x + F(Norm(x)),
  Peri-LN y = x + Norm(F(Norm(x))) plus a final norm (embedding norm optional, omitted in their runs); Table 1 loss /
  average: 400M Post 7.46 / 42.45, Pre 3.43 / 49.69, Peri 3.34 / 51.57; 1.5B Post 5.38 / 45.49, Pre 3.29 / 53.71, Peri
  3.18 / 56.55; 3.2B Post 4.43 / 46.45, Pre 3.20 / 56.69, Peri 3.11 / 58.56; five seeds, diverged runs excluded,
  "mostly occurs in Pre-LN" (4.5); Pre-LN hidden states pass the FP16 maximum "as early as 0.5B training tokens" (7.2).
- Takase et al., "Spike No More" (arXiv 2312.16903 v4, COLM 2025): conditions "small sub-layers and large shortcut";
  Scaled Embed (embeddings x sqrt(d)) or Embed LN; Vanilla spiked at 350M and 1.7B ("loss value exploded at about 13000
  steps" at 1.7B), failed at 13B lr 3e-4 and 1.7B lr 1e-3.
- DeepSeek-V3 technical report (arXiv 2412.19437) section 4.2: "All learnable parameters are randomly initialized with
  a standard deviation of 0.006"; "additional RMSNorm layers after the compressed latent vectors"; abstract: "we did not
  experience any irrecoverable loss spikes or perform any rollbacks". Its config.json says initializer_range 0.02 (the
  config value is a library default, not the training init).
- OLMo 2 (arXiv 2501.00656), checked on the OLMo 2 paper page: reordered norm x + Norm(F(x)) and QK-norm together
  (gradient-norm spike score 0.108 to 0.069), neither alone; N(0, 0.02) init (0.40 to 0.03); z-loss 1e-4; AdamW eps 1e-8
  instead of 1e-5; no weight decay on embeddings (0.16 to 0.092); spike score = share of values at least 7 standard
  deviations from a rolling average of the last 1,000.
- GPT-2 (Radford et al. 2019) section 2.3: residual-layer weights scaled by 1/sqrt(N) at init; transformers v5.20.1
  modeling_gpt2.py:449 `std = initializer_range / math.sqrt(2 * n_layer)` for c_proj.
- muP (Yang et al. 2022, arXiv 2203.03466): hyperparameters transfer across width; "transferring from 40M parameters,
  we outperform published numbers of the 6.7B GPT-3 model, with tuning cost only 7% of total pretraining cost" (checked
  on the ML-fundamentals Normalisation page).
- Configs (root src/data/configs and src/map/inputs/configs, read 2026-10-19): Gemma 2 9B and 27B attn_logit_softcapping
  50.0, final_logit_softcapping 30.0; Gemma 3 both null; Gemma 4 31B final_logit_softcapping 30.0; use_qk_norm true in
  Llama 4 Scout, GLM-4.5, MiniMax-M2, MiniMax-M3, false in Llama 4 Maverick and GLM-4.5-Air; MiniMax-M1 postnorm true;
  Qwen3 and OLMo 2 apply QK-norm in code with no config switch; initializer_range 0.02 in almost every config, SmolLM2
  0.0417, Granite 4.0-H and Mamba 0.1; rms_norm_eps 1e-6 (Qwen, DeepSeek, Gemma, OLMo, Kimi K2) or 1e-5 (Llama, Mistral,
  gpt-oss).
- transformers v5.20.1 (commit 0ea877911a), located by pattern (out/code_refs.json): LlamaRMSNorm forward upcasts to
  float32 (modeling_llama.py:61-66); Qwen3 q_norm/k_norm per head before RoPE (modeling_qwen3.py:229-230, 244-245);
  OLMo 2 q_norm over all heads at once (modeling_olmo2.py:213-214), output norm before the residual add (307-308,
  313-314); Gemma 3 RMSNorm multiplies by (1 + weight) (modeling_gemma3.py:148) and norms around both sub-layers
  (409-413); Gemma 2 softcap in eager attention (modeling_gemma2.py:195-198) and on the final logits (519-522), config
  defaults 30.0 and 50.0 (configuration_gemma2.py:90-91).
## Also appended to FACTS.md: published / code, checked 2026-10-19 (full list with quotes in the child's src/facts.md)
- MiniMax-M1 config postnorm true, layernorm_*_alpha 3.5565588 with 80 layers = (2 x 80)^(1/4): DeepNorm; transformers v5.20.1 minimax/modeling_minimax.py:572 `residual * self.attn_alpha_factor + hidden_states * self.attn_beta_factor` (the residual is the normed input).
- DeepSeek-V4 (transformers deepseek_v4, config hc_mult 4, hc_sinkhorn_iters 20): mHC, 4 residual streams mixed by a Sinkhorn-projected doubly stochastic matrix (modeling_deepseek_v4.py:976-979, 1175-1179), pre-norm RMSNorm inside. mHC paper arXiv 2512.24880: HC composite gain "peaks of 3000", loss surge "around the 12k step" (27B); mHC 6.7% overhead at n = 4.
- Gemma 4 RMSNorm multiplies by plain weight (modeling_gemma4.py:222; Gemma 1-3 and Qwen3-Next use 1 + weight); Gemma 4 31B final_logit_softcapping 30.0, no attention softcap, q_norm/k_norm per head.
- DeepSeek-V3 report section 4.2: init std 0.006 for all parameters; config initializer_range 0.02 (library default).
- PaLM section 5: z loss = 1e-4 log^2 Z; section 5.1 spikes "roughly 20 times", restart ~100 steps before, skip ~200-500 batches.
- Wortsman et al. 2023 section 3.3: "all points with attention logits above 1e4 diverged".
- torch 2.14.1 nn.RMSNorm(eps=None) uses float32 machine epsilon (1.19e-7), not the 1e-5/1e-6 of configs.
## Measured here (Apple M1 Pro; outputs in the child's src/out)
- ns_train.py (train.py loop + probe) reproduces bl_pre_lr3e-3: 2.2788 (Block lab 2.2811).
- Pre-norm lr 3e-2, no clipping: largest attention logit 20,865 at step 510, lowest layer entropy 0.004 nats, held-out 4.295 (no NaN); same with QK-norm 2.432 (largest logit 69.9); with z-loss 1e-4 4.289 (z-loss does not stop attention-logit growth); Block lab's clipped run 4.361 (clipping does not fix it). Healthy lr 3e-3 peak logit 58.2.
- Trained reference tiny GPT (LayerNorm): |mean| / RMS of stream rows median <= 0.015; LayerNorm -> RMSNorm at inference changes running-sequence loss 1.95631 -> 1.95632. Final norm dropped 3.493; gains - 1 8.496; eps 1.0 7.720.
- Init-time median token norm (running sequence): pre 0.449 -> 1.41 (GPT-2 init), 5.18 flat init; post 16.0; sandwich 56.0; output norm 53.2 (derived 16 sqrt 12 = 55.4).
- Placements (held-out, 1,500 steps, seed 0): sandwich 2.501 / 3.324 / 3.389 at lr 3e-3 / 1e-2 / 3e-2 (largest attention logit 240 at 3e-3); output norm (OLMo 2) 3.405 / 3.763 / 3.605 (largest logit 5,693 at 3e-3: nothing normalises the attention input); post-norm + QK-norm 3e-3 6.011 (unigram; QK-norm does not rescue post-norm); pre + QK-norm 2.273 / 2.302 / 2.476; post lr 1e-3 rerun 2.561 (Block lab 2.534).
- LayerNorm vs RMSNorm, lr 3e-3, seeds 0 / 1: 2.279 / 2.260 vs 2.275 / 2.256 (no difference beyond seed spread). On MPS (torch 2.14.1) RMSNorm forward+backward is 2.3x to 9.1x SLOWER than LayerNorm (no fused kernel; nn.RMSNorm = hand-written speed); whole run 383 s vs 323 s.
- Flat init (no 1/sqrt(2L)) 2.267 vs 2.279 (seed spread 0.019): no effect at 6 layers. Attention softcap 50 at lr 3e-2 no clipping: 2.845 (vs 4.295 none, 2.432 QK-norm). Gradient-norm spike counts (7 sigma, window 100): none 9, z-loss 9, cap 5, QK-norm 0, default lr 1; no loss spikes.
- With QK-norm added at lr 3e-3: output norm 3.405 -> 2.506, sandwich 2.501 -> 2.396 (OLMo 2 and Gemma 3 pair these placements with QK-norm). CPU (4 threads) RMSNorm fwd+bwd 2.0x to 4.3x slower than LayerNorm in torch 2.14.1 too.
