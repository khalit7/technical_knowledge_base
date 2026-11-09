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

## 2026-10-24 rebuild
| # | Idea | Placement | Status |
|---|---|---|---|
| 16 | **Hero**: one photo through both models, processor to language model, counts at every stage (static annotated diagram) | Reading top | built |
| 17 | **1-D against 3-D positions** on the same 16 x 16 image tokens, from get_rope_index (static before/after) | Reading 2a | built (replaces idea 3's prose-only answer) |
| 18 | **Training stages**: encoder, connector, language model trained, frozen, LoRA or not stated, per stage, six recipes (static) | Reading 6 | built |
| 19 | **Serving pipeline** with the cache or limit at each stage (static HTML) | Reading 9 | built |
| 2 | Tiles against native animation | moved from the What the model saw tab to Reading 2 | moved |
| 9 | Hallucination probe | moved from its own tab to a closed block in Reading 7 | moved |
| 20 | Real photo or paper figure (LLaVA, Flamingo architecture figure) | none | rejected: the connector animation and hero draw the same structure with this page's numbers; arXiv's default licence does not grant reuse |

## 2026-11-09 rollout (split layout, renderer v2 stages)
| # | Idea | Placement | Status |
|---|---|---|---|
| 21 | **Hero as a 3D stage**: the cat through both models in two lanes, the processors' own views as image plates, patch grids, connectors as glass, token walls to scale, the language model reading them | Reading top, Fig. 1 | built (replaces idea 16's static SVG) |
| 22 | **Five connectors** as one stage, one design per step, then the context each pays as columns | Reading 1, Fig. 2 | built (replaces the 2D connector animation and its picker) |
| 23 | **Tiles against native resolution** to scale (one unit = 512 pixels): the rocket stretched into 12 tiles and a global view against 640 x 416 | Reading 2, Fig. 3 | built (replaces idea 2's 2D animation) |
| 24 | **Legibility**: one 20-pixel code resampled at five processor scales, patch grid and one token outlined, capital heights as columns against a patch | Reading 3, Fig. 4 | built (new) |
| 25 | **Pointing**: one answer's four numbers drawn under the three readings with IoU | Reading 4, Fig. 5 | built; the 12-scene explorer moved into a closed block |
| 26 | **Video to tokens**: 16 frames, 8 kept, pairs into tubes, 80 tokens each, timestamps as text, both answers | Reading 5, Fig. 6 | built (new; frames redrawn from make_inputs.py's recipe) |
| 27 | **Training-free token cuts** on SmolVLM's 1,088 tokens over the processor's views: FastV's real kept set, pooling, no global view, all nine results | Reading 8a, Fig. 7 | built (replaces the 2D result bars) |
| 28 | 3D position grid for 2a, 3D training stages, 3D hallucination or cache charts | none | rejected: a table of numbers, a matrix of stages and bar or line charts read best flat |
