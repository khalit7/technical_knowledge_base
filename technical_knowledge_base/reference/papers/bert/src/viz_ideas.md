# BERT: visualisation ideas

The question the paper keeps returning to: **what does a model gain by seeing both sides of every word, and how do you train that without the answer leaking in?** Every visual below makes one side of that measurable: the leak and the mask, the objective's cost, and the gap on token-level outputs.

Old page's visuals: none (prose only). Its links (arXiv, google-research/bert, the Google AI blog, The Illustrated BERT, BERT 101, the ModernBERT post) were the first sources searched. The Illustrated BERT draws static input and fine-tuning diagrams; Polo Club's Transformer Explainer runs a real decoder in the browser. Nothing found runs a trained bidirectional encoder beside its left-to-right twin on sentences the reader builds, which is what this page adds.

## Scores (0 to 2 each; reproduce and computable count double; build cost subtracted)

| Idea | Param moves | Reproduces | Computable | Beyond a sentence | Misconception | Central | New | Animation | Cost | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Toy BERT and toy LTR model in the browser: fill, tag, attention | 2 | 2×2 (Table 5 direction) | 2×2 | 2 | 2 ("a causal LM sees enough") | 2 | 2 | 0 | -2 | 18 |
| Leak animation: one sentence through two layers, MLM / LTR / both ways no mask | 1 | 0 | 2×2 | 2 | 2 (why not just predict every word bidirectionally) | 2 | 2 | 2 | -1 | 14 |
| Fine-tuning curves against labelled-set size, per variant and test subset | 2 | 1×2 | 2×2 | 2 | 1 | 2 | 1 | 0 | -1 | 13 |
| Masking demo with the 80/10/10 tally | 1 | 2×2 (12 / 1.5 / 1.5%) | 2×2 | 1 | 1 | 1 | 1 | 0 | -1 | 11 |
| Toy Figure 5 (fine-tune from pretraining checkpoints) | 0 | 1×2 | 2×2 | 1 | 1 | 1 | 2 | 0 | -1 | 10 |
| Then and now: BERT-Base to ModernBERT-base one change at a time, recounted | 1 | 2×2 (149M) | 2×2 | 1 | 1 | 1 | 1 | 2 | -2 | 12 |
| Tables 1 to 8 rebuilt, sortable, with recomputed averages and derived deltas | 1 | 2×2 | 2×2 | 1 | 1 | 1 | 0 | 0 | -1 | 11 |
| Figure 5 decoded from its SVG coordinates | 0 | 2×2 | 2×2 | 1 | 1 (LTR is ahead early) | 0 | 2 | 0 | -1 | 10 |
| Noise check: standard errors of the Table 1 and Table 5 gaps from split sizes | 0 | 0 | 2×2 | 2 | 2 (NSP's effect is mostly inside the noise) | 1 | 2 | 0 | 0 | 11 |

## Built

| id | Idea | Placement | Data |
|---|---|---|---|
| P-bert.1 | **Run a toy BERT**: a real BERT (L=2, H=24, A=4, 18,668 parameters) and the same model pretrained left to right, both in plain JS on 6-bit weights; build a sentence, hide any word (fill-in from both heads), tag names PER/LOC with the fine-tuned taggers, attention per layer and head | Own tab | train.py, grammar.py; JS checked against PyTorch (check_forward.json) |
| P-bert.2 | Leak animation: two attention layers, lines that can carry the target word coloured, three modes (masked LM, left to right, both ways with no mask), live probabilities from the toy models in the last step | Reading, Idea | §3.1 |
| P-bert.3 | Predict-then-reveal: "the big ___ ... purred": how sure can a left-to-right model be? Reveal runs both toy models with a verb selector | Reading, Idea | toy models |
| P-bert.4 | Figure 2 redrawn with the toy's real token, segment and position vectors and their sum | Reading, Model and input | toy weights |
| P-bert.5 | Masking demo: draw the paper's rule on a pretraining pair, toy predictions at every chosen position, tally over 10,000 draws | Reading, Masked LM | §3.1, A.1 |
| P-bert.6 | Predict: the LTR tagger on right-cue names (reveal: measured accuracy) | Reading, Fine-tuning | finetune.json |
| P-bert.7 | Predict: removing NSP or going left to right, which costs more SQuAD F1? Reveal: Table 5 differences as bars | Reading, Ablations | Table 5 |
| P-bert.8 | Fine-tuning accuracy against labelled-set size for five pretraining variants, two tasks, five test subsets, mean ± sd of 3 seeds | Run tab | finetune.json |
| P-bert.9 | Toy Figure 5: fine-tune from checkpoints along pretraining, MLM against LTR | Run tab | finetune.json fig5 |
| P-bert.10 | Pretraining curves from the training logs; in-browser test on uniformly sampled sentences | Run tab | logs.json |
| P-bert.11 | Tables 1 to 8 and Figure 5 rebuilt (Figure 5 decoded from the arXiv HTML's SVG coordinates), parameters recounted from released configs | Tables tab | tables.json, recompute.py |
| P-bert.12 | Then and now: BERT-Base to ModernBERT-base one sourced change at a time, recounted at each step, landing on 149M | Own tab | hf_configs.json, ModernBERT §2 |
| P-bert.13 | Noise check in "How much of this to believe": binomial standard errors of the Table 1 test gains and Table 5 / Table 8 dev differences from GLUE split sizes | Reading, How much to believe | glue_sizes.json, recompute.py |
| P-bert.14 | Pretraining-seed repeat of the toy NSP ablation (bert and nonsp pretrained again with seed 8, fine-tuned identically), to tell an effect from seed noise | Run tab, reading note | seed2.json |

## Defaults that reproduce

- BERT-Base 110M parameters, independently from the released config; BERT-Large recounts to 335M (paper 340M). ModernBERT-base 149M, independently.
- Table 1 Average column from its nine columns, all five rows.
- Masking shares 12 / 1.5 / 1.5% of all tokens, by construction (the rule) and by the in-page tally.
- Bidirectionality on token-level outputs, independently at toy scale: right-cue names tagged far better by BERT than by the LTR model; a fresh bidirectional layer recovers part of it, as the BiLSTM does.

## Do not reproduce

- NSP's benefit on real text. The toy does show an NSP gain in both pretraining seeds (tagging at 128 / 512 labels: +8.3 / +10.6 points with seed 7, +2.4 / +2.3 with seed 8), but because its IsNext pairs share a name in one role, so NSP teaches the fine-tuning label itself; the page says so. The seed repeat also moved BERT's own accuracy by 3.8 points at 128 labels.
- Model size (one size only).

## Rejected

- A training-bill or compute tab: the paper does not centre on it (Khalid removed such tabs elsewhere).
- Animating fine-tuning for each GLUE task: one table row each says it; the Fine-tuning table is enough.
- A WordPiece tokenizer demo: the toy vocabulary is whole words, and a real 30,522-entry vocabulary would cost about 230 KB.

## What the methodology lacked for this page

- A rule for **pretraining-seed variance** in toy ablations: fine-tuning seeds alone share one pretrained model, so a gap between two pretrained variants can be pure pretraining-seed noise. Repeat the pretraining with a second seed before reporting an ablation gap as an effect.
