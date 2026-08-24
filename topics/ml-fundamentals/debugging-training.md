# Debugging training

## Best resources

- [A Recipe for Training Neural Networks (Karpathy)](https://karpathy.github.io/2019/04/25/recipe/): the canonical "why your training silently fails" checklist.
- [Deep Learning Tuning Playbook (Google Research)](https://github.com/google-research/tuning_playbook): systematic hyperparameter and debugging methodology.
- [Focal loss paper (arXiv:1708.02002)](https://arxiv.org/abs/1708.02002): the imbalance-handling reference.

## Why feature scaling

Ensures all features contribute equally so large-range features do not dominate, speeds up gradient-descent convergence (rounder loss contours), and improves overall model performance. Mandatory for distance-based methods (kNN, SVM, k-means). Formulas in [normalisation-and-initialisation.md](normalisation-and-initialisation.md).

## Fit problems

| Symptom | Diagnosis | Fixes (in order of preference) |
|---|---|---|
| Train loss low, val loss high | Overfitting | 1. More data (incl. augmentation) 2. Regularisation (L1/L2, dropout, weight decay) 3. Early stopping 4. Reduce model complexity |
| Train loss itself high | Underfitting | 1. Increase model complexity 2. Train longer 3. Decrease regularisation |

## Gradient pathologies

| Symptom | Diagnosis | Fixes |
|---|---|---|
| Early-layer gradients ~0; deep net learns slowly or not at all | Vanishing gradients | Better initialisation (Xavier/He); residual connections; normalisation layers; better activation (ReLU family over sigmoid/tanh); make the network shallower |
| Gradients/weights blow up; loss spikes or NaN | Exploding gradients | Better initialisation; **gradient clipping**; residual connections; normalisation layers; make the network shallower |

## Loss-curve diagnosis trees

**Loss does not decrease from the start**

| Cause | Check |
|---|---|
| LR too high or too low | LR sweep; try 3x up/down |
| Wrong loss function | Matches the task and the output activation? (e.g. logits vs probabilities) |
| Gradients not flowing | Network actually connected? Layers accidentally frozen? Inspect grad norms per layer |
| Data/label mismatch | Overfit a single batch first; visually inspect (x, y) pairs after the pipeline |

**Loss increasing or hitting NaN from the start**: LR too high, or exploding gradients.

**Loss decreases, then suddenly jumps to NaN**: numerical instability, division by zero or log(0); add epsilons, use fused/log-space ops (log-softmax + NLL), check for inf inputs, consider loss-scaling with fp16.

**Loss stopped decreasing (plateau)**

| Cause | Response |
|---|---|
| Reached a local/global minimum | May simply be done; check val metrics |
| Saddle point | Optimiser with momentum/adaptivity escapes it (see [optimisers-and-schedulers.md](optimisers-and-schedulers.md)) |
| LR too small | Increase, or use warm restarts |
| Vanishing gradients | See gradient table above |
| Dead ReLUs | Fraction of zero activations per layer; switch to Leaky ReLU/GELU or lower LR |

**Loss oscillating heavily**: LR too high; batch size too small (noisy gradients); optimiser lacking momentum or adaptive LR.

## Imbalanced data

Problem: the model struggles to learn the minority class (and accuracy hides it).

| Strategy | How |
|---|---|
| Re-sampling | Oversample the minority class (or SMOTE-style synthesis); undersample the majority |
| Re-weighting | Weighted loss: higher weights on minority-class terms |
| Focal loss | $-(1-\hat p_t)^\gamma\log\hat p_t$ down-weights easy examples so hard, misclassified ones dominate training; built for extreme imbalance (dense detection) |
| Data augmentation | Enlarge the minority class with realistic transforms |
| Right metrics | Evaluate with precision/recall/F1/AUPRC, never plain accuracy (see [metrics.md](metrics.md)) |

## Standing checklist (Karpathy-style)

1. Inspect data by hand before training.
2. Overfit a single batch to ~0 loss; if you cannot, the bug is in the code, not the hyperparameters.
3. Establish a dumb baseline; verify the initial loss matches theory (e.g. $-\log(1/K)$ for K-class CE).
4. Change one thing at a time; log grad norms, weight norms, LR.

## Cross-links

- Warmup rationale, schedulers, saddle points: [optimisers-and-schedulers.md](optimisers-and-schedulers.md)
- Initialisation and normalisation as gradient fixes: [normalisation-and-initialisation.md](normalisation-and-initialisation.md)
