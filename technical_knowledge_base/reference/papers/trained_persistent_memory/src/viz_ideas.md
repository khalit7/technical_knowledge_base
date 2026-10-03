# Visualisation ideas: Trained Persistent Memory (arXiv 2603.16413)

Kind of paper: a method-on-top-of-a-model pilot with no code, no weights and no traces. Nothing can be trained or replayed at the paper's scale, but its write rules are fully specified, use fixed random write maps (Sec. 5) and can be run exactly, so the live ingredient is a simulation of the bank.

## Built (ranked)

| id | Idea | Score (teach / data / cost) | Where | Data and formula |
|---|---|---|---|---|
| P-trained_persistent_memory.1 | **Stateless against bank, step animation** on the paper's own "I like reading" example, with the fact's remaining weight γ^l as a counter, out to LoCoMo's typical lag of 256 | 5 / 5 / 4 | Reading, Idea | γ = 0.95 (Sec. 6.2); 62% of test questions at lag 256+ (Table 3 n row) |
| P-trained_persistent_memory.2 | **Method explorer**: pick M.1 to M.6, see where the read enters and how the write works, with recounted parameter counts | 4 / 5 / 4 | Reading, Six methods | Tables 1, 2; Flan-T5-XL config.json; recompute.py |
| P-trained_persistent_memory.3 | **Clipped-metric widget** (predict first): sliders for the share of questions memory helps or hurts; net F1 change against the clipped recall rate, which stays positive when memory hurts | 5 / 5 / 5 | Reading, The metric | Eq. 40; seeded synthetic questions at F1 0.06 |
| P-trained_persistent_memory.4 | **Forgetting curves** at 1x/10x with the per-bucket standard-error bound | 4 / 5 / 5 | Reading, Results | Table 3; √(p(1−p)/n) |
| P-trained_persistent_memory.5 | **Adapter tax as F1 levels** (predict first): F1 zeroed and with memory against the 6.44 baseline | 5 / 5 / 5 | Reading, Results | Table 5, derived levels |
| P-trained_persistent_memory.6 | **Decay chart** (predict first, and the main chart of the simulation tab): share of the bank a turn holds against lag, on a log scale, over the share of test questions per lag bucket | 5 / 5 / 4 | Reading, How much to believe; Simulate tab | 20_js_sim.js, checked against NumPy |
| P-trained_persistent_memory.7 | **Row-collapse animation**: the 64 rows of an attention-coupled bank as a heatmap after turns 1 to 600, zero start against small random start, with distinct rows and spread counters | 5 / 4 / 4 | Simulate tab | 20_js_sim.js snapshots |
| P-trained_persistent_memory.8 | **Claims against tables** list: 19 statements of the text checked against the paper's own tables and equations | 4 / 5 / 5 | Tables tab | recompute.py |

## Rejected

- A toy trained read adapter on synthetic dialogues: it would test a toy, not the paper's claim, and the paper's question (does latent memory help a frozen 3B model on LoCoMo) cannot be reached at toy scale; the write side, which needs no training, carries the page's findings.
- Re-plotting Figure 9's curves: Table 3 holds the same numbers.
- A text-memory baseline run: would need Flan-T5-XL inference over LoCoMo, out of budget and not the paper's experiment; LoCoMo's own published baselines are quoted as a scale instead.

## What the methodology lacked

The paper-kind table has no row for "fully specified mechanism with no training on one side": a simulation of the untrained half (here the write rule) is a cheap, exact live ingredient whenever a paper freezes part of its own method.
