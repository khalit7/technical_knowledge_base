<!-- Fetched read-only from Notion page 3c65c17b0d0d81e988b5c3cb5e197f98 ("Regularisation"), as of 2026-09-20T20:25:17.514Z, fetched 2026-10-03. No child pages, databases or video. The L1/L2 "Penalty" row is garbled in Notion's export (inline maths); kept verbatim. -->
⏱ 4 min read · +3h 45m resources
## Best resources
- [Dropout paper (Srivastava et al. 2014, JMLR)](https://jmlr.org/papers/v15/srivastava14a.html) (1h 30m): the original, still the clearest statement of the ensemble interpretation.
- [Decoupled Weight Decay Regularization (Loshchilov & Hutter 2017, arXiv:1711.05101)](https://arxiv.org/abs/1711.05101) (45 min): the AdamW paper; why L2-in-the-loss is not weight decay for adaptive optimisers.
- [Deep Learning book, ch. 7: Regularization (Goodfellow et al.)](https://www.deeplearningbook.org/contents/regularization.html) (1h 30m): the systematic treatment.
## Definition
Techniques that prevent overfitting and improve generalisation to unseen data, classically by adding a penalty term to the loss that discourages complex models or large parameter values (though dropout, augmentation, and early stopping regularise without an explicit penalty).
## Penalty-based: L1, L2, elastic net
<table header-row="true">
<tr>
<td></td>
<td>L1 (lasso)</td>
<td>L2 (ridge)</td>
</tr>
<tr>
<td>Penalty</td>
<td>\$\`lambdasum\\</td>
<td>w_i\\</td>
</tr>
<tr>
<td>Effect on weights</td>
<td>Pushes some to exactly zero: sparse models</td>
<td>Shrinks all toward zero, none exactly zero</td>
</tr>
<tr>
<td>Use when</td>
<td>Feature selection, simpler/interpretable models</td>
<td>Handling multicollinearity, stabilising predictions</td>
</tr>
<tr>
<td>Differentiability</td>
<td>Not differentiable at 0 (subgradient needed)</td>
<td>Differentiable everywhere</td>
</tr>
<tr>
<td>Bayesian view</td>
<td>Laplace prior on weights</td>
<td>Gaussian prior on weights</td>
</tr>
</table>
- **Elastic net**: $`\lambda_1\|w\|_1 + \lambda_2\|w\|_2^2`$; sparsity plus stability, useful with correlated features.
## Dropout
- During each training step, drop each neuron independently with probability $`p`$ (authors suggest keep probability around 0.8 for hidden layers). Prevents co-adaptation: no neuron can rely on one specific partner, so the network learns redundant, robust features. Equivalent to training an implicit ensemble of subnetworks.
- **Train vs inference scaling**: training drops units; inference drops nothing, but activations must be scaled so the expected value matches:
	- Original scheme: at inference multiply activations by keep probability.
	- **Inverted dropout** (what frameworks actually do): at training divide surviving activations by keep probability; inference is then a plain forward pass.
- Largely absent from modern LLM pretraining (single-epoch data means little overfitting) but still common in fine-tuning and smaller models.
## Other techniques
<table header-row="true">
<tr>
<td>Technique</td>
<td>Mechanism</td>
<td>Notes</td>
</tr>
<tr>
<td>Data augmentation</td>
<td>Random but realistic transforms (flips, rotations, crops, noise) enlarge and diversify the training set</td>
<td>Attacks overfitting at the data level; the highest-leverage fix when feasible</td>
</tr>
<tr>
<td>Early stopping</td>
<td>Monitor validation loss; stop before the model starts overfitting</td>
<td>Free, always on; keep the best-validation checkpoint</td>
</tr>
<tr>
<td>Weight decay</td>
<td>Penalise large weights so the model captures patterns rather than memorising</td>
<td>Two implementations, below</td>
</tr>
</table>
## Weight decay: two implementations, not equivalent
1. **L2 in the loss**: add $`\tfrac{\lambda}{2}\|w\|^2`$ to the objective; the penalty enters the gradient and then flows through the optimiser's machinery.
2. **Decoupled (in the optimiser)**: modify the update rule directly, $`w \leftarrow w - \eta\lambda w`$ applied alongside the gradient step.
For plain SGD the two coincide. For adaptive optimisers (Adam) they do not: L2-in-the-loss gets divided by the per-parameter second-moment term, so weights with large gradients are barely decayed. Decoupling restores uniform decay, which is the whole point of **AdamW** (see <mention-page url="https://app.notion.com/p/3c65c17b0d0d817080bbc90954681d09"/>).
## Cross-links
- Overfitting/underfitting decision table: <mention-page url="https://app.notion.com/p/3c65c17b0d0d8198857bd8347723ad70"/>
- Normalisation layers also have a mild regularising effect (batch noise): <mention-page url="https://app.notion.com/p/3c65c17b0d0d81369e1cc38ed4e11d48"/>
