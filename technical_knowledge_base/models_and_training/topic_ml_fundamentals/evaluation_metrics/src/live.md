Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d81a29acef722e842a29b as of 2026-09-20T20:25:44.055Z:
<page url="https://app.notion.com/p/3c65c17b0d0d81a29acef722e842a29b">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81d796ccc0a293218c57" title="Topic: ml-fundamentals"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Evaluation metrics"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 5 min read · +2h 45m resources
## Best resources
- [Google ML Crash Course: classification metrics](https://developers.google.com/machine-learning/crash-course/classification) (\~45 min): precision/recall/ROC with interactive thresholds.
- [The Relationship Between Precision-Recall and ROC Curves (Davis & Goadrich 2006)](https://www.biostat.wisc.edu/~page/rocpr.pdf) (45 min): the imbalanced-data argument, formally.
- [BERTScore paper (Zhang et al. 2019, arXiv:1904.09675)](https://arxiv.org/abs/1904.09675) (45 min): embedding-based text evaluation.
- [HuggingFace evaluate docs](https://huggingface.co/docs/evaluate) (docs, \~30 min): implementations of BLEU/ROUGE/METEOR/perplexity and friends.
## Classification metrics
From the confusion matrix (TP, FP, TN, FN):
<table header-row="true">
<tr>
<td>Metric</td>
<td>Formula</td>
<td>Reads as</td>
</tr>
<tr>
<td>Precision</td>
<td>TP/(TP+FP)</td>
<td>Of everything I flagged positive, how much was right</td>
</tr>
<tr>
<td>Recall (= TPR, sensitivity)</td>
<td>TP/(TP+FN)</td>
<td>Of all actual positives, how many I caught</td>
</tr>
<tr>
<td>F1</td>
<td>$`2PR/(P+R)`$</td>
<td>Harmonic mean of precision and recall</td>
</tr>
<tr>
<td>FPR</td>
<td>FP/(FP+TN)</td>
<td>Fraction of actual negatives wrongly flagged</td>
</tr>
<tr>
<td>TNR (specificity)</td>
<td>TN/(TN+FP)</td>
<td>$`1-`$ FPR</td>
</tr>
</table>
### ROC vs PR curves
- **ROC curve**: sweep the decision threshold, plot TPR vs FPR. **AUC (ROC-AUC)** = area under it; probability a random positive scores above a random negative.
- **PR curve (PRC)**: for binary classification, sweep thresholds in \[0,1\], record precision and recall at each, plot them against each other. **AUPRC** = area under it.
- **Why ROC misleads on imbalanced data**: FPR's denominator is the (huge) negative class, so even thousands of extra false positives barely move FPR, while recall moves quickly; the ROC curve looks great regardless. Precision's denominator is the model's own positive predictions, so it punishes those same false positives directly. Use PRC/AUPRC when positives are rare.
## Text generation metrics
<table header-row="true">
<tr>
<td>Metric</td>
<td>Mechanism</td>
<td>Origin / notes</td>
</tr>
<tr>
<td>BLEU</td>
<td>For n = 1..4: count n-grams shared between output and reference (clipped precision); geometric mean; multiply by brevity penalty BP to punish short outputs. BLEU = BP x mean</td>
<td>Machine translation; precision-oriented</td>
</tr>
<tr>
<td>ROUGE-N</td>
<td>Precision, recall, and F1 of matching n-grams</td>
<td>Summarisation; recall-oriented</td>
</tr>
<tr>
<td>ROUGE-L</td>
<td>Longest common subsequence between output and reference</td>
<td>Order-sensitive without requiring contiguity</td>
</tr>
<tr>
<td>ROUGE-S</td>
<td>Skip-bigram co-occurrence</td>
<td>Allows gaps within bigrams</td>
</tr>
<tr>
<td>METEOR</td>
<td>Unigram alignment with stemming and synonym matching, plus a fragmentation (ordering) penalty</td>
<td>Correlates with humans better than BLEU at sentence level</td>
</tr>
<tr>
<td>Perplexity</td>
<td>$`PPL = \left(\prod_i p(w_i\mid w_{<i})\right)^{-1/N} = \exp(\text{mean NLL})`$: reciprocal geometric mean of per-token probabilities</td>
<td>Lower is better; intrinsic LM quality; comparable only under the same tokeniser</td>
</tr>
<tr>
<td>BERTScore</td>
<td>Cosine similarity between contextual BERT embeddings of candidate and reference tokens, greedily matched; report P/R/F1</td>
<td>Semantic similarity, robust to paraphrase</td>
</tr>
<tr>
<td>MoverScore</td>
<td>Earth mover's distance between contextual embedding distributions</td>
<td>Softer many-to-one matching than BERTScore</td>
</tr>
</table>
Modern practice note (2026): n-gram metrics survive mostly in translation/summarisation papers; LLM output evaluation has largely moved to LLM-as-judge and task-specific benchmarks (see <mention-page url="https://app.notion.com/p/3c65c17b0d0d8181b351e1b8fc6a1546"/>).
## Entropy vs cross entropy vs KL divergence
<table header-row="true">
<tr>
<td>Quantity</td>
<td>Formula</td>
<td>Meaning</td>
<td></td>
</tr>
<tr>
<td>Entropy $`H(P)`$</td>
<td>$`-\sum P\log P`$</td>
<td>Average bits to encode samples from $`P`$ using $`P`$'s own optimal code</td>
<td></td>
</tr>
<tr>
<td>Cross entropy $`H(P,Q)`$</td>
<td>$`-\sum P\log Q`$</td>
<td>Average bits to encode samples from $`P`$ using a code built for $`Q`$</td>
<td></td>
</tr>
<tr>
<td>KL divergence</td>
<td>\$\`D_\{KL\}(P\\</td>
<td>Q) = H(P,Q) - H(P) = sum Plog(P/Q)\`\$</td>
<td>The extra bits paid for using the wrong code; distance-like but asymmetric, no triangle inequality</td>
</tr>
</table>
- Minimising cross entropy w.r.t. $`Q`$ = minimising KL, since $`H(P)`$ is fixed; with one-hot labels, $`H(P)=0`$ and CE = KL = NLL of the true class.
- KL is the workhorse for measuring divergence between distributions: VAE regularisers, distillation, RLHF policy constraints.
## Cross-links
- Imbalanced-data handling (why accuracy fails, focal loss): <mention-page url="https://app.notion.com/p/3c65c17b0d0d8198857bd8347723ad70"/>
- CE and KL as loss functions: <mention-page url="https://app.notion.com/p/3c65c17b0d0d8161a72bc8c572f37d55"/>
</content>
</page>
