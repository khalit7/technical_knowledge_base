# Vision lab (t-vision): visual ideas, built and rejected

The tab's question: what does a vision encoder turn an image into, and what can (and cannot) be read back out of it by comparing with text? Every visual runs on the released CLIP ViT-B/32 and SigLIP 2 base-patch16-224 weights and on the topic's running example, because the ViT, CLIP and Contrastive pages already teach the mechanisms on trained toys.

Checked first, so nothing is repeated (2026-10-17):
- ViT paper page: one image through ViT and a ResNet (animated, toy), patch-size explorer, toy position-embedding tiles (did not reproduce the paper's grid), data-scale toy.
- CLIP paper page: tiny CLIP toy, toy batch with temperature slider, softmax against sigmoid animated on toy cosines, zero-shot head animation, robustness toys.
- Contrastive and self-supervised learning: InfoNCE on a real text batch with tau and N sliders, alignment/uniformity, collapse lab, MAE against I-JEPA.

Scores: 0 to 2 on quantity-with-a-parameter, reproduces-a-published-or-recorded-figure (x2), computable from public data (x2), shows what a sentence cannot, corrects a misconception, measures the tab's question, absent elsewhere, step animation against the method it replaced; minus build cost.

| # | Idea | Placement | Score | Status | Data |
|---|---|---|---|---|---|
| VS1 | **One image as patches, a sequence and tokens, animated, CLIP B/32 against SigLIP 2 B/16 on the same input** (8 steps: input, grid, sequence, flatten, project, positions, [CLS] or not, pool) with counters (patches, numbers per patch, tokens, attention scores) | Section 1 | 13 | built | analyse.py: real 224-px input, first 16 of 768 numbers of each real patch token, real position-embedding cosines (click a patch), last-layer [CLS] attention (CLIP) and MAP-probe attention (SigLIP 2) |
| VS2 | **Patch embedding = unfold + one matrix**, checked against the model's Conv2d (max abs difference printed) | Section 1, code | 8 | built | analyse.py patch_check |
| VS3 | **Real 16 x 16 similarity explorer**: cosine, row softmax, column softmax, sigmoid views with each model's learned scale and bias; click a cell | Section 3 | 11 | built | sim16 from analyse.py; reproduces the root smoke test's 15 of 16 |
| VS4 | **Contrastive-loss calculator on real embeddings**: N, t, b, softmax or sigmoid; loss-against-scale curve with ln N line; per-pair loss bars | Section 3 | 10 | built | sim16; formulas from transformers modeling_clip.py:47, modeling_siglip.py:805/814 |
| VS5 | **Why the sigmoid scales**: per-device logits and received embeddings for |B| and D, three accountings | Section 3 | 8 | built | derived from SigLIP section 3.3 (labelled derived) |
| VS6 | **Zero-shot query** on 40 Fashion-MNIST test images, 2 wordings x 6 template choices, both models | Section 4 | 10 | built | zeroshot.py query_cos |
| VS7 | **Prompt-set table and confusion matrix** on all 10,000 test images | Section 4 | 10 | built | zeroshot.py |
| VS8 | **Zero-shot against linear probes (k = 1 to 500 per class, 5 draws) and a from-scratch CNN**, predict first | Section 4 | 11 | built | zeroshot.py, root smoke classifier |
| VS9 | **Typographic attack before/after animation** (plain, CAT control, DOG, BIRD, CAR, small and large DOG), both models | Section 5 | 12 | built | make_probes.py + analyse.py; DOG reproduces the root smoke test's cosines |
| VS10 | **Counting, left/right, binding minimal pairs** with margins | Section 5 | 9 | built | probes |
| VS11 | Pretrained CLIP running in the browser | none | | rejected | hundreds of MB; sandbox has no network; recorded cosines are exact for the recorded inputs |
| VS12 | Training a tiny contrastive model here for the temperature/batch demo | none | | rejected | the CLIP and Contrastive pages already train toys; the real embeddings show the loss behaviour without a new toy |
| VS13 | GPU (MPS) timing of both encoders | none | | rejected | CPU was fast enough (2 and about 9 minutes for 15,000 images), keeping the shared bench lock free for the Latent lab; GPU timings would not transfer to datacenter GPUs anyway |
| VS14 | Attention rollout over all layers | none | | rejected | the last-layer map is labelled as a hint; rollout adds code and a second interpretation without changing the lesson |
| VS15 | Receptive-field growth animation (CNN against ViT) | none | | rejected | the ViT page animates one image through both; a sentence with the 2L + 1 formula suffices here |

What the methodology lacked here: a rule for when a released model's numbers should replace a toy (here: when the neighbouring pages already own the toy and the root's running example gives fixed inputs).
