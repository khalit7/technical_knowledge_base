# Scaling calculator (tab t-scale): sources and findings

Files: `recompute.py` (every number; writes `../data/scale.json` and `../parts/34_js_scale0_data.js`), `check_scale.mjs` (JS against Python, every control at 390 dark and 920 light), `build_iso.sh` (a page with only this tab, so the check does not depend on the other tabs), `viz_ideas.md`.

Run: `python3 scale/recompute.py && sh build.sh && node scale/check_scale.mjs` (from `src/`). Last run: 2,720 checks, 0 failures.

## Formulas

- Training compute C = 6ND, N active parameters for an MoE. Attention term 6 L n_ctx d_attn per token (Kaplan et al. 2020 §2.1 forward 2 L n_ctx d_attn, times 3); equals QK and AV under a causal mask. For MLA (DeepSeek-V3) d_attn = h (d_qk + d_v)/2 = 128 × 160, which reproduces the DeepSeek-V3 page's 3.07e10 FLOPs per token at 4K.
- GPU-hours = C / (dense peak × MFU) / 3600.
- Chinchilla Approach 3: L = E + A/N^α + B/D^β; N_opt = G (C/6)^a, G = (αA/βB)^(1/(α+β)), a = β/(α+β).
- 20 tokens per parameter: N = √(C/120).
- Kaplan: L(N, D) = [(N_c/N)^(α_N/α_D) + D_c/D]^α_D, Table 2 (0.076, 0.103, 6.4e13, 1.8e13); compute-efficient N = 1.3e9 (C/2 / 8.64e19)^0.73 (Table 6, C_min = C/2 as Chinchilla D.4 reads it; reproduces 4.68B at 1e21).
- Sardana et al. 2024: minimise 6ND + 2N·D_inf on L(N, D) = target, ternary search in log N (200 steps), as the Chinchilla page does.

## Constants and sources

- Hoffmann unrounded (default): E 1.6934, A 406.401, B 410.7228, α 0.33917084, β 0.2849083 (TeX source, quoted by Besiroglu et al., https://arxiv.org/html/2404.10102v2). Rounded Eq. 10: 1.69, 406.4, 410.7, 0.34, 0.28. Besiroglu refit: 1.8172, 482.01, 2085.43, 0.3478, 0.3658. Already verified on the Chinchilla page (`reference/papers/chinchilla/src/recompute.py`).
- Peaks, fetched 2026-10-03: A100 SXM BF16 312 TFLOPS dense (https://www.nvidia.com/en-us/data-center/a100/); H100 SXM BF16 1,979 and FP8 3,958 with sparsity (https://www.nvidia.com/en-us/data-center/h100/), dense half; HGX B200 FP16/BF16 36 PF and FP8 72 PF sparse for 8 GPUs (https://www.nvidia.com/en-us/data-center/hgx/), so 2.25 and 4.5 PF dense per GPU. H800: no NVIDIA datasheet found; assumed equal to H100 SXM, labelled unconfirmed on the page.
- Presets: GPT-3 Table D.1 (174.6B, 300B, 3.14e23; `reference/papers/gpt_3`). Gopher 280B/300B and Chinchilla 70B/1.4T, budget 5.76e23 (Chinchilla page). Llama 2 70B: 1,720,320 A100-80GB hours, 2.0T tokens (Llama 2 paper Table 2, fetched https://arxiv.org/html/2307.09288v2); N = 68,976,653,312 (HF safetensors metadata). Llama 3.1 8B/70B/405B: 1.46M / 7.0M / 30.84M H100 hours (model card, `reference/papers/llama_3_herd/src/inputs/llama3_1_model_card.md`), "~15T" tokens, 405B 15.6T and 3.8e25 FLOPs, Table 4 MFU 43/41/38%; N from HF metadata (8,030,261,248; 70,553,706,496; 405,853,388,800). DeepSeek-V3: 37B active, 671B total, 14.8T tokens, 2,664K H800 hours pretraining (Table 1; DeepSeek-V3 page). OLMo 2 7B/13B/32B: N from released configs, tokens with mid-training 4.05T/5.6T/6.6T, Table 6 FLOPs 1.8/4.6/13.0e23 (OLMo 2 page). Qwen3-235B-A22B: 22B active (card), 235,093,634,560 total (HF), ~36T tokens, S1 at 4,096 tokens (Qwen3 page). SmolLM3: 3,075,098,624 parameters (HF), 11.2T tokens, "384 H100 GPUs for 24 days" (https://huggingface.co/blog/smollm3).

## Residuals (preset defaults: lab-stated MFU where given, else 40%; H100/H800/A100 BF16 dense)

| Preset | 6ND | Published | Residual 6ND / +attn | Published hours | Hours at MFU | Residual | Implied MFU |
|---|---|---|---|---|---|---|---|
| GPT-3 175B | 3.143e23 | 3.14e23 | +0.1% / +1.5% | | | | |
| Gopher 280B | 5.040e23 | 5.76e23 | -12.5% / -11.7% | | | | |
| Chinchilla 70B | 5.880e23 | 5.76e23 | +2.1% / +4.0% | | | | |
| Llama 2 70B | 8.277e23 | | | 1.72M A100 | 1.84M | +7.1% | 42.8% |
| Llama 3.1 8B | 7.227e23 | | | 1.46M H100 | 0.51M | -65.3% | 13.9% |
| Llama 3.1 70B | 6.350e24 | | | 7.0M | 4.46M | -36.3% | 25.5% |
| Llama 3.1 405B | 3.799e25 | 3.8e25 | -0.03% / +4.1% | 30.84M | 26.01M (41%) | -15.7% | 34.6% |
| DeepSeek-V3 | 3.286e24 | | | 2.664M H800 | 2.31M | -13.4% | 34.6% (17% vs FP8) |
| OLMo 2 7B | 1.774e23 | 1.8e23 | -1.5% / +5.8% | | | | |
| OLMo 2 13B | 4.609e23 | 4.6e23 | +0.2% / +6.3% | | | | |
| OLMo 2 32B | 1.276e24 | 1.3e24 | -1.8% / +2.3% | | | | |
| Qwen3-235B-A22B | 4.752e24 | | | | | | |
| SmolLM3 3B | 2.066e23 | | | 221,184 H100 | 145K | -34.4% | 26.2% |

6ND reproduces 6 of 7 published FLOP figures within 3%. GPT-3's is by construction (Table D.1 is 6ND); Llama 3.1 405B's is independent. Published FLOP counts mostly leave attention out: adding it overshoots by 2 to 6%.

## Corrections and findings

- **Approach 3's printed (rounded) constants do not give the paper's 40B** at Gopher's budget: they give 32.2B on 2.98T (93 tokens per parameter). The unrounded constants give 40.4B on 2.38T (59), so the page defaults to them and offers the rounded set as a toggle.
- **"Chinchilla-optimal" is two rules.** Approach 3 (a = 0.457) has tokens per parameter rising with compute: 59 at 5.76e23, 85 at 3.8e25. The 20 rule is Approaches 1 and 2 and Chinchilla itself. Besiroglu's refit (a = 0.513) gives about 18 to 20 and agrees with them.
- **Gopher's published 5.76e23 is not 6ND**: 6ND is 12.5% below it, and by 6ND Chinchilla used 17% more compute than Gopher, not the same.
- **Model-card GPU-hours do not reproduce at a standard MFU.** Implied MFUs range from 14% (Llama 3.1 8B) to 43% (Llama 2 70B). Llama 3.1 405B at Meta's own 41% Table 4 MFU is 16% short of the card. Shown as residuals, not absorbed into MFU.
- **DeepSeek-V3's MFU depends on the peak it is quoted against**: 35% of BF16, 17% of FP8, for the same GPU-hours.
- **Kaplan's rule extrapolated to 3.8e25 gives 10.3T parameters on 614B tokens**, which is why it is only shown for contrast.
- Sardana et al.'s §2 examples reproduce with the unrounded constants: 7.1B, 2.10x data, 16% saving (paper 7B, 2.1x, 17%); 6.05B, 1.16x (6B, 1.18x); 13.9B, 2.74x, 27% (13.6B, 2.84x, 28%).

## Defaults: independent or by construction

- Llama 3.1 405B FLOPs: independent (N from the checkpoint, D from the paper).
- GPT-3 FLOPs: by construction (the paper's table is 6ND).
- OLMo 2 FLOPs: independent of the paper's arithmetic, but the token totals were assembled to include mid-training, which is what the paper's figure counts.
- Every GPU-hours figure: not reproduced; MFU is never back-solved. The implied MFU is shown as an output.
- Dollars: $2.00 per GPU-hour, illustrative (also DeepSeek's own rental assumption); real disclosed costs belong to the Price list tab.
