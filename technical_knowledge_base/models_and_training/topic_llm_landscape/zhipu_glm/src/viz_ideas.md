# Zhipu: GLM, visualisation ideas (v3)

Central question: what does it cost to train and serve an agentic, million-token model, and which of Zhipu's choices moves that cost?
Existing page: text only, no visuals; links listed in coverage.json. No child pages, databases or video.

## Scored candidates (0 to 2 each: parameter to move, reproduces a figure (x2), computable from public data (x2), shows what prose cannot, corrects a misconception, measures the central question, absent elsewhere, step animation against the replaced method; minus build cost)

| # | Idea | Score | Placement | Status |
|---|---|---|---|---|
| Z1 | Hybrid attention animation: one decoded token through GLM-5.3-Flash (34 KDA + 11 NoPE sparse MLA, IndexPool), toggle GLM-5.3 (MLA+DSA in 78 layers, IndexShare) and full attention; layer strip to scale, context bar, indexer band (pooled at 1/4 height), top-k, write; counters | 17 | Reading, Attention | built |
| Z2 | Long-context cost tab: cache per request and attention multiply-adds per token against context for GLM-4.5 GQA, GLM-5/5.1, GLM-5.2/5.3, Flash, MLA reference; precision, IndexPool and weights toggles, budget | 16 | Own tab | built |
| Z3 | slime animation: four rollout slots, synchronous on-policy against asynchronous with policy-version shading, trainer steps, staleness discard (tau) | 15 | Reading, slime | built |
| Z4 | Lineage timeline with cards (lanes: flagship, flash/small, vision, built on GLM, corporate) | 13 | Own tab | built |
| Z5 | Inference-stack throughput by day (Z.ai Figure 1, values printed on the figure) | 11 | Reading, inline | built |
| Z6 | Job cost calculator on Z.ai list prices | 10 | Reading, Pricing | built |
| Z7 | AA v4.3 open-weight scatter, index against cost per task, frontier staircase | 11 | Reading, Where it stands | built |
| Z8 | 96 query heads in 8 KV groups grid | 7 | Reading, Shape | built (cheap, makes "heads do not grow the cache" visible) |
| Z9 | ARC pipeline diagram (GLM-4.5 expert iteration; GLM-5 sequential RL + cross-stage distillation) | 7 | Reading, ARC | built (static) |
| R1 | MTP speculative-decoding calculator | 8 | | rejected: the mechanism belongs to Inference techniques; Google page already has one (G18) |
| R2 | GRPO vs critic advantage calculator | 7 | | rejected: owned by RL for LLMs; a worked example suffices |
| R3 | Price history of GLM API | 6 | | rejected: Khalid removed price-history tabs |
| R4 | Benchmark heatmap from Zhipu tables | 6 | | rejected: vendor-run single numbers, mixed harnesses and versions |
| R5 | Muon vs AdamW toy optimiser | 6 | | rejected: belongs to the Kimi page |

## Data, formulas and sources
- Configs: GLM-4.5 (92 layers, 96 q heads, 8 KV heads, head 128), GLM-5 (78 layers, indexer every layer), GLM-5.2/5.3 (78 layers, kv_lora 512 + rope 64, indexer_types 21 full / 57 shared, index 32 x 128, topk 2048), GLM-5.3-Flash (45 layers: 34 linear_attention, 11 deepseek_sparse_attention; kv_lora 512, rope 0, index_kpool 4; KDA 64 heads x 128; hc_mult 4). Saved in src/.
- Cache per token = sum over layers (latent + indexer key / pool). GLM-5.3 47,616; Flash 5,984 (7,040 without IndexPool); GLM-4.5 188,416 (368 KiB, 46 GiB at 128K).
- Zhipu convention (docs.z.ai/guides/vlm/glm-5.3-flash): "attention compute per head per layer and average KV cache size per layer (BF16)"; published 3.01x and 4.44x. Our per-layer cache ratio 4.59x (independent, 3% off, unexplained); per whole model 7.96x. Decomposition: layer mix 4.09x, NoPE 1.125x, IndexPool 1.18x. 3.01x not reproduced (our per-head count at 1M: 4.4x; context and terms unpublished).
- IndexShare 2.9x per-token FLOPs at 1M (GLM-5.2 card): our count 2.73x with 40B active weights as multiply-adds; 2.94x with 25B. Amdahl f = 0.87.
- Work per token: indexer 32 x 128 x L / pool per indexing layer; core H x min(2048, L) x (576 + 512) (absorbed MLA), Flash 512 + 512; GQA 96 x L x 256; KDA 3 x 128^2 per head (estimate, labelled).
- Prices: docs.z.ai/guides/overview/pricing. Job example 9.28 vs 1.04 (by construction from prices).
- AA v4.3: pages/topic-llms/aa_snapshot.json (read 2026-10-01).
- Infra chart: values printed on Z.ai Figure 1 of the inference-infrastructure post.
- slime animation: illustrative episode lengths, tau = 2 illustrative; rules from GLM-5 report.
- All recomputation: recompute.py.

## Inspiration
DeepSeek MLA explainer (D14) for the before/after animation pattern; Anthropic session animation (A1) for counters; Raschka's IndexShare note for the indexer-dominates framing; Z.ai's own per-layer comparison chart.

## What the methodology lacked here
- A rule for vendor "fair comparison" normalisations (per layer, per head): the published ratio and the whole-model ratio differ by almost 2x, so both must be shown.
- A rule for figures whose values are printed as labels on an image (transcription is exact, unlike reading a curve); used here with a label.
- A way to handle stale third-party claims about a fast-changing repository (Atria's README gained an API and a benchmark table after launch coverage).
