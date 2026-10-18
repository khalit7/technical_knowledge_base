# Visuals: built and rejected (scores 0 to 2 per criterion of visuals/choosing.md; doubles counted)

## Built
| visual | where | type | why it earned its place |
|---|---|---|---|
| Mask matrices, four modes on 12 real tokens | Reading 1 | toggle-compare (3) | the whole family split is one matrix; encoder-decoder drawn as T5Gemma 2's fused matrix (score 11) |
| The leak, step by step | Reading 3 | before/after on one checkpoint (1), measured | the same weights before and after 150 leaky steps; ends on real bad output "to to to" (score 13) |
| MTP designs, parallel against sequential | Reading 7 | toggle-compare (3) | one position, two ways to predict t+2, with measured top-1 in the caption (score 10) |
| Joint training on tokens and FLOPs axes | Reading 7 | toggle of the x-axis over recorded runs (4) | the equal-tokens view flatters MTP; the FLOPs view shows the fair control (score 12) |
| Click-a-query mask explorer, 24 tokens | Mask lab | explorer (9) | which keys, which scored positions, what can be cached, for any query and split (score 10) |
| Swapped-mask loss bars, attention-on-next bars | Mask lab | before/after (1), measured | a mask is a training contract; where the leak is learned (layer 1) (score 11) |
| Six objectives on the same 40 tokens | Objective drill | toggle-compare (3) | inputs, targets and loss-term counts side by side, T5 lengths from its arithmetic (score 10) |
| Self-speculative decoding replay, two drafts | MTP lab | before/after on one prompt (1), measured | forwards, accepted and rejected drafts token by token; identical output (score 13) |
| Acceptance to tokens per forward | MTP lab | calculator (8) | defaults at DeepSeek's 85% give 1.85 against their stated 1.8x; measured points on the curve (score 11) |
| AR against diffusion on the same prompt | Diffusion lab | before/after (1), measured | committed, newly committed and still-guessed cells; positions-processed counter shows the FLOPs trade (score 14) |
| Quality against steps, random remasking ticks | Diffusion lab | slider over recorded runs as bars (4) | the speed-quality trade and LLaDA's remasking ablation reproduced in direction (score 11) |
| Fill-in crossover 15/50/90% | Diffusion lab, Reading 4 table | before/after | why MLM masks 15% and why a sampler's first steps are hardest (score 10) |

## Rejected
- Rebuilding BERT's leak animation, T5's span-corruption and mask animations, Ettin's paired generation, DiffusionGemma's block sampler: they exist on the paper pages; linked instead.
- A from-scratch BERT trained on TinyStories: the BERT and Ettin pages train toy encoders against left-to-right twins; at fixed rate our adapted diffusion model is that encoder.
- A toy encoder-decoder: T5's ablation gaps are fractions of a point at 220M (T5 page's reasoning); a 5M toy would not resolve them.
- Speculative decoding speed in wall-clock on the Mac: counts of forwards are deterministic, timings on a shared CPU are not; the Speculative decoding page owns measured speed.
- A diffusion KV-cache / block-diffusion toy: would need a new sampler and training run for a mechanism the DiffusionGemma page already runs.
- Parameter bills for GLM-4.5 and Qwen3-Next MTP layers: counts are quoted; one bill (DeepSeek-V3) teaches the structure.
