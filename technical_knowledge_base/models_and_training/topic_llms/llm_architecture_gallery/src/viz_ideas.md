# Visualisation ideas: LLM Architecture Gallery and the architectural deltas that matter

Central question: for a given token and context, how many bytes does each architectural choice make a model keep and read, and what does it give up for that? Everything on the page (attention variant, window layout, recurrence, position scheme, normalisation) either moves that number or keeps the model trainable while it is moved.

Existing visual on the page: an older embedded HTML (replaced by this one). Outbound sources used first: Raschka's gallery and its `models.yml` (Apache 2.0), his KV-cache calculation notes, config.json files for 92 models, GQA, DeepSeek-V2, Gemma 3, Gated DeltaNet, Kimi Linear and YaRN papers.

Scoring (0 to 2 each; reproduce and computable count double; +1 for a before/after animation; minus build cost).

| # | Idea | Data and formula | Reproduces | Score | Placement | Status |
|---|---|---|---|---|---|---|
| 1 | Attention ladder animation: one token at one layer, same 32-query-head shape and the same 16-token context, run for MHA, GQA, MQA, MLA, sliding window, Gated DeltaNet and KDA; MHA's row drawn dashed behind every other variant; one cell = one KV head (256 numbers); steps arrive, project, store, read, scale to 128K | `2 H_kv d_h`, `d_c + d_R`, `H d_k d_v` state; shapes from Llama 3.1 8B, DeepSeek V3, Qwen3-Next and Kimi Linear configs | 8,192 / 2,048 / 256 / 576 numbers per token per layer; 2 GiB, 512 MiB, 64 MiB, 144 MiB per layer at 128K; state 524,288 numbers = 1 MiB; state equals MHA cache at 64 tokens, GQA at 256 | 17 | Reading, attention section | built |
| 2 | Architecture comparison from config.json (92 models), per-layer strips (mixer, FFN, position), KV per token computed against the gallery's figure, KV-per-token-over-time scatter, pick-two diff | gen_data.py over src/configs; gallery models.yml | 84 of 86 gallery figures matched independently; MiMo-V2-Flash and V2.5 differ (shown with both arithmetic) | 17 | Own tab | built |
| 3 | Cache at context across models: KV memory per request against context (log-log), windows credited or not (gallery convention dashed), optional fixed recurrent state, concurrency and memory budget | `sum_layers per-layer bytes x min(T, W_layer)`; state from config | Llama 3.1 70B 40 GiB at 128K; Gemma 3 27B 10.4 vs 62 GiB; gpt-oss-120b 4.5 GiB; Qwen3-Next 3 GiB plus 36 MiB state | 16 | Own tab | built |
| 4 | Local/global layer strip with context slider (Gemma 3 27B default, five other models) | per-layer codes from config | 10 GiB + 416 MiB = 10.4 GiB against 62 GiB; 83 KiB effective; gpt-oss 36 KiB effective | 15 | Reading, sliding windows | built |
| 5 | RoPE dial plus frequency bands with YaRN ramp | `theta_i = base^(-2i/d)`, YaRN r = L/lambda, alpha 1, beta 32 | dot 0.5403 at any shift; pair 0 every 6.3 tokens, pair 63 every 2.56M; gpt-oss 9 kept / 9 ramp / 14 interpolated, temperature factor 1.347 | 14 | Reading, positional encoding | built |
| 6 | RMSNorm vs LayerNorm on an editable vector plus norm-placement switch (pre, post, OLMo 2, Gemma 3) | page formulas | (0.365, 0.730, 1.095, 1.461) and (-1.342, -0.447, 0.447, 1.342) | 11 | Reading, normalisation | built |
| 7 | KV calculator with presets | `2 L H_kv d_h b x T x N` | 320 KiB, 40 GiB, 320 GiB (Llama 3.1 70B) | 12 | Reading, KV formula | built |
| 8 | GQA head map alone | `g(i)` | heads 0-3 to KV head 0 | 8 | folded into 1 (GQA step 4 draws it) | merged |
| 9 | MLA absorption detail, DSA indexer funnel, V4.1-Flash strip, Qwen and Zhipu hybrids, Mistral sliding window | | | | owned by lab pages (DeepSeek, Qwen, Zhipu, Kimi, Mistral) | rejected here (linked) |
| 10 | Copy of Raschka's diagrams | images | | | none | rejected (his figures, and images only) |
| 11 | MoE routing animation | | | | owned by the MoE page | rejected (linked) |
| 12 | Looped transformer / encoder-decoder visual | no weights or measurements published for the loop spec | | | text only | rejected |

Inspiration: Raschka's gallery cards and diff tool (layout of side-by-side fields, not copied), DeepSeek page MLA explainer (animation mechanics reused from deepseek/v3/parts/18_js_mlx.js).

What the methodology lacked: a rule for checking a third-party table at scale. Recomputing all 86 gallery figures from configs found two disagreements (MiMo-V2-Flash and V2.5: config gives 217.5 KiB, gallery 144 KiB, which reconstructs as 4 KV heads of 192 for K and V in all 48 layers). Suggested rule: when a page leans on a curated table, recompute every row, publish the match count, and show each mismatch with both arithmetics.
