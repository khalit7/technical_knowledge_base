# ViT: visualisation ideas (ids P-vit.k, for the orchestrator to merge into the ideas log)

Scores: teaches (0 to 3), sourced or real (0 to 3), cost (3 cheap to 0 expensive), fits the reader's question (0 to 3).

| id | Idea | Placement | Score | Status | Data and formula |
|---|---|---|---|---|---|
| P-vit.1 | **One image through ViT and through a ResNet** (before/after animation): patchify, project, class token and positions, the class token's real attention at each of 4 layers, prediction; then the same image through the ResNet with its receptive-field square growing 3, 7, 11, 15, 23, 31, 39 px; counters for tokens, reach, multiply-adds | Reading, Method | 3+3+1+3 = 10 | built | shipped toy weights; RF from kernel sizes and strides; MACs by formula (3,122,848 and 3,402,800, equal to `train.py macs`) |
| P-vit.2 | **Patch-size explorer** behind the first predict question: patch size and resolution, grid to scale, tokens, attention pairs against pixel attention | Reading, Problem | 3+3+3+3 = 12 | built | N = floor(R/P)²; pairs (N+1)² |
| P-vit.3 | **Toy data-scale experiment** (the paper's Figure 4 protocol at toy scale): ViT against a compute-matched BiT-style ResNet on 500 to 64,000 images, same hyperparameters and steps, early stopping; held-out accuracy and overfitting gap | Reading, Data scale | 3+3+1+3 = 10 | built | `model/runs/*.json`; one seed per point |
| P-vit.4 | **Learned position-embedding similarity tiles** (Figure 7 centre, from the toy's own table), 64,000-image against 2,000-image model, a grid score | Reading, Position embeddings | 2+3+2+2 = 9 | built; does not reproduce Figure 7's clear grid (score about 0.1), said so | cosine similarity; correlation of similarity with minus grid distance |
| P-vit.5 | **Attention distance by head and layer** (Figure 7 right) measured live on 100 held-out images | Reading, Inside | 2+3+2+2 = 9 | built | attention-weighted patch-centre distance, uniform baseline computed |
| P-vit.6 | **Large minus Base by pre-training set** (Table 5) behind the second predict question | Reading, Data scale | 3+3+3+3 = 12 | built | Table 5 differences |
| P-vit.7 | **Composer and drawing canvas** with live prediction, rollout and every head's map, from the class token or a clicked patch | Run a ViT | 3+3+1+2 = 9 | built | Abnar and Zuidema rollout as App. D.8 |
| P-vit.8 | **Table 6 against compute with the compute-saving recount** (interpolation along the ResNet frontier) and exaFLOPs reproduced by formula | Tables | 3+3+2+3 = 11 | built | 3 × 2 × MACs × 303M × epochs; log-linear interpolation |
| P-vit.9 | **Table 2 gaps in standard deviations** | Tables | 2+3+3+3 = 11 | built | diff / sqrt(sd_a² + sd_b²) |
| P-vit.10 | **Then and now token-sequence morph** (DeiT, MAE, CLIP, registers, NaViT, 2D-RoPE, DiT) | Then and now | 2+2+2+2 = 8 | built | each step's arXiv abstract or quoted line in `inputs/` |
| P-vit.11 | Position-embedding interpolation demo (7 × 7 table bilinearly resized to 10 × 10, similarity kept) | none | 2+3+2+1 = 8 | rejected for now: the toy's table has too little grid structure to show it convincingly | |
| P-vit.12 | Patch-filter principal components (Figure 7 left) of the toy's E | none | 1+3+2+1 = 7 | rejected: with 4 × 4 grey patches the components are trivial and teach little | |
| P-vit.13 | Hybrid (ResNet stem + ViT) variant in the toy | none | 1+2+0+1 = 4 | rejected: CPU budget on a shared machine | |

## Inspiration

- The Transformer page's Run tab and predict widgets (`attention_is_all_you_need_transformer/src/`).
- Attention rollout: Abnar and Zuidema 2020 (https://arxiv.org/abs/2005.00928), as the paper's App. D.8.
- Receptive-field arithmetic: the standard r_l = r_(l-1) + (k - 1) × jump formula.

## What the methodology lacked for this page

- A rule for when a toy result contradicts the paper's headline at toy scale (here the ResNet stays ahead at every size). I followed papers.md's honesty rule: show it beside the paper's figure and say why the toy cannot settle it, without tuning the task.
- Shared-machine CPU budgets: with other agents training, one run took 19 minutes instead of 2.5. A note in the brief to check `uptime` before choosing the sweep size would help.
