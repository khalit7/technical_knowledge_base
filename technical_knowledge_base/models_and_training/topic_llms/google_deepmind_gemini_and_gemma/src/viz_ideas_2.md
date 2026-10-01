# Google DeepMind: Gemini and Gemma, visualisation ideas, round 2

This follows the Methodology in `interactive-html-ideas.txt`, including the four Google additions: mark each reproduction as independent or by construction, show primary sources that contradict each other, put the index version beside every score, and ask which models a docs figure applies to. Web search was tried once and failed ("used its web search budget", 200 of 200), so every source was fetched directly on 1 October 2026. Every proposed default was recomputed in `scratchpad/checks.py` (results quoted below).

Status labels: **published** (a source states it), **derived** (our formula applied to published inputs), **illustrative** (an assumption we chose, labelled in the UI), **(verify)** (we could not read it in a primary source).

## 0. What exists, and what this round adds

- **Built (visual.html):** Reading has the thinking-level matrix, the media token calculator (Gemini 3 and 2.5 rates), the 3.7 vs 3.8 Flash token bars, the Gemma layer strip, the p-RoPE slider and the distillation storage calculator. There are also the Lineage tab (two lanes on a time axis), the Cost per task tab (list price by generation, AA v4.3 index against cost per task, one task taken apart with a cached share h), the Gemma on one machine tab (weights plus KV against a budget, compute per token, a decode ceiling at batch 1, edge models left out), and Further reading.
- **Rejected in round 1, still rejected:** the Deep Think width-vs-depth simulator (no published curve), a Live latency timeline (Google publishes none), a benchmark bar chart, T5Gemma sizing (another page owns it), and edge models in the cache calculator (cross-layer sharing still does not reproduce 0.05 and 0.14 GB).
- **What Khalid liked:** views that recompute a published figure from a formula with one parameter to move, and views that lay the whole subject on one axis.
- **Through-line (unchanged):** *what a request costs on Google's models, counted in tokens.* This round adds four things the page does not yet count:
  - time per token: latency, speculative decoding and batching;
  - charges the token price leaves out: cache storage and search queries;
  - where the parameters of an "effective" model actually sit;
  - Google's own token volume over time.

## 1. What a reader still cannot see from the page

1. That "effective 2B" is an accounting choice: where E2B's 5.1B parameters actually live.
2. That MoE's decode advantage depends on batch size. The page says "about 7 times less to read per token", which is true at batch 1.
3. That a reasoning Flash model spends most of its response time before the first token. "Works harder" costs seconds as well as dollars.
4. That a request's bill has terms besides tokens: cache storage per hour, and a search fee per query on Gemini 3 that can exceed the token cost.
5. That a Live session is a window filling at a fixed token rate per second, and that video fills it about three times faster than audio.
6. How a drafter makes decoding faster without changing the output, and why "up to ~3x" needs an acceptance rate Google does not publish.
7. How Google's token volume has grown, and that its two published metrics are different series that cannot be spliced.
8. Contradictions in the primary sources that the page states as fact. Gemma 3's own memory table does not credit its sliding window, and the "24x El Capitan" claim compares FP8 against FP64.

## 2. Candidates, scored

Scoring as in the Methodology. Each criterion is 0 to 2. Reproduces-claim and computable are weighted x2, and build cost (0 to -2) is subtracted. In the Repro column, **I** marks an independent reproduction and **C** a reproduction by construction.

| # | Candidate | Param | Repro x2 | Comp x2 | Teaches | Misconc | Through-line | Not dup | Build | **Score** | Placement |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | Live session meter: tokens/s filling a 32K or 128K window, $/min | 2 | 2 (I: $0.018/min; $0.0045 rounds to $0.005) | 2 | 2 | 1 | 2 | 2 | 0 | **17** | Reading, inline at "Gemini 3.8 Live" |
| B | Google's token volume on one time axis (two series, never spliced) | 1 | 2 (I: x50, "doubled", +60%) | 2 | 2 | 2 | 2 | 2 | -1 | **16** | Own tab "Scale" (or a lane in Lineage) |
| C | Where E2B's parameters live (PLE map, "what counts as effective" toggle) | 1 | 2 (I: 2,340M, 2,820M from configs) | 2 | 2 | 2 | 2 | 1 | 0 | **16** | Reading, inline at "Gemma 3n" |
| D | Gemma 3's memory table against the window it describes | 2 | 2 (I: 0.9, 4.7 GB within 3% as all-global) | 2 | 1 | 2 | 2 | 1 | 0 | **16** | Inside Gemma on one machine |
| E | Charges the token price leaves out: cache storage per hour, search per query | 2 | 0 (derived only) | 2 | 2 | 2 | 2 | 2 | -1 | **15** | Inside Cost per task (panel 4) |
| F | Batch roofline: decode tokens/s against batch, MoE expert coverage | 2 | 2 (I: B_crit 240 on v5e) | 1 (uniform routing illustrative) | 2 | 2 | 2 | 2 | -1 | **15** | Inside Gemma on one machine |
| G | Speculative decoding with the MTP drafter | 2 | 2 (I: 12 of 12 rows of Leviathan Table 4 within 0.1) | 2 | 2 | 1 | 1 | 2 | -1 | **15** | Inside Gemma on one machine, or Reading at Gemma 4 |
| H | TPU generations at matched precision, plus cost per useful FLOP | 1 | 2 (I: 42.5 EF; 6x, 4.5x, 1.5x Trillium) | 2 (one peak (verify)) | 2 | 2 | 1 | 1 (KB TPU page overlaps) | 0 | **15** | Reading, inline at "How Google trains" (or the TPU page) |
| I | Time to answer: TTFT plus streaming, with Gemini Diffusion | 2 | 0 (C: AA's E2E uses the same sum) | 2 | 2 | 2 | 2 | 2 | 0 | **14** | Inside Cost per task (as "cost in seconds") |
| J | How long a model code lives: preview and stable lifespans, notice periods | 1 | 1 (I: 14-day minimum; one 1-day exception (verify)) | 2 | 2 | 2 | 0 | 1 | 0 | **12** | Inside Lineage (toggle) |
| K | Arena scores with CIs: which ranks are distinguishable | 1 | 0 | 2 | 2 | 2 | 0 | 2 | 0 | 11 | Optional, inside Cost tab beside the AA scatter |
| L | Training compute on one axis + pod-days calculator | 2 | 1 (C: PaLM 6ND = Epoch's 6ND) | 1 (Gemma 4 tokens and Gemini compute unpublished) | 2 | 1 | 1 | 2 | -1 | 11 | Rejected (see 4) |
| M | Gemma 4 long context: RULER at 32K/128K against KV bytes per token | 1 | 0 | 2 | 1 | 1 | 1 | 2 | 0 | 10 | Rejected |
| N | Image tokens: 2.x tiling against 3.x fixed resolution | 2 | 0 | 1 (tile rule "as needed") | 2 | 1 | 2 | 1 | 0 | 10 | Rejected (add-on note only) |
| O | Gemini Diffusion latency on its own | 1 | 0 | 1 | 1 | 0 | 0 | 2 | 0 | 6 | Folded into I |

Ties are broken by links to existing tabs. D, F and G all extend Gemma on one machine; E and I extend Cost per task.

## 3. Ranked ideas

### 1. Live session meter (score 17; Reading, inline at "Gemini 3.8 Live")

**What it shows and what the user does.** A horizontal window bar (32K for half-cascade Live models, 128K for native audio) fills in real time, or scrubbed with a time slider, as a session runs. The user toggles:
- user audio in;
- model audio out;
- camera video at 1 fps;
- rates: Gemini 3 media resolution (70 per frame and 25/s audio) against the 2.0-era rates (258 per frame and 32/s).

Readouts are tokens used, minutes until the window is full, cost so far at Live prices, and a marker for the documented session limits (15 min audio-only, 2 min audio plus video).

**Why text cannot do it.** Two crossings are visual:
- With video on, the bar fills about three times faster.
- At 2.0-era rates a 32K window fills at about 1.9 minutes, which is where the documented 2-minute audio-plus-video limit sits.

That correspondence is **our reconstruction, unconfirmed**: Google does not say why the limit is 2 minutes. At Gemini 3 rates in a 128K window the same session would last about 23 minutes.

**Formulas.**
- Tokens: N(t) = t (a_in + a_out + f r).
- Cost: C = t (a_in p_audio_in + a_out p_audio_out) / 10^6.
- Time to fill: t_full = W / (a_in + a_out + f r).

**Data, with status.**
- Published: $3.00 per 1M audio in, or $0.005/min; $12.00 per 1M audio out, or $0.018/min; "calculated at a rate of 25 tokens per second of audio" (https://ai.google.dev/gemini-api/docs/pricing).
- Published: a window of "128k tokens for native audio output models [and] 32k tokens for other Live API models", and 15-minute and 2-minute limits (https://ai.google.dev/gemini-api/docs/live-guide).
- Published: connection lifetime "around 10 minutes"; resumption tokens "valid for 2 hr" (https://ai.google.dev/gemini-api/docs/live-session).
- Published: 70 per frame and 25/s audio for Gemini 3 (https://ai.google.dev/gemini-api/docs/media-resolution); 32/s and 258 per image tile on the generic page (https://ai.google.dev/gemini-api/docs/tokens).
- Derived: 25 x 60 = 1,500 tokens/min. Output 1,500 x $12 / 10^6 = $0.0180/min, which matches the published $0.018 (**independent**). Input $0.0045/min against the published $0.005, so the rate is rounded up, and the UI says so.
- Derived: a 15-minute two-way audio session is 45,000 tokens and $0.338.
- Illustrative: the "user speaks / model speaks" duty cycle (default 50/50), labelled.

**Disagreeing docs pages.**
- The changelog (9 April 2025) says session resumption stores state for "24-hour" storage; the live-session page says resumption tokens are valid for 2 hours. Show both, and date them.
- The Live pricing rows carry no cache price, so a long session cannot be cached. Which models this applies to: 3.8 Live only.

**Defaults reproduce.** $0.018/min (independent). The 2-minute limit is reconstructed from 32K at 290 tokens/s (our reconstruction, not Google's statement).

**Inspiration.** The page's own media calculator (same N = t(fr + a)); AA's speech-to-speech pages; the Live API docs' session diagrams.

**Build cost.** Low: one bar, three toggles, a slider, about 150 lines.

### 2. Google's token volume on one axis (score 16; own tab "Scale", or a lane on Lineage)

**What it shows and what the user does.** A log-scale time axis, May 2024 to July 2026, with two series that are never joined:
- monthly tokens across all surfaces (products plus API): 9.7T (May 2024), 480T (May 2025), 980T (July 2025), 1.3 quadrillion (October 2025);
- API tokens per minute: 7B (Q3 2025), 10B (Q4 2025), 16B (Q1 2026), 22B (Q2 2026).

A unit toggle converts the API series to per month (22B/min is about 950T per 30-day month), so the reader sees it sit at the level of the all-surfaces figure from a year earlier, and why the two still cannot be spliced. A doubling-time readout runs between any two points the user selects. Optional lanes show Gemini app MAU (400M, 450M, 650M, 750M, 950M) and quarterly capex.

**Why text cannot do it.** It shows the shape. Doubling took about 2.1 months (May 2024 to May 2025) and about 1.9 months (May to July 2025), then 7.4 months (July to October 2025). The API series doubles about every 5.5 months. Growth is fast but slowing, and the slope change is the point.

**Formula.** Doubling time = Δt · ln 2 / ln(b/a). Unit conversion: per month = per minute x 60 x 24 x 30 (30-day month, stated).

**Data, with status.** All published, dated:
- I/O 2025: "9.7 trillion tokens a month ... Now, we're processing over 480 trillion — that's 50 times more"; 400M MAU (https://blog.google/technology/ai/io-2025-keynote/).
- Q2 2025: "over 980 trillion monthly tokens"; 450M MAU (https://blog.google/inside-google/message-ceo/alphabet-earnings-q2-2025/).
- Q3 2025: "over 1.3 quadrillion monthly tokens, more than 20x growth in a year"; "7 billion tokens per minute, via direct API"; 650M MAU (https://blog.google/inside-google/message-ceo/alphabet-earnings-q3-2025/ and https://www.sec.gov/Archives/edgar/data/0001652044/000165204425000087/googexhibit991q32025.htm).
- Q4 2025: "over 10 billion tokens per minute ... up from 7 billion"; "over 750 million monthly active users"; "lower Gemini serving unit costs by 78% over 2025"; capex $91.447B for 2025 and $175 to 185B guided for 2026 (https://www.sec.gov/Archives/edgar/data/0001652044/000165204426000012/googexhibit991q42025.htm, https://blog.google/inside-google/message-ceo/alphabet-earnings-q4-2025/).
- Q1 2026: "more than 16 billion tokens per minute ... up 60% from last quarter"; capex $35.674B (https://www.sec.gov/Archives/edgar/data/0001652044/000165204426000043/googexhibit991q12026.htm).
- Q2 2026: 22B per minute; 950M MAU; capex $44.924B (https://www.sec.gov/Archives/edgar/data/0001652044/000165204426000066/googexhibit991q22026.htm).

**Defaults reproduce (independent).** Each is a ratio of two published figures checked against the stated ratio:
- 480 / 9.7 = 49.5, stated as "50 times";
- 980 / 480 = 2.04, stated as "doubled";
- 16 / 10 = 1.60, stated as "up 60%";
- 1.3Q at "more than 20x in a year" implies October 2024 was under 65T.

**Correction for the page.** The Reading tab says the 750 million MAU figure "is not in the Q2 release and its source is not confirmed here". The Q4 2025 exhibit states it: "the Gemini App has grown to over 750 million monthly active users." The page can now cite it.

**Caveats shown in the UI.**
- "Across all our surfaces" and "via direct API" are different populations.
- The all-surfaces series stops being reported in the earnings releases after Q3 2025. The EDGAR full-text search finds "tokens per minute" only from Q3 2025 on, and no hits for "trillion tokens" or "quadrillion".

**Inspiration.** The page's Lineage tab (one time axis); Epoch AI's log-scale trend charts (https://epoch.ai/data-insights/llm-inference-price-trends).

**Build cost.** Medium (-1): a new tab with two series, a unit toggle and a two-point picker. It could start as a lane in Lineage at build cost 0.

### 3. Where E2B's parameters live (score 16; Reading, inline at "Gemma 3n" or Gemma 4)

**What it shows and what the user does.** A stacked bar per model (E2B, E4B) splitting the checkpoint into the parts in Table 1 of the Gemma 4 report: audio encoder, vision encoder, main embedder, per-layer embeddings (PLE), transformer einsums and the MTP drafter. A slider for the per-layer embedding width (default 256) and a layers control recompute the PLE block live. A second control, "count as effective", ticks parts in or out and shows which accounting lands on the published "2.3B and 4.5B effective".

**Why text cannot do it.**
- The bar shows that nearly half of E2B (2.34 of 5.07B) is a lookup table that can sit outside accelerator memory.
- The toggle shows that no single accounting gives both headline numbers. Einsums plus the embedder gives 2.27B and 4.61B (rounding to 2.3 and 4.6). Einsums plus the encoders gives 2.33B and 4.40B (2.3 and 4.4).
- The report's memory table (E2B 4.6 GB, E4B 9.0 GB in bf16, i.e. 2.3B and 4.5B at 2 bytes) uses yet another rounding.

**Formula.** PLE = L x d_ple x V; main embedder = V x d_model.

**Data, with status.**
- Published, configs: E2B has 35 layers, d_model 1,536, hidden_size_per_layer_input 256, vocab 262,144; E4B has 42 layers and d_model 2,560 (https://huggingface.co/google/gemma-4-E2B-it/raw/main/config.json, https://huggingface.co/google/gemma-4-E4B-it/raw/main/config.json).
- Published, Table 1: E2B is 305M audio, 150M vision, 400M + 2,340M embedder, 1,870M einsums and a 76M drafter; E4B is 305M, 150M, 670M + 2,820M, 3,940M and 77M. Table 3 gives the memory figures (https://arxiv.org/html/2607.02770).
- Published, Gemma 3n: "1.91B" resident (https://ai.google.dev/gemma/docs/gemma-3n); "approximately 2B for E2B and 4B for E4B" core weights (https://developers.googleblog.com/en/introducing-gemma-3n-developer-guide/).
- Derived: PLE 35 x 256 x 262,144 = 2,348.8M against the published 2,340M (0.4%), and 42 x 256 x 262,144 = 2,818.6M against 2,820M. Main embedder 402.7M against 400M, and 671.1M against 670M. Totals 5,065M (5.1B) and 7,885M (about 8B).

**Contradictory primary figures.** "2.3B and 4.5B effective" (report text) cannot both come from one sum of Table 1. Show the three candidate accountings and do not pick one.

**Defaults reproduce.** The PLE and embedder sizes **independently**, from configs to the report's table. The effective counts are shown as a contradiction, not a reproduction.

**Inspiration.** HF Gemma 4 blog's description of PLE as "a parallel, lower-dimensional conditioning pathway" (https://huggingface.co/blog/gemma4); HF Gemma 3n blog ("while having 5B real parameters, takes about as much GPU memory as if it were a 2B", https://huggingface.co/blog/gemma3n); Raschka's gallery fact sheets.

**Build cost.** Low: two stacked bars and checkboxes. It corrects the page's own Mistakes entry ("Reading E4B as a 4B checkpoint").

### 4. Gemma 3's memory table against its own window (score 16; inside Gemma on one machine)

**What it shows and what the user does.** It adds Gemma 3 1B, 4B, 12B and 27B to the KV-against-context chart, with a switch between two lines:
- "as the Gemma 3 report's Table 3 counts it";
- "with the 5:1 window credited".

A context slider (default 32K, the table's setting) moves both lines.

**Why text cannot do it.** The two lines differ five- to six-fold at 32K (27B: 18.7 GB in the table against 3.1 GB computed with the window). The table's figures sit within 3% of an all-global cache for 1B and 4B. So the report's memory table, the figure most people quote for "what Gemma 3 needs", does not credit the sliding window that the same report says cuts KV overhead from about 60% to under 15%.

**Formula.** As on the existing tab: KV(T) = [L_g T + L_l min(T, W)] · 2 H_kv d_h · b.

**Data, with status.**
- Published, configs: 1B is 26 layers, 1 KV head of 256, window 512; 4B is 34 layers, 4 x 256, window 1,024; 12B is 48 layers, 8 x 256; 27B is 62 layers, 16 x 128 (https://huggingface.co/unsloth/gemma-3-1b-it/raw/main/config.json, .../gemma-3-4b-it/..., .../gemma-3-12b-it/..., .../gemma-3-27b-it/...). These are unsloth mirrors, because the google/ repos returned 401. Mark them as mirrors.
- Published, Table 3 (bf16 weights, then +KV at 32K): 1B 2.0 and 2.9 GB; 4B 8.0 and 12.7; 12B 24.0 and 38.9; 27B 54.0 and 72.7. The text says "less than 15%" against "60%" (https://arxiv.org/html/2503.19786).
- Derived: table KV is 0.9, 4.7, 14.9 and 18.7 GB. All-global gives 0.87, 4.56, 12.88 and 16.64 GB (ratios 1.03, 1.03, 1.16, 1.12). Windowed gives 0.15, 0.79, 2.48 and 3.12 GB.

**Contradictory primary sources.** The table matches an all-global cache within 3% for 1B and 4B. For 12B and 27B it is 12 to 16% above even all-global; something else is counted there (verify). The Gemma 4 report's own table (1.10 GB for 31B) does credit the window; the existing tab reproduces it within 1%. Show the report figure, our all-global figure and our windowed figure side by side, and state which accounting reproduces each.

**Defaults reproduce.** Table 3 for 1B and 4B **independently**, as all-global. The windowed line is derived.

**Inspiration.** The existing tab; Raschka's gallery (496 KiB per token for 27B, no window credited).

**Build cost.** Low: four presets on an existing chart.

### 5. Charges the token price leaves out (score 15; Cost per task, new panel 4)

**What it shows and what the user does.** It has two linked mini-calculators.

**(a) Explicit cache: storage against savings over time.**
- Inputs: cached context size, reuses per hour, TTL in hours, model.
- Output: cost with and without the cache, over time, with a break-even line.

**(b) Search grounding: one request's bill split into input tokens, output tokens and search fees.**
- Inputs: searches per prompt, tokens in and out, and Gemini 2.5 (per prompt) against Gemini 3 (per query) billing.

**Why text cannot do it.** It has two crossovers:
- On Flash, a cache pays once it is reused more than about 0.74 times an hour (one reuse every 81 minutes). On 3.1 Pro, whose storage is 9 times dearer, it needs a reuse every 24 minutes.
- On Gemini 3 a single search ($0.014) costs about 1.9 times the tokens of a typical 5K-in, 1K-out 3.8 Flash request. Per-query billing beats 2.5's flat $35 per 1,000 prompts only below 2.5 searches per prompt.

**Formulas.**
- Cache break-even, reuses per hour: r* = s / (p_in - p_cache), with s the storage price per 1M per hour.
- Grounding cost: C = T_in p_in + T_out p_out + q x $0.014. The 2.5 and 3 billing models break even at q* = 35/14 = 2.5 queries per prompt.

**Data, with status.**
- Published, pricing page (https://ai.google.dev/gemini-api/docs/pricing):
  - 3.8 Flash: cache $0.075 and storage $0.50 per 1M per hour, doubling to $0.15 and $1.00 on 1 January 2027;
  - 3.5 Flash: $0.15 + $1.00;
  - 3.1 Pro: $0.20 (≤200K prompts) or $0.40, with storage $4.50;
  - Search grounding: 2.5 gives "1,500 RPD (free ...), then $35 / 1,000 grounded prompts"; 3.x gives "5,000 free search requests per month (shared across all Gemini 3.x models), then $14 per 1,000 requests".
- Published, caching docs: "Implicit caching is enabled by default for all Gemini 2.5 and newer models"; minimum 4,096 tokens on the 3.x Flash models and 3.1 Pro, 2,048 on 2.5 (https://ai.google.dev/gemini-api/docs/caching).
- Published, grounding docs: billed "for each search query that the model decides to execute"; per prompt on 2.5 (https://ai.google.dev/gemini-api/docs/google-search).
- Derived: r* = 0.50 / 0.675 = 0.74 per hour (Flash, unchanged in 2027 because both prices double); 4.50 / 1.80 = 2.5 per hour (3.1 Pro).
- Illustrative: the 5K-in, 1K-out request, and searches per prompt (default 2, the docs' Euro 2024 example).

**Disagreeing docs pages.**
- The grounding page names no free quota, while the pricing page gives 5,000 per month.
- The Maps row says "5,000 prompts per month ... then $14 / 1,000 search queries", mixing units.
- The caching page omits the default TTL, so the TTL default is illustrative (1 hour, labelled).
- The pricing page ties these figures to specific models; the panel lists which models each applies to.

**Defaults reproduce.** Nothing headline-level (derived only), which is why it scores 15 rather than 17. It extends the existing panel 3 (the cached share h) with what keeping that cache costs.

**Inspiration.** The DeepSeek Cache tab (a break-even crossover); the existing panel 3.

**Build cost.** Medium (-1): two small charts sharing the model selector.

### 6. Batch roofline: when MoE stops being cheaper to decode (score 15; inside Gemma on one machine)

**What it shows and what the user does.**
- **Controls:** batch size B (1 to 512), the chip (H100 at illustrative 989 TF bf16 and 3.35 TB/s; TPU v6e; Ironwood), the model (26B A4B, 31B, 12B), context and precision.
- **Main chart:** time per decode step and tokens per second against B. A second line counts how many of the MoE's 128 experts the batch touches.
- **Markers:** B_crit = peak / bandwidth, where decode turns compute-bound.

**Why text cannot do it.** At B = 1 the MoE reads 7.6 GB per step against 64 GB for 31B in bf16, the advantage the page states. Under uniform routing, a batch of 8 already touches about 52 of 128 experts and a batch of 32 about 112 (87%). So the MoE's bytes-per-step advantage over 31B mostly disappears in served settings, while its FLOP advantage (3.8B against 30.7B active per token) remains once compute-bound. The dominant term changes with B, and the misconception "MoE is 7 times faster" holds only at batch 1.

**Formulas.** From the Scaling Book:
- step time = B·KV/W_hbm + max(2 B N_active / F, P_read / W_hbm);
- P_read for an MoE = shared + E(B) · expert size, with E(B) = n [1 - (1 - k/n)^B] for n = 128 and k = 8, uniform routing;
- B_crit = F / W_hbm.

**Data, with status.**
- Published: the formulas, and B_crit = 240 for v5e (https://jax-ml.github.io/scaling-book/inference/).
- Published, TPU specs: v5e 1.97e14 FLOP/s and 8.2e11 B/s (https://jax-ml.github.io/scaling-book/tpus/); v6e 918 TF bf16 and 1,638 GBps (https://docs.cloud.google.com/tpu/docs/v6e); Ironwood 2,307 TF bf16 and 7,380 GBps (https://docs.cloud.google.com/tpu/docs/tpu7x).
- Published, models: 8 of 128 experts plus 1 shared (page and model card); active weights 7.6 GB and 2.8 GB (Gemma 4 report, Table 3).
- Derived: B_crit is 240 on v5e (matches, **independent**), 560 on v6e, 313 on Ironwood bf16 and 625 at fp8.
- Illustrative: uniform routing (real routers are skewed; labelled); the per-expert size, back-solved from 7.6 GB active (**by construction**).

**Defaults reproduce.** B_crit 240 (independent). The B = 1 bytes (7.6 GB) by construction, from Table 3.

**Inspiration.** Scaling Book inference chapter (roofline and step-time formula); the existing decode-ceiling readout.

**Build cost.** Medium (-1): one chart with two y-series and a chip preset table.

### 7. Speculative decoding with the MTP drafter (score 15; inside Gemma on one machine, or Reading at Gemma 4 "A built-in draft model")

**What it shows and what the user does.** The user sets the acceptance rate α, the drafted tokens γ and the drafter cost ratio c, and gets:
- a step-by-step strip of drafted tokens accepted or rejected (geometric, seeded);
- expected tokens per target pass;
- the speedup curve against γ, with its optimum marked.

There are two presets:
- **"Leviathan et al., T5-XXL"**: the 12 published configurations. The UI shows the computed factor next to the paper's expected and measured columns.
- **"Gemma 4 31B + 500M drafter"**: c = 0.5/30.7 = 0.016 (illustrative, a parameter ratio). It shows that HF's "up to ~3x" needs α of about 0.79 at γ = 4, or about 0.75 at γ = 5.

**Why text cannot do it.** It shows:
- the optimum γ, past which more drafts slow decoding;
- the α > c condition;
- that the output distribution is unchanged, so speed is bought with wasted FLOPs, not quality.

**Formulas (published, Leviathan et al. Theorem 3.8).**
- Expected tokens per iteration: (1 - α^(γ+1)) / (1 - α).
- Walltime improvement: (1 - α^(γ+1)) / ((1 - α)(γc + 1)).

**Data, with status.**
- Published: Table 4 rows such as EnDe T5-small, temp 0, γ 7, α 0.75, c 0.02, expected 3.2, measured 3.4 (https://arxiv.org/abs/2211.17192).
- Published: drafter sizes of 76M, 77M, 400M, 430M and 500M, "a 4-layer Transformer block" (Gemma 4 report, https://arxiv.org/html/2607.02770).
- Published: "end-to-end speedups go up to ~3x depending on hardware, batch size, and workload" (https://huggingface.co/blog/gemma4).
- Published: AI Overviews uses it (https://research.google/blog/looking-back-at-speculative-decoding/).
- Unpublished, so illustrative: α for Gemma 4.

**Defaults reproduce.** All 12 rows of Table 4's expected column to within 0.1, recomputed: 3.16, 3.25, 2.50, 2.26, 2.35, 1.93, 2.40, 2.62, 2.02, 1.89, 1.80, 1.54 against 3.2, 3.3, 2.5, 2.3, 2.4, 2.0, 2.4, 2.6, 2.0, 1.9, 1.8, 1.6 (**independent**). The Gemma "~3x" is fitted **by construction**: α is solved for, and labelled so.

**Contradiction.** Google's 2024 retrospective says T5-Small has "60M" parameters; the paper's own setup says 77M. Show the paper's figure and footnote the other.

**Inspiration.** The Google Research retrospective's accepted/rejected token animation; Scaling Book's speculative-decoding section.

**Build cost.** Medium (-1): a token strip plus a curve.

### 8. TPU generations at matched precision, and cost per useful FLOP (score 15; Reading, inline at "Everything on TPUs", or on the KB's TPU page)

**What it shows and what the user does.** One row per TPU generation on a log axis of peak FLOP/s per chip and per pod: v4 (4,096-chip pod), v5p (8,960), v5e, v6e (256), Ironwood (9,216). A precision toggle switches bf16 and fp8. Columns show HBM, bandwidth, ICI and B_crit, and an "H100 equivalents per pod" readout. A comparison marker shows El Capitan in FP64 (Rmax 1.809 EF, Rpeak 2.82 EF) and, with the toggle, at the MI300A's own FP8 or BF16 peak.

A second panel shows cost per effective PFLOP-hour = $/chip-hour / (peak x MFU), with MFU sliders for TPU and GPU and the break-even MFU.

**Why text cannot do it.** "More than 24x ... El Capitan" compares FP8 with FP64. At matched precision the comparison flips: about 90 EF FP8 for El Capitan's 46,080 MI300A (verify peak) against 42.5 EF for an Ironwood pod. And B_crit rises across generations (v4 229, v5p 166, v6e 560, Ironwood 313 bf16), because FLOPs grew faster than bandwidth.

**Formulas.**
- Pod FLOP/s = chips x peak.
- B_crit = peak / bandwidth.
- Break-even MFU_TPU = MFU_GPU x (c_TPU / c_GPU) x (peak_GPU / peak_TPU).

**Data, with status.**
- Published, Ironwood blog: "4,614 TFLOPs", 9,216 chips, "42.5 Exaflops", "192 GB per chip, 6x that of Trillium", "7.37 TB/s ... 4.5x", "1.2 TBps ... 1.5x", "24x ... El Capitan ... 1.7 Exaflops" (https://blog.google/products/google-cloud/ironwood-tpu-age-of-inference/).
- Published, Cloud TPU docs: tpu7x 2,307 bf16 and 4,614 fp8, 192 GiB, 7,380 GBps, 1,200 GBps, 9,216 per pod (https://docs.cloud.google.com/tpu/docs/tpu7x); v6e 918 TF, 32 GB, 1,638 GBps, 800 GBps, 256 chips (https://docs.cloud.google.com/tpu/docs/v6e); v5p 459 TF, 95 GiB, 2,765 GBps, 8,960 (https://docs.cloud.google.com/tpu/docs/v5p); v4 275 TF, 32 GiB, 1,200 GBps, 4,096 (https://docs.cloud.google.com/tpu/docs/v4).
- Published, El Capitan: Rmax 1,809 PF, Rpeak 2,821.1 PF, June 2026 list (https://top500.org/system/180307/); 46,080 MI300A, 2,889.2 PF (https://hpc.llnl.gov/hardware/compute-platforms/el-capitan).
- (verify): MI300A FP8 1,961.2 TF and BF16 980.6 TF dense. AMD's spec page and datasheet timed out; TechPowerUp returned 403.
- Published, SemiAnalysis estimates: "$1.60 per TPU-hour"; "~41% lower than the cost of the GB300"; break-even "19% extracted MFU for Anthropic" against GB300 at 30% (https://newsletter.semianalysis.com/p/tpuv7-google-takes-a-swing-at-the).
- Derived: 4,614 x 9,216 = 42.52 EF (matches, **independent**); 192/32 = 6.0, 7,380/1,638 = 4.5 and 1,200/800 = 1.5 (match). The break-even is 19.2% if GB300 FP8 dense is 5 PF (verify), or 17.3% at 4.5 PF. It reproduces SemiAnalysis's 19% only under the 5 PF assumption, so it is labelled by construction.
- Epoch H100e per pod as a cross-check: v4 pod 569, v5p pod 4,156 (https://epoch.ai/data/gpu_clusters.csv). Our 8,960 x 459 / 989 = 4,158 matches v5p. Epoch's v4 figure is half of our 1,139, because Epoch counts v4 differently (verify), so show both.

**Contradictory primary sources.**
- 192 GB (blog) against 192 GiB (docs); 7.37 TB/s against 7,380 GBps.
- The blog quotes 1.7 EF for El Capitan; the June 2026 TOP500 says 1.809.
- SemiAnalysis states two break-evens in one piece: 15% and 19%. Show both and the arithmetic for each.

**Placement note.** The KB page "TPUs: systolic arrays and pod-scale machines" owns pod mechanics. Build this there, and link from the Reading tab's Training section, unless that page has no visuals.

**Build cost.** Low to medium (0): a table chart and one slider panel.

### 9. Time to answer (score 14; inside Cost per task as "cost in seconds", or Reading at "What works harder costs")

**What it shows and what the user does.** One stacked horizontal bar per model: time to first token (thinking plus input processing) and streaming time for N output tokens. An output-length slider runs from 100 to 5,000 tokens, default 500, AA's convention. Rows: 3.8 Flash, 3.7 Flash, 3.5 Flash-Lite, 3.1 Pro, plus Gemini Diffusion (overhead plus N / 1,479). A readout gives "pre-answer tokens at output speed" = TTFT x speed (illustrative).

**Why text cannot do it.**
- On every Google reasoning model, 85 to 89% of a 500-token answer's wait comes before the first token.
- 3.8 Flash's TTFT is 53% longer than 3.7 Flash's (17.45 s against 11.42 s), so "works harder" shows up in seconds as well as dollars.
- The fastest streamer (3.5 Flash-Lite, 326 tok/s) still takes about 10 s.
- Diffusion's 1.18 s for 500 tokens sits an order of magnitude below everything else. It is the only design whose cost is mostly not tokens divided by speed.

**Formulas.** E2E(N) = TTFT + N / v; diffusion: E2E(N) = overhead + N / v_d.

**Data, with status.** All dated to 1 October 2026 with the index version beside each score:
- Published, AA (measured): 3.8 Flash (high) 221.0 tok/s and 17.45 s TTFT, index v4.3 (methodology v4.3.2) 40.9 (https://artificialanalysis.ai/models/gemini-3-8-flash); 3.7 Flash (high) 291.2 and 11.42 s, v4.3 39.1 (https://artificialanalysis.ai/models/gemini-3-7-flash); 3.5 Flash-Lite 326.1 and 8.76 s, v4.3 "22" (https://artificialanalysis.ai/models/gemini-3-5-flash-lite); 3.1 Pro 114.2 and 24.99 s, v4.3 29.7 (https://artificialanalysis.ai/models/gemini-3-1-pro-preview). Argon has no speed data on AA.
- Published: Gemini Diffusion "1479 tokens / sec" and "0.84 sec" overhead (https://deepmind.google/models/gemini-diffusion/).
- Derived: E2E(500) of 19.71, 13.14, 10.29 and 29.37 s; Diffusion 1.18 s.

**Dated measurements disagree.** Google's 3.5 Flash-Lite blog quotes 350 output tokens/s "in Artificial Analysis' measurement"; AA now shows 326.1. Speeds drift, so show the measurement date and add a rule.

**Defaults reproduce.** AA's E2E is computed the same way, so any match is **by construction**. No independent figure; it scores on teaching and misconception.

**Inspiration.** AA's latency-breakdown charts (https://artificialanalysis.ai/leaderboards/models); the page's Live Extended Thinking paragraph (speech fills this TTFT).

**Build cost.** Low: stacked bars and one slider.

### 10. How long a model code lives (score 12; inside Lineage as a "lifespans" toggle)

**What it shows and what the user does.** A Gantt of model codes from launch to shutdown, coloured preview, experimental or stable, with the deprecation announcement marked. The gap between announcement and shutdown is drawn as the notice period. A filter switches between preview and stable.

**Why text cannot do it.** Preview codes lived 111 to 182 days (3 Pro preview 111, 2.5 Flash preview 05-20 182, 2.5 Flash-Lite preview 06-17 154, 2.5 Flash image preview 142). A stable 2.0 Flash lived 481. Notice periods cluster at the documented minimum: 14 days for the 2.5 previews, 28, 42 and 103 for 2.0 Flash. That is the page's Mistakes entry "planning around a preview model as if it were stable", drawn.

**Data, with status.**
- Published: every date from the changelog (https://ai.google.dev/gemini-api/docs/changelog); "at least two weeks' notice" (https://ai.google.dev/gemini-api/docs/models).
- (verify): `veo-3.0-fast-generate-preview` deprecated 11 November 2025 and shut down 12 November, a 1-day notice that would break the rule. It came from a fetch summary and is a Veo, not Gemini, code.
- Also (verify): 2.0 Flash appears in the fetched changelog as "shut down" on both 18 February and 1 June 2026. The first is presumably the deprecation announcement; the fetch conflated them, so re-read before building.

**Defaults reproduce.** The 14-day minimum (independent, from changelog dates against the models page's rule).

**Build cost.** Low: Lineage already has the axis and the cards.

## 4. Rejected, and why

- **K, Arena with CIs (11).** Worth a footnote, not a view. It shows that the Arena (30 September 2026 snapshot) puts 3.7 Flash (1488±5), 3.1 Pro (1487±3), 3 Pro (1485±4) and 3.6 Flash (1483±4) within each other's intervals, while AA v4.3 puts 3.1 Pro 11 points below 3.8 Flash. Two leaderboards disagree on whether the Pro tier is behind. Gemma 4 31B's Arena rank is "#3 open" at launch (blog), 43 overall in the report's Table 4, and 74 on 30 September 2026. Rank is date-dependent; record the snapshot date. No parameter and off the through-line, so it is kept as a caption.
- **L, training compute timeline (11).** 6ND for Gemma 2 and 3 is derivable: Gemma 3 27B is 2.27e24, about PaLM 540B's 2.53e24, which is a nice fact. But Gemma 4 tokens are unpublished and every Gemini figure is an Epoch "Speculative" estimate (Ultra 5e25, 1.5 Pro 1.58e25 imputed). PaLM's 6ND matches Epoch only by construction, since Epoch used 6ND. PaLM's 1,368 equivalent hours at 46.2% MFU imply 30.4% effective utilization against Gemini 2.5's published 93.4% goodput, which is a good caption. Keep the Gemma 3 vs PaLM sentence for the Training section.
- **M, long-context RULER (10).** Only two context points (32K and 128K). Gemma 3 27B falls 91.1 → 66.0 while Gemma 4 31B holds 96.8 → 96.4 (report Table 9). It belongs in text.
- **N, image tiling (10).** The generic tokens page says "Images ≤384 pixels in both dimensions count as 258 tokens; larger images are tiled into 768x768 pixel tiles", but not how many tiles a given image becomes ("cropped and scaled as needed"). It cannot be computed exactly. Add one line to the media calculator's footnote: on 2.x token cost grows with size; on 3.x it is set by the resolution setting, not the pixels.
- **O, Gemini Diffusion alone (6).** Single numbers, folded into idea 9.
- **Add-on, not a new idea: a Gemini 1.5 preset in the media calculator.**
  - The 1.5 report's "10.5 hours" = "9.9M tokens" implies about 262 tokens per second of video, which matches the tokens page's 263.
  - Its "107 hours" of audio = 9.9M implies 25.7/s, not the tokens page's 32/s. That is a further docs disagreement (which models does 32/s apply to?).
  - The tokens page's agentic example (1.08M → 108K, a 90% cut) disagrees with its own "up to 88% fewer", and 1.08M per hour is 300/s, the high-resolution rate, not 263.
- **Still rejected from round 1.** Deep Think and IMO (no curve published). Mix-n-Match MMLU against size: the developer guide's chart is an image with no values. T5Gemma (owned by its page).

## 5. Methodology as applied, and what to add to it

### How the search went, in order

1. **Step 0, done as written.** I stripped visual.html to text (scripts and styles removed, tags removed) and read all of it. I listed the built visuals and grepped the outbound hrefs (35 external). I read viz_ideas.md and its "what the methodology lacked" section, which is the Google addition in interactive-html-ideas.txt (lines 731 to 735).
2. **WebSearch, tried once:** "Gemini context caching storage cost per hour break-even". It failed: "this session has used its web search budget (200 of 200)". No query patterns were tested.
3. **Official docs first.** These were tried for numbers that become parameters: pricing (fetched three times with different prompts; one prompt returned only part of the table each time), caching, live-session, live-guide, tokens, google-search and changelog. The narrow prompts ("quote the rows for X") worked far better than "list every model".
4. **Configs.**
   - huggingface.co/google/gemma-3n-E2B-it and E4B returned **401** (gated).
   - gemma-4-E2B-it and E4B raw configs worked.
   - The Gemma 3 configs came from **unsloth mirrors**, because the Google repos are gated.
5. **Reports, as arxiv /html/.** The Gemma 4 report took two passes (figure list, then exact Table 1, 2 and 9); after it, Gemma 3, Gemma 2, Gemini 1.5 and Gemini 2.5. The Leviathan PDF could not be read by the fetch model. I read the saved PDF with `pdftotext -layout`, which recovered Tables 2 and 4 exactly. **New tactic: when WebFetch returns a binary PDF, run pdftotext on the saved file.**
6. **Blogs.**
   - Worked: Ironwood, Gemma 4, I/O 2025 keynote, Q2, Q3 and Q4 2025 CEO remarks, the Gemini Diffusion model page, and the speculative-decoding retrospective.
   - 404: the Q1 and Q2 2026 CEO remarks. The URL pattern changed, so I used the SEC exhibits instead.
7. **SEC EDGAR.** Full-text search (`efts.sec.gov/LATEST/search-index?q="tokens per minute"&ciks=0001652044`) returned accession numbers for every exhibit, which turned a guessing problem into a lookup. "trillion tokens" and "quadrillion" returned no hits, which is itself evidence that the all-surfaces metric is not in the press releases.
8. **Analysts and trackers.**
   - Epoch: `epoch.ai/data/notable_ai_models.csv` and `gpu_clusters.csv` downloaded with curl. WebFetch summarised the CSV wrongly; filtering it locally with Python was correct. `machine_learning_hardware.csv` returned an HTML redirect page.
   - SemiAnalysis TPUv7 (guessed slug, worked).
   - AA model pages, five of them.
   - LMArena (301 to arena.ai; followed manually).
9. **Hardware cross-checks.** Cloud TPU docs: cloud.google.com 301 → docs.cloud.google.com; the per-version pages worked. TOP500 and LLNL worked. AMD (spec page and datasheet) timed out and TechPowerUp returned 403, so the MI300A FP8 figure is marked (verify).
10. **Interactive explainers.**
    - The Scaling Book's TPU and inference chapters (JAX team) worked and supplied both formulas and B_crit.
    - Raschka's gallery worked (fact sheets, a memory calculator and a diff tool; no PLE or MatFormer explainer).
    - The HF Gemma 3n and Gemma 4 blogs worked.
    - I found no interactive explainer for PLE, MatFormer or sliding windows. That absence is why ideas 3 and 6 are not duplicates.
11. **Recompute.** One script, `checks.py`, holds all 13 checks: PLE, the Gemma 3 KV table, Live per-minute and fill times, cache break-even, grounding, the Leviathan rows, TPU ratios and B_crit, token doubling times, latency, 6ND and pod-days, lifespans, MFU break-even, and expert coverage. Each idea quotes its output.

### How I scored

I used the eight criteria and weights from the Methodology, with the Repro cell split into **I** (independent: defaults land on a figure computed by someone else, from inputs we did not fit) and **C** (by construction). A reproduction by construction scores at most 1. Ideas whose only "reproduction" is a contradiction (idea 3's effective counts) score the reproduction on the parts that do reproduce (PLE sizes). Ties went to links into existing tabs.

### New rules this topic suggests for the skill

1. **Check a source's rounding before treating a mismatch as a contradiction.** The Live input price is $0.005/min against $0.0045 computed. Also try the published per-minute rate times 60 and see which way it rounds.
2. **Run every limit through the window arithmetic.** Session limits, maximum file sizes and output caps often fall out of window ÷ rate. Try it, and if a limit matches, label it "our reconstruction" rather than stating it as the cause (the Live 2-minute limit and 32K at 290/s).
3. **Never splice two metrics that a company reports in sequence.** When a company switches metrics (monthly tokens across surfaces, then API tokens per minute), plot them as separate series and say when each stops being reported. Use full-text search over filings to prove where each appears.
4. **For "effective" or "active" parameter claims, sum the parts table every way.** Show which sum reproduces the headline. If none reproduces all of them, show the candidates instead of picking one.
5. **A memory table's KV column may not credit the architecture's own savings.** Recompute it both ways (all-global and windowed) before quoting it.
6. **Speeds and latencies are measurements with a date.** Record the measurement date beside every tokens/s and TTFT, as for index versions. Third parties quoting AA (Google's "350 tok/s") will be stale.
7. **Compare compute at matched precision.** Any FLOP comparison across systems must state precision and dense or sparse for both sides. If they differ, add a toggle that matches them.
8. **Gated model repos.** If the official config returns 401, use a named mirror (unsloth, mlx-community), say so, and cross-check one value against the report.
9. **Binary PDFs:** save the file, then extract it with `pdftotext -layout`. Tables survive layout mode.
10. **Regulatory filings are a search engine.** EDGAR full-text search gives exact exhibit URLs for any phrase. Use it for earnings figures instead of guessing CEO-blog slugs.

## Sources (all fetched 1 October 2026)

- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/caching
- https://ai.google.dev/gemini-api/docs/live-session
- https://ai.google.dev/gemini-api/docs/live-guide
- https://ai.google.dev/gemini-api/docs/tokens
- https://ai.google.dev/gemini-api/docs/google-search
- https://ai.google.dev/gemini-api/docs/changelog
- https://ai.google.dev/gemini-api/docs/media-resolution (cited from round 1 and the page)
- https://ai.google.dev/gemini-api/docs/models (two-week notice rule, from the page)
- https://ai.google.dev/gemma/docs/gemma-3n
- https://developers.googleblog.com/en/introducing-gemma-3n-developer-guide/
- https://huggingface.co/google/gemma-4-E2B-it/raw/main/config.json
- https://huggingface.co/google/gemma-4-E4B-it/raw/main/config.json
- https://huggingface.co/google/gemma-3n-E2B-it/raw/main/config.json (401, gated)
- https://huggingface.co/google/gemma-3n-E4B-it/raw/main/config.json (401, gated)
- https://huggingface.co/unsloth/gemma-3-1b-it/raw/main/config.json
- https://huggingface.co/unsloth/gemma-3-4b-it/raw/main/config.json
- https://huggingface.co/unsloth/gemma-3-12b-it/raw/main/config.json
- https://huggingface.co/unsloth/gemma-3-27b-it/raw/main/config.json
- https://arxiv.org/html/2607.02770 (Gemma 4 report)
- https://arxiv.org/html/2503.19786 (Gemma 3 report)
- https://arxiv.org/html/2408.00118 (Gemma 2 report)
- https://arxiv.org/html/2403.05530 (Gemini 1.5 report)
- https://arxiv.org/html/2507.06261 (Gemini 2.5 report)
- https://arxiv.org/abs/2211.17192 and https://arxiv.org/pdf/2211.17192 (Leviathan et al., speculative decoding)
- https://huggingface.co/blog/gemma4
- https://huggingface.co/blog/gemma3n
- https://sebastianraschka.com/llm-architecture-gallery/
- https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/
- https://blog.google/products/google-cloud/ironwood-tpu-age-of-inference/
- https://blog.google/technology/ai/io-2025-keynote/
- https://blog.google/inside-google/message-ceo/alphabet-earnings-q2-2025/
- https://blog.google/inside-google/message-ceo/alphabet-earnings-q3-2025/
- https://blog.google/inside-google/message-ceo/alphabet-earnings-q4-2025/
- https://blog.google/inside-google/message-ceo/alphabet-earnings-q1-2026/ (404)
- https://blog.google/inside-google/message-ceo/alphabet-earnings-q2-2026/ (404)
- https://abc.xyz/investor/ (navigation only)
- https://efts.sec.gov/LATEST/search-index?q=%22tokens%20per%20minute%22&ciks=0001652044
- https://efts.sec.gov/LATEST/search-index?q=%22trillion%20tokens%22&ciks=0001652044 (no hits)
- https://efts.sec.gov/LATEST/search-index?q=%22quadrillion%22&ciks=0001652044 (no hits)
- https://www.sec.gov/Archives/edgar/data/0001652044/000165204425000087/googexhibit991q32025.htm
- https://www.sec.gov/Archives/edgar/data/0001652044/000165204426000012/googexhibit991q42025.htm
- https://www.sec.gov/Archives/edgar/data/0001652044/000165204426000043/googexhibit991q12026.htm
- https://www.sec.gov/Archives/edgar/data/0001652044/000165204426000066/googexhibit991q22026.htm
- https://deepmind.google/models/gemini-diffusion/
- https://research.google/blog/looking-back-at-speculative-decoding/
- https://jax-ml.github.io/scaling-book/tpus/
- https://jax-ml.github.io/scaling-book/inference/
- https://cloud.google.com/tpu/docs/system-architecture-tpu-vm (301) → https://docs.cloud.google.com/tpu/docs/system-architecture-tpu-vm
- https://docs.cloud.google.com/tpu/docs/tpu7x
- https://docs.cloud.google.com/tpu/docs/v6e
- https://docs.cloud.google.com/tpu/docs/v5p
- https://docs.cloud.google.com/tpu/docs/v4
- https://top500.org/system/180307/
- https://hpc.llnl.gov/hardware/compute-platforms/el-capitan
- https://www.amd.com/en/products/accelerators/instinct/mi300/mi300a.html (timed out)
- https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/data-sheets/amd-instinct-mi300a-data-sheet.pdf (timed out)
- https://www.techpowerup.com/gpu-specs/radeon-instinct-mi300a.c4148 (403)
- https://newsletter.semianalysis.com/p/tpuv7-google-takes-a-swing-at-the
- https://epoch.ai/data/notable_ai_models.csv
- https://epoch.ai/data/gpu_clusters.csv
- https://epoch.ai/data/machine_learning_hardware.csv (returned an HTML redirect)
- https://epoch.ai/data-insights/llm-inference-price-trends (inspiration, from round 1)
- https://artificialanalysis.ai/models/gemini-3-8-flash
- https://artificialanalysis.ai/models/gemini-3-7-flash
- https://artificialanalysis.ai/models/gemini-3-5-flash-lite
- https://artificialanalysis.ai/models/gemini-3-1-pro-preview
- https://artificialanalysis.ai/models/gemini-4-argon
- https://artificialanalysis.ai/leaderboards/models (inspiration; AA snapshot in pages/topic-llms/aa_snapshot.json)
- https://lmarena.ai/leaderboard/text (301) → https://arena.ai/leaderboard/text
