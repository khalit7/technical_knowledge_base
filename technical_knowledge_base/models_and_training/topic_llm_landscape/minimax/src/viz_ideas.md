# MiniMax: visualisation ideas (v3)

Page: https://app.notion.com/p/3c65c17b0d0d813ba1c0cb4ba00659b8 (no child pages, databases or video; one old embed).
Central question: **what does each of MiniMax's three attention routes (linear hybrid, full GQA, block-sparse MSA) store, read and compute per token, and where did the cheaper routes break?**
All defaults recomputed in `recompute.py` (output in `recompute.out`).

## Existing visuals and outbound links
Old embed "Interactive: MiniMax" (v2, Read / Explore / Check / Go further). Page links: MiniMax-01, M1, MSA and M2-series papers on arXiv; Text-01, M2, M3 config.json; M2 full-attention post; M3 announcement; Fireworks launch post; pricing page; Wikipedia; Morph (now an empty JS shell, 18 words fetched: dropped from resources as unreadable, kept as a link with a note); MiniMax Hugging Face org.

## Scoring (0 to 2 each; reproduce and computable count double; +1 animation point; minus build cost)

| # | Idea | Param | Repro x2 | Computable x2 | Beyond a sentence | Misconception | Central | Novel | Anim | Cost | Score | Placement |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **One decoded token, three ways** (MSA / full GQA / lightning hybrid), animated, to scale, counters, context selector | 2 | 2 (x2) | 2 (x2) | 2 | 2 (MSA shrinks the cache; 01 has no cache) | 2 | 2 | 1 | -2 | 19 | Reading, after MSA |
| 2 | **Cost by context tab**: stored, read, computed per token against context for 01 hybrid, 01 all-softmax, M2, M3 | 2 | 2 (x2) | 2 (x2) | 2 | 1 | 2 | 1 | 0 | -1 | 17 | Own tab |
| 3 | Layer strip (80 / 62 / 60 layers by attention type) with per-layer cache at a context | 1 | 2 (x2) | 2 (x2) | 1 | 2 (01 has a cache) | 2 | 1 | 0 | -1 | 15 | Reading, 7:1 hybrid |
| 4 | Parameter reconstruction from configs (total and active) | 0 | 2 (x2) | 2 (x2) | 1 | 2 (22B vs 23B; 230/10 vs 229.9/9.8) | 1 | 2 | 0 | -1 | 14 | Reading, MoE |
| 5 | SWA against full attention, paired bars from M2 report Tables 2 and 3 | 0 | 2 (x2) | 2 (x2) | 1 | 2 (benchmarks hid the gap) | 2 | 2 | 0 | -1 | 14 | Reading, M2 |
| 6 | Lightning: token-by-token against blocks of B, stepper on the toy example | 1 | 2 (x2) | 2 (x2) | 1 | 1 (lightning is a kernel) | 1 | 1 | 1 | -1 | 13 | Reading, lightning |
| 7 | CISPO against PPO-clip gradient weight as a function of r, with A sign and epsilon | 2 | 2 (x2) | 2 (x2) | 1 | 2 (CISPO just widens the clip) | 1 | 1 | 0 | -1 | 14 | Reading, CISPO |
| 8 | Kernel arithmetic intensity, Q-outer against KV-outer, with B_k and G | 2 | 1 (x2) | 2 (x2) | 1 | 0 | 1 | 2 | 0 | -1 | 11 | Reading, kernel |
| 9 | Request cost: M3 against M2.7 by input length (512K price cliff, 204,800 window) | 2 | 1 (x2) | 2 (x2) | 1 | 1 | 0 | 1 | 0 | -1 | 9 | Reading, current models |
| 10 | Lineage timeline (releases by attention route, sized by total parameters) | 1 | 0 | 2 (x2) | 1 | 0 | 1 | 1 | 0 | -1 | 7 | Own tab (one axis for the whole subject) |

Rejected: training-cost / RL bill tab (M1's $534,700 is one number; Khalid removed training-bill tabs); price history (removed pattern); benchmark bar chart of M3 against rivals (vendor single numbers, harness-dependent); index-over-time (AA versions do not compare); MSA "selection playground" with random heat as a separate tab (duplicates the animation's steps 3 to 5); MTP speculative decoding (owned by the inference page, no MiniMax acceptance data); Hailuo / speech pricing (adjacent product lines, priced per second or character).

## Data and formulas (all checked in recompute.py)
- Configs: https://huggingface.co/MiniMaxAI/MiniMax-Text-01/raw/main/config.json (80 layers, attn_type_list 7:1, 64 heads x 128, 8 KV heads, 32 experts top-2, ffn 9,216), https://huggingface.co/MiniMaxAI/MiniMax-M2/raw/main/config.json (62 layers, 48 heads, 8 KV, 256 experts top-8, max_position 196,608), M2.7 config (max_position 204,800), https://huggingface.co/MiniMaxAI/MiniMax-M3/raw/main/config.json (60 layers, 64 heads, 4 KV, 128 experts top-4 + 1 shared, first 3 dense and full attention, MSA: 4 index heads x 128, top-16 blocks of 128, score max, local block 1, 7 MTP modules).
- KV per token = layers x 2 x H_kv x d_h x 2 bytes: 40 KiB (01), 248 KiB (M2), 120 KiB (M3) + index keys 57 x 128 x 2 = 14.25 KiB if BF16 (assumption: precision of index keys not stated). State 70 x 64 x 128 x 128 x 2 B = 140 MiB.
- MSA paper eq. 12 (https://arxiv.org/abs/2606.13392): F_GQA = 2 H_q d_h N^2, F_MSA = H_kv d_idx N^2 + 4 H_q d_h N k B_k. At the paper's config (64 / 4 / 128, k = 16, B_k = 128), N = 1,048,576: 28.44x. **Reproduces the paper's 28.4x independently.**
- Kernel eqs. 13 to 16: Q-outer 15.9 (paper: about G = 16), KV-outer 83.4 (paper: about 2/3 B_k = 85.3). Reproduces both approximations.
- Generation compute per decoded token at 1M (multiply-adds over layers): M2 7.99e11, M3 8.41e10, ratio 9.5x; with all 60 layers MSA 23.3x. **MiniMax's "1/20 of the previous generation" does not reproduce under this accounting** unless the 3 full-attention layers are left out; the 9.5x is close to the reported 9x prefill gain (reconstruction, labelled).
- Decode bytes read per token per layer at 1M with M3's heads: full 2 GiB, MSA 4 MiB selected + 256 MiB index keys = 260 MiB, ratio 7.9x; the paper measures 7.6x decode on the same head shape (reconstruction, labelled).
- Parameters: Text-01 reconstruction 456.1B / 45.9B (reproduces the card exactly, independently, once the lightning layers' output gate from modeling_minimax_text_01.py is counted); M2 228.7B / 9.80B (active reproduces 9.8B; total matches the safetensors count, 1.2B under the report's 229.9B, possibly the MTP modules: unconfirmed); M3 text stack 426.2B / 23.5B, safetensors 427.0B with vision ("~428B / ~23B" on the card).
- SWA ablation: M2 report (https://arxiv.org/abs/2605.26494) Table 2 and Table 3, columns Baseline (full) and w/ SWA.
- Prices: https://platform.minimax.io/docs/guides/pricing-paygo read 1 Oct 2026. Windows: https://platform.minimax.io/docs/guides/text-generation (M2.x 204,800; M3 and M3.1-Flash-Preview 1,000,000).
- AA: aa_snapshot.json (index v4.3, methodology v4.3.2, read 1 Oct 2026): M3 29.2, cost per index task $0.5076.
- Revenue: MiniMax 2025 annual report (HKEX): https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0422/2026042202118.pdf.

## Inspiration
DeepSeek MLA explainer (pages/deepseek/v3/parts/18_js_mlx.js) for the animation's controls and manners; DeepSeek cache tab (D11) for the cost-by-context tab; Gemma layer strip (G5); the MSA paper's Figure 1 (index branch and main branch) and Figure 5 (groups pick different long-range stripes) for the selection step; the M3 card's GQA-vs-MSA efficiency figure.

## What the methodology lacked here
- A rule for **vendor wording that contradicts the vendor's own paper** (the M3 blog says MSA partitions KV "more precisely" than DSA; the paper says DSA is token-level). Handled as contradictory primary sources side by side, with granularity stated plainly.
- A rule for **headline ratios whose accounting is unstated** ("1/20 per-token compute"): show which accounting reproduces it and which does not, rather than picking one.
- Index-key precision is unstated anywhere; any stored-bytes figure for MSA's extra keys carries an assumption label.

## Built (resume, 1 Oct 2026)
1 as a canvas animation in Reading (MSA / full GQA / lightning, 128K default, 32K and 1M; 7 / 5 / 5 steps; read and stored bars to scale); 2 as the Cost by context tab; 3 layer strip; 4 MoE rebuild table; 5 SWA paired-difference chart (all rows of Tables 2 and 3); 6 lightning stepper (token by token against blocks); 7 CISPO weight plot; 8 kernel widget (same 2,048-key budget, k = 2048 / B_k); 9 request-cost bars (M3, M2.7, M2.7-highspeed, M3.1 not priced); 10 Lineage tab. Correction during build: MSA decode reads 4 MiB of selected keys and values per layer at 1M (4 groups x 2,048 x 2 x 128 x 2 B), not 2 MiB; ratio still 7.9x.
