<!-- Notion fetch of "Debugging training" (3c65c17b0d0d8198857bd8347723ad70), last edited 2026-09-20T20:25:34.717Z, fetched 2026-10-03. Content block copied verbatim from the tool result (JSON-unescaped). No child pages, databases or video. -->
<page url="https://app.notion.com/p/3c65c17b0d0d8198857bd8347723ad70">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81d796ccc0a293218c57" title="Topic: ml-fundamentals"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Debugging training"}
</properties>
<content>
⏱ 5 min read · +3h 20m resources
## Best resources
- [A Recipe for Training Neural Networks (Karpathy)](https://karpathy.github.io/2019/04/25/recipe/) (\~35 min): the canonical "why your training silently fails" checklist.
- [Deep Learning Tuning Playbook (Google Research)](https://github.com/google-research/tuning_playbook) (repo, \~2h for the main document): systematic hyperparameter and debugging methodology.
- [Focal loss paper (arXiv:1708.02002)](https://arxiv.org/abs/1708.02002) (45 min): the imbalance-handling reference.
## Why feature scaling
Ensures all features contribute equally so large-range features do not dominate, speeds up gradient-descent convergence (rounder loss contours), and improves overall model performance. Mandatory for distance-based methods (kNN, SVM, k-means). Formulas in <mention-page url="https://app.notion.com/p/3c65c17b0d0d81369e1cc38ed4e11d48"/>.
## Fit problems
<table header-row="true">
<tr>
<td>Symptom</td>
<td>Diagnosis</td>
<td>Fixes (in order of preference)</td>
</tr>
<tr>
<td>Train loss low, val loss high</td>
<td>Overfitting</td>
<td>1. More data (incl. augmentation) 2. Regularisation (L1/L2, dropout, weight decay) 3. Early stopping 4. Reduce model complexity</td>
</tr>
<tr>
<td>Train loss itself high</td>
<td>Underfitting</td>
<td>1. Increase model complexity 2. Train longer 3. Decrease regularisation</td>
</tr>
</table>
## Gradient pathologies
<table header-row="true">
<tr>
<td>Symptom</td>
<td>Diagnosis</td>
<td>Fixes</td>
</tr>
<tr>
<td>Early-layer gradients \~0; deep net learns slowly or not at all</td>
<td>Vanishing gradients</td>
<td>Better initialisation (Xavier/He); residual connections; normalisation layers; better activation (ReLU family over sigmoid/tanh); make the network shallower</td>
</tr>
<tr>
<td>Gradients/weights blow up; loss spikes or NaN</td>
<td>Exploding gradients</td>
<td>Better initialisation; **gradient clipping**; residual connections; normalisation layers; make the network shallower</td>
</tr>
</table>
## Loss-curve diagnosis trees
**Loss does not decrease from the start**
<table header-row="true">
<tr>
<td>Cause</td>
<td>Check</td>
</tr>
<tr>
<td>LR too high or too low</td>
<td>LR sweep; try 3x up/down</td>
</tr>
<tr>
<td>Wrong loss function</td>
<td>Matches the task and the output activation? (e.g. logits vs probabilities)</td>
</tr>
<tr>
<td>Gradients not flowing</td>
<td>Network actually connected? Layers accidentally frozen? Inspect grad norms per layer</td>
</tr>
<tr>
<td>Data/label mismatch</td>
<td>Overfit a single batch first; visually inspect (x, y) pairs after the pipeline</td>
</tr>
</table>
**Loss increasing or hitting NaN from the start**: LR too high, or exploding gradients.
**Loss decreases, then suddenly jumps to NaN**: numerical instability, division by zero or log(0); add epsilons, use fused/log-space ops (log-softmax + NLL), check for inf inputs, consider loss-scaling with fp16.
**Loss stopped decreasing (plateau)**
<table header-row="true">
<tr>
<td>Cause</td>
<td>Response</td>
</tr>
<tr>
<td>Reached a local/global minimum</td>
<td>May simply be done; check val metrics</td>
</tr>
<tr>
<td>Saddle point</td>
<td>Optimiser with momentum/adaptivity escapes it (see <mention-page url="https://app.notion.com/p/3c65c17b0d0d817080bbc90954681d09"/>)</td>
</tr>
<tr>
<td>LR too small</td>
<td>Increase, or use warm restarts</td>
</tr>
<tr>
<td>Vanishing gradients</td>
<td>See gradient table above</td>
</tr>
<tr>
<td>Dead ReLUs</td>
<td>Fraction of zero activations per layer; switch to Leaky ReLU/GELU or lower LR</td>
</tr>
</table>
**Loss oscillating heavily**: LR too high; batch size too small (noisy gradients); optimiser lacking momentum or adaptive LR.
## Imbalanced data
Problem: the model struggles to learn the minority class (and accuracy hides it).
<table header-row="true">
<tr>
<td>Strategy</td>
<td>How</td>
</tr>
<tr>
<td>Re-sampling</td>
<td>Oversample the minority class (or SMOTE-style synthesis); undersample the majority</td>
</tr>
<tr>
<td>Re-weighting</td>
<td>Weighted loss: higher weights on minority-class terms</td>
</tr>
<tr>
<td>Focal loss</td>
<td>$`-(1-\hat p_t)^\gamma\log\hat p_t`$ down-weights easy examples so hard, misclassified ones dominate training; built for extreme imbalance (dense detection)</td>
</tr>
<tr>
<td>Data augmentation</td>
<td>Enlarge the minority class with realistic transforms</td>
</tr>
<tr>
<td>Right metrics</td>
<td>Evaluate with precision/recall/F1/AUPRC, never plain accuracy (see <mention-page url="https://app.notion.com/p/3c65c17b0d0d81a29acef722e842a29b"/>)</td>
</tr>
</table>
## Standing checklist (Karpathy-style)
1. Inspect data by hand before training.
2. Overfit a single batch to \~0 loss; if you cannot, the bug is in the code, not the hyperparameters.
3. Establish a dumb baseline; verify the initial loss matches theory (e.g. $`-\log(1/K)`$ for K-class CE).
4. Change one thing at a time; log grad norms, weight norms, LR.
## Cross-links
- Warmup rationale, schedulers, saddle points: <mention-page url="https://app.notion.com/p/3c65c17b0d0d817080bbc90954681d09"/>
- Initialisation and normalisation as gradient fixes: <mention-page url="https://app.notion.com/p/3c65c17b0d0d81369e1cc38ed4e11d48"/>
</content>
</page>
