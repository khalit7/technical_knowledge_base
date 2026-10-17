# VLM lab: visual ideas (2026-10-17)

Question the lab keeps returning to: what does an image cost as tokens, and what does the model get wrong at each cost?

Built (score 0-2 on: parameter the reader controls / reproduces a measured or published figure / inputs computable / shows what a sentence cannot / corrects a misconception)
1. **One image through the model, animated, SmolVLM vs LLaVA-1.5 toggle** (Reading-style before/after on the same photo; 7 steps; counters; play/pause/step/scrub/speed; on-screen only; paused under reduced motion). Colours in the encoder and projector steps are the first three principal components of the real vectors (trace.json); LLaVA colours are patch means, labelled illustrative. Score 1/2/2/2/2.
2. **Token-budget calculator**: width, height, N, splitting, question length -> tiles, image tokens, prompt tokens, share of 8,192 context, grid drawing, stretch and upscale warnings, comparison bars (LLaVA-1.5, Qwen2-VL rough, Gemma 4). Re-implements the processor; reproduces all 36 measured counts (check_calc.mjs). Score 2/2/2/2/2.
3. **The exact prompt**: template string, expanded string (runs compressed), token-kind bar. 0/2/2/2/2.
4. **Question set explorer**: 30 questions x 3 budgets, accuracy by kind, filters (wrong, changes with budget), every answer shown. 1/2/2/2/2.
5. **POPE-style probe**: yes-rate bars on present, absent random, absent adversarial at two budgets; full table. 1/2/2/2/2.
6. **Long descriptions with wrong claims marked** (by-eye judgement in captions_marks.json). 1/1/2/2/2.
7. **Time split bars** (encoder, prefill, decode for a 20-token answer) and table with peak memory per budget. 1/2/2/1/1.
8. **Parameter bars by component** (projector highlighted: what stage 1 trains). 0/2/2/1/1.
9. Predict-then-reveal: tokens for a phone screenshot.

Rejected
- Training a projector (alignment stage) on a toy set: needs hundreds of thousands of captions to mean anything; 16 images would teach memorisation (Khalid 2026-10-15: drop expensive runs that teach little).
- Running a second VLM (Qwen3-VL-2B, LLaVA) for side-by-side answers: 4+ GB more downloads and GPU time for a comparison the Model map and published benchmarks already cover; one VLM is enough for the mechanism.
- Attention maps from text tokens to image tokens: 32 layers x 15 heads of noisy maps; easy to over-read, and the Vision lab already shows pooling attention.
- Nearest-vocabulary "logit lens" of image tokens as a visual: the nearest tokens are meaningless special tokens (median cosine 0.27); kept as one sentence, not a chart.
- Benchmark tables (MMMU, DocVQA...): owned by the Long-context and multimodal benchmarks page.

What the methodology lacked: a rule for scoring free-text answers; here pattern matching with every answer shown, plus by-eye marks stored as data.
