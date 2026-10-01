# Meta: Llama and MSL, visualisation research (v3)

Central question: what does Meta trade away, and what does it get, each time it moves cost or openness (training cost up for cheap serving; weights behind an API; trust out of the model into the harness)?

Scoring: 0 to 2 each on parameter to move, reproduces a published figure (x2), computable from public data (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, step-by-step animation against the method it replaced; minus build cost.

## Built (ranked)
| # | Idea | Score | Placement | Data and formulas | Reproduces |
|---|---|---|---|---|---|
| M1 | Overtraining animation: one budget (7.2e23) spent as 8B on 15T and as 77.5B on 1.55T; height N, width 6 FLOPs per training token then 2 per served token, area = compute, same scale; ghost of the other choice; counters | 19 | Reading, Overtraining | C=6ND, N*=sqrt(C/120), C_serve=2NT; loss under Sardana fit (illustrative) | Page's worked example by construction (1,875; 77.5B; 9.7x; 2.4e23) |
| M2 | Overtraining explorer: minimise 6ND+2NT on the iso-loss curve; four fitted laws side by side (Hoffmann rounded, Sardana/De Vries, Hoffmann precise, Epoch refit); optimum tokens/param against lifetime demand with Meta's ratios | 18 | Own tab | [Sardana et al.](https://arxiv.org/abs/2401.00448) eq. 7; [Hoffmann](https://arxiv.org/abs/2203.15556); [Besiroglu](https://arxiv.org/abs/2404.10102) | Sardana Table 2 row 4 independently within 2 to 4% (29.4B/1.52T, 16.0B/3.22T, 16.7% vs 30B/1.56T, 16.4B/3.27T, 16%); gap from two-decimal loss |
| M3 | Agent security animation: one injected page through Muse's design and a naive agent; surrogate token, taint, Sentinel ask, consent in app UI, single-use card; counters | 17 | Reading, Agent security | [Meta security post](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse); scenario illustrative | n/a (mechanism) |
| M4 | Run it yourself: params rebuilt from config.json for 7 models, weights + KV vs 24/32/80/640 GB | 17 | Own tab | configs (Unsloth mirrors; meta-models for Glimmer); KV = 2 x kv x hd x 2 B per global layer per token | 8.03B, 70.55B, 405.85B; Maverick 400.7B; Scout text 107.8B (+vision to 109B); 17.2B active; Glimmer 29.65B only with gated-attention gate (assumption); Scout Int4 54.5 GB on H100; Maverick FP8 400 vs 640 GB; Glimmer BF16 55.1 GiB |
| M5 | Llama 4 layer strip: MoE/dense and chunked-RoPE/global-NoPE per layer, Scout vs Maverick, temperature factor and KV at a context, parameter table | 15 | Reading, Inside Llama 4 | config.json; HF modeling_llama4.py temperature 1+0.1 ln(1+floor((p+1)/8192)) | 400B/109B/17B independently; corrected "alternates" claim (Scout is MoE in every layer) |
| M6 | AA v4.3 index vs cost per task with Meta highlighted; release-time panel kept separate | 13 | Reading, scores | aa_snapshot.json (42 rows), AA article 2 Sep | v4.3 values from AA by construction |
| M7 | 4D mesh from Table 4 with derived MFU and days | 12 | Reading, training | [Llama 3 paper](https://arxiv.org/html/2407.21783v3) Table 4; H100 989 TFLOPs dense BF16 | products and 16M tokens/batch independently; MFU 43.5/40.4/38.4 vs 43/41/38 (middle row one point off) |
| M8 | Interruptions by cause with "count as hardware" toggles | 11 | Reading, training | Table 5 | 419 sum; "about 78%" falls between groupings (76.6% / 85.0%); Table 5's 30.1% for 148 faulty GPUs is a misprint (35.3%) |
| M9 | Lineage tab: three lanes (open, organisation, closed) with cards | 12 | Own tab | dated sources per event | n/a |

## Findings from recomputation
- 405B: paper's 15.6T tokens gives 6ND = 3.79e25, reproducing 3.8e25 (the page had assumed "slightly above 15T").
- Meta's 402B on 16.55T: 6ND gives 3.99e25 (5% over); its own law (0.29 C^0.53) gives 10.5T, at most 14.3T at the rounding edges. Shown as unconfirmed.
- Llama 2 tokens: 2T (Llama 2 paper) vs 1.8T (Llama 3 paper), shown side by side.
- Scout 10M context: KV 481 GiB even with iRoPE (12 global layers).
- Glimmer reuses the 3 local : 1 global, RoPE-only-on-local pattern; its width and depth (6,656, 52) equal LLaMA-33B's (noted here only).

## Rejected
- Benchmark bars for Llama 3.3 vs 405B, Glimmer table: single numbers, kept as text.
- Muse Spark version index line: index versions do not compare (methodology rule).
- Price history of Muse Spark: one price; and Khalid removed price-history tabs.
- Training-bill tab for Llama 3: Khalid removed training-bill tabs; the 4D mesh and days stay inline only.
- Dense vs MoE token animation: overlaps the MoE page and OpenAI's gpt-oss animation; the layer strip covers Llama 4's specifics.
- Context-extension stages: only "six stages, 800B tokens" published.
- Licence spectrum: covered by the lineup table.

## Inspiration
Sardana et al. Figure 1 (compute ratio against demand); Raschka's architecture gallery (layer strips); DeepSeek MLA explainer and Anthropic session animation (animation mechanics).

## What the methodology lacked
A rule for security architectures: there is no number to reproduce, so the before/after animation must carry an explicit "illustrative scenario, Meta's components" label and avoid implying behaviour the source does not state (surrogate swap for foreign destinations left unconfirmed). Also: check a paper's own tables for internal arithmetic (Table 5 percentage) before using them.
