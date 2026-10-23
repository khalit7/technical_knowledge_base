# Visualisation ideas: LLM Architecture Gallery and the architectural deltas that matter (rebuild 2026-10-18)

Central question: for a released model, what does each layer do and what does each token leave behind, and how do the
2025 to 2026 models differ on it? Every visual reads the configs (105 gallery models plus 3 extras and the tiny GPT).

Scoring as in the explainer-page skill (0 to 2 each; reproduce and computable count double; +1 before/after; minus cost).

| # | Visual | Data | Reproduces | Score | Place | Status |
|---|---|---|---|---|---|---|
| 1 | Attention ladder: one token, seven designs, MHA dashed behind each (kept from the 2026-10-01 build; removed 2026-10-23, Attention variants owns the mechanism) | shapes from Llama 3.1 8B, DeepSeek-V3, Qwen3-Next, Kimi Linear configs | 8,192 / 2,048 / 256 / 576 numbers per token per layer; 2 GiB, 512 MiB, 64 MiB, 144 MiB at 128K | 17 | Reading 5 | kept, ported to the ag prefix |
| 2 | Per-layer strips (mixer, FFN, position) for every model | gen_data.py over configs | 95 of 101 gallery KV figures; 59 of 59 transformers layer lists; 27 of 27 root-map rows | 17 | Reading 4 (12 small multiples), Compare tab (all) | built |
| 3 | Decode a config: the fields read and what each set, the arithmetic line by line, predict-first mode | tracked config keys per row | every row's KV equals the Python and, for 44 models, the root Config calculator | 16 | own tab | built (new) |
| 4 | Layer-by-layer accumulation, card convention against windows credited (stepped, before/after on the same layers) | per-layer bytes | ends on each model's two numbers | 14 | Decode tab | built (new) |
| 5 | Scatter of KV per token over release date, animated between the card's convention and the cache held at 131K | gallery.json | Gemma 4 31B falls 18 times, gpt-oss 2 times | 15 | Compare tab | built (the old toggle, now a tween on the same dots) |
| 6 | One request growing: tokens held per layer (log), T from 1 to 1M, card against credited (before/after) | per-layer W | Gemma 3 27B 62 GiB against 10.4 GiB at 131,072 | 16 | Cache tab | built (new) |
| 7 | Memory per request against context for chosen models, concurrency, budget, bf16/FP8, state on/off | as above | Llama 3.1 70B 40 GiB; gpt-oss-120b 4.5 GiB; Qwen3-Next 3 GiB + 72 MiB | 15 | Cache tab | built (kept, state now FP32 as the root calculator) |
| 8 | Census bars: share of models with each delta by release year | census.json | 2026: MoE 52 of 66, windows 25, hybrids 20, MLA 16, sparse 11 | 13 | Reading 0 | built (new) |
| 9 | Windows bars: card against credited, every windowed model | gallery.json | factors 2.0 (gpt-oss) to 31.2 (Gemma 4 12B) | 12 | Reading 7 | built (new) |
| 10 | Hybrid table with state = cache crossover | gallery.json | Qwen3-Next 3,072 tokens; Kimi K3 15,701 | 11 | Reading 8 | built (table, not a chart: the crossovers span 2,304 to 32,768 and read better as numbers) |
| 11 | RoPE dial, YaRN frequency bands | | | | | removed: owned by Positional Encodings (moved there in the report) |
| 12 | RMSNorm vs LayerNorm demo and norm placement switch | | | | | removed: owned by Normalisation, residuals and stability |
| 13 | KV calculator with presets in Reading | | | | | removed: the root Config calculator and this page's Cache tab cover it |
| 14 | MLA absorption, DSA funnel, V4 compressed-cache diagram | | | | | rejected here: animated on the DeepSeek page (linked); V4 reconstructed in text, section 12 |
| 15 | A strip per layer coloured by QK-norm or norm placement | configs do not state norms | | | | rejected: no config data; the root map has sourced norms for 46 models |
| 16 | Expert scatter (routed experts against active share) | gallery lines + configs | | 9 | | rejected: the table says it with fewer pixels; MoE child owns the mechanism |

What the method lacked (suggestion for the skill): a rule that a third-party table is recomputed with the modeling code at
a pinned version, not only the config, when the config cannot settle the cache (Gemma 4 E2B/E4B, Motif 3, LongCat).

## 2026-10-23 rebuild (teaching contract)
| Visual | Place | Status |
|---|---|---|
| Hero matrix: 14 models by design choice, 2026 counts as bottom row | Reading top | built (new) |
| Census by year as one SVG (was seven small HTML rows) | Reading top | rebuilt |
| Gallery mismatches as a dumbbell (gallery against config) | Reading 1 | built (new) |
| KV per token by year, strip plot with medians | Reading 5 | built (new); distinct from the Compare scatter (distribution and medians, not dates) |
| Windowed models: card against held at 131K, dumbbell | Reading 6 | rebuilt from HTML bars |
| Linear:attention ratio: Kimi ablation (published) over released hybrids (derived), two panels | Reading 7 | built (new) |
| Active share against total parameters, MoE models 2025 to 2026 | Reading 8 | built (new; the 2026-10-18 rejection reversed: the pattern, share falling with size, is what the table hid) |
| Config layers against caches per token | Reading 10 | built (new) |
| Small multiples as SVG | Reading 4 | rejected: the HTML strips already work at phone width and are clickable; the audit does not count them as a visual |
| Positional choices figure | Reading 9 | rejected: the census and hero carry the counts; a sentence says the rest |
