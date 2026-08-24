# Evaluation metrics

## Best resources

- [Google ML Crash Course: classification metrics](https://developers.google.com/machine-learning/crash-course/classification): precision/recall/ROC with interactive thresholds.
- [The Relationship Between Precision-Recall and ROC Curves (Davis & Goadrich 2006)](https://www.biostat.wisc.edu/~page/rocpr.pdf): the imbalanced-data argument, formally.
- [BERTScore paper (Zhang et al. 2019, arXiv:1904.09675)](https://arxiv.org/abs/1904.09675): embedding-based text evaluation.
- [HuggingFace evaluate docs](https://huggingface.co/docs/evaluate): implementations of BLEU/ROUGE/METEOR/perplexity and friends.

## Classification metrics

From the confusion matrix (TP, FP, TN, FN):

| Metric | Formula | Reads as |
|---|---|---|
| Precision | TP/(TP+FP) | Of everything I flagged positive, how much was right |
| Recall (= TPR, sensitivity) | TP/(TP+FN) | Of all actual positives, how many I caught |
| F1 | $2PR/(P+R)$ | Harmonic mean of precision and recall |
| FPR | FP/(FP+TN) | Fraction of actual negatives wrongly flagged |
| TNR (specificity) | TN/(TN+FP) | $1-$ FPR |

### ROC vs PR curves

- **ROC curve**: sweep the decision threshold, plot TPR vs FPR. **AUC (ROC-AUC)** = area under it; probability a random positive scores above a random negative.
- **PR curve (PRC)**: for binary classification, sweep thresholds in [0,1], record precision and recall at each, plot them against each other. **AUPRC** = area under it.
- **Why ROC misleads on imbalanced data**: FPR's denominator is the (huge) negative class, so even thousands of extra false positives barely move FPR, while recall moves quickly; the ROC curve looks great regardless. Precision's denominator is the model's own positive predictions, so it punishes those same false positives directly. Use PRC/AUPRC when positives are rare.

## Text generation metrics

| Metric | Mechanism | Origin / notes |
|---|---|---|
| BLEU | For n = 1..4: count n-grams shared between output and reference (clipped precision); geometric mean; multiply by brevity penalty BP to punish short outputs. BLEU = BP x mean | Machine translation; precision-oriented |
| ROUGE-N | Precision, recall, and F1 of matching n-grams | Summarisation; recall-oriented |
| ROUGE-L | Longest common subsequence between output and reference | Order-sensitive without requiring contiguity |
| ROUGE-S | Skip-bigram co-occurrence | Allows gaps within bigrams |
| METEOR | Unigram alignment with stemming and synonym matching, plus a fragmentation (ordering) penalty | Correlates with humans better than BLEU at sentence level |
| Perplexity | $PPL = \left(\prod_i p(w_i\mid w_{<i})\right)^{-1/N} = \exp(\text{mean NLL})$: reciprocal geometric mean of per-token probabilities | Lower is better; intrinsic LM quality; comparable only under the same tokeniser |
| BERTScore | Cosine similarity between contextual [BERT](../../papers/2018-10_bert/summary.md) embeddings of candidate and reference tokens, greedily matched; report P/R/F1 | Semantic similarity, robust to paraphrase |
| MoverScore | Earth mover's distance between contextual embedding distributions | Softer many-to-one matching than BERTScore |

Modern practice note (2026): n-gram metrics survive mostly in translation/summarisation papers; LLM output evaluation has largely moved to LLM-as-judge and task-specific benchmarks (see topics/evaluation-and-llm-judges).

## Entropy vs cross entropy vs KL divergence

| Quantity | Formula | Meaning |
|---|---|---|
| Entropy $H(P)$ | $-\sum P\log P$ | Average bits to encode samples from $P$ using $P$'s own optimal code |
| Cross entropy $H(P,Q)$ | $-\sum P\log Q$ | Average bits to encode samples from $P$ using a code built for $Q$ |
| KL divergence | $D_{KL}(P\|Q) = H(P,Q) - H(P) = \sum P\log(P/Q)$ | The extra bits paid for using the wrong code; distance-like but asymmetric, no triangle inequality |

- Minimising cross entropy w.r.t. $Q$ = minimising KL, since $H(P)$ is fixed; with one-hot labels, $H(P)=0$ and CE = KL = NLL of the true class.
- KL is the workhorse for measuring divergence between distributions: VAE regularisers, distillation, RLHF policy constraints.

## Cross-links

- Imbalanced-data handling (why accuracy fails, focal loss): [debugging-training.md](debugging-training.md)
- CE and KL as loss functions: [losses.md](losses.md)
