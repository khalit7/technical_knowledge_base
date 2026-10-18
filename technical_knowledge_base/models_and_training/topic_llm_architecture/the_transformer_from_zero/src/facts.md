# Facts verified for this page (2026-10-18)

## Measured here (Apple M1 Pro; outputs in zero/out and train/out)
- gpt_zero.py with default switches = tiny_gpt.py baseline: 5,836,032 parameters; seed-0 initial weights identical
  (max difference 0.0); the ref_baseline_s1500 checkpoint loaded into it gives identical logits (0.0); eval_zero.py
  --tiny reproduces eval.py exactly (held-out 2.3022, running sequence 1.9563, all 16 samples).
- Trained from scratch with the running example's loop (MPS, seed 0): held-out 2.2757 (20 windows), 2.3001 (100),
  315.7 s, 40,711 tokens/s; reference 2.2776 / 2.3022; Block lab rerun 2.2811; baseline seed 1 (mx_baseline_s1) 2.264 / 2.2872.
- FlopCounterMode forward over 256 tokens = 3,355,443,200 = 2 x 5,767,168 x 256 + 6 x 4 x 256^2 x 256 (exact);
  forward+backward / forward at T = 255: 3.0. One 1,500-step run: about 4.83e14 FLOPs (derived).
- Count floors on TinyStories held-out: unigram 6.0057; bigram 3.6158 (train counts, add-k toward the unigram,
  k = 100 chosen on the first half of val, scored on the second half; calculation).
- Untrained loss on the running sequence 8.360 (ln 4096 = 8.318), logits std 0.320; trained 1.956 (perplexity 7.1).
- 1/sqrt(hd): std of q.k for unit-variance vectors 5.65 at hd 32; mean largest softmax weight over 256 keys 0.62
  unscaled vs 0.04 scaled (hd 32), 0.84 unscaled (hd 128).
- Shuffle test, trained layer-1 head 0 without mask: no positions 5.6e-7 relative change; with positions 1.13.
- Silent bugs on the trained model (running sequence loss 1.9563): weights masked after softmax 4.1788 (leak 0.0026);
  future scores set to 0 instead of -inf 2.4264 (leak 0.0325); softmax over queries 4.2722 (leak 0.0707).
- Unshifted targets (targets = inputs), 150 CPU steps from scratch: train loss 7.25 -> 0.067; held-out 13.36; greedy ".....".
- Double shift: trained model scored on the token after next: 8.84 vs 1.96.
- Error messages (torch 2.14.1): cross_entropy on (B,T,V) "Expected target size [1, 4096], got [1, 255]"; view after
  transpose "view size is not compatible with input tensor's size and stride ... Use .reshape(...) instead."; past the
  position table "IndexError: index out of range in self"; temperature 0 "probability tensor contains either `inf`,
  `nan` or element < 0"; nn.Linear weight used as (in, out) "mat1 and mat2 shapes cannot be multiplied (4x256 and 1024x256)".
- Parameter formula vs Hub safetensors (configs manifest, read 2026-10-18): residual 0 for SmolLM2-135M, Mistral 7B
  v0.1, Llama 3.1 8B and 70B, Qwen3-8B, OLMo 2 7B; GPT-2 +12,582,912 (attn.bias masks); Qwen3-0.6B +155,582,464 (stored
  lm_head); Llama 2 7B +2,048 (32 F32 rotary_emb.inv_freq [64], NousResearch/Llama-2-7b-hf @8efe6c9 headers).

## Published, checked 2026-10-18
- Shazeer 2020 (arXiv 2002.05202) section 2: "To keep the number of parameters and the amount of computation
  constant, we reduce the number of hidden units d_ff ... by a factor of 2/3"; base d_ff 3,072 -> 2,048 for GLU variants.
- GPT-2 paper section 2.3: LayerNorm "moved to the input of each sub-block", "an additional layer normalization was
  added after the final self-attention block", residual weights scaled by 1/sqrt(N), N residual layers.
- Dong et al. 2021 (arXiv 2103.03404) abstract: without "skip connections or multi-layer perceptrons (MLPs), the
  output converges doubly exponentially to a rank-1 matrix".
- Haviv et al. 2022 (arXiv 2203.16634): "causal attention enables the model to infer the number of predecessors that
  each token can attend to".
- nanoGPT 3adf61e model.py: estimate_mfu flops_per_token = 6*N + 12*L*H*Q*T (line 296). transformers v5.20.1:
  ForCausalLMLoss pads and shifts labels (loss/loss_utils.py:64); Llama tie declared by _tied_weights_keys (modeling_llama.py:411).

## Ablations (gpt_zero.py, MPS, seed 0 unless stated, 1,500 steps x 8,192 tokens, held-out on 20 / 100 windows)
- baseline 2.2757 / 2.3001; no residual 6.0112 / 6.0164 (lr 1e-3: 6.0114; greedy output all full stops); no norm
  2.5458 / 2.5672 (lr 1e-3: 3.0606, baseline at lr 1e-3 2.4644); no position 2.3753 / 2.3987 (Positional child's
  pe_nope 2.3666 / 2.389); one head 2.2821 / 2.3063, seed 1 2.3268 (baseline seed 1 2.264); no FFN 2.7024 / 2.725
  (2,688,768 parameters); no attention 3.6951 / 3.703 (bigram floor 3.6158).
- Roxy at step 1,500 (in_snap): tokens "o","x","y" cost 9.0 nats together at the first occurrence, 4.5 at the second,
  1.6 on average from the third on; about 25 at step 0, 9 to 11 at step 300.
