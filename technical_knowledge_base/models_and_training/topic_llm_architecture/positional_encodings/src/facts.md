# Verified facts of the Positional Encodings page (2026-10-18; also in the topic's shared FACTS.md under `pe`)

## Code (transformers 5.20.1, the shared venv; located by pattern in src/code/code_refs.py)
- `modeling_llama.py`: `LlamaRotaryEmbedding.forward` lines 110-116 (cos and sin of `cat(freqs, freqs)`, both multiplied by `attention_scaling`); `rotate_half` 119-123 (pairs dimension i with i + d/2); `apply_rotary_pos_emb` 127-149.
- `modeling_rope_utils.py`: linear 174-181 (frequencies divided by the factor); dynamic NTK 328-342 (base × ((factor · seq_len / max_pos) − (factor − 1))^(d/(d−2)), not the YaRN paper's s = l'/L); YaRN 429-483 (ramp on pair index, `truncate` defaults True, `attention_factor` = 0.1 ln s + 1 unless mscale and mscale_all_dim are both set, then their ratio, which is 1 for DeepSeek-V3); llama3 644-662; LongRoPE 556-577 (long factors only when seq_len > original_max_position_embeddings, else short; attention factor sqrt(1 + ln s / ln L)); proportional 246-266 (rotated pairs keep exponents over the full head_dim; the rest get frequency 0).
- Configs are standardised to `rope_parameters` (`RotaryEmbeddingConfigMixin.standardize_rope_params`): `rope_theta`, `rope_scaling` and `partial_rotary_factor` move into it; nested per layer type for Gemma 4.
- `apply_rotary_pos_emb(` call count outside its definition: nemotron_h 0, jamba 0 (defined, never called: no positions in their attention), falcon_h1 1, granitemoehybrid 1 (only when `position_embedding_type == "rope"`), qwen3_next 1.
- Llama 4 NoPE layers: query × (log1p(floor((p + 1)/floor_scale)) × attn_scale + 1) (modeling_llama4.py 358-366): 1.49 at position 1,048,575, 1.72 at 10,485,759.
- Ministral 3 `get_llama_4_attn_scale` (modeling_ministral3.py 104-106): 1 + beta · ln(1 + floor(p / original_max_position_embeddings)), applied to queries after RoPE. Mistral Large 3's config carries the same field (beta 0.1, original 8,192): 1.358 at position 294,911 (calculation).
- DeepSeek-V3: transformers keeps `apply_rotary_pos_emb_interleave` (modeling_deepseek_v3.py 311-347) for the interleaved layout; gpt-oss's `_apply_rotary_emb` (modeling_gpt_oss.py 207-215) splits in halves.
- This page's ports of linear, YaRN, llama3 and LongRoPE agree with `ROPE_INIT_FUNCTIONS` on all 12 presets to a relative 9.0e-7 or better (float32), src/code/hf_check.py.

## Configs (Hugging Face config.json, fetched 2026-10-18 by the root agents unless noted; census of 74 in src/census/out/census.json)
- 74 configs: 61 RoPE (incl. partial and decoupled), 6 no positions (Nemotron-H 8B, Nemotron 3 Super, Granite 4.0-H Small, Jamba v0.1, Kimi Linear, Kimi K3), 3 learned (GPT-2, GPT-2 XL, BERT), 2 ALiBi (BLOOM, MPT-7B), 2 SSM-only. Bases from 10,000 (18 configs) to 1e11 (Falcon-H1 7B and 34B); 27 at 1,000,000 or more; 20 ship a scaling.
- Gemma 4 31B: 60 layers, 10 full_attention; global layers `proportional`, partial 0.25, theta 1,000,000, global_head_dim 512: 64 of 256 pairs rotate, wavelengths 6.28 to 188.3 tokens; local layers theta 10,000, head_dim 256, window 1,024.
- Qwen3-Next-80B-A3B: head_dim 256, partial 0.25 (32 of 128 pairs), theta 10,000,000, wavelengths 6.28 to 37,969,062; Qwen3.5-397B adds mrope_section [11, 11, 10], interleaved.
- DeepSeek-V4-Pro: qk_rope_head_dim 64, theta 10,000, YaRN factor 16 from 65,536 (max 1,048,576), beta_fast 32, beta_slow 1, compress_rope_theta 160,000: YaRN keeps 21 pairs, ramps 11, interpolates none (every pair turns at least once in 65,536).
- Mistral Large 3 (params-style config.json): qk_rope_head_dim 64, theta 10,000, yarn factor 36, original 8,192, beta 32, alpha 1, apply_scale false; llama_4_scaling beta 0.1; max 294,912 = 36 × 8,192.
- Kimi K3: mla_use_nope true; 24 full-attention (MLA) layers of 93 (linear_attn_config.full_attn_layers), 69 KDA layers; no RoPE anywhere. Kimi K2: YaRN factor 32 from 4,096 with beta_fast = beta_slow = 1 (a step at one turn).
- Nemotron 3 Super 120B-A12B: model_type nemotron_h, rope_theta 10,000 in the config, unused by the code. Granite 4.0-H Small: position_embedding_type "nope".
- Olmo 3 32B Think: theta 500,000, YaRN factor 8 from 8,192, max 65,536.
- Llama 4 Scout base config: llama3 factor 8 (low 1, high 4) from 8,192, max 262,144; the Instruct mirror's config (fetched 2026-10-03): factor 16, low = high = 1, max 10,485,760.

## Tiny GPT (root src/data/tiny_gpt.py)
- RoPE: head_dim 32, theta 10,000: 16 pairs, wavelengths 6.3 to 35,333 tokens; pairs 0 to 6 complete a turn within 256, pairs 7 to 15 do not (pair 15 covers 2.6 degrees). YaRN at s = 8 with orig 256: 1 kept, 6 ramp, 9 interpolated; NTK base at s = 8: 91,896.
- Its YaRN multiplies cos and sin by 0.1 ln s + 1 (like Hugging Face): logits × 1.459 at s = 8.
- TinyStories train shard: 122,021,463 tokens over 529,875 stories, about 230 tokens per story (calculation from the root README).

## Measured (Apple M1 Pro; filled from src/*/out by the page; see the page for the numbers)
- Past-length windows: same 24 × 2,048 windows (seed 1234) as long_context/src/past/past_len.py; at_mha plain 2.0714 / 2.4635 / 3.3392 / 3.8234 and yarn x8 2.2889 / 2.3872 / 2.4002 / 2.4300 reproduced exactly.
- Equal-budget runs (1,500 steps x 8,192 tokens, seed 0, MPS fp32, 2026-10-18), held-out loss on 100 windows: RoPE (at_mha) 2.160 (seed 1 2.175), ALiBi 2.168, sinusoidal with token embeddings x 16 2.286, learned 2.302 (seed 1 2.285), NoPE 2.389, sinusoidal as tiny_gpt.py adds it (unscaled) 4.292: embeddings at std 0.02 (norm about 0.32) against unit sinusoids (norm 11.3) leave the model on the unigram plateau for about 300 steps. Vaswani et al. section 3.4 multiply embeddings by sqrt(d_model). RoPE trained at 33,500 tokens/s against about 40,000 for the others (rough, unfused).
- Past 256 (24 x 2,048 windows), loss at 1,024 to 2,047: ALiBi 2.07 (flat: 2.09 / 2.07 / 2.06 / 2.07), RoPE 3.82, sinusoidal x16 4.85, NoPE 5.97, learned IndexError at 299. RoPE scalings at inference: PI x4 3.15, PI x8 3.45, NTK x4 3.54, NTK x8 3.25, YaRN x4 2.75, YaRN x8 2.43; YaRN x8 without temperature 2.57; temperature alone 3.88. Inside 256 the cost: PI x8 +1.19, YaRN x8 +0.22, NTK x8 +0.11.
- Misconfigurations: YaRN x8 with orig_ctx 2,048 instead of 256: 3.97 at 1,024 to 2,047; rope_theta 500,000 at inference on a 10,000-trained model: 2.32 on 0 to 255 (from 2.07), 2.59 far.
- The long_context sibling's fine-tunes (300 steps at 1,024) on the same windows: PI x4 2.080 / 2.027 (512-1,023) / 3.288 (1,024-2,047); plain 2.055 / 2.027 / 2.137.
- Running sequence at offset 768 (positions 768-1,023), mean loss: plain RoPE 1.74 -> 3.56, YaRN x8 1.94 -> 2.10, ALiBi 1.72 -> 1.76.
- Permutation test: NoPE token 255 after block 1 changes by 2e-7 (float rounding) when tokens 0-254 are shuffled; RoPE 0.052 at block 1. Position probe R2: NoPE 0.94 to 0.97 in blocks 3-5, RoPE at most 0.27, learned and sinusoidal about 0.99 until the last block (0.71).
