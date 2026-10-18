# Coverage of the 2026-10-01/02 build (the floor), and corrections

The old page's text was read from its parts (backed up before the rebuild; also in git history before this rebuild). Each
claim is carried (where), moved to the sibling that now owns it (linked from the page), or dropped (why).

## Carried
| Old claim or section | Where now |
|---|---|
| What the gallery is, its fields, models.yml under Apache 2.0, "first stop when a model drops" | Reading 1 |
| The gallery's KV convention (logical cache, bf16, windows at full cost, linear layers 0 B, state outside) | Reading 1, quoted from the KV notes (re-read 2026-10-18) |
| KV formula and the Llama 3.1 70B worked example (320 KiB, 40 GiB, 320 GiB for 8; MHA counterfactual 2,560 KiB) | Reading 6, mistakes, Cache tab defaults |
| Attention ladder animation, its captions and step-5 numbers | Reading 5 (ported unchanged) |
| MLA worked example DeepSeek-V3 68.6 KiB, 57 times smaller than MHA at its shape | Reading 6 (68.6 KiB; the ratio is on the ladder caption) |
| Windows: formula, Gemma 3 27B (416 MiB + 10 GiB = 10.4 GiB against 62 GiB, 83 KiB effective), gpt-oss-120b (72 to 36 KiB, 4.5 GiB) | Reading 2 (drill), 7, Cache tab |
| Trained sparse: selection cuts arithmetic not storage; indexer keys are a cache of their own | Mistakes; Reading 6 table; DeepSeek V3.2 indexer keys now computed (15.25 KiB) |
| Hybrids: Qwen3-Next 24 KiB, Kimi Linear 7.9 KiB, the 3:1 ablation (5.65 against 5.77, 5.66, 5.70, 5.82) | Reading 8 (table and text) |
| MoE expert counts (V3 256/8/1, Kimi K2 384, K3 896/16/2, Qwen3 128 no shared, Qwen3-Next 512/10/1); dense prefix | Reading 9 table and every row's data |
| Position: RoPE near universal, partial RoPE (Qwen3-Next 0.25), NoPE layers (SmolLM3 every fourth, Kimi), iRoPE in Llama 4, per-layer bases (Gemma) | Reading 10 (counts from configs) |
| Looped depth (Ouro 4 passes, 1.5 MiB) | Reading 12 |
| DeepSeek V4.1-Flash encoder-decoder, gallery 3.125 KiB | Reading 12 (gallery-sourced; detail linked to DeepSeek) |
| How to read a card in 30 seconds, five questions, gpt-oss-120b worked example | Reading 2 (plus Kimi K3) |
| Common mistakes (KV heads, factor 2, windows, total vs active, sparse cache, cache-free hybrid, MLA kernels, recompute tables) | Mistakes (MLA-kernel and pre/post-norm items moved to their siblings) |
| Compare tab: table, strips, scatter, diff; Cache-at-context tab | Compare and Cache tabs, extended |
| The MiMo-V2-Flash / V2.5 mismatch with both arithmetics | Reading 1 corrections table |

## Moved to the sibling that owns it (linked, not repeated)
GQA head map and its formula, MLA equations and the decoupled-RoPE argument (attention_variants; DeepSeek page);
Gated DeltaNet and KDA update equations (beyond_attention); RMSNorm/LayerNorm worked vector (1, 2, 3, 4), placement
variants, QK-norm logit bound sqrt(d_h) (normalisation_residuals_and_stability); RoPE rotation, the 0.5403 worked example,
pair frequencies, YaRN ramp (alpha 1, beta 32, temperature 0.1 ln s + 1, gpt-oss 9/9/14 pairs) (positional_encodings);
MoE gating, balancing, capacity (mixture_of_experts); MTP (families_and_objectives); trade-off table (root section 13).

## Dropped
- "GPT-6 Astra is assumed to work this way" and the "Recurrent Looped Transformer specification": no source in hand on
  2026-10-18, no weights or measurements; the old page itself marked them unconfirmed. Not repeated.
- The zartbot blog as the source for V4.1-Flash's no-cross-attention design, and "a quarter of V4-Flash's HBM, an eighth of
  its SSD footprint", "111 MiB at 131,072": the DeepSeek page owns V4.1-Flash; this page keeps only the gallery's figure.
- The FP4 option of the old Reading KV calculator (the Cache tab offers bf16 and FP8).

## Corrections (visible on the page or in data)
1. Nine saved "configs" were HTTP error bodies (gated repos, one missing file); the models were silently skipped. Removed;
   Llama 3 8B, Llama 3.2 1B and 3B now read from public unsloth mirrors. Shown in Reading 3 and Mistakes.
2. Match count: 95 of 101 (was 84 of 86): four new gallery entries, and 12 entries the old build skipped now decoded (Llama 3 8B, Llama 3.2 1B and 3B, Qwen3 Coder Flash, Kimi K2.7 Code, Laguna XS 2.1, Gemma 4 E2B and E4B, Motif 3, ZAYA1, LongCat-Flash-Lite, Step 3.5 Flash).
3. New gallery mismatches found and explained with both arithmetics: Gemma 4 E2B 18 KiB and E4B 56 KiB per token (gallery
   35 and 84: it ignores cross-layer KV sharing and the 512-dimension global heads; transformers 5.20.1
   configuration_gemma4.py per_layer_config and modeling_gemma4.py is_kv_shared_layer); LongCat-Flash-Lite 31.5 KiB
   (gallery 63: two MLA sublayers per layer x 14 layers, modeling_longcat_flash.py); Step 3.5 Flash 180 KiB (gallery 192
   counts its 3 MTP layers: a convention). Motif 3 matches the gallery only once the released code is read (it caches
   expanded K and V, not the latent).
4. Granite 4.0-H Small: the old strips showed RoPE on its attention layers; its config sets position_embedding_type
   "nope" (and the model card says NoPE, per the root map).
5. Arcee Trinity Large: old strip had all 60 layers MoE; the config's num_dense_layers 6 makes the first 6 dense.
   LFM2.5 8B-A1B: first 2 dense (num_dense_layers 2).
6. Llama 4 Maverick: a shared expert per MoE layer (model card), as the root map has it.
7. Kimi Linear 3:1 ablation: the old text read "0:1" as one of the hybrid ratios; in the paper's Table 1 it is the pure
   full-attention baseline.
8. Hybrid state now in FP32, as the root Config calculator keeps it (old page used 2 bytes): Qwen3-Next 72 MiB, not 36.
9. DeepSeek V4-Pro and V4-Flash: the gallery's 7.7 and 5.4 KiB now reconstructed from compress_ratios (30 CSA + 31 HCA;
   21 CSA + 20 HCA + 2 window-only layers); V4-Flash's first two layers are window-only (transformers layer_types).
