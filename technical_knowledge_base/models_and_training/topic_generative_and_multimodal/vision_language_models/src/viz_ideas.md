# Vision-language models: visualisation ideas (2026-10-17)

The question the page keeps returning to: **what does an image become inside a VLM (how many tokens, at which positions, carrying what), and what does each choice cost or break?** Every visual either shows the image-to-token path of a real model on a real input, or makes a cost or a failure measurable.

What already exists and is not rebuilt (linked instead):
- Root VLM lab (`src/vlm/`): one image through SmolVLM step by step against LLaVA-1.5 (animation), SmolVLM's token-budget calculator (36 measured counts), the exact prompt, the 30-question set at three budgets, the POPE-style probe (parsed answers), long descriptions with wrong claims marked, time split, parameter bars.
- Vision encoders sibling: the encoders-inside-VLMs table, high-norm tokens and registers in five encoders, NaFlex and Qwen2.5-VL resize calculators, layer-wise probes.
- Benchmarks page (Long-context and multimodal): MMMU, DocVQA, OCRBench and other VLM benchmark tables.

Scores 0-2 on: quantity the reader moves / reproduces a measured or published figure (double) / computable from public data (double) / shows what a sentence cannot / corrects a misconception / measures the central question / absent elsewhere / step animation against what it replaced; minus build cost.

| # | Idea | Score | Placement | Status |
|---|---|---|---|---|
| 1 | **Same image, five connectors** (animation, before/after): one image's patch grid through a linear/MLP projector (LLaVA-1.5), a Q-Former (BLIP-2), a Perceiver Resampler with gated cross-attention (Flamingo), pixel shuffle (SmolVLM) and a 2 x 2 merger at native resolution (Qwen); squares to scale (one square per token), counters for tokens in the context and where the image enters | 16 | Reading 1 | built |
| 2 | **What the model saw** (own tab): four images (square, 3:2, portrait receipt, 3:2 photo) through SmolVLM at three settings and Qwen3.5 at four budgets: the exact pixels each model receives (decoded from pixel_values), the token grid on top, click a token for its region, its 1-D or (t, h, w) position, its encoder patch-norm ratio; the prompt as a strip to scale; a step animation SmolVLM tiling against Qwen native resolution on the same image | 17 | Own tab | built |
| 3 | **M-RoPE position counter**: the position the next text token gets after an image of N tokens, 1-D against 3-D, measured from the model's own get_rope_index | 12 | Reading 2 (predict, then reveal) and the Saw tab | built |
| 4 | **Legibility grid**: a 6-character code at 7 font sizes x 3 token budgets x 2 models, exact-match and character error rate | 14 | Reading 3 | built |
| 5 | **Grounding boxes with a convention toggle**: Qwen3.5's boxes on 12 scenes drawn as read under 0-1000, as resized-image pixels and as original pixels, IoU per reading | 14 | Reading 4 | built |
| 6 | **Video token arithmetic and the direction test**: frames to temporal patches, timestamps in the prompt (the real string), 8 clips and a one-frame control | 11 | Reading 5 | built |
| 7 | **Token and cache budget** (own tab): image size, image count, video seconds and fps -> tokens, share of context and cache bytes for SmolVLM, Qwen3.5, LLaVA-1.5-7B, InternVL3-1B, with rules ported from the processors and checked against them; cache per token measured for the two models run here (hybrid linear attention keeps a fixed state) | 15 | Own tab | built |
| 8 | **Token reduction without retraining**: accuracy on the 30 questions when image tokens are removed at random, by FastV's attention criterion, by 2 x 2 pooling, or by dropping the global view; prefill time per setting | 14 | Reading 7 and the budget tab | built |
| 9 | **Hallucination probe** (own tab): P(yes) for 72 object questions per model and condition (image, grey image, no image, leading phrasing), threshold slider, confusion counts, the full table | 15 | Own tab, summary in Reading 6 | built |
| 10 | **High-norm tokens inside the VLM's encoder**: SmolVLM's SigLIP-family tower against SigLIP 2 B/16 at 224 and 512 and Qwen3.5's tower, same statistic as the sibling page | 12 | Reading 1 | built |
| 11 | **Was the encoder trained inside the VLM?** SmolVLM's vision weights against the public SigLIP base 512 checkpoint, relative change per block | 11 | Reading 6 (training) | built if the download fits |
| 12 | Attention maps from answer tokens to image tokens | 7 | none | rejected (as in the root lab): noisy and easy to over-read; FastV's ranking uses the same attention in a measurable way instead |
| 13 | Fine-tuning a projector on the running example | 6 | none | rejected: an alignment stage needs hundreds of thousands of captions to mean anything (root lab's reasoning; Khalid 2026-10-15) |
| 14 | A 2B to 4B VLM (Qwen3-VL-2B, InternVL3-2B) | 7 | none | rejected: Qwen3.5-0.8B already teaches native resolution, 3-D positions, grounding, video and hybrid attention in 1.75 GB; a bigger one adds benchmark points the vendor tables already give |
| 15 | Benchmark tables | 4 | none | rejected: owned by the Long-context and multimodal benchmarks page; the vendor's own numbers for the two models are quoted where a measurement here meets them |

What the methodology lacked: a rule for checking a coordinate convention empirically (score the same outputs under every documented convention and keep the one the outputs fit), and a rule for logit-based yes/no scoring (report the probability mass on yes and no tokens, so a model that answers neither is visible).
