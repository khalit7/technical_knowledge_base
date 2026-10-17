# Vision lab: verified facts (2026-10-17)

## Papers (checked 2026-10-17)
- SigLIP: Zhai, Mustafa, Kolesnikov, Beyer, "Sigmoid Loss for Language Image Pre-Training", arXiv:2303.15343 (PDF text extracted with pdftotext). Section 3.2: loss -1/|B| sum_i sum_j log 1/(1 + e^{z_ij(-t x_i.y_j + b)}), z_ij = 1 for pairs and -1 otherwise; "We initialize t0 and b to log 10 and -10 respectively". Section 3.3: data split across D devices, b = |B|/D; "D collective permutes is typically faster than two all-gathers between D devices), and the memory cost at any given moment is reduced from |B|^2 to b^2"; "enabled training with batch sizes over 1 million on relatively few devices". Section 4.1: "When the batch size is smaller than 16 k, sigmoid loss outperforms softmax loss by a large margin". Figure 2 caption: "performance for both sigmoid and softmax saturate at around 32 k batch size"; SigLIP (not SigLiT): "A very large batch size hurts both losses". Abstract: four TPUv4 chips, SigLiT 84.5% ImageNet zero-shot in two days.
- SigLIP 2: Tschannen et al., arXiv:2502.14786, submitted 2025-02-20 (arXiv API). Abstract: adds "captioning-based pretraining, self-supervised losses (self-distillation, masked prediction) and online data curation"; ViT-B (86M), L (303M), So400m (400M), g (1B).
- ViT: Dosovitskiy et al., arXiv:2010.11929, 2020-10-22.
- MAE: He et al., arXiv:2111.06377, 2021-11-11: "masking a high proportion of the input image, e.g., 75%"; encoder on visible patches only.
- DINO: Caron et al., arXiv:2104.14294, 2021-04-29: "a form of self-distillation with no labels"; features "contain explicit information about the semantic segmentation of an image".
- CLIP (from the CLIP paper page in this repo): temperature initialised at 0.07, logits scale clipped at 100 (sections 2.3, 2.5); batch 32,768.

## Code (transformers v5.20.1 clone, commit 0ea877911a11)
- models/clip/modeling_clip.py:47 `def contrastive_loss(logits)`: cross_entropy against arange; `image_text_contrastive_loss` averages logits and transpose.
- models/siglip/modeling_siglip.py:805 `logits_per_text = logits_per_text * logit_scale.exp() + logit_bias`; :814 `loglik = torch.nn.functional.logsigmoid(m1_diag1 * logits_per_text)`; nll summed over each row, mean over rows.
- CLIP and SigLIP patch embeddings are nn.Conv2d with kernel = stride = patch size (clip :148, siglip :124); CLIP has no bias, SigLIP has one; position_embedding is an nn.Embedding (clip :158, siglip :134). CLIP prepends class_embedding (:146, :212).
- `google/siglip2-base-patch16-224` loads as SiglipModel (config model_type "siglip"); processor SiglipImageProcessor: resize to 224 x 224 bilinear (resample 2), mean and std 0.5, no crop. CLIP processor: shortest side 224 bicubic (resample 3), centre crop 224, mean [0.4815, 0.4578, 0.4082], std [0.2686, 0.2613, 0.2758].

## Measured here (CPU float32): see out/*.json for every number.
- big_vision `SigLIP2_demo.ipynb` (commit 0127fb6b337e): text preprocessing `lower(key="text")|tok(length=..., model="gemma", bos="no", eos="sticky", key="text")`; the transformers processor does not lowercase, so this lab lowercases SigLIP text itself (vs_env.embed_text), except in the zero-shot prompt sets, which are embedded exactly as written to show the effect.
- Darcet et al., "Vision Transformers Need Registers", arXiv:2309.16588 (2023-09-28): "high-norm tokens appearing during inference primarily in low-informative background areas of images, that are repurposed for internal computations".
- Winoground arXiv:2204.03162 (2022-04-07); ARO (Yuksekgonul et al.) arXiv:2210.01936 (2022-10-04).
