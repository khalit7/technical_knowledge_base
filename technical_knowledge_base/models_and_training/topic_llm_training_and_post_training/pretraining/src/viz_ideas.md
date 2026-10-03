# Pretraining: visualisation ideas

Page question (one sentence): **what does pretraining optimise, and which decisions (objective, size against tokens, data stages, run hygiene) decide how much model a fixed budget buys?**

## What already exists, so it is not rebuilt here
- Root page Topic: llm-training-and-post-training: stage x axis grid, data-over-time animation, **Open recipes compared** (tokens per stage, mixes as text, 20 recipes), **Price list**, **Scaling calculator** (Chinchilla against Kaplan against over-training). Linked by tab name.
- Paper pages: T5 (span corruption ported from the real code, three objectives animated, ablation grid with noise), Seq vs Seq (four objectives and their attention masks animated), Kaplan and Chinchilla (refits, tokens per parameter, IsoFLOPs), GPT-3 (Table 2.2, filtering steps, tokens per parameter), OLMo 2 (stability replays, Figure 11 LR crossover, microanneals Table 12, soups Table 14, before and after mid-training Table 9, the recipe animated), Llama 3 (the 405B run on one axis: LR and batch ramp), WSM (schedules planned against "train 50% longer", WSD against WSM toy), DeepSeek-V3 (FP8), Qwen3.
- Optimisers and learning-rate schedulers (Topic: ml-fundamentals, id 3c65c17b0d0d817080bbc90954681d09): the whole schedule family, cooldown shape and length, the three senses of "annealing", the optimiser family including Muon. The Kimi page has a Newton-Schulz stepper.
- Topic: data-curation-and-datasets owns filtering, dedup and mixing.

## Scoring (0 to 2 each; reproduce and computable count double; animation point; build cost subtracted)
Questions: Q1 quantity moves with a control; Q2 defaults reproduce a published figure (x2); Q3 inputs computable from public data (x2); Q4 shows what a sentence cannot; Q5 corrects a misconception; Q6 measures the page question; Q7 absent from the page and other explainers; A step animation, ideally against what it replaced; minus build cost.

| # | Idea | Q1 | Q2x2 | Q3x2 | Q4 | Q5 | Q6 | Q7 | A | cost | Score | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **A run, stage by stage** (GPT-3 one pass, OLMo 2 7B cut cosine then Dolmino anneal, SmolLM3 WSD with three mixes): LR and mixture bands to scale on each run's own token axis, playhead with captions, counters (tokens, LR as % of peak, maths+code share, maths tokens seen), zoom on the last 5% | 1 | 4 | 4 | 2 | 1 | 2 | 1 | 1 | -2 | 14 | built, Reading (Data and curriculum) |
| 2 | **What the anneal buys, split in two**: OLMo 2 Table 11 rows (4T checkpoint; 50B with LR to zero on the pretraining mix; 50B on the new mix), predict then reveal, binomial SE on GSM* | 1 | 4 | 4 | 2 | 2 | 2 | 2 | 0 | -1 | 16 | built, Reading |
| 3 | **Toy anneal, trained**: a 0.8M-parameter character model, stage 1 at constant LR on 97% books and 3% two-digit sums, then four 1,200-step branches (LR flat or to zero) x (same mix or 25% sums), 3 seeds; loss per kind of token, sum accuracy, per-character loss heatmap, samples | 2 | 0 | 4 | 2 | 2 | 2 | 2 | 1 | -2 | 13 | built, own tab |
| 4 | **Speedrun record history**: 92 records, time on a log axis, coloured by kind of change (this page's tagging), filter, replay, log-speedup share by kind | 2 | 4 | 4 | 1 | 1 | 1 | 2 | 1 | -1 | 15 | built, own tab (the root's PL-14 assigned it here) |
| 5 | **One sentence, five objectives** (causal, masked, span corruption, UL2 mode token, FIM): what goes in, what must come out, which positions carry a loss; counters for input length, target length, supervised positions | 2 | 2 | 4 | 2 | 1 | 1 | 1 | 1 | -1 | 13 | built, Reading (Objective), compact; T5 and Seq vs Seq pages own the span and mask mechanics and are linked |
| 6 | **Families against variants**: T5 Tables 4 to 7 GLUE as ranges, against the baseline's run-to-run SD | 0 | 4 | 4 | 1 | 1 | 1 | 0 | 0 | 0 | 11 | built, small inline chart |
| 7 | Data pipeline funnel, Common Crawl to tokens (FineWeb, DCLM, FineWeb-Edu, Nemotron-CC retention) | 1 | 4 | 2 | 2 | 1 | 1 | 1 | 1 | -2 | 9 | rejected: belongs to Topic: data-curation-and-datasets (this page's own text says the dedup and filtering detail lives there); the GPT-3 page already animates one filtering pipeline |
| 8 | LR schedules animated on one run (cosine, WSD, linear, anneal) | 2 | 0 | 2 | 1 | 0 | 1 | 0 | 1 | -1 | 6 | rejected: the Optimisers page owns the family, the WSM page draws the planning problem, OLMo 2 and Llama 3 pages draw their schedules. Idea 1 keeps only what is specific to pretraining: the schedule and the data switch on one axis |
| 9 | AdamW against Muon on a toy problem | 2 | 0 | 2 | 1 | 0 | 0 | 0 | 1 | -1 | 5 | rejected: optimiser mechanics belong to the Optimisers page and the Kimi page (Newton-Schulz stepper). Muon's effect on a real benchmark is shown by idea 4 (records 3 and 4) |
| 10 | Tokens per parameter across models | 1 | 4 | 4 | 1 | 1 | 1 | 0 | 0 | 0 | 12 | rejected: duplicate of GPT-3 page (P-gpt_3.11), Chinchilla page (P-chinchilla.10) and the root Scaling calculator; linked |
| 11 | Toy trained live in the browser | 2 | 0 | 2 | 2 | 1 | 1 | 1 | 1 | -2 | 8 | rejected for the replay: a live run of 7,200 steps x 4 branches x 3 seeds takes minutes in JS and gives one noisy seed; the recorded run carries three seeds and the same curves |
| 12 | Batch-size ramp chart | 1 | 2 | 4 | 0 | 0 | 0 | 0 | 0 | -1 | 6 | rejected: the Llama 3 page draws the 405B batch ramp; text carries GPT-3, Llama 3 and speedrun record 46 |

## Data and formulas (all recomputed in `recompute.py`)
- GPT-3 mix: Table 2.2 (CC 60, WebText2 22, Books1 8, Books2 8, Wikipedia 3; sums to 101 as printed), 300B tokens, cosine to 10% over 260B, warmup 375M (§2.3 and Appendix B, https://arxiv.org/abs/2005.14165).
- OLMo 2 7B: Table 3 (peak 3e-4, warmup 2,000 steps, cosine to 10% planned over 5T, truncated after 4T), Table 4 (3.90T stage-1 composition), Table 10 PT Mix column, Table 13 Dolmino 50B composition, Table 11 (anneal ablation), Table 9 (before and after), §2.3 (linear decay to zero in mid-training). https://arxiv.org/html/2501.00656v3
  - LR at the cut: 0.1 + 0.9 x 0.5 x (1 + cos(pi x 3.90/5)) of peak (recompute.py).
  - Warmup in tokens: 2,000 x 1,024 x 4,096 = 8.39B.
- SmolLM3: https://huggingface.co/blog/smollm3 (stage mixes 85/12/3, 75/15/10, 63/24/13; WSD, 2,000 warmup steps, linear decay to 0 over the last 10% of steps; batch 2.36M tokens; long context 2 x 50B; reasoning mid-training 35B x 4 epochs, about 140B).
- Llama 3: §3.1.3 and §3.4.3 (8B anneal +24.0% GSM8k, +6.4% MATH; negligible at 405B; final 40M tokens LR to zero; 30% new dataset in 40B-token anneal tests). https://arxiv.org/abs/2407.21783
- T5 Tables 2, 4 to 7 (https://arxiv.org/html/1910.10683v4).
- modded-nanogpt README record table (fetched 2026-10-03, `inputs/modded_nanogpt_README.md`); `mk_speedrun.py` makes `data/speedrun.json`. Log-speedup per record = ln(previous timing / this timing); re-timings of record 21 reset the baseline, so the shares sum over records to ln(45/0.665) + ln(3.014/2.933).

## Inspiration
- DeepSeek MLA explainer (before and after on one input) for idea 1 and 5.
- OLMo 2's own framing of Table 11 for idea 2; Optimisers page's "the two levers are separable" note, which no source in this knowledge base had measured.
- Polo Club's Transformer Explainer and the Seq vs Seq toy suite for the replayed toy.

## What the methodology lacked for this page
- A rule for when a toy experiment is worth running: here it separates two levers that the only published ablation (OLMo 2 Table 11) did not fully cross (it has no "new mix at constant LR" arm). A toy is worth it when it completes a published ablation's missing cell, labelled as toy-scale.
- A rule for categorising community records: the category is this page's tagging of the first-listed change, stated as such, never the repository's.
