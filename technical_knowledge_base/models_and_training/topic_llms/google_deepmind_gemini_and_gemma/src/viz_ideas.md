# Google DeepMind: Gemini and Gemma, visualisation ideas (v3)

Follows the Methodology in `interactive-html-ideas.txt`. Research by direct fetch (no web search used); every URL below was fetched on 1 October 2026.

## 0. What already exists, and the through-line

- The page (live.md) is text only plus an older embed (three widgets: a thinking-level grid, a video-window calculator, a sparse-vs-dense memory bar), built on the old template in `pages/google-deepmind-gemini-and-gemma/`. The new HTML replaces both text and embed.
- Outbound links in the page: the Gemini 1.5, 2.5, Gemma 2, 3, 4 reports; Gemini 3 Pro model card; Gemini API pricing, thinking, models, media resolution, tokens, changelog; Gemma 3n docs; Gemma 4 model card and blog; Google blogs on 3.6 Flash, 3.8 Flash, 3.8 Live, Argon; the Deep Think IMO post; The Register; DEV Community (Real-SWE); Alphabet Q2 2026; AI Weekly (Siri); Wikipedia (Gemini, Gemma).
- What Khalid liked (DeepSeek v3): the Cache and Compute tabs (a published figure recomputed from a formula, one parameter to move) and Lineage (the whole subject on one axis).
- **Through-line:** *what a request costs on Google's models, counted in tokens.* Tokens in the window (media), tokens per task (thinking, "works harder"), and bytes per token in memory (Gemma's attention layout, MoE versus dense).

## 1. What the text needs in order to be understood

1. Two families and their release order (Gemini closed, Gemma open; Flash cadence; Argon gating). A time axis.
2. Thinking control: which level each model accepts and defaults to; why a request is not portable. A matrix.
3. Media against the window: N = t (f r + a) and the 1M window; the hour-of-video example. A calculator.
4. Cost per task versus price per token ("works harder"). A decomposition of a task's cost.
5. Gemma's local/global layout: which layers keep which cache, why memory stops growing, K=V and p-RoPE. A layer strip plus a cache-versus-context chart.
6. Gemma 4 MoE versus dense on one machine: memory set by total, compute (and decode bandwidth) set by active. A fit calculator.
7. Distillation: why the teacher distribution is subsampled (storage arithmetic).

## 2. Candidates, scored (0 to 2; reproduces-claim and computable weighted x2; build cost subtracted)

| # | Candidate | Param | Repro x2 | Comp x2 | Teaches | Misconc | Through-line | Not dup | Build cost | Score | Placement |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | Media token calculator vs 1,048,576 window | 2 | 2 (342,000; 1,098,000; 11,038 s; 3,438 s; $0.2565; 2.5's 1h vs 3h) | 2 | 2 (overflow crossover) | 2 ("1M = an hour of anything") | 2 | 2 | -0 | 18 | Reading inline |
| B | Cost per task tab: AA index vs cost per task, plus a fitted decomposition of one task (uncached input, cached input, output) with levers (price period, cache share, output multiplier, batch) | 2 | 2 ($1.24, $0.93, $2.48, $7.63; by construction, stated) | 2 | 2 (input is ~60% of 3.8 Flash's bill) | 2 (per-token price) | 2 | 2 | -1 | 17 | Own tab |
| C | Gemma memory tab: KV cache against context for Gemma 3 27B and Gemma 4 12B/26B/31B, with ratio, window, K=V and precision toggles; weights + cache against a memory budget; compute and decode bytes per token | 2 | 2 (10.4 vs 62 GiB; 496/840/210/328 KiB; 52.0 vs 64.0 GB; 16.2 vs 19.2; 7.6 vs 61.4 GFLOP; 1.10 GB within 1%) | 2 | 2 (crossover of what fits) | 2 (MoE when memory-bound; E4B is not 4B) | 2 | 2 | -1 | 17 | Own tab |
| D | Lineage: both families on one time axis, closed above, open below, with a 2026 zoom | 1 | 0 | 2 | 2 (Flash cadence vs Pro stall) | 1 (preview vs stable) | 1 | 2 | -1 | 10 | Own tab (house favourite) |
| E | Thinking-level matrix with "send this level" | 1 | 0 | 2 | 2 | 2 (portability) | 1 | 1 | -0 | 9 | Reading inline |
| F | Layer strip: 5:1 layout, window, global entry size with K=V and p (37.5% at p = 0.25) | 2 | 1 (37.5% via one accounting, labelled ours) | 2 | 2 | 1 | 2 | 1 | -0 | 13 | Reading inline |
| G | Flash list price by generation (2.5 to 3.8, standard and introductory) | 1 | 0 | 2 | 2 (Flash list price rose, not fell) | 2 | 2 | 2 | -0 | 11 | Inside Cost tab (shares the money axis) |
| H | Distillation storage: full distribution vs k sparse, per token and over 14T tokens | 2 | 0 | 2 (bytes per entry illustrative) | 1 | 1 | 1 | 2 | -0 | 9 | Reading inline, small |
| I | Deep Think width vs depth simulator | 1 | 0 | 0 (no published curve) | 1 | 0 | 1 | 1 | -1 | rejected |
| J | Live Extended Thinking latency timeline | 0 | 0 | 0 (Google publishes no latency) | 1 | 0 | 0 | 2 | -1 | rejected |
| K | Benchmarks bar chart (Argon, 3.8 Flash, Live) | 0 | 0 | 2 | 0 | 0 | 0 | 1 | -0 | rejected: single numbers, no parameter, mixed benchmarks |
| L | T5Gemma asymmetric encoder/decoder sizing | 1 | 0 | 1 | 1 | 0 | 0 | 0 (owned by the T5Gemma page) | -1 | rejected: out of scope |
| M | Gemma 4 edge models (E2B/E4B) in the cache calculator | 2 | 0 | 1 | 1 | 1 | 2 | 1 | -1 | rejected: their KV sharing and global shapes do not reproduce the report's 0.05/0.14 GB from the configs (factor 2 off on E4B) |

## 3. Ranked ideas with data and inspiration

### 1. Media in the window (Reading, inline at "How media is counted")
- Shows: tokens for a video (length, resolution, audio on/off), plus images and PDF pages, stacked against the 1,048,576-token window; cost at the chosen model's input price; longest video that fits. A preset switches to Gemini 2.5-era rates (258 or 66 tokens per frame, 32 audio tokens per second).
- Formulas: N = t (f r + a); C = N / 10^6 x p_in; t_max = W / (f r + a).
- Defaults reproduce 342,000 tokens (32.6%), $0.2565; high gives 1,098,000 (overflow 49,424); 11,038 s and 3,438 s; the 2.5 preset gives about 1 hour at 258 and about 3 hours at 66 tokens per frame (2.5 report's claim).
- Data: https://ai.google.dev/gemini-api/docs/media-resolution (70/280 per frame, 25/s audio, image 280/560/1120/2240, PDF 560); https://ai.google.dev/gemini-api/docs/tokens (generic 263/s video and 32/s audio; agentic processing 1.08M vs ~108K); https://arxiv.org/abs/2507.06261 (258 to 66); https://ai.google.dev/gemini-api/docs/pricing; changelog (agentic video for 3.7, 3.6 Flash, 3.5 Flash-Lite on 1 Sep 2026).
- Inspiration: the old embed's window bar; Gemini docs' resolution table.

### 2. Cost per task (own tab)
- Shows: (a) the price list by generation for each tier (Flash: 2.5 $0.30/$2.50, 3 Flash Preview $0.50/$3.00, 3.5 $1.50/$9.00, 3.6 to 3.8 $1.50/$7.50 standard, $0.75/$3.75 introductory); (b) AA v4.3 index against cost per task (log), every priced model, Google highlighted, with a "2027 prices" toggle; (c) one task's cost split into uncached input, cached input and output, for 3.8 Flash, 3.7 Flash, 3.1 Pro, Argon and Fable 5.1, with sliders.
- Formula: C_task = [T_in (1 - h) p_in + T_in h p_cache + T_out p_out] / 10^6. T per task = AA run totals / (AA run total cost / AA cost per task); h back-solved from AA's run total. Stated plainly: the split is fitted, so the defaults reproduce $1.24, $0.93, $7.63 by construction. What is independent: the 2027 doubling ($2.49), the no-cache cost, and the token ratios (3.8 vs 3.7: input x1.45, output x1.65, reasoning x2.27, cost per task x1.34).
- Data: pages/topic-llms/aa_snapshot.json (AA v4.3.2, read 1 Oct 2026; https://artificialanalysis.ai/models/gemini-3-8-flash etc.), pricing page, 3.6 Flash blog (launch price $1.50/$7.50), The Register (launch-day "about 40 percent more per task", pre-v4.2).
- Inspiration: DeepSeek Price history and One day of inference tabs; AA's cost-to-run chart (https://artificialanalysis.ai/leaderboards/models).

### 3. Gemma memory on one machine (own tab)
- Shows: KV cache against context (1K to 256K) per model, with toggles for local:global ratio, window, K=V and cache precision; a memory-budget bar (weights at bf16 or Q4_0 from the report's table plus the computed cache) for 16, 24, 48, 80 GB; compute per token F = 2 N_active and weight bytes read per decoded token, with an illustrative bandwidth giving a decode ceiling.
- Formula: KV(T) = [L_g min(T, ctx) e_g + L_l min(T, W) e_l] b; e_l = 2 H_kv d_h; e_g = (K=V ? 1 : 2) H_kv,g d_g.
- Defaults reproduce: Gemma 3 27B at 131,072 tokens 10.4 GiB vs 62 GiB all-global (KB gallery page); gallery headlines 496, 840, 210, 328 KiB per token; Gemma 4 31B 1.09 GB vs report 1.10 GB at 32K int8 (1% low); 26B A4B 0.27 vs 0.28 (3% low); 12B 0.30 vs 0.28 (8% high, said plainly); 52.0 vs 64.0 GB, 16.2 vs 19.2 GB; 7.6 vs 61.4 GFLOP.
- Data: configs https://huggingface.co/google/gemma-4-31B-it/raw/main/config.json, gemma-4-26B-A4B-it, gemma-4-12B-it; report https://arxiv.org/abs/2607.02770 (Table 3, "up to 37.5%"); gallery https://sebastianraschka.com/llm-architecture-gallery/; Gemma 3 report https://arxiv.org/abs/2503.19786.
- Inspiration: DeepSeek Cache tab; Raschka's gallery KV-per-token fact sheets and its KV calculation notes.

### 4. Lineage (own tab)
- Two lanes on one time axis (2023 to 2026, with a 2026 zoom): Gemini releases, shutdowns and gating above; Gemma, Gemma 3n, T5Gemma below. Click a dot for the release card (what changed, numbers, source).
- Data: changelog; Wikipedia Gemini and Gemma; Google blogs; release_history.json; Gemma 3n developer guide (26 June 2025).
- Inspiration: DeepSeek Lineage tab.

### 5. Layer strip and the global entry (Reading, inline in Gemma 3 and 4)
- One cell per layer for the chosen model (Gemma 2 style 1:1, Gemma 3 27B, Gemma 4 31B); bars for the bytes each layer keeps at a chosen context; a p slider showing one accounting of K=V with p-RoPE, saving = (1 - p) / 2, 37.5% at p = 0.25 (labelled our reconstruction; the report states "up to 37.5%" without arithmetic, and its own memory table matches storing one vector per global head).

### 6. Thinking-level matrix (Reading, inline)
- From the thinking guide's table, current models only; choose a level to see which models reject it and where it is the default.

### 7. Distillation storage (Reading, small inline)
- Bytes per training token to store the teacher: full 262,144-entry distribution versus k sampled (id, probability) pairs; times the 14T tokens of Gemma 3 27B. Bytes per entry are illustrative (4-byte float, 4-byte id), labelled so.

## 4. Rejected (and why)
See rows I to M above. General: single numbers (benchmarks), no public data (latency, Deep Think curves), owned elsewhere (T5Gemma), and edge-model cache figures that do not reproduce from the configs.

## 5. What the methodology lacked for this topic
- **Fitted versus independent reproduction.** The Methodology treats "defaults reproduce X" as a test. For AA cost per task, the inputs (cache-hit share, effective task count) are not published, so any decomposition is fitted to the published total and reproduces it by construction. The method should require saying which figures are reproduced independently and which by construction.
- **Conflicting primary figures.** Gemma 4's report states "up to 37.5%" for the global cache and gives a memory table whose numbers match a 50% cut; the configs reproduce the table for the large models but not for the edge models. The method has no step for "two primary figures disagree with each other"; it should say: show both, state the arithmetic that reproduces each, and do not pick silently.
- **Dated and versioned indexes.** Index versions changed four times in September 2026 (pre-v4.2, v4.2, v4.3, v4.3.2); launch-day figures and current ones are not comparable. The method should require recording the index version beside every index number.
- **Docs pages that disagree with each other.** The generic tokens page (263/s video, 32/s audio) and the media resolution page (70 per frame + 25/s for Gemini 3) are both current. The method should ask which models a docs figure applies to.
