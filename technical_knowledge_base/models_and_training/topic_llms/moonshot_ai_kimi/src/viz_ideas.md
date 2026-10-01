# Moonshot AI: Kimi, visualisation ideas (v3, HTML-only page)

Central question the page keeps returning to: **what does each change to a "settled" layer (optimiser, attention, residual, MoE width, precision) buy, and what does it cost?** A visual earns its place when it makes one of those trades measurable, ideally against the method it replaced.

Existing visuals (old embed, `pages/moonshot-ai-kimi/visual.html`): Newton-Schulz stepper with unit-circle ellipse, a four-rule associative-memory sandbox (linear, delta, GDN, KDA), and an AttnRes depth-softmax slider. All three ideas are reused in improved form below; nothing else was in it.

Scoring (0 to 2 each): parameter to move (P), reproduces a stated figure (R, counts double), computable from public data (C, counts double), shows what a sentence cannot (S), corrects a misconception (M), measures the central question (Q), absent elsewhere (A), step-by-step or before/after animation (N); build cost subtracted (B).

## Built

| # | Idea | Placement | P | R×2 | C×2 | S | M | Q | A | N | B | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| K1 | **KDA against full attention, animated.** One token through one K3 attention layer: in KDA mode the 128 × 128 head state (drawn to scale, one square = 64 numbers, so 256 squares) is decayed per key channel, erased along k, written with v kᵀ and read with q; in full-attention mode the token is compressed to MLA's 576-number entry (9 squares), appended, and every earlier entry is read. Last steps sweep the context from 1 to 1,048,576 tokens with running counters for numbers stored and read per layer. Play, pause, step, scrub, speed; only animates on screen in the visible tab; starts paused under reduced motion. | Reading, KDA section | 2 | 4 | 4 | 2 | 2 | 2 | 2 | 2 | -2 | **18** |
| K2 | **Parameters and memory tab.** K3 and K2 parameter tables rebuilt from config.json (every part's formula), the precision of each part, the checkpoint size under four precision schemes, and cache memory against context (hybrid 69 KDA + 24 MLA against an all-MLA 93-layer stack and K2's 61 MLA layers), with the KDA state's dtype as an exposed assumption. | Own tab | 2 | 4 | 4 | 2 | 2 | 2 | 2 | 0 | -1 | **17** |
| K3 | **Delta-rule sandbox.** A 2-channel associative memory under four rules (linear, delta, GDN scalar gate, KDA per-channel gate), with the page's two worked examples as presets. | Reading, KDA section | 2 | 4 | 4 | 2 | 2 | 1 | 1 | 1 | -1 | **16** |
| K4 | **Newton-Schulz stepper.** The quintic f(σ) with iterates of two singular values, steps 0 to 8, plus the Adam-matched scale for real K2/K3 matrix shapes. | Reading, MuonClip | 2 | 4 | 4 | 2 | 2 | 1 | 1 | 1 | -1 | **16** |
| K5 | **QK-Clip, per head against per layer.** Eight heads' max logits (illustrative), τ slider, per-head against naive global clipping; per-part MLA scale factors for the selected head. | Reading, MuonClip | 2 | 2 | 2 | 2 | 2 | 1 | 2 | 0 | -1 | **12** |
| K6 | **Hybrid ratio trade-off.** Kimi Linear's Table 1: validation (or training) perplexity against the share of layers that keep a cache, with K3's 24/93 marked. | Reading, KDA section | 1 | 4 | 4 | 2 | 1 | 2 | 2 | 0 | 0 | **16** |
| K7 | **Quantile Balancing.** Illustrative router scores for 16 tokens and 4 experts; one QB update against DeepSeek's fixed-step bias rule. | Reading, Stable LatentMoE | 2 | 0 | 2 | 2 | 1 | 1 | 2 | 1 | -1 | **10** |
| K8 | **Attention Residuals across depth.** Choose a layer of K3; see the weight on each source under the plain residual, Full AttnRes at initialisation and Block AttnRes with K3's 8 blocks of 12 layers, and how many vectors each keeps per token. | Reading, AttnRes | 2 | 2 | 4 | 2 | 1 | 1 | 1 | 0 | -1 | **12** |
| K9 | **Rank depends on the ruler.** K3's place on AA v4.1 (July), AA v4.3 (1 Oct), Real-SWE (two readings a week apart), WebDev Arena, each with version and date, never joined. | Reading, K3 section | 0 | 2 | 4 | 1 | 2 | 1 | 1 | 0 | 0 | **11** |
| K10 | **Lineage tab.** Timeline of Kimi releases sized by total parameters, a card per release, and the config diff DeepSeek-V3 / K2 / Kimi Linear / K3. | Own tab | 1 | 0 | 4 | 2 | 1 | 1 | 1 | 0 | -1 | **9** |

### Data, formulas and sources (all recomputed in `recompute.py`)

- K3 config: https://huggingface.co/moonshotai/Kimi-K3/raw/main/config.json (93 layers, KDA layers 1-3,5-7,...,89-91; full-attention layers 4,8,...,92,93; 96 heads of 128; kv_lora_rank 512, qk_rope 64, NoPE; 896 experts, 16 active, 2 shared, latent 3584, expert hidden 3072; first_k_dense_replace 1; attn_res_block_size 12; gate_lower_bound -5; MXFP4 group 32 on routed experts only).
- K3 safetensors totals: https://huggingface.co/api/models/moonshotai/Kimi-K3 (F32 11,122,432; BF16 57,179,884,544; U8 logical 2,722,740,830,208; total 2,779,931,837,184) and the index total_size 1,560,860,324,864 bytes.
- **Reproductions.** Routed experts = 92 × 896 × 3 × 3584 × 3072 = 2,722,740,830,208, equal to the HF MXFP4 count **exactly** (independent). Text non-expert parameters from the config = 56.744B against HF's 57.191B BF16+F32; the 0.447B difference is the 401M vision encoder plus projector (card: 401M). Active per token, counting the output head but not the input-embedding lookup = **104.19B**, reproducing the report's 104.2B independently. Checkpoint bytes = 2,722,740,830,208 × 4.25/8 + 57,179,884,544 × 2 + 11,122,432 × 4 = 1,560,860,324,864 = index total_size **exactly** (independent arithmetic on HF's counts). The page's old 1.49 TB assumed every weight at 4.25 bits; it does not reproduce (non-expert weights stay BF16, report §4.1.4).
- K2: config sums to 1.0264T, equal to HF's 1,026,408,235,864 (independent). The report's 1.04T is reproduced only by adding the one MTP module the report's Table 1 lists (1.0436T): a reconstruction, labelled. Active 32.6B is not reproduced exactly (31.7B without MTP, 32.3B with, input embedding excluded); said plainly.
- Cache: MLA entry 576 numbers per token per layer (kv_a_proj_with_mqa output); KDA state 96 × 128 × 128 = 1,572,864 numbers per layer; conv state 3 × 12,288 × 3. Hybrid per token 24 × 576 = 13,824 numbers; all-MLA 93 × 576 = 53,568. At 1M tokens with an FP32 state and BF16 cache: 27.4 GiB against 104.6 GiB, a 73.8% cut; limit 1 - 24/93 = 74.2% (page: "about 74%"). Crossover where the hybrid stops holding more than all-MLA: about 5,650 tokens with an FP32 state, 2,920 with BF16 (derived, dtype is an assumption: the report does not state it).
- Kimi Linear Table 1 (https://arxiv.org/abs/2510.26692): validation PPL 0:1 5.77, 1:1 5.66, 3:1 5.65, 7:1 5.70, 15:1 5.82; training 9.45, 9.29, 9.23, 9.23, 9.34; TPOT 1.84 ms against 11.48 ms (6.3×) at 1M.
- Newton-Schulz: a,b,c = 3.4445, -4.7750, 2.0315 (https://kellerjordan.github.io/posts/muon/); worked example 3 and 0.3 reproduces 0.9950/0.0995, then 0.7047/0.3381 ... 0.7020/0.7087, ratio 0.991 after 5 steps (by construction: same formula). Jordan's target band [0.7, 1.3].
- QK-Clip: τ = 100, γ = min(1, τ/S), √γ on q^C, k^C, γ on q^R, k^R untouched (K2 report §2.1, Algorithm 1). 12.7% of heads in first 70,000 steps (Appendix D).
- QB: Eq. 13 and 14 of the K3 report (https://github.com/MoonshotAI/Kimi-K3/blob/main/k3_tech_report.pdf); the figure's own scores are not given numerically, so the demo uses seeded illustrative scores (labelled).
- AA v4.3 rows from `pages/topic-llms/aa_snapshot.json` (read 1 Oct 2026): MiMo-V2.6-Pro 46.3, GLM-5.3 44.8, Kimi K3 43.6; lab ranking by best model puts Moonshot 10th. AA v4.1 57.1, #4 of 580 (K3 report Table 5, as of 23 July 2026).
- Real-SWE: 18.8% against GLM 5.3's 28.8% as quoted on 25 Sep 2026 (https://dev.to/shaam_ai/fable-51-vs-gpt-6-astra-vs-gemini-38-flash-on-real-swe-16k3, citing Specific Labs); the live board read 1 Oct 2026 shows 20.00% against 37.50%, pass@1 over eight runs (https://withspecific.com/benchmarks/real-swe). Shown side by side.

### Inspiration
DeepSeek MLA explainer (pattern, scale unit of 64 numbers), OpenAI gpt-oss MoE animation (counters), Gemma on one machine and gpt-oss on one GPU (parameter tables reproducing the card), Kimi Linear paper Fig. 1 (TPOT against length), K3 report Figs. 3 and 5, Raschka's gallery (config diff).

## Rejected
- **RL objective calculator** (group baseline, τ): belongs to the RL page; the formula is explained in text.
- **MXFP4 block quantiser**: owned by Quantization and Precision and built on the OpenAI page; here only bits per weight matter.
- **SiTU-GLU curve**: a pretty curve with one formula; the text gives the bound (|f| ≤ β₁β₂ = 100) in a sentence.
- **Scaling-law curves** (sparsity, heads, K2 against K3 2.5×): data exist only as figures.
- **Sandbox and serving infrastructure** (MoonEP, KCP, prefix cache): systems detail outside the page's scope; one sentence each.
- **Benchmark heatmap of the K3 card**: vendor-selected, harness-mixed table; the ruler table makes the point honestly with fewer numbers.
- **Price history**: Khalid's removed category.

## What the methodology lacked here
It has no rule for when a model card and a later technical report disagree with the page's earlier "not stated" entries (dense layers, expert grouping, the LatentMoE mechanism): the fix was to treat the report as the newer primary source and say what changed. It also has no rule for a leaderboard that is re-run in place (Real-SWE moved from 18.8% to 20.00% for K3 in a week): treated as two dated readings shown side by side, like contradictory primary sources.
