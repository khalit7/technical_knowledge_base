# Vision encoders: visualisation ideas (2026-10-17)

The question the page keeps returning to: **what does each way of training a vision transformer put into its vectors, and what does a token cost?** Every visual either shows what an encoder's vectors contain (global, per layer, per patch) on the same images, or makes the token arithmetic measurable.

What already exists and is not rebuilt (linked instead):
- Root Vision lab: one image as patches and tokens (CLIP B/32 and SigLIP 2), position-similarity tiles at the trained resolution, the 16 x 16 similarity matrix, the softmax/sigmoid loss calculator, the chunked-sigmoid memory calculator, zero-shot prompt sets, linear probes for CLIP and SigLIP 2, typographic, counting, left/right and binding probes.
- ViT paper page: one image through ViT and a ResNet, patch-size explorer, toy data-scale experiment, attention distance, rollout.
- CLIP paper page: a toy CLIP, softmax against sigmoid on a toy batch, the paper's tables.
- Contrastive and self-supervised learning page: InfoNCE, collapse lab, MAE reconstructions from the released ViT-MAE-Base at three masking ratios, I-JEPA block sampling.

Scores: quantity the reader moves (0-2), reproduces a published figure (0-2, counts double), computable from public data (0-2, counts double), shows what a sentence cannot (0-2), corrects a misconception (0-2), measures the central question (0-2), absent elsewhere (0-2), step animation against what it replaced (0-2); minus build cost (0-2).

| # | Idea | Score | Placement | Status |
|---|---|---|---|---|
| 1 | **Same image, four encoders, layer by layer** (animation): the top 3 principal components of every layer's patch tokens as colours, CLIP B/32 against SigLIP 2 B/16 against DINOv2 B/14 against MAE B/16 on one image, with counters (layer, grid, variance carried by 3 components) | 15 | Reading 3 and the Encoder comparison tab | built |
| 2 | **Frozen-feature scoreboard** on Fashion-MNIST: linear probe at k = 1 to 500 labels per class, weighted kNN, image-to-image precision@10 and mAP, for seven vectors (CLIP, SigLIP 2, DINOv2 [CLS] / mean / both, MAE [CLS] / mean), with DINOv2's own Table 4 (published) beside it | 14 | Reading 3 (bars), Encoder comparison tab (table) | built |
| 3 | **Layer-wise probe**: accuracy of a linear probe on each layer's mean patch token, four encoders | 12 | Reading 3 | built |
| 4 | **High-norm tokens and registers**: per-patch norm maps of the same image for five encoders (DINOv2 with and without registers) | 12 | Reading 1 and the comparison tab | built; finding: SigLIP 2 B/16 has three fixed-position outlier patches in every image (15 to 22 times the median norm), DINOv2 B has milder content-dependent ones (up to 4.7 times), DINOv2 with registers none (max 1.4 times) |
| 5 | **Changing the resolution, animated**: CLIP's 7 x 7 position table bicubically resized to 14 x 14 (the model's own interpolate_pos_encoding), slot picker before/after, then the measured embedding drift and the real error raised without interpolation | 12 | Reading 1 | built |
| 6 | **Tokens and cost calculator**: resolution, patch size, width, depth, MLP, extra tokens, presets from configs; MACs split into patch embedding, projections, attention scores, MLP; reproduces timm's 16.9 GMACs (ViT-B/16, 224, without attention scores) and 151.7 (DINOv2 B/14, 518, with them), matched exactly by a FLOP counter with eager attention; NaFlex (SigLIP 2) and Qwen2.5-VL resizing rules ported from transformers | 14 | Own tab | built |
| 7 | **Retrieval**: text to image (24 queries, CLIP and SigLIP 2, with the case trap) and image to image (any of 1,000 gallery images, four encoders side by side) on the Fashion-MNIST test set, precision@K over all 10,000 | 12 | Own tab | built |
| 8 | **Dataset filtering by CLIP score**: LAION's rule (OpenAI CLIP ViT-B/32 cosine at least 0.28) applied to the 16 x 16 matrix of the very same model on the running example, threshold slider | 11 | Reading 2 | built |
| 9 | Patch-to-patch similarity on click (dense correspondence inside one image) from 16 principal components per patch | 9 | Encoder comparison tab | built, labelled approximate |
| 10 | Training a tiny contrastive model at several batch sizes | 7 | none | rejected: the Vision lab and CLIP page already cover batch size and temperature; a toy would not show the published saturation at 32k |
| 11 | DINOv2 ViT-L or g token norms (the paper's outliers appear from ViT-L up) | 8 | none | rejected for now: 300M to 1.1B parameters for one figure the registers paper already prints; base-size results shown, published finding quoted |
| 12 | Fine-tuning at a new resolution (FixRes style) | 6 | none | rejected: multi-hour run that teaches what the published papers state |
| 13 | Semantic segmentation probe (ADE20K) | 6 | none | rejected: dataset licence and size; DINOv2 Table 10 and SigLIP 2 Table 2 quoted instead |

What the methodology lacked: a rule for encoders, whose "figure to reproduce" is usually a benchmark that cannot be run here. The substitute used: run the same protocol (linear probe, kNN, retrieval) on the running example, and set the published table beside it without mixing the two.

## Added 2026-10-24 (teaching-contract rebuild)
| # | Idea | Placement | Status |
|---|---|---|---|
| 14 | **Hero**: one backbone, three training signals, two outputs, measured numbers on the lanes (static annotated diagram) | Reading top | built |
| 15 | **Patchify stepper**: one image through cut, flatten, one matrix, positions, extra tokens, attention, readout; patch 32 / 16 / 14 switch with counters | Reading 1 | built (replaces a link to the root's patch animation) |
| 16 | **Contrastive loss on the real matrix**: CLIP or SigLIP 2 cosines, softmax or sigmoid, batch size and scale, probability matrix and loss-against-scale curve | Reading 4 | built (absorbs the root Vision lab's loss calculator and matrix explorer in one widget) |
| 17 | **Softmax all-gather against chunked sigmoid** (before/after, static), SigLIP section 3.3 accounting at 32,768 on 256 devices | Reading 4 | built (replaces the root's bar calculator: the point is the shape of what each device holds, one number each) |
| 18 | **Typographic attack before/after** on the real cat images with both models' cosines, plus a minimal-pair table with the probe images | Reading 6 | built |
| 19 | Processor aspect-ratio card | moved from the Tokens and cost tab into Reading 2 | moved |
| 20 | A zero-shot prompt explorer | none | rejected here: the root's Vision lab keeps it; this page states the ranges and the case trap with numbers |
