# Positional Encodings: visualisation ideas (rebuild of 2026-10-18)

Central question: how does a model know where a token is, and what happens to that knowledge past the length it was trained on?

Existing visuals checked before scoring (not rebuilt here, linked):
- RoFormer page: eight-pair dials, the shift test on trained toy weights, Figure 2's decay rebuilt, six toy models run past their length, "Then and now" spectrum morph.
- Attention Is All You Need page: PE heatmap and offset curve; a toy retrained without positions.
- T5 page: the bucket chart from T5's own function.
- Root (Topic: llm-architecture): Block lab, Attention lab, Config calculator, Inside a real model, Architecture map. None draws positions.
- Long context sibling: KV memory, eviction, effective context. It measures the tiny GPT past 256 with RoPE scaling (same windows); this page reuses its windows and adds the other schemes, the offsets animation and the temperature split.
- The Architecture Gallery rebuild (2026-10-18) moved the one-pair RoPE dial and the YaRN band chart here (its coverage.md, "moved to a sibling").

Scoring as in visuals/choosing.md (0 to 2 each; "reproduces" and "computable" count double; +2 for a step-by-step before/after animation; minus build cost).

## Built

| # | Visual | Where | Score | Notes |
|---|---|---|---|---|
| PE1 | What breaks past the trained length (dials, plain RoPE against a method, 8 distances) | Reading, kept from the 2026-10-03 build | 17 | now starts on the tiny GPT preset, plus DeepSeek-V4-Pro; ids prefixed pe- |
| PE2 | Six schemes, one query (exact logits; real T5-base biases) | Reading, kept | 14 | unchanged maths, renamed ids |
| PE3 | Stretch the spectrum (per-pair slowdown, every method, configs table) | Own tab, kept and improved | 15 to 17 | added the tiny GPT (with its measured losses under the chart), DeepSeek-V4-Pro, Olmo 3, Mistral Large 3, Kimi K2, a "your own config" input, the census table of all 74 configs |
| PE4 | Variants table with layer strips | Reading, kept and extended | 11 | added Qwen3.5 (linear layers), Gemma 4 (local/global, proportional), Kimi K3 (KDA/MLA, no RoPE) strips |
| PE6 | The same story moved past 256: plain RoPE against a chosen method, 8 offsets, loss strip + dials + greedy text per step | Own tab "Past the trained length" | move 2 + reproduces 1x2 (lc numbers to 4 decimals) + computable 2x2 + beyond a sentence 2 + misconception 2 + central 2 + absent 2 + animation 2 - cost 2 = 18 | every frame is a recorded measurement of the same 256 tokens; the brief's before/after of the same prompt |
| PE7 | Per-position loss to 2,048, every scheme and scaling | Past tab | 13 | same windows as long_context's past_len.py |
| PE8 | Permutation test (token 255's change per block, shuffled prefix) | Reading, Why positions | 12 | shows the causal mask leaking order: NoPE block 1 exactly invariant |
| PE9 | Position probe R2 per block per scheme | Reading, Why positions | 12 | where each scheme keeps absolute position |
| PE10 | One-pair RoPE dial with the 0.5403 worked example | Reading, RoPE from zero | 9 | carried from the Gallery's 2026-10-02 build |
| PE11 | YaRN bands (turns per pair, kept / ramp / interpolated) on 8 configs | Reading, Stretching RoPE | 12 | carried from the Gallery; gpt-oss 9/9/14 reproduced independently; tiny GPT, V4-Pro, Kimi K2 step, Mistral Large 3 added |
| PE12 | Base census scatter (rope_theta against max context, 61 RoPE configs) | Reading, The base | 11 | from census.py; extremes 10,000 to 10^11 |
| PE13 | Training curves of the five schemes, equal budgets, with second seeds and the sinusoidal scale fix | Reading, Measured here | 9 | table with greedy text; the unscaled sinusoid failure became a measured mistake |

## Rejected (and why)
- RoPE eight-pair dials, Figure 2 decay, toy extrapolation models, spectrum morph: on the RoFormer page (repeat).
- A learned-table visual from GPT-2's real wpe (1,024 x 768): 3 MB, and the point (the cap) needs no real weights; the IndexError is shown instead.
- Perplexity-against-length curves for PI / NTK / YaRN from the papers: they exist only as figures (curves are never read); the tiny GPT measures the same thing honestly at toy scale.
- Needle-in-a-haystack simulator: nothing computable without a model; the Long context sibling owns effective-context evaluation.
- CoPE counting demo: would need a trained model and a counting task; the mechanism is three lines of text.
- A softmax-of-temperature chart: one number per s; shown in the formula box, the YaRN bands card and the measured temperature split.
- Attention maps of the tiny GPT past 256 (which tokens the last query attends to under each scheme): considered for PE6; dropped to keep the data part small, since the loss strip and the text already show the before/after and the Inside lab owns attention maps.
- Running a pretrained model (SmolLM2, Qwen3-0.6B) past its window: 8K to 32K-token windows on CPU or MPS for hours, teaching little the toy does not (cheap-runs rule); published results are cited instead.
- Dynamic NTK as its own measured row: in one forward pass over 2,048 tokens it equals NTK at s = 8 under the YaRN paper's definition (stated, not measured).

## What the method lacked here (lessons)
- Periodic quantities: whether an angle is "seen" must be judged modulo a turn (2026-10-03 lesson, kept).
- A config field is not proof of use: Nemotron-H configs carry rope_theta but the modeling code never calls the rotation; count calls in the pinned source before quoting a hybrid's position scheme.
- Partial RoPE has two incompatible meanings in transformers 5 (default respaces the spectrum, "proportional" truncates it): read rope_type, not just partial_rotary_factor.
