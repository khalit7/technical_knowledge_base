# Evaluation metrics: visualisation ideas

Central question: what does each score reward, what can it not see, and how much should a number on a finite test set be trusted? A visual earns its place when it makes one of those three measurable on real model outputs.

Existing visuals elsewhere (not repeated here): ROC against precision-recall as prevalence falls, binormal classifier, ROC-AUC 0.856 while AUPRC falls 0.85 to 0.11 (Topic: ml-fundamentals, Reading step 7, `rd-pr`); entropy, cross entropy and KL bar with a probability slider (same page, thread 1, `rd-ce`); perplexity of twelve decoders on GPT-2 (Sampling and Decoding, SD3); bootstrap re-ranking of a leaderboard from released judge grades (RocketEval, P-rocketeval.1); Wilson intervals on corrected benchmark scores (Re-grading six physics benchmarks); Elo tournament bootstrap (QLoRA, P-qlora.3). Topic: evaluation-and-llm-judges is not migrated, so its judge material is linked, not built.

## Scoring (0 to 2 each; reproduces and computable count double; build cost subtracted; +1 for a step-by-step before/after animation)

| # | Idea | Param | Repro x2 | Computable x2 | Beyond a sentence | Misconception | Central | Absent elsewhere | Anim | Cost | Score | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EM1 | **Threshold lab**: real SST-2 scores of three classifiers (LR, naive Bayes, NB + isotonic), threshold slider, confusion matrix with the sentences in each cell, accuracy, P, R, F1, F2, F0.5, specificity, MCC, balanced accuracy, ROC / PR / reliability with the current point, all or rare positives, best-F1 / best-MCC buttons, probability or log-odds histogram | 2 | 2 (x2) (scikit-learn, exact) | 2 (x2) | 2 | 2 (accuracy on imbalance; F1 and MCC want different thresholds) | 2 | 1 (root has a binormal toy, no confusion matrix) | 0 | -2 | 15 | built, own tab |
| EM2 | **Calibration before/after animation**: 872 real NB predictions as dots, binned, gaps, isotonic map slides every dot, re-binned, LR for reference; counters accuracy, AUC, log-loss, Brier, ECE | 1 | 2 (x2) | 2 (x2) | 2 | 2 (the more accurate model is the worse forecaster) | 2 | 2 | 1 | -1 | 16 | built, Reading section 3 |
| EM3 | **Macro / micro / weighted** on a real imbalanced 6-class confusion matrix (UCI Glass, CV logistic regression), bar width = class weight | 1 | 2 (x2) | 2 (x2) | 1 | 2 (micro = accuracy; a class with F1 0 vanishes) | 1 | 2 | 0 | 0 | 14 | built, Reading section 4 |
| EM4 | **One sentence pair through five scorers, animated** (BLEU n-gram by n-gram with clipping and BP, ROUGE-L's LCS, METEOR's stages and chunks, chrF's character orders, BERTScore's real similarity matrix and greedy matches), 7 candidates | 1 | 2 (x2) (sacrebleu, rouge-score, NLTK, bert-score) | 2 (x2) | 2 | 2 | 2 | 2 | 1 | -2 | 17 | built, Reading section 5 |
| EM5 | **Paraphrase against one-word negation** on seven scores | 0 | 2 (x2) | 2 (x2) | 2 | 2 (overlap and embeddings miss negation) | 2 | 2 | 0 | 0 | 16 | built, Reading section 5 |
| EM6 | **Text metrics lab**: editable reference and candidate, BLEU, chrF, ROUGE-1/2/L/S*, METEOR live; all presets table with BERTScore and METEOR + WordNet | 2 | 2 (x2) (150 random pairs match) | 2 (x2) | 1 | 1 | 2 | 2 | 0 | -2 | 14 | built, own tab |
| EM7 | **Perplexity token by token under three tokenizers** (GPT-2, SmolLM2-135M, Qwen2.5-0.5B real log-probs), width = bytes, height = bits per byte, area = bits; counters per token and per byte; summary table with per-word perplexity | 2 | 1 (x2) (Pile's BPB rationale, by construction) | 2 (x2) | 2 | 2 (per-token perplexity is not comparable) | 2 | 2 | 1 | -1 | 16 | built, Reading section 6 |
| EM8 | **Paired against unpaired bootstrap** of the NB minus LR accuracy difference, test-size slider | 2 | 1 (x2) (NumPy bootstrap, to tolerance) | 2 (x2) | 2 | 2 (a 1-point gap on 872 is noise; pairing halves the interval) | 2 | 1 (bootstraps exist on paper pages, not for a basic metric) | 0 | -1 | 14 | built, Reading section 8 |
| EM9 | Accuracy trap table (always negative against LR at 0.5 and at best MCC, rare positives) | 0 | 2 (x2) | 2 (x2) | 1 | 2 | 1 | 2 | 0 | 0 | 14 | built, Reading section 1 |
| EM10 | ROC against PR as prevalence changes | 2 | 2 | 2 | 2 | 2 | 1 | 0 (root `rd-pr`) | 0 | -1 | 9 | rejected: built on the root; linked, and the real-data version lives in EM1's "rare positives" |
| EM11 | Entropy / CE / KL widget | 1 | 1 | 2 | 1 | 1 | 1 | 0 (root thread 1) | 0 | -1 | 6 | rejected: built on the root; summarised and linked |
| EM12 | MoverScore on the presets | 0 | 1 | 1 | 1 | 0 | 1 | 2 | 0 | -2 | 4 | rejected: needs corpus idf and an optimal-transport solve; would add a second embedding score with the same blind spot (negation) |
| EM13 | Live BERTScore on the reader's own text | 2 | 2 | 0 | 1 | 1 | 1 | 2 | 0 | -3 | n/a | rejected: roberta-large (355M) cannot run in a sandboxed page; presets precomputed instead |
| EM14 | METEOR WordNet stage in JS | 1 | 1 | 1 | 0 | 0 | 0 | 2 | 0 | -3 | 1 | rejected: WordNet is megabytes; NLTK's values shown for presets, with the stem-then-synonym quirk explained |
| EM15 | ECE bin-count sensitivity slider | 2 | 0 | 2 | 1 | 1 | 0 | 2 | 0 | -1 | 7 | rejected for now: one sentence says ECE depends on binning; would crowd the calibration card |
| EM16 | pass@k unbiased estimator | 2 | 2 | 2 | 1 | 1 | 0 | 0 | 0 | -1 | 6 | rejected: belongs to benchmarks / test-time compute pages (Topic: llms R3) |

## Data and formulas

- SST-2: `data_sst2.py`, Hugging Face `stanfordnlp/sst2` parquet (train 67,349 phrases, validation 872 sentences, 444 positive). Models: TF-IDF (1,2)-grams min_df 2 sublinear + LogisticRegression C=1; CountVectorizer (1,2)-grams + MultinomialNB alpha 1; CalibratedClassifierCV(MultinomialNB, isotonic, cv=5). Shipped as log-odds x 1000 (probabilities as extreme as 1e-15 kept); texts cut to 90 characters. "Rare positives": every tenth positive in file order (45) and all 428 negatives.
- Formulas: confusion-matrix ratios as in scikit-learn; MCC (Matthews 1975); ROC-AUC by average ranks; average precision = sum (R_k - R_k-1) P_k (scikit-learn); Brier mean (p - y)^2; log-loss with clip 1e-15; ECE over 10 equal-width bins (Guo et al. 2017).
- Glass: `data_glass.py`, OpenML 41, StandardScaler + LogisticRegression, StratifiedKFold(5, shuffle, seed 0), cross_val_predict. Macro, micro, weighted as scikit-learn `average=`.
- Text: `data_text.py`; sacrebleu 2.6.0 `sentence_bleu` (13a, exp smoothing, effective order) and `sentence_chrf` (char order 6, beta 2); rouge-score 0.1.2 (no stemmer); NLTK 3.10.3 `meteor_score` on 13a tokens lower-cased, PorterStemmer MARTIN_EXTENSIONS and a no-synonym WordNet stand-in (the page's live METEOR), and NLTK defaults (WordNet) for the presets; bert-score 0.3.12 roberta-large layer 17, idf off, baseline rescaling from the package's `rescale_baseline/en/roberta-large.tsv`; the similarity matrices recomputed by hand and checked against the library (equal to 1e-4). `data_text_fuzz.py`: 150 perturbed SST-2 sentence pairs for the port check.
- Perplexity: `data_ppl.py`, GPT-2 (openai-community/gpt2), HuggingFaceTB/SmolLM2-135M, Qwen/Qwen2.5-0.5B; float32 CPU, 2 threads; each text after the model's own BOS or end-of-text token; per-token bytes from the byte-level BPE alphabet. PPL = exp(nats / tokens); BPB = bits / UTF-8 bytes; PPL per word = exp(nats / whitespace words).
- Bootstrap: per-sentence correctness at 0.5, first n of a seed-0 permutation; paired resamples draw sentence indices once for both models; unpaired draw separately; percentile 2.5 and 97.5 (`MX.quant`, linear interpolation).

## Reproduction

- Every classification number at threshold 0.5, ROC-AUC, AP, Brier, log-loss and ECE for 3 models x 2 subsets, the glass averages and per-class F1: reproduce scikit-learn exactly (`check_core.mjs`, independently).
- BLEU, chrF, ROUGE-1/2/L and METEOR (no WordNet) on the 8 presets and 150 random pairs: reproduce the libraries to 1e-9 (independently, by porting the code). Porter stemmer: every word in the check list equals NLTK MARTIN_EXTENSIONS.
- BERTScore from the 3-decimal matrices: within 2e-3 of the library; rescaled values by construction from the library's raw F and baseline.
- Perplexity and bits per byte: recomputed from the shipped log-probabilities (by construction from the same data); the Pile's tokenizer-invariance argument is shown, not reproduced as a number.
- Bootstrap: paired interval at n = 872 is -1.1 to +3.2 points in the page against -1.0 to +3.4 in NumPy (different resamples; same method).

## Inspiration

Google ML Crash Course threshold widgets (confusion matrix with a slider); scikit-learn's calibration examples (reliability diagrams of naive Bayes against logistic regression); Guo et al. 2017 Figure 1 (reliability bars with gaps); the DeepSeek MLA explainer pattern for the stepped text-scorer and calibration animations; the root page's ROC/PR widget for plot styling.

## What the methodology lacked for this page

The scoring assumes published figures to reproduce; for metrics the "figure" is the reference implementation, so reproduction means porting the library code and checking against it on chosen and random inputs. That should be a named rule: when a page explains an algorithm with a canonical library, port it and fuzz-test it against the library.
