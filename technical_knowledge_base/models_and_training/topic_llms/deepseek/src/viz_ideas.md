# DeepSeek page: new visualisation ideas

Research note, 1 October 2026. These are proposals for `visual.html`. Each one is new: none repeats the MLA prefill/decode switch, the per-layer cache bars, the 2% calculator, the stored-vs-read bars, the V4.1-Flash phase diagram, the expert layouts, the balancing loop, the Sinkhorn demo, the GRPO calculator, the Cache tab or the Lineage tab.

**How the research was done.** WebSearch was not available: the session's search budget was already used up. I fetched about 45 pages directly instead. These were the primary sources (the V2, V3, V3.2, R1 and V4 papers, the V4.1-Flash model card, the Open Source Week repos, the API docs and changelog) and the explainers named in the brief (Alammar, Raschka, Grootendorst, Epoch AI, SemiAnalysis, Hugging Face, the Ultra-Scale Playbook, siboehm, Welch Labs). Every figure below comes from one of those pages or from arithmetic on them. Figures I could not confirm on a fetched page are marked **(verify)**.

**What the field already draws, and what it doesn't.** Most DeepSeek explainers are static diagrams:
- pipeline flowcharts of R1's training (Alammar, Grootendorst, Hugging Face Open-R1);
- side-by-side block diagrams (Raschka's comparison article and gallery);
- an analogy-led MLA walkthrough (Hugging Face) and a poster plus video (Welch Labs).

The quantitative pictures come from DeepSeek themselves:
- the DualPipe schedule grids;
- the V3.2 cost-by-token-position chart;
- the V4 report's FLOPs and KV-cache curves against sequence length;
- the V4.1-Flash model card's cache-across-generations bar chart (Figure 1(b));
- the Day 6 inference-system charts.

Nobody has made those interactive, or recomputed them from the published configuration the way the Cache tab does. That gap is where the ideas below sit.

---

## Ranked proposals

| Rank | Name | Placement |
|---|---|---|
| 1 | Compute across generations (FLOPs per token against context) | **Own tab** |
| 2 | One day of DeepSeek's inference: cost floor against list price | **Own tab** |
| 3 | API price history and blended-price calculator | **Own tab** (or a strip under Lineage) |
| 4 | The training bill: the $5.6M figure, 6ND, and the RL top-up | **Own tab** ("Training cost"), or Reading > Numerics |
| 5 | DualPipe and pipeline-bubble simulator | Reading tab (Numerics and systems) |
| 6 | The DeepSeek template across the field (config diff explorer) | Lineage tab, as a second panel |
| 7 | R1 recipe as a data-flow river, with the distillation scatter | Reading tab (RL) |
| 8 | Expert-parallel placement and EPLB packing | Reading tab (MoE or Systems) |
| 9 | V4.1-Flash layer-mode strip and the two-stage indexer funnel | Reading tab (V4.1-Flash) |
| + | Small add-on: a DeepSeek LLM 67B line in the Cache tab | Cache tab (existing) |

---

### 1. Compute across generations: FLOPs per decoded token against context (own tab)

**What it shows and what the user does.** This is the compute twin of the Cache tab. It is a line chart of FLOPs per decoded token (log y-axis) against context length from 4K to 1M, with five lines:
- dense MLA (V3);
- DSA (V3.2), drawn as a stacked line split into "weights", "core attention" and "indexer";
- V4-Pro;
- V4-Flash;
- a flat reference line at 2 × active parameters, the cost of the weights alone.

What the user can do:
- Drag the context slider.
- Toggle "count indexer FLOPs at full cost / discount for FP8 or FP4".
- Hover a line for its arithmetic.
- Read a pinned readout that tries to reproduce the V4 report's "27% of V3.2's single-token FLOPs at 1M (Pro), 10% (Flash)", like the 2% calculator does for the cache.

**Why a picture beats text.** It shows three things words don't land:
- Each design moves the cost to a different term, and the crossovers are visible. Dense attention passes the weights' cost at about 8K tokens on V3's dimensions.
- DSA's core attention flattens past k = 2,048, but its indexer, still linear in context, takes over.
- V4 wins mostly by shrinking the indexer's input fourfold (CSA) and by making HCA's dense reads tiny.

The page's line "the indexer still scores every entry" becomes a visible bulge.

**Data and formulas** (per decoded token; 2 FLOPs per multiply-add):
- Weights: 2 × N_active (V3/V3.2: 37B; V4-Pro: 49B; V4-Flash: 13B).
- Dense MLA (absorbed): layers × n_h × L × 2 × (576 + 512). The scores use the 576-dimensional entry and the values use its first 512 dimensions.
- DSA: the same with L replaced by min(L, 2,048), plus the indexer, layers × H_I × d_I × L × 2.
- V4 CSA layers: n_h × (min(L/4, k) + 128) × 2 × (512 + 512), plus the indexer, 64 heads × 128 dimensions × L/4 × 2.
- V4 HCA layers: n_h × (L/128 + 128) × 2 × 1,024.
- Layer counts and head counts, the same as the existing 2% calculator: Pro has 61 layers (30 CSA, 31 HCA), 128 heads and top-k 1,024; Flash has 43 layers (2 SWA, 21 CSA, 20 HCA), 64 heads and top-k 512.
- Worked result, computed for this note at 1M tokens:
  - V3.2: 74 GFLOP (weights) + 35 (core attention) + 999 (indexer) ≈ 1.11 TFLOP.
  - V4-Pro: 98 + 74 + 123 ≈ 295 GFLOP, which is **26.6% of V3.2**. That reproduces the reported 27%.
  - V4-Flash: ≈ 135 GFLOP, 12.1% against the reported 10%, so the Flash figure is sensitive to its indexer size. Expose that as an assumption toggle.
  - Dense MLA would need about 17 TFLOP.
- Assumption to flag: V3.2's indexer has 64 heads of dimension 128 (from the V3.2 config.json, **verify**). The V3.2 paper text says only "a small number of heads".
- Sources:
  - V3 report hyperparameters: https://arxiv.org/html/2412.19437v1
  - V3.2 paper: https://arxiv.org/html/2512.02556v1
  - V4 report, for the 27% and 10% FLOPs and the 10% and 7% cache figures: https://arxiv.org/html/2606.19348 and https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro

**Inspired by:**
- the V4 report's Figure 1 (right panel), single-token FLOPs and accumulated KV cache against sequence length: https://arxiv.org/html/2606.19348;
- the V3.2 paper's Figure 3, inference cost by token position: https://arxiv.org/html/2512.02556v1;
- the existing Cache tab and 2% calculator.

---

### 2. One day of DeepSeek's inference: cost floor against list price (own tab)

**What it shows and what the user does.** It rebuilds DeepSeek's Open Source Week Day 6 disclosure as a live ledger:
- A 24-hour band of H800 nodes in service, between the average of 226.75 and the peak of 278.
- A token waterfall: 608B input tokens, of which 342B (56.3%) were cache hits, then 168B output tokens.
- A cost bar (GPU rental) beside a revenue bar.

The user can:
- set the GPU rental price per hour (default $2);
- set the cache-hit rate;
- set the share of traffic actually billed (the free web and app traffic is not);
- switch the price card (R1, V3, or a current model).

Outputs:
- Daily cost, revenue and margin. The defaults reproduce $87,072, $562,027 and 545%.
- The **cost floor per million tokens**, set against the list price:
  - one node is 8 GPUs × $2 = $16 per hour;
  - decode runs at 14.8k output tokens per second per node, so the floor is $16 / (14.8k × 3,600) ≈ **$0.30 per million output tokens**;
  - prefill runs at 73.7k input tokens per second per node, so the floor is ≈ **$0.06 per million input tokens**.
- A link back to the Cache tab. The average KV length per output token was 4,989, and 4,989 × 70,272 bytes ≈ **351 MB of MLA cache per sequence**, which is why decode needs wide EP144.

**Why a picture beats text.** "545% margin" reads like a boast or a scandal. The picture shows it is an artefact of the assumptions: drop the billed share and turn on off-peak pricing, and the margin collapses (DeepSeek say so themselves). The floor-against-list comparison makes the whole "price war" thread concrete: list prices sit a few times above a rental-cost floor that MLA and wide expert parallelism made low.

**Data:**
- All headline numbers (nodes, cost, revenue, tokens, cache-hit rate, per-node throughput, EP32 prefill and EP144 decode): https://github.com/deepseek-ai/open-infra-index/blob/main/202502OpenSourceWeek/day_6_one_more_thing_deepseekV3R1_inference_system_overview.md
- R1 prices ($0.14 hit, $0.55 miss, $2.19 output): https://api-docs.deepseek.com/news/news250120
- V3 prices: https://api-docs.deepseek.com/news/news1226
- The 24-hour curve's shape is an image in the Day 6 doc. Draw it as a band between the average and the peak, or digitise it and say so.

**Inspired by:**
- Day 6's own charts (node count over 24 hours, cost against theoretical income), cited above;
- SemiAnalysis on the economics of DeepSeek's pricing: https://newsletter.semianalysis.com/p/deepseek-debates;
- Epoch AI's point that R1's price edge came largely from thin gross margins: https://epoch.ai/gradient-updates/what-went-into-training-deepseek-r1.

---

### 3. API price history and blended-price calculator (own tab, or a strip under Lineage)

**What it shows and what the user does.** A step chart of DeepSeek list prices per million tokens since May 2024, on a log y-axis. There are three series (cache hit, cache miss, output), with Lineage dots on the x-axis so each price step lines up with a release. Controls:
- an input:output mix (default 3:1, the convention Artificial Analysis uses);
- the cache-hit rate;
- peak or off-peak.

These collapse the three series into one **blended price** line. A second y-axis can show it as a multiple of the Day 6 cost floor from proposal 2.

**Why a picture beats text.** The page says V2 "started the price war" and V3.2-Exp "cut prices by more than half". The chart shows two things the text can't:
- Prices did not fall monotonically. V3's standard price rose above V2's, and V4 Pro sits well above V4.1-Flash.
- After August 2024, the cache-hit price, not the headline price, is the number that moves. With realistic hit rates for agents, the blended line falls much faster than the miss line.

**Data (per million tokens, USD):**
- V2 era (May 2024): $0.14 input, $0.28 output (**verify** the output price against the price image in the V2 README: https://github.com/deepseek-ai/DeepSeek-V2).
- Context caching, 2 August 2024: hit $0.014, miss $0.14: https://api-docs.deepseek.com/news/news0802
- V3 from 8 February 2025: hit $0.07, miss $0.27, output $1.10: https://api-docs.deepseek.com/news/news1226
- R1, 20 January 2025: hit $0.14, miss $0.55, output $2.19: https://api-docs.deepseek.com/news/news250120
- V3.2-Exp, 29 September 2025: "50%+" cut. The exact figures ($0.028 hit, $0.28 miss, $0.42 output) are in the announcement's images, not its text (**verify**): https://api-docs.deepseek.com/news/news250929
- 2025 off-peak discounts (**verify**; the page I fetched did not carry them).
- Peak and off-peak pricing introduced with V4-Pro GA, 13 August 2026: https://api-docs.deepseek.com/updates
- Current: V4.1-Flash $0.006 hit, $0.30 miss, $1.20 output at peak; V4-Pro $0.044 hit, $1.32 miss, $3.96 output at peak; off-peak is half: https://api-docs.deepseek.com/quick_start/pricing
- Optional overlay: Artificial Analysis Intelligence Index and price for the current models (V4.1 Flash max 39 at $0.27; V4 Pro 0813 max 36 at $0.67): https://artificialanalysis.ai/providers/deepseek

**A labelling point found while checking.** Artificial Analysis labels its $0.27 and $0.67 as "Price (per 1M tokens)", a blended token price. The page currently calls them "per index task". Worth re-checking before reusing them in a chart.

**Inspired by:**
- Epoch AI's "price to reach a benchmark threshold over time" chart, which includes DeepSeek-V3 and Coder-V2 points: https://epoch.ai/data-insights/llm-inference-price-trends;
- Artificial Analysis's intelligence-against-price scatter: https://artificialanalysis.ai/providers/deepseek;
- the price-comparison images in the V2 README and the V3.2-Exp announcement.

---

### 4. The training bill: the $5.6M figure, 6ND, and the RL top-up (own "Training cost" tab, or Reading > Numerics)

**What it shows and what the user does.** It has three linked parts.

1. **A receipt.** V3's Table 1 as stacked bars: 2,664K GPU hours of pretraining, 119K of context extension and 5K of post-training, 2,788K in total, at $2 per hour, giving $5.576M. Toggles add what the receipt excludes, as a scale break: research and ablations (not quantified), and SemiAnalysis's estimates of about $1.6B in server capex and a fleet of about 50,000 Hopper GPUs. This shows the $5.6M as one thin slice.
2. **A 6ND calculator.** Inputs are active parameters, tokens, peak FLOP/s and MFU; the output is GPU hours. The defaults give 6 × 37B × 14.8T ≈ 3.3 × 10²⁴ FLOP. Divided by 2.664M GPU hours, that is about 343 TFLOP/s achieved per H800. Show this against the BF16 and FP8 peaks, with a note that Epoch put MFU at about 23% on its own accounting.
3. **An RL top-up.** Epoch's R1-Zero estimate, N × B × G × L × 37B × 8 FLOP, with sliders for N = 8,000 steps, B = 1,024 prompts, G = 64 samples per group and L = 4,000 tokens. That gives about 6.2 × 10²³ FLOP, about $1M. Show it as a sliver beside pretraining, and wire G to the existing GRPO calculator.

**Why a picture beats text.** It shows two things: what the famous number covers and what it leaves out, and that RL for reasoning was about a fifth of pretraining's FLOPs on Epoch's estimate, not a rounding error. Moving G or L shows why GRPO's cost lives in sampling.

**Data:**
- V3 Table 1, hyperparameters, 14.8T tokens: https://arxiv.org/html/2412.19437v1
- Epoch's FLOP, MFU and RL estimates: https://epoch.ai/gradient-updates/what-went-into-training-deepseek-r1
- SemiAnalysis fleet and capex: https://newsletter.semianalysis.com/p/deepseek-debates
- Epoch's "about ten times less compute than Llama 3.1 405B": https://epoch.ai/gradient-updates/how-has-deepseek-improved-the-transformer-architecture
- V3.2's "post-training budget over 10% of pre-training": https://arxiv.org/html/2512.02556v1
- The Nature version of the R1 paper reports R1's own training cost (widely quoted as about $294K; **verify**, since the page could not be fetched): https://www.nature.com/articles/s41586-025-09422-z

**Inspired by:**
- Epoch AI's cost breakdown (link above);
- SemiAnalysis's "the $6M is misleading" framing (link above);
- the Ultra-Scale Playbook's memory and compute calculators: https://nanotron-ultrascale-playbook.static.hf.space/index.html

---

### 5. DualPipe and pipeline-bubble simulator (Reading tab, Numerics and systems)

**What it shows and what the user does.** A rank-by-time grid like DeepSeek's README figure. Rows are pipeline ranks; cells are coloured forward, backward-for-input, backward-for-weights, or overlapped forward-and-backward (one cell with a border). Controls:
- schedule: 1F1B, ZB1P, DualPipe or DualPipeV;
- PP (4 to 16);
- micro-batches;
- the time ratios F : B : W, and how much the overlapped F&B chunk costs (full overlap means F&B ≈ max(F, B)).

The grid redraws, and a readout shows the bubble from the published formulas next to the measured idle area, along with parameter copies (2× for DualPipe), activation memory and device count (half for DualPipeV). A "show all-to-all" toggle colours the MoE dispatch and combine time that sits hidden inside the overlapped cells.

**Why a picture beats text.** The page's sentence "feeds the pipeline from both ends and overlaps communication with compute" only clicks when you see the two directions interleave and the communication vanish into the borders. The formulas also show the price, two copies of the parameters, which text tends to bury. Worked example, PP = 16 (V3's setting) with F = 1, B = 2, W = 1, F&B = 2.5:

| Schedule | Formula | Bubble (time units) |
|---|---|---|
| 1F1B | (PP − 1)(F + B) | 45 |
| ZB1P | (PP − 1)(F + B − 2W) | 15 |
| DualPipe | (PP/2 − 1)(F&B + B − 3W) | 10.5 |

**Data:**
- The bubble, parameter, activation and device table for all four schedules: https://github.com/deepseek-ai/DualPipe
- V3 Table 2, plus Figures 4 and 5 (8 PP ranks, 20 micro-batches): https://arxiv.org/html/2412.19437v1
- Real traces to calibrate the ratios (EP64 training, EP32 prefill, EP128 decode, viewable in chrome://tracing): https://github.com/deepseek-ai/profile-data

**Inspired by:**
- the DualPipe README diagrams (link above);
- the Ultra-Scale Playbook's pipeline section (AFAB, 1F1B, interleaved, zero-bubble; bubble fraction (p − 1)/m): https://nanotron-ultrascale-playbook.static.hf.space/index.html;
- siboehm's GPipe and 1F1B schedule tables (bubble fraction 1 − m/(m + n − 1)): https://siboehm.com/articles/22/pipeline-parallel-training

---

### 6. The DeepSeek template across the field: config diff explorer (Lineage tab, second panel)

**What it shows and what the user does.** Pick any two models from DeepSeek V2, V3, V3.2, V4-Flash, V4-Pro, V4.1-Flash, Kimi K2, Mistral Large 3 and GLM-4.5. A two-column config card highlights the differences: layers, hidden size, heads, KV latent, query latent, RoPE dimension, routed and active experts, shared experts, dense prefix layers, vocabulary. Live derived metrics sit beneath: KV cache per token (Cache tab formula), active and total parameters, expert combinations C(N_r, K_r), and attention FLOPs per token at 128K.

**Why a picture beats text.** The page says Kimi K2 "keeps MLA and the expert layout". The diff shows what changed and what that buys. Kimi K2 halves the heads (64 against 128) and raises routed experts to 384, yet its **MLA cache per token is identical to V3's** ((512 + 64) × 61 layers × 2 bytes = 70,272 bytes), because MLA's cache does not depend on the head count. Halving the heads cuts decode attention FLOPs instead. Readers learn which knobs move memory and which move compute, and see how far DeepSeek's design spread.

**Data:**
- V3 hyperparameters: https://arxiv.org/html/2412.19437v1
- Kimi K2 config (61 layers, 64 heads, kv_lora_rank 512, q_lora_rank 1,536, RoPE 64, 384 routed experts, 8 active, 1 shared, first_k_dense_replace 1, expert width 2,048, vocabulary 163,840): https://huggingface.co/moonshotai/Kimi-K2-Instruct/blob/main/config.json
- V4 and V4.1-Flash values from the page's existing tables and https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash
- The other models from their config.json files on Hugging Face.

**Inspired by:**
- Raschka's side-by-side figures (V3 against Llama 4 Maverick, V3 against Kimi K2): https://magazine.sebastianraschka.com/p/the-big-llm-architecture-comparison;
- his LLM Architecture Gallery, which has a compare tool and notes which models "adopt the DeepSeek architecture": https://sebastianraschka.com/llm-architecture-gallery/

---

### 7. The R1 recipe as a data-flow river, with the distillation scatter (Reading tab, RL)

**What it shows and what the user does.** A left-to-right flow diagram whose band widths are data volumes:

V3-Base → R1-Zero (pure RL; AIME pass@1 rises from 15.6% to 71.0%, 86.7% with majority voting over 64) → cold start (thousands of examples) → reasoning RL → rejection sampling (600K reasoning + 200K non-reasoning = 800K) → SFT → RL in all scenarios → R1, with an 800K branch out to the distilled students.

Click a stage to see:
- its reward type (rule-based, language-consistency or preference model);
- what it fixed (for example, unreadable, language-mixed R1-Zero output);
- one example: the R1-Zero "aha moment" quote.

A linked scatter plots each distilled student's size against its AIME 2024 score, with a reference line for the teacher:

| Student | AIME 2024 |
|---|---|
| Qwen-1.5B | 28.9 |
| Qwen-7B | 55.5 |
| Llama-8B | 50.4 |
| Qwen-14B | 69.7 |
| Qwen-32B | 72.6 |
| Llama-70B | 70.0 |

**Why a picture beats text.** R1's recipe is four stages that alternate SFT and RL. Prose turns it into a list; the river shows that most of the data the final model sees was **generated by its own predecessors**, and that the distillation branch is just the same 800K samples pointed at smaller models. The scatter shows how little of the reasoning is lost at 14B to 32B.

**Data:**
- R1 paper (Figure 2, Table 5, the aha moment, the pipeline): https://arxiv.org/html/2501.12948v1
- The 600K and 200K split and the cold-start sizes as Alammar presents them: https://newsletter.languagemodels.co/p/the-illustrated-deepseek-r1

**Inspired by:**
- Jay Alammar's Illustrated DeepSeek-R1 (link above);
- Maarten Grootendorst's Visual Guide to Reasoning LLMs: https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-reasoning-llms;
- Hugging Face's Open-R1 pipeline figure: https://huggingface.co/blog/open-r1

---

### 8. Expert-parallel placement and EPLB packing (Reading tab, MoE or Systems)

**What it shows and what the user does.** A grid of GPUs grouped into nodes. The user sets:
- the number of experts, GPUs and nodes;
- the number of redundant replicas;
- a load-skew slider that makes a few experts hot.

There are three views:
1. Naive placement (expert i on GPU i mod G), with the hottest GPU highlighted.
2. EPLB's hierarchical policy: pack expert groups onto nodes evenly, then replicate the heaviest experts within each node.
3. EPLB's global policy: replicate the heaviest experts anywhere.

The readout gives max-to-mean GPU load, which sets the step time, and the share of each token's experts that cross a node boundary. A preset switches to DeepSeek's production layout: prefill at EP32 and decode at EP144 (Day 6), the decode case giving very few experts per GPU.

**Why a picture beats text.** The page explains balancing in the router (the bias loop). This adds the other half: even a balanced router leaves hot experts, and the remedy in serving is replicating and packing them, which is a bin-packing picture. It also shows why decode wants a much wider EP than prefill (proposal 2's 351 MB of cache per sequence, and many sequences per batch).

**Data:**
- The EPLB algorithm and its worked example (2 layers, 12 experts, 4 redundant, 2 nodes, 8 GPUs). The policy is a short open Python file, so it can be ported to JS exactly: https://github.com/deepseek-ai/EPLB
- Production EP sizes: the Day 6 doc (link in proposal 2). It also gives the per-GPU expert counts for prefill and decode (**verify**; my fetch returned only the EP sizes).
- V3 training EP64 across 8 nodes and the 4-node routing limit: https://arxiv.org/html/2412.19437v1
- Optional: DeepEP's performance table by EP size, to put a latency on cross-node hops. It was not on the README I fetched, so it may now live in the repo's docs or tests: https://github.com/deepseek-ai/DeepEP

**Inspired by:**
- the EPLB README's placement output;
- Grootendorst's capacity-factor and token-overflow diagrams: https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-mixture-of-experts;
- the V3 report's appendix heatmaps of expert load by Pile domain (aux-loss-free against aux-loss-based).

---

### 9. V4.1-Flash layer-mode strip and two-stage indexer funnel (Reading tab, V4.1-Flash)

**What it shows and what the user does.** A 40-cell strip, one cell per layer, coloured by mode:

| Layers | Part | Mode |
|---|---|---|
| 1 to 2 | Encoder | Sliding-window attention |
| 3 to 20 | Encoder | Three blocks of 1 full + 5 reuse layers; adjacent positions merged 2:1 |
| 21 | Decoder | Full, with the hierarchical sparse indexer |
| 22 to 40 | Decoder | Reindex |

Engram injection points sit at layers 1 and 14, and arrows show which layers share one cache copy (3 encoder copies and 1 decoder copy). Hover a layer to see what it computes and what it reuses.

Beside it, a funnel: of 1M causally visible positions, stage 1 keeps up to 2,048 blocks of 8 (16,384 candidates) and stage 2 keeps the top 512. A slider for context length shows that stage 2's cost stays fixed.

**Why a picture beats text.** "Full, reindex and reuse layers" is three definitions in prose. The strip shows they are a pattern, and the copy-sharing arrows show exactly where the "quarter of V4-Flash's cache" comes from. Along the layer axis there are 4 cache copies, not 40. Along the channel axis, a 512-dimensional entry is shared by 64 heads. Along the sequence axis, the encoder stores half the positions.

**Data:**
- Layer pattern, the indexer's two stages, Engram and bounded replay: https://zartbot.github.io/blog/model_arch/dsv41flash_arch/en.html
- 890 bytes per token, 1/4 and 1/8 of V4-Flash, 8B and 16B active: https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash
- Per-entry byte layouts for a cache-entry inset: 528 bytes (FP8 + e8m0 scales) and 288 bytes (FP4 e2m1 + e4m3 scales): https://github.com/deepseek-ai/FlashMLA

**Inspired by:** zartbot's breakdown diagrams, and the FlashMLA README's byte-layout tables (links above).

---

### Add-on (not a new visual): a DeepSeek LLM 67B line in the Cache tab

The V4.1-Flash model card's Figure 1(b) claims a "437-fold" reduction against DeepSeek's first generation. DeepSeek LLM 67B has 95 layers and GQA with 8 KV heads of dimension 128. Its cache per token is 2 × 8 × 128 × 95 × 2 bytes = **389,120 bytes**, and 389,120 / 890 = **437.2**. That reproduces the claim exactly. Adding this line would put the reported figure on the tab, the way the 2% calculator does for V4.
- Config: https://huggingface.co/deepseek-ai/deepseek-llm-67b-base/blob/main/config.json
- Claim: https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash

---

## Methodology

This is written so another agent can follow it for an unrelated topic. Where this run differed from the ideal, that is stated, so the method isn't credited with results it didn't produce.

### 0. Before searching: list what already exists

1. Strip the existing page down to text: remove scripts and styles, remove tags, collapse whitespace. Read all of it.
2. List every existing visual, with its tab and the quantity it shows. Here that was 12 Reading-tab widgets, the Cache tab and the Lineage tab.
3. List every outbound link in the page (`grep -oE 'href="[^"]+"'`). These are your first seed sources, and they show which sources the page already relies on.
4. Note what the owner liked, and why. Here that was the Lineage and Cache tabs: the Cache tab recomputes published numbers from a formula and lets you move one parameter; Lineage organises the whole subject on one axis (time). This becomes the house style that new proposals are measured against.
5. Write down the topic's "through-line" in one sentence; here, "the cost to train and serve". Good visuals make that line measurable.

### 1. How to search, and in what order

**What happened in this run.** WebSearch returned "budget exhausted" on the first call, so no query patterns were tested. All research was done by fetching URLs directly, about 45 of them. The URLs came from three places: the page's own links, well-known canonical addresses (author newsletters, GitHub organisations, arXiv IDs, API doc paths), and links found inside fetched pages. Treat the query patterns below as a plan that has not been tested. The fetch strategy is tested.

**Source types, in the order to visit them, and why each matters.**

| Order | Source type | Why it is useful | Examples here | What to ask the fetch for |
|---|---|---|---|---|
| 1 | **Primary papers and tech reports**, HTML version (arxiv.org/html/ID) | The authors' own figures show which quantity they think matters. Their tables hold the hyperparameters every calculation needs. | V2, V3, V3.2, R1 and V4 reports | "List every figure and table with its caption; give hyperparameters; give approximate values read from figure X" |
| 2 | **Official model cards and config files** (huggingface.co/ORG/MODEL, `/blob/main/config.json`) | Exact architecture numbers. Model cards often carry a headline efficiency chart, which you can try to reproduce. | V4.1-Flash card (the 437× chart); 67B and Kimi K2 configs | "Give these keys exactly: ..." |
| 3 | **Official code and infrastructure repos** | Diagrams of systems behaviour (schedules, placements, byte layouts), formula tables, benchmark tables, sometimes raw traces. Small algorithms can be ported to JS exactly. | DualPipe, EPLB, FlashMLA, profile-data, the Day 6 inference overview | "Give the comparison table exactly; describe each figure; give the performance numbers" |
| 4 | **Official changelogs, pricing pages and announcements** | Dated events and prices, which become time series. | api-docs.deepseek.com /updates, /quick_start/pricing, /news/newsMMDD | "List every entry with its date and any price" |
| 5 | **Visual explainer blogs** | Show what the field already drew, so you can avoid copying it, and which concepts readers find hard. | Alammar, Raschka, Grootendorst, the Hugging Face MLA blog | "List every figure/visual device and what it depicts; is any of it interactive?" |
| 6 | **Interactive explorables and playbooks** | Interaction patterns that work (sliders against formula readouts, schedule grids), and how they parametrise. | Ultra-Scale Playbook, siboehm's pipeline post | "Describe the interactive widgets, their inputs and outputs, and the formulas shown" |
| 7 | **Analysts and data trackers** | External estimates that let you cross-check the official numbers, and time-series data. | Epoch AI, SemiAnalysis, Artificial Analysis | "Extract the estimates, the formulas used, and the chart descriptions" |
| 8 | **Videos and posters** | The motion metaphors. Usually the weakest data source, since only the title and description can be fetched. | Welch Labs | "Title, channel, description" |

**Query patterns to try when search is available (untested in this run):**
- `"<author>" visual guide <topic>` and `illustrated <model>`, to find explainers.
- `<model> technical report figure <quantity>`, for example "KV cache vs sequence length".
- `<technique> interactive visualization` or `<technique> explorable` or `<technique> simulator`.
- `<org> open source week` or `<org> github <component>`.
- `<model> API price history`, `<model> pricing changelog`, and `<model> training cost estimate epoch`.
- Always also query the critiques (`<claim> misleading`, `<claim> debate`), because a misconception makes a good visual.

**Fetch tactics that worked:**
- Prefer arxiv `/html/` over `/abs/`. The abstract page carries no figures.
- Ask the fetch model for exact tables, not summaries.
- Follow redirects manually (SemiAnalysis moved to a newsletter subdomain).
- Use raw.githubusercontent for READMEs when the rendered page is thin.
- Static Hugging Face Space URLs (`*.static.hf.space/index.html`) work where the Space wrapper does not.

**What failed:**
- Paywalled or bot-blocked hosts (nature.com, reuters.com).
- Prices that appear only inside images (the V3.2-Exp announcement).
- A personal blog's root page; the specific article URL worked.
- A summarised README that omitted the table I wanted (DeepEP).

When this happens, mark the number **(verify)** rather than filling it in from memory.

### 2. Criteria for judging whether a visual is useful

Score each candidate from 0 to 2 on each criterion:

1. **Parametric quantity.** Does a number change continuously with a parameter the reader can move (context length, PP, G, price, hit rate)? This is the strongest signal; it is what makes the Cache tab work.
2. **Reproduces a published claim.** Can the defaults land on a number the source states (27%, 545%, 437×, $5.576M)? This turns a claim into something the reader checks, and it tests our own understanding. Weighted ×2.
3. **Computable from public data.** Are all the inputs in a paper, config, repo or pricing page, with nothing to estimate by eye? Weighted ×2. A visual that needs data read off an image scores 1. One needing private data scores 0 and is rejected.
4. **Teaches what text cannot.** Is there a crossover, a dominant term that changes, a shape (a funnel, a bubble, a bin-packing), or a trajectory over time? If a sentence conveys it equally well, score 0.
5. **Corrects a misconception.** Does it disarm a known wrong belief ("$5.6M is what V3 cost", "545% margin", "MLA cache depends on heads", "DSA shrinks the cache")? Check the page's own Mistakes section and the analyst critiques.
6. **Through-line fit.** Does it measure the topic's central question (here, cost)? Proposals 1 to 4 each put a different cost on an axis.
7. **Not a duplicate.** Does it show something the page and the main explainers don't already show? It must not duplicate the page. Duplicating external explainers is fine only if the version here is interactive and computed.
8. **Build cost** (counted against). Can it be a few hundred lines of plain JS and SVG? Or does it need digitised images, large datasets or animation timelines?

**Ranking.** The weighted sum gives the order: reproduces-claim and computable at ×2, the rest at ×1, minus build cost. Ties go to whichever links to more existing tabs (proposal 2 links to the Cache tab and to proposal 3). Here, proposals 1 to 4 scored highest because each is parametric, reproduces a published figure, and is computable. Proposals 5 to 9 teach a mechanism well but either reproduce nothing headline-level or need assumptions such as time ratios or skew.

### 3. Tab or inline

Give a visual its **own tab** when most of these hold:
- it spans several generations or sections, not one mechanism;
- it is a "lens" on the whole subject (memory, compute, money, time);
- it has enough controls and readouts to stand alone;
- readers would come back to it as a reference.

Put it **inline in the Reading tab** when it explains one mechanism at the point where the text introduces it, and reading it without that text would confuse. Put it **inside an existing tab** when it shares that tab's axis. The config diff shares Lineage's set of models; the 67B line shares the Cache tab's chart.

A rule of thumb: a new tab should answer a question phrased as "across all of X, how does Y change?" An inline visual answers "how does this one thing work?"

### 4. Finding and checking data

- **Trace each number to the page that first states it**, ideally the primary source. Record the URL beside the number at the moment you read it.
- **Recompute before proposing.** Run a short script that reimplements each proposed visual's arithmetic and checks it against the published claim. Here that confirmed:

  | Calculation | Result |
  |---|---|
  | 6ND for V3 pretraining | 3.3 × 10²⁴ FLOP |
  | Epoch's RL formula | 6.2 × 10²³ FLOP, against Epoch's stated 6.1 × 10²³ |
  | Day 6 daily cost | 226.75 × 8 × 24 × $2 = $87,072 |
  | Day 6 margin | 545% |
  | Cache reduction from 67B | 389,120 / 890 = 437.2 |
  | V4-Pro FLOPs against V3.2 at 1M | 26.6%, against the reported 27% |

  It also exposed a sensitivity: V4-Flash computes to 12% against the reported 10%. The proposal therefore states its assumptions and exposes them as toggles.
- **Cross-check across independent sources**, for example official GPU hours against Epoch's estimate, or Artificial Analysis's labels against what the page says. Disagreements become either a caveat or a note in the write-up, such as the "per 1M tokens" against "per index task" label.
- **Label each number's status:** published, derived (with its formula), illustrative, or (verify).
- **Prefer configs and tables over figures.** If a value exists only in an image, say so and either digitise it openly or draw a band.

### 5. What was rejected, and why

| Candidate | Why it was rejected |
|---|---|
| An animated MLA explainer in the style of Welch Labs or 3Blue1Brown | Duplicates the existing mode switch and cache bars; animation adds build cost without new numbers. |
| A 3FS or DeepGEMM throughput chart (6.6 TiB/s; 1,550 TFLOPS) | Single headline numbers with no parameter to move, and off the page's through-line. A sentence does the job. |
| A FlashMLA kernel roofline | Interesting, but needs hardware peaks and per-shape data the repo does not tabulate; too far from the reader's question. |
| A loss-curve replay (FP8 against BF16, R1-Zero response length) | The data exists only as images; digitising would be imprecise and adds little over the stated "within 0.25%" or "length grows". The AIME start and end values are kept as annotations in proposal 7. |
| An intelligence-over-time chart from Artificial Analysis | Only current values were available. Index versions change, so past scores aren't comparable. It sits as an optional overlay in proposal 3. |
| A token-routing heatmap by domain | The V3 appendix heatmaps aren't published as numbers. The existing expert-layout widget already covers routing visually. |
| A separate GRPO-variants visual (DAPO, Dr. GRPO) | Belongs to the linked RL page, which owns that scope. |

The general rule: reject a visual if it is (a) a single number, (b) backed only by images, (c) already shown, or (d) outside the page's stated scope.

---

## Notes for building

- **Ones that reproduce a published figure.** Like the Cache tab and the 2% calculator, proposals 1 (27%), 2 ($87,072, $562,027, 545%), 4 (2,788K hours, $5.576M) and the add-on (437×) each match a figure DeepSeek or Epoch published. Each one can carry a "defaults reproduce X" line.
- **The two strongest new tabs**, 1 and 2, extend the Cache tab's logic: from memory to compute, then from compute to money.
- **Items marked (verify)** need a check against the page itself before shipping: the V2 output price, the V3.2-Exp prices, the 2025 off-peak terms, the V3.2 indexer head count, the per-GPU expert counts in the Day 6 doc, and the R1 cost in Nature.
- **Not used as a source:** Welch Labs (https://www.youtube.com/watch?v=0VLAoVGf_74, "How DeepSeek Rewrote the Transformer [MLA]"; the MLA poster is at http://www.welchlabs.com/store) is a good animated MLA explainer, but the page's existing MLA mode switch and cache bars already cover its ground, so no proposal relies on it.
- **Hugging Face MLA explainer:** the photo-album analogy and an 8× compression example (32 heads × 128 against a 512 latent), https://huggingface.co/blog/NormalUhr/mla-explanation. It could feed a one-line caption, not a new visual.

---

## Sources

- https://newsletter.languagemodels.co/p/the-illustrated-deepseek-r1
- https://magazine.sebastianraschka.com/p/the-big-llm-architecture-comparison
- https://magazine.sebastianraschka.com/p/technical-deepseek
- https://sebastianraschka.com/llm-architecture-gallery/
- https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-mixture-of-experts
- https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-reasoning-llms
- https://www.youtube.com/watch?v=0VLAoVGf_74
- http://www.welchlabs.com/store
- https://github.com/deepseek-ai/open-infra-index
- https://github.com/deepseek-ai/open-infra-index/blob/main/202502OpenSourceWeek/day_6_one_more_thing_deepseekV3R1_inference_system_overview.md
- https://github.com/deepseek-ai/DualPipe
- https://github.com/deepseek-ai/EPLB
- https://github.com/deepseek-ai/DeepEP
- https://raw.githubusercontent.com/deepseek-ai/DeepEP/main/README.md
- https://github.com/deepseek-ai/FlashMLA
- https://github.com/deepseek-ai/DeepGEMM
- https://github.com/deepseek-ai/3FS
- https://github.com/deepseek-ai/profile-data
- https://github.com/deepseek-ai/DeepSeek-V2
- https://arxiv.org/abs/2405.04434
- https://arxiv.org/html/2412.19437v1
- https://arxiv.org/html/2501.12948v1
- https://arxiv.org/html/2512.02556v1
- https://arxiv.org/html/2606.19348
- https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro
- https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash
- https://huggingface.co/deepseek-ai/deepseek-llm-67b-base/blob/main/config.json
- https://huggingface.co/moonshotai/Kimi-K2-Instruct/blob/main/config.json
- https://zartbot.github.io/blog/model_arch/dsv41flash_arch/en.html
- https://newsletter.semianalysis.com/p/deepseek-debates
- https://epoch.ai/gradient-updates/how-has-deepseek-improved-the-transformer-architecture
- https://epoch.ai/gradient-updates/what-went-into-training-deepseek-r1
- https://epoch.ai/data-insights/llm-inference-price-trends
- https://huggingface.co/blog/NormalUhr/mla-explanation
- https://huggingface.co/blog/open-r1
- https://huggingface.co/docs/trl/main/en/grpo_trainer
- https://nanotron-ultrascale-playbook.static.hf.space/index.html
- https://siboehm.com/articles/22/pipeline-parallel-training
- https://artificialanalysis.ai/providers/deepseek
- https://api-docs.deepseek.com/quick_start/pricing
- https://api-docs.deepseek.com/updates
- https://api-docs.deepseek.com/news/news250929
- https://api-docs.deepseek.com/news/news1226
- https://api-docs.deepseek.com/news/news250120
- https://api-docs.deepseek.com/news/news0802
- https://api-docs.deepseek.com/news/news1201 (no prices found)
- https://api-docs.deepseek.com/news/news251201 (no prices found)
- https://api-docs.deepseek.com/news/news0725 (no prices found)
- https://api-docs.deepseek.com/news/news250226 (off-peak terms not found)
- https://www.nature.com/articles/s41586-025-09422-z (could not be fetched)
- https://www.reuters.com/world/china/chinas-deepseek-says-its-hit-ai-model-cost-just-294000-train-2025-09-18/ (could not be fetched)
