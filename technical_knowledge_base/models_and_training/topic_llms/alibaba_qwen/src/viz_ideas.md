# Alibaba: Qwen, visualisation ideas (v3)

Research note, 1 October 2026. The page's central question, in one sentence: **how does Qwen buy capacity without paying for it per token, and what do you actually get to use?** Three answers recur: sparsity (more, smaller experts), cheaper token mixing (Gated DeltaNet, then QSA) and, on the "what you get" side, a licence that differs checkpoint by checkpoint.

## How the research was done

WebSearch was not available. Everything was fetched directly (curl into `src/`):

- **Hugging Face config.json for eight checkpoints**: Qwen3-32B, 30B-A3B, 235B-A22B, Next-80B, 3.5-397B, 3.8-27B, 3.8-2.4T-A95B, 3.8-Flash-Next. Every architecture number below is recomputed from them in `recompute.py`.
- **Licences**: LICENSE files and card front-matter for about 35 repositories, in `src/lic_*` and `src/agent_news/hf/`.
- **Papers, as arXiv HTML converted to text**: the Flash-Next architecture paper (2608.30320), the Qwen3 report (2505.09388), Gated Attention (2505.06708), Global-batch balancing (2501.11873) and Gated DeltaNet (2412.06464).
- **News and posts**, gathered by a sub-agent into `src/agent_news/`: the Qwen3-Next blog, Alibaba's 3.8-Max announcement, TechNode, MarkTechPost, Willison, XDA, Presenc.
- **AA data**: Artificial Analysis Intelligence Index v4.3 rows from `pages/topic-llms/aa_snapshot.json`, read 2026-10-01.

qwen.ai/blog is a JavaScript app and returned nothing, so nothing on it could be confirmed.

## What the field already draws

- Qwen's own figures are static: the Qwen3-Next architecture diagram, the Flash-Next architecture figure, QSA's two-pass figure and the kernel-latency curves (Fig. 6, images only).
- Raschka's gallery and comparison article show Qwen3-Next as one block diagram among many.
- Nobody animates what a hybrid layer actually reads per token against full attention.
- Nobody lays out the licence checkpoint by checkpoint. Trackers say "Apache 2.0" for the family, which is the misconception the page fights.

## Ranked candidates

Scoring is 0 to 2 per question; reproduction and computability count double; build cost is subtracted. The questions:

- **Q** a quantity moves with a parameter;
- **R** defaults reproduce a published figure (x2);
- **C** computable from public data (x2);
- **S** shows what a sentence cannot;
- **M** corrects a misconception;
- **Ctr** measures the central question;
- **N** new;
- **A** step animation, ideally against the method it replaced;
- **cost** build cost.

| # | Idea | Q | R | C | S | M | Ctr | N | A | cost | Score | Placement | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Hybrid attention animation**: one decoded token through one block of four layers on Flash-Next's dimensions. Three modes: all full attention (counterfactual), 3:1 GDN hybrid (Flash-Next as pretrained), hybrid + QSA (as shipped). Context selector, to-scale grids, running read and storage counters | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | -2 | 20 | Reading, attention section | built |
| 2 | **Configs and cache tab**: eight configs side by side, with expert parameters, KV per token, DeltaNet state, KV per request against context (log-log) and a 16/32-bit state toggle | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 0 | -1 | 19 | Own tab ("across all Qwen generations") | built |
| 3 | **Licence checker**: about 30 checkpoints by licence family, a use-case picker and a verdict per checkpoint | 2 | 1 | 2 | 2 | 2 | 2 | 2 | 0 | -1 | 18 | Own tab | built |
| 4 | **Expert grid, Qwen3 against Next on**: 128 cells with 8 lit against 512 cells with 10 + 1 lit, to scale, with routed share and stored/active computed | 1 | 2 | 2 | 1 | 2 | 2 | 1 | 1 | 0 | 17 | Reading, MoE | built |
| 5 | **Micro-batch against global-batch balancing loss**: four single-domain micro-batches and eight experts, with a specialisation slider. LBL is computed from the paper's formula both ways | 2 | 1 | 2 | 2 | 1 | 1 | 2 | 1 | -1 | 15 | Reading, MoE | built |
| 6 | **Lineage timeline**: 2023 to Sep 2026, open against closed, coloured by licence family, card per release | 1 | 0 | 2 | 2 | 1 | 1 | 1 | 0 | -1 | 12 | Own tab | built |
| 7 | **Delta rule against plain linear attention**: write (k1,v1), (k2,v2), (k1,v3), then read k1. The sum piles up, the delta rule replaces | 1 | 1 | 2 | 2 | 1 | 1 | 2 | 1 | 0 | 14 | Reading, GDN | built |
| 8 | **Flash-Next against Qwen3.7-Plus, base models**: diverging bars over 14 benchmarks | 0 | 2 | 2 | 1 | 1 | 2 | 2 | 0 | 0 | 15 | Reading, QSA section | built |
| 9 | **Distillation against RL on Qwen3-8B**: scores and GPU hours from Table 21 | 0 | 2 | 2 | 1 | 1 | 1 | 1 | 0 | 0 | 12 | Reading, distillation | built (bars) |
| 10 | **Thinking-budget strip**: budget slider against an illustrative chain length, with the inserted stop instruction | 1 | 0 | 1 | 1 | 2 | 1 | 1 | 1 | 0 | 10 | Reading, thinking | built (small) |
| 11 | **Qwen on the Intelligence Index v4.3**: index against cost per task for 4 Qwen rows | 1 | 1 | 2 | 1 | 1 | 2 | 1 | 0 | 0 | 12 | Reading, current models | built (small) |
| 12 | **GDN hybrid against SWA hybrid against full attention**: the 9-benchmark ablation (Table 1) | 0 | 2 | 2 | 1 | 1 | 1 | 2 | 0 | 0 | 13 | Reading, layout | built (compact table with bars) |

### Reproduced figures

1. **Hybrid attention animation**
   - Per token per full-attention layer: 2 × 2 × 256 = 1,024 numbers.
   - One GDN state: 48 × 128 × 128 = 786,432 numbers, so the crossover comes at 768 tokens.
   - Stored cache, by construction from the configs: hybrid 24 KiB per token, against 96 KiB for 48 full layers.
   - QSA at 1M tokens: 250,000 blocks scored and 2,048 tokens read, 488 times fewer than 1,000,000. These are the page's figures, reproduced independently from the config fields `indexer_budget` and `indexer_compress_ratio`.
   - The measured 7.6x and 4.9x (paper section 2.1.2, Fig. 6) are shown beside the read ratio and are not reproduced: reads are not time.
   - Assumption, labelled: the indexer's compressed keys are cached at 128 numbers per block.
2. **Configs and cache tab** (all independent, from config.json):
   - Expert parameters, as a share of each headline total:

     | Model | Experts (computed) | Headline total | Share |
     |---|---|---|---|
     | Qwen3-235B | 227.1B | 235B | 97% |
     | Qwen3-30B | 29.0B | 30B | 97% |
     | Next | 77.5B | 80B | 97% |
     | 3.5-397B | 387.3B | 397B | 98% |
     | 2.4T | 2.375T | 2.4T | 99% |
     | Flash-Next | 121.0B | 125B, excluding the 51B n-gram and 4B MTP | 97% |

   - KV cache per token: 188, 96, 256, 24, 30, 64, 92 and 24 KiB.
   - DeltaNet states: Next 36 MiB, 3.5 90 MiB, 27B 72 MiB, 2.4T 276 MiB and Flash-Next 54 MiB at 2 bytes. Double these at 4 bytes: the 3.5 and 3.8 configs carry `mamba_ssm_dtype: float32`, so the 32-bit state is shown as a toggle. Whether serving stores it in 32 bits is unconfirmed.
3. **Licence checker**: licence names and clauses are read verbatim from each LICENSE file. There are no derived numbers.
4. **Expert grid**: routed share 8/128 = 6.25% against 10/512 = 1.95%; the page's "2.0%" is rounded.
5. **Balancing loss**:
   - LBL = N_E Σ f_i P_i (Qiu et al. 2025, eq. 2 and 3).
   - Fully specialised routing scores 4.0 per micro-batch against 1.0 over the global batch; the toy setting is labelled illustrative.
   - The paper's measured gains (about 0.1 PPL and about 2 benchmark points, under 3% latency) are quoted rather than simulated.
7. **Delta rule**: exact arithmetic in 3 dimensions with orthonormal keys; illustrative vectors.
8. **Flash-Next against Qwen3.7-Plus**: 8 leads, largest trail 2.59 (MultiPL-E), so "at most 2.6" is reproduced independently from Table 11.
9. **Distillation**: 1,800 / 17,920 = 10.0%, "about 1/10", reproduced.

## Rejected

- **QSA kernel-latency curves** (Fig. 6): image-only data; only the two 1M arrows are stated in text.
- **Thinking-budget accuracy curves** (Qwen3 Fig. 2): image-only; the strip uses illustrative lengths instead and says so.
- **Arena placings as a chart**: preference rankings at one date (the page warns against reading them as capability); kept as text with dates.
- **Price-history and compute-across-generations tabs**: removed from DeepSeek by Khalid; the page does not centre on them.
- **Training-FLOPs comparison**: the "1/9" is the paper's own figure. Its inputs (tokens for Qwen3.7-Plus) are unpublished, so it cannot be recomputed and is quoted as stated.
- **Gated-residual animation**: the mechanism is real, but its effect is a loss and stability result, not a quantity a reader moves; prose plus the formula suffices.
- **n-gram embedding memory calculator**: one number (20,000,000 × 2,560 = 51.2B parameters, about 102 GB in 16-bit). It is stated inline with its formula instead.

## Inspiration

- DeepSeek MLA explainer (D14), for the animation mechanics.
- DeepSeek Cache tab (D11) and config diff (D6), for the Configs tab.
- Topic: llms licence spectrum (T12, runner-up there), promoted to a checker here because this page's misconception is exactly that.

## What the methodology lacked here

- **Licence content**: legal text is neither a number nor a mechanism, so the scoring questions fit it poorly. It scored well only on misconception and centrality. A rule is needed for "categorical facts that vary per item": a checker or matrix, read verbatim, never paraphrased into thresholds the text does not state.
- **Same-named benchmark sets**: the predecessor in the Flash-Next paper was not the model the page implied. The paper says "397B-A17B predecessor", and its own Table 11 names Qwen3.7-Plus, a closed model. Rule: when a paper compares against "the predecessor", read the table header, not the prose.
- **Config fields that disagree with prose**: `output_gate_type: swish` in the 27B and 2.4T configs against "sigmoid output gate" in the paper. Rule: the config describes the checkpoint; the paper may describe only its own model.
