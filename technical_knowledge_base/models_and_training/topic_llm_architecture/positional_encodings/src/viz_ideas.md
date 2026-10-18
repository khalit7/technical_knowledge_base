# Positional Encodings: visualisation ideas

Central question: how does a model know where a token is, and what happens to that knowledge past the length it was trained on?

Existing visuals to avoid repeating (checked before scoring):
- RoFormer page: eight-pair dials (shift both positions), the shift test on trained toy weights (RoPE against sinusoidal), Figure 2's decay rebuilt with actual scores, six trained toy models run past their length (with window and PI), and "Then and now", an 11-step morph of turns per pair from the 2017 sinusoid to Llama 4.
- LLM Architecture Gallery: the one-pair RoPE dial and the YaRN bands for gpt-oss, DeepSeek V3 and Kimi K2 (9 / 9 / 14 for gpt-oss).
- Attention Is All You Need page: PE heatmap and offset curve; a toy retrained without positions.
- T5 page: the bucket chart from T5's own function.
- Llama 3 page: the long-context stage in the training timeline.

Scoring as in the Methodology (0 to 2 each; "reproduces" and "computable" count double; +2 for a step-by-step before/after animation; minus build cost).

| # | Idea | What it shows, what the reader does | Score | Placement | Data and formulas |
|---|---|---|---|---|---|
| PE1 | **What breaks past the trained length, before/after animation** | One real config (Llama 3.1, Qwen3, DeepSeek-V3 key, gpt-oss, Phi-3, Gemma 3 global) at 8 distances from L/4 to s·L; top panel plain RoPE, bottom the chosen extension (PI, NTK, dynamic NTK, YaRN, Llama 3, LongRoPE); 8 dials with the trained wedge and the current angle, a strip of all pairs, counters (unseen pairs, furthest beyond a wedge, fastest pair's speed, logit multiplier), caption per step | move 2 + reproduces 1×2 (Llama 3.1 band boundaries 2,048 / 8,192, YaRN ranges) + computable 2×2 + beyond a sentence 2 + corrects a misconception 2 (the old page's "high-frequency dims see unseen angles") + central 2 + absent 1 (RoFormer shows turns per pair, not angles against the trained wedge per method) + animation 2 − cost 2 = 17 | Reading, What breaks | configs in inputs/; ports of transformers' rope functions; unseen = (Δθ′ mod 2π) > Lθ for pairs with Lθ < 2π |
| PE2 | **Six schemes on one query** | Positional part of the logit (or attention weights) against distance for sinusoidal, learned, T5 (real T5-base decoder biases), ALiBi, RoPE, NoPE; shift the pair, head, RoPE base, range | 2 + 1×2 (T5 bucket edges, ALiBi slopes) + 2×2 (T5 weights read from safetensors; formulas exact) + 2 + 1 (absolute schemes move under a shift) + 2 + 2 (no explainer puts all six on one query) + 0 − 1 = 14 | Reading, Six schemes | illustrative content vector (seeded, labelled); T5 bias tensor; finding: bucket 31 (offsets 113+) holds outlying values |
| PE3 | **Stretch the spectrum** | θ/θ′ per pair against wavelength (or index) for PI, NTK, YaRN, Llama 3, LongRoPE long and short, on 7 configs, factor selectable, inspect a pair; the configs table with kept / blended / ×s counts, logit factor, s·L against max_position_embeddings | 2 + 2×2 (gpt-oss 9/9/14 = Gallery, independently; DeepSeek 163,840 and Phi-3 131,072 = configs; Qwen 131,072 = card by construction) + 2×2 + 2 + 1 + 2 + 1 (Gallery has YaRN only) + 0 − 1 = 15 | Own tab ("across all methods and configs") | same ports; temperatures (0.1 ln s + 1)², LongRoPE 1 + ln s / ln L |
| PE4 | **Variants table with layer strips** | Partial, decoupled, multimodal RoPE and RoPE/NoPE interleaving, config fields verbatim, a strip of every layer drawn from no_rope_layers / sliding_window_pattern / layer_types | 0 + 1×2 + 2×2 + 1 + 1 (NoPE retrieval claim) + 1 + 2 + 0 − 0 = 11 | Reading, Variants | configs; HF Llama 4 config semantics (1 = uses RoPE) |
| PE5 | Production recipes table | Pretraining length and base, long-context stage, positions, window for 7 models | 0 + 0 + 2×2 + 1 + 1 + 1 + 1 = 8 (a table, not a visual) | Reading, Recipes | papers, cards, blogs |

Rejected:
- RoPE dial, eight-pair dials, Figure 2 decay, toy extrapolation models, spectrum morph: already on the RoFormer page or the Gallery (repeat).
- YaRN bands per config as a separate visual: the Gallery has it; folded into PE3's table and reproduced there.
- Perplexity against length curves for PI / NTK / YaRN: the numbers exist only as figures in the papers (the method forbids reading curves).
- Needle-in-a-haystack simulator: nothing computable without a model.
- CoPE counting demo: would need a trained model to mean anything; the mechanism is three lines of text.
- A softmax-of-temperature chart for YaRN: one number per s; shown as values in the formula box and the table.
- A learned-table visual from GPT-2's real wpe (1,024 × 768): 3 MB, and the point (the cap) needs no real weights; the learned rows are labelled illustrative.

What the methodology lacked here:
- A rule for periodic quantities: whether an angle is "seen" must be judged modulo a turn, and per-pair checks are a lower bound on what is new jointly. The first draft counted unseen pairs without the modulo and overstated them (29 instead of 24 for Llama 3.1 at 4×).
- Reading real weights by byte range from a safetensors file (the header gives offsets) is a cheap way to use a few kilobytes of a large checkpoint; worth recording as a data source.
