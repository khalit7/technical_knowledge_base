# The running example of Topic: llm-architecture

Every lab on the root page and every child page works on the same text, the same tokenizer, the same tiny GPT and the same real-model configs, so a KV-cache bar in the Attention lab, a parameter bar in the Config calculator, a residual-norm curve in the Block lab and an attention map in Inside a real model are all about the same objects. This folder is written by the setup agent and is read-only for everyone else (suggest changes in your report).

Built 2026-10-18 on an Apple M1 Pro (16 GB unified memory). GPU work runs on MPS (PyTorch's Metal backend) at low priority on a machine shared with other agents; timings are labelled "measured on Apple M1 Pro (MPS)". Large artefacts (token arrays, checkpoints, the venv, source clones) live outside the repo under the scratch folder named by the environment variable `LA_SCRATCH`; Hugging Face weights stay in `~/.cache/huggingface`.

## Four shared inputs

| | what | file |
|---|---|---|
| **Text** | TinyStories (short, simple stories written by GPT-3.5 and GPT-4 for training small models), train shard 0 of 4 and the official validation split | `$LA_SCRATCH/data/{train,val}.bin` (built by `prepare_data.py`) |
| **Tokenizer** | byte-level BPE, 4,096 tokens, trained here on the train shard; id 0 is `<\|endoftext\|>` | `tokenizer.json` |
| **Running sequence** | 256 tokens of validation story 1 (Roxy the rhinoceros and the icy hill), starting with `<\|endoftext\|>`: exactly one training context. Names and phrases repeat ("Roxy" 11 times, "icy hill" 6, "Billy" 5), which attention, induction and KV-cache demos need. Never seen in training. | `running_sequence.json` (text, ids, token strings, decoded pieces) |
| **Evaluation prompts** | 8 fixed story openings written for this topic; each probes something an architecture change can break (names over a distance, dialogue, counting, a long-range callback). Prompt 7 is the running sequence's own opening. | `eval_prompts.json` |
| **Real configs** | 45 `config.json` files (config only, no weights) from GPT-2 to DeepSeek-V3.2, Kimi K2, gpt-oss, Qwen3-Next, Nemotron-H, Granite 4.0-H, Jamba, Mamba, with source URL, revision, date, published total and active parameters (vendor claim, source) and the Hugging Face safetensors count | `configs/*.json`, `configs/manifest.json` |
| **Inspection models** | SmolLM2-135M (Apache-2.0, revision 93efa2f0...) and Qwen3-0.6B (Apache-2.0, revision c1899de2...), both already in the Hugging Face cache | `pretrained_smoke.py`, `smoke/pretrained_smoke.json` |

### Why TinyStories and why a 4,096-token BPE

- **TinyStories** (Eldan and Li 2023, [arXiv 2305.07759](https://arxiv.org/abs/2305.07759); dataset [roneneldan/TinyStories](https://huggingface.co/datasets/roneneldan/TinyStories) revision `f54c09fd23315a6f9c86f9dc80f725de7d8f9c64`, licence CDLA-Sharing-1.0 per the dataset card) was built so that models of a few million parameters write fluent text. A 6-layer, 256-wide GPT goes from random to readable stories in about two minutes here, so architecture swaps show up as visible differences in loss curves and samples within a lab's time budget. A FineWeb-Edu slice would be closer to real pretraining but a 5M-parameter model on it stays in the "word salad" regime for far longer than our budget, and differences between variants drown in noise.
- **Own BPE, vocab 4,096**: GPT-2's 50,257-token vocabulary would make the embedding table (50,257 x 256 = 12.9M parameters) 2.7x the whole block stack (4.7M), so swapping attention or the FFN would move a small share of the model. With 4,096 tokens the embedding is 1.05M and the blocks dominate, as in real LLMs. It is byte-level (no unknown tokens), 3.93 characters per token on TinyStories train. The Tokenizers child page may compare it with GPT-2's and Llama 3's.

| split | stories | tokens | sha256 of the uint16 array |
|---|---|---|---|
| train (shard 0) | 529,875 | 122,021,463 | cb0b87ad0d41e379... |
| val (official validation split, held out) | 21,990 | 4,883,843 | 24bc3ea293022612... |

## The tiny GPT (`tiny_gpt.py`, `configs.py`)

One readable decoder-only GPT where every architectural choice is a config switch (read `tiny_gpt.py` top to bottom; `GPTConfig` documents every field). Baseline = GPT-2 style: d_model 256, 6 layers, 8 heads of 32, context 256, multi-head attention, LayerNorm pre-norm, learned positions, GELU 4x FFN, tied embeddings: 5,836,032 parameters (4,721,920 non-embedding).

| axis | switches |
|---|---|
| attention | `attn` mha / gqa (`n_kv_head`) / mqa / mla (`mla_kv_latent` d_c, `mla_rope_dim` d_r: the decoupled RoPE key); `window` (sliding) with `global_every` (local:global interleave); `qk_norm`; `attn_sink` (learned per-head sink logit, gpt-oss style) |
| normalisation | `norm` layernorm / rmsnorm; `norm_pos` pre / post / sandwich |
| position | `pos` learned / sinusoidal / rope / alibi / nope; `rope_theta`; `rope_scaling` {type linear / ntk / yarn, factor, orig_ctx} for running past the trained length (learned positions raise an IndexError there, on purpose) |
| feed-forward | `ffn` gelu / swiglu (hidden 704 = 8/3 x 256 rounded up to 32, about 2% more parameters than 4x GELU) |
| mixture of experts | `n_experts`, `top_k`, `n_shared`, `moe_hidden` (default ffn_hidden / top_k: equal active FFN), `router` softmax / sigmoid, `balance` aux / bias / none, `capacity_factor` (drops overflow tokens), `moe_every` |
| sequence mixer | `layer_types` string of `a` (attention) and `s` (a Mamba-2 style selective SSM: input-dependent decay, state 16 per head, 16 heads of 32 channels, short causal conv, gate; trained in the exact quadratic "dual" form, decoded with the constant-size recurrent state) |
| misc | `tie_embeddings`, `bias`, `init_std` (residual outputs scaled by 1/sqrt(2L), GPT-2) |

Hooks: `model(idx, record=True)` returns `rec` with `resid_norm` (L+1, B, T), `attn` (per layer (B, H, T, Tk), or None for SSM layers), `router` (per MoE layer: `top_i`, `top_w`, `load`, `dropped_frac`); `record="hidden"` also returns the residual stream after every block (logit lens: apply `model.ln_f` and `model.lm_head`). `model(idx, cache=[])` decodes with a KV cache (MLA caches the latent; SSM layers cache their state). `model.param_groups()` counts parameters by component (total, active, non-embedding); `kv_cache_bytes_per_token(cfg, bytes, context)` and `ssm_state_bytes(cfg, bytes)` give the cache arithmetic.

`test_tiny_gpt.py` (CPU, about a minute) checks that every preset builds, trains a step, records, and that cached decoding equals a full forward (max abs error about 1e-6; the capacity-factor preset legitimately differs, because which tokens are dropped depends on the batch). Its table, recorded 2026-10-18 (KV bytes per token across all layers in bf16, at context 256):

| preset | total params | active | non-embedding | KV bytes/token (bf16) | SSM state bytes (bf16) |
|---|---|---|---|---|---|
| `baseline` | 5,836,032 | 5,836,032 | 4,721,920 | 6,144 | 0 |
| `gqa2` | 5,246,208 | 5,246,208 | 4,132,096 | 1,536 | 0 |
| `gqa4` | 5,442,816 | 5,442,816 | 4,328,704 | 3,072 | 0 |
| `mqa` | 5,147,904 | 5,147,904 | 4,033,792 | 768 | 0 |
| `mla` | 5,500,544 | 5,500,544 | 4,451,968 | 960 | 0 |
| `swa64` | 5,836,032 | 5,836,032 | 4,721,920 | 1,536 | 0 |
| `swa64_g3` | 5,836,032 | 5,836,032 | 4,721,920 | 3,072 | 0 |
| `sink` | 5,836,080 | 5,836,080 | 4,721,968 | 6,144 | 0 |
| `postnorm` | 5,835,776 | 5,835,776 | 4,721,664 | 6,144 | 0 |
| `rmsnorm` | 5,836,032 | 5,836,032 | 4,721,920 | 6,144 | 0 |
| `sandwich` | 5,839,104 | 5,839,104 | 4,724,992 | 6,144 | 0 |
| `qknorm` | 5,770,880 | 5,770,880 | 4,722,304 | 6,144 | 0 |
| `sinusoidal` | 5,770,496 | 5,770,496 | 4,721,920 | 6,144 | 0 |
| `rope` | 5,770,496 | 5,770,496 | 4,721,920 | 6,144 | 0 |
| `alibi` | 5,770,496 | 5,770,496 | 4,721,920 | 6,144 | 0 |
| `nope` | 5,770,496 | 5,770,496 | 4,721,920 | 6,144 | 0 |
| `swiglu` | 5,934,336 | 5,934,336 | 4,820,224 | 6,144 | 0 |
| `moe8top2` | 15,285,504 | 5,848,320 | 14,171,392 | 6,144 | 0 |
| `moe8top2_bias` | 15,285,504 | 5,848,320 | 14,171,392 | 6,144 | 0 |
| `moe8top2_cap1` | 15,285,504 | 5,848,320 | 14,171,392 | 6,144 | 0 |
| `moe16top3_shared` | 16,084,224 | 5,860,608 | 14,970,112 | 6,144 | 0 |
| `ssm` | 6,650,336 | 6,650,336 | 5,601,760 | 0 | 117,888 |
| `hybrid` | 6,503,696 | 6,503,696 | 5,455,120 | 1,024 | 98,240 |
| `hybrid2` | 6,357,056 | 6,357,056 | 5,308,480 | 2,048 | 78,592 |
| `modern` | 5,279,360 | 5,279,360 | 4,230,784 | 1,536 | 0 |

Notes: RoPE, ALiBi, NoPE and sinusoidal presets drop the learned position table (65,536 parameters). `swa64` caches at most 64 tokens per layer, so at context 256 its average is a quarter of the baseline's, and its saving grows with context. MLA caches d_c + d_r = 64 + 16 = 80 numbers per layer instead of 2 x 8 x 32 = 512. SSM layers cache a constant state whatever the context.

## Training (`train.py`, `eval.py`)

Fixed seeds; the same random training windows for every preset (seeded generator), so presets compare at an equal token budget. AdamW (0.9, 0.95), weight decay 0.1 on matrices, lr 3e-3 with 100 warmup steps and cosine to 10%, batch 32 x 256 = 8,192 tokens per step, gradient clipping 1.0 (`--clip 0` disables it, for instability demos). Held-out loss every `--eval_every` steps on a fixed set of 20 validation windows. fp32 by default: on MPS fp32 was faster than bf16 autocast (about 40k vs 30k tokens/s for the baseline, 60-step probe). Writes `$LA_SCRATCH/runs/<name>/{config.json, log.json, ckpt.pt}`. `eval.py <name>` adds `eval.json`: held-out loss on 100 fixed windows, per-token loss on the running sequence, greedy and sampled (T 0.8, seed 0) continuations of the 8 prompts.

```
export LA_SCRATCH=<scratch>/la KB_SCRATCH=<scratch>
LOCK=<scratch>/tools/lock.sh; PY=$LA_SCRATCH/venv/bin/python
sh $LOCK acquire bench <prefix> 60 && {
  PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 OMP_NUM_THREADS=4 \
    nice -n 15 $PY src/data/train.py --preset gqa2 --steps 1500 --name gqa2_s1500
  sh $LOCK release bench <prefix>; }
```

Both MPS variables are needed: the high ratio alone fails with `RuntimeError: invalid low watermark ratio 1.4`. Touch the lock (`lock.sh touch bench <prefix>`) every 10 minutes in a longer script; release it as soon as GPU work ends.

**Time budget per run.** The default (`--steps 1500`, 12.3M tokens) takes about 5.3 minutes for the baseline (40k tokens/s) and reaches a held-out loss of 2.28 (from 8.38 at initialisation; ln 4096 = 8.32). Attention-only presets run at 33k to 40k tokens/s (MLA slowest: it rebuilds K and V from the latent at every step). SSM and hybrid presets run at about 16k tokens/s (the quadratic dual form of the scan costs about 34 ms forward and backward per SSM layer at batch 32 x 256; a chunked SSD form measured 31 ms, not worth the extra code), so 1,500 steps take about 13 minutes: give them `--time_budget 900` or compare at fewer steps. Keep each run under about 15 minutes; one GPU job at a time machine-wide. MPS memory: 2.6 to 2.8 GB for attention presets, 4.8 GB for the hybrid (the (B, heads, T, T) decay matrices); halve `--batch` for context above 256 or for the `ssm` preset at larger sizes, and check memory on one run before a sweep.

### Smoke runs (measured on Apple M1 Pro, MPS, fp32, 600 steps = 4.9M tokens, seed 0, 2026-10-18)

| run | preset | steps (tokens) | wall time | tokens/s | held-out loss at end (20 windows) | held-out loss, 100 windows (eval.py) | loss on the running sequence | peak RSS | MPS driver memory |
|---|---|---|---|---|---|---|---|---|---|
| smoke_baseline | baseline | 600 (4.9M) | 129 s | 40,045 | 2.788 | 2.800 | 2.61 | 0.68 GB | 2.6 GB |
| smoke_mla | mla (with RoPE) | 600 (4.9M) | 160 s | 33,075 | 2.652 | 2.664 | 2.41 | 0.62 GB | 2.8 GB |
| smoke_hybrid | hybrid (5 SSM + 1 attention, NoPE) | 544 of 600 (4.5M), stopped by the 300 s cap | 300 s | 15,912 | 2.500 (step 500) | 2.477 | 2.39 | 0.49 GB | 4.8 GB |
| ref_baseline_s1500 | baseline, default budget | 1,500 (12.3M) | 319 s | 40,091 | 2.278 | 2.302 | 1.96 | 0.74 GB | 2.6 GB |

Curves, samples and the earlier slow hybrid run (`smoke_hybrid_v0_slowconv`: 10,606 tokens/s with PyTorch's grouped `nn.Conv1d`, which is slow on MPS; replaced by shifted multiply-adds, same numbers at a fixed step: held-out 3.0613 at step 200 in both runs) are in `smoke/runs.json`. Read these as a proof that the loop works, not as a comparison: the presets differ in more than one switch (MLA and the hybrid also change the position scheme), the hybrid saw fewer tokens, and the schedule was cosine over 600 steps. A lab that compares variants trains them at the same token budget with the same schedule.

What a reader sees at the default budget (ref_baseline_s1500, greedy): "Once upon a time, there was a little girl named Lily. She loved to play outside in the park. One day, she saw a big, scary dog. The dog was scared and ran away." After 600 steps the text is already grammatical but repetitive ("a big, a big, a big"); the counting prompt (Mia's apples) fails at both budgets.

## Inspection models (`pretrained_smoke.py`)

Both load with `attn_implementation="eager"` (the only path that returns attention weights) and run the running sequence's text, re-tokenised with each model's own tokenizer, with `output_attentions` and `output_hidden_states` (`smoke/pretrained_smoke.json`, measured on Apple M1 Pro, MPS, 2026-10-18, inside `torch.inference_mode()`):

| model | dtype | parameters (in memory) | layers x heads | tokens | load | forward | loss on the text | MPS driver memory | peak RSS |
|---|---|---|---|---|---|---|---|---|---|
| SmolLM2-135M | fp32 | 134,515,008 | 30 x 9 (3 KV heads) | 226 | 4.3 s | 0.28 s | 1.56 | 1.2 GB | 1.2 GB |
| Qwen3-0.6B | fp16 | 596,049,920 | 28 x 16 (8 KV heads) | 222 | 2.3 s | 0.43 s | 1.83 | 2.6 GB | 3.9 GB |

Already visible in the smoke numbers (first look, for the Inside lab to measure properly): attention mass on the first token (queries past position 8) is under 0.09 in the first 12 layers of SmolLM2 and 0.31 to 0.74 from layer 12 on; in Qwen3-0.6B it jumps from under 0.01 in layers 0 to 2 to 0.69 in layer 3 and stays 0.33 to 0.78. The median residual-stream norm grows with depth in both (SmolLM2: 2.8 after the embedding, 39 after layer 1, 727 after layer 29; the final norm brings it back to 47). Qwen3-0.6B stores a separate `lm_head` tensor in its safetensors although `tie_word_embeddings` is true: 751,632,384 stored versus 596,049,920 in memory (the difference is exactly 151,936 x 1,024).

## Real configs (`configs/`)

`configs/manifest.json` lists each file with the official repo, the repo the config was actually fetched from (gated meta-llama, google and ai21 repos return 401 without a token, so public mirrors from unsloth or NousResearch were used, or Jamba v0.1 for Jamba Mini), the revision sha and date, `model_type`, a kind (dense, moe, moe-mla, hybrid, ssm, +vision), the published total and active parameter counts with their source (vendor claims from model cards, or the Mistral blog for Mixtral), the Hugging Face API safetensors count, and a note on why the two may differ (vision towers in Llama 4, Gemma 3 27B and Mistral Small 3.1; the 14B MTP module in DeepSeek-V3's 685B; packed MXFP4 bytes in gpt-oss; GPT-2's stored attention-mask buffers). The calculator's residual check should compare against `published_total_params` and explain each residual.

Rebuild everything: `fetch/fetch_all.sh` (downloads, under the download lock), `fetch/st_totals.py` and `fetch/write_manifest.py`, then `prepare_data.py` (reuses the committed `tokenizer.json`, so ids are stable), then `make_manifest.py`.

## Caveats

- Determinism: the seeded batches and init make reruns repeat closely (two hybrid runs, before and after the conv rewrite, gave the same held-out loss 3.0613 at step 200), but MPS does not promise bit-identical kernels across versions or batch sizes. Seed-to-seed spread was not measured here: run a second seed (`--seed 1`) before reading a small gap between presets.
- The tiny GPT is about 1/1000 of a small real model and trains on about 10M tokens: it shows mechanisms (cache sizes, instability, routing, extrapolation failures), not the absolute quality gaps a datacenter run would show.
- The SSM mixer's training form is quadratic in the sequence (exact, simple, fast at 256 to 1k tokens); it shows the recurrence and the constant-size state, not Mamba's hardware-aware scan kernel.
- The running sequence is tokenised with this tokenizer; the inspection models re-tokenise the same text with their own tokenizers, so token counts differ (stated where used).
