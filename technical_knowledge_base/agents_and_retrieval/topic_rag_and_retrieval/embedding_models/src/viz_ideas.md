# Embedding models: visual ideas

The question the page keeps returning to: what decides where a text lands in the vector space (architecture, pooling, training, prompts, truncation), and how do you know, on your own data, that one model or one training is better than another?

## Built
| # | Idea | Why it earns its place | Data | Placement |
|---|---|---|---|---|
| E1 | One real claim through three models, step by step (tokens, hidden states, pooling, normalisation, cosine), with a toggle running the same hidden states through a wrong pooling (before/after) | Pooling is the only part of "an embedding model" that is not a transformer; the wrong-pooling toggle shows that nothing fails while the numbers stop meaning anything | e_anim.py (real weights, CPU) | Reading 1 |
| E2 | Pooling table: modules, pooling, dims, vector lengths, difference to encode() | Proves the code reading: five models rebuilt by hand, identical | e_pooling.py | Reading 1 |
| E3 | Who gets pushed: softmax weight on each negative of a real batch row, temperature slider, hard negative toggle | The parent shows the loss; this shows where its gradient goes, which is what the temperature really changes | parent's contrastive.json | Reading 4 |
| E4 | False-negative bars and real examples (two models agree on an unlabelled abstract) | Turns "false negatives exist" into a rate and readable cases | e_mine.py | Reading 5 |
| E5 | Fine-tune results: every seed a dot, starting model as a line, SciFact and NFCorpus | Shows effect against seed noise and transfer; pending run | e_train.py, e_ftstats.py | Reading 6 |
| E6 | Training lab: exact cosines around one claim (radius = 1 - cos, fixed angles), every 4 steps, two training arms on the same points (before/after), margins of all 12 claims | The contrastive-training animation the brief asks for, without a lying 2-D projection (the parent measured PCA keeps 0 to 3 of 10 neighbours) | e_train.py snapshots, e_lab.py; pending run | own tab |
| E7 | Prefix effects as paired intervals against the documented setting, two sets | The direction and the noise in one picture | e_prefix.py | Reading 7 |
| E8 | Document lengths per tokenizer and evidence position against token limits | Shows why a 256-token model misses evidence in abstracts | e_long.py stats | Reading 9 |
| E9 | Same models across three sets, intervals, lines crossing | Domain shift on one screen | e_choose.py | Reading 10 |
| E10 | MTEB scatter: 149 models, average against SciFact or NFCorpus, setup models labelled | The rank-transfer question measured | e_mteb.py | Reading 11 |
| E11 | Subsample stability: same winner and same order against number of labelled queries | How many queries you need depends on the gap | e_choose.py | Reading 12 |
| E12 | Model chooser: intervals, paired difference to the best, limits on latency and bytes, tied group, subsample stats | The protocol as a tool | e_choose.py + parent's models.json | own tab |
| E13 | Four predict-then-reveal drills | Belief before evidence | facts | Reading 1, 7, 11, 12 |

## Rejected
- A truncation and quantization explorer: the parent's Vector search lab already has one on the same Qwen3 vectors; repeating it adds nothing. Linked instead.
- A 2-D (PCA, t-SNE or UMAP) before/after map of the fine-tune: projections distort neighbours (the parent measured it); the radial view is exact.
- An InfoNCE loss widget: the parent has it (live batch, temperature slider); E3 shows the gradient side instead.
- Hosted-model landscape table: the parent's Tool map owns it.
- A multilingual comparison: no multilingual labelled set in the running example; said in Reading 10.
- Animating the gradient cache: a checked equality (relative difference 1e-06) is clearer than an animation.

## What the methodology lacked
A rule for results that need a shared GPU slot: build the visual against a toy run in a development mode that can never ship (here `EMB_DEV=1` and a check that fails if development data is embedded), and show a visible "pending run" marker in its place, never a guess.
