# Visualisation ideas: T5

The question the paper keeps returning to: **with everything else held fixed, what is each pretraining choice worth, and is the difference bigger than the noise?** Scoring follows `.claude/skills/explainer-page/visuals/choosing.md` plus the paper-page criteria R (runs the paper's own mechanism) and P (supports a predict question).

## Built

| id | Idea | Placement | Why |
|---|---|---|---|
| P-t5.1 | **The real span-corruption code, ported and run on your text**: `random_spans_noise_mask` and the sentinel functions from `t5/data/preprocessors.py` line by line, rate and span-length sliders, BERT-style and i.i.d. against spans, the paper's score for each setting beside it, checked against `recompute.py` by `check_core.mjs` | Own tab, Corrupt a sentence | R 2. The paper's mechanism is preprocessing, not a layer, so the live ingredient is its code rather than a toy model. Shows why the target is about 104 tokens per 512 for spans of 3: the code fixes both counts. |
| P-t5.2 | **Same sentence, three objectives, animated** (BERT-style, i.i.d. noise, spans), with target length to scale per 512 tokens | Reading, Span corruption | Before/after on one input, Khalid's preferred pattern. |
| P-t5.3 | **Attention-mask animation** for encoder-decoder, language model and prefix LM on the paper's translation example, with parameters and cost counters (2P, M) | Reading, Architectures | Makes Table 2's "matched on compute, not parameters" visible. |
| P-t5.4 | **Ablation grid with deltas in standard deviations of the paper's own 10-run noise (Table 1)**, sortable across all scored tables | Tables tab | Turns "one run per variant" into a judgement per row; drives "How much of this to believe" (12 of 56 rows within 2 SD on GLUE). Reusable for any paper that reports a repeated-baseline variance. |
| P-t5.5 | **Checks on the paper's own tables**: bold marks against the stated rule, main tables against the appendix, parameter recount against checkpoints | Tables tab | Found the Large 737.7M against printed 770M mismatch and three main/appendix disagreements. |

## Rejected

| id | Idea | Why not |
|---|---|---|
| P-t5.6 | Toy encoder-decoder trained with each objective | The paper's gaps among denoising variants are fractions of a point at 220M; a toy would show noise and invite over-reading. |
| P-t5.7 | Then and now morph to T5 1.1 / Flan-T5 | Four small changes; a sourced paragraph in "Why it matters" carries them. |

## Light pass, 2026-10-24
| id | Idea | Decision |
|---|---|---|
| P-t5.8 | Hero: the paper's own Figure 1 (text to text), embedded as WebP | Built. The JMLR version is CC BY 4.0, so the canonical figure is embedded with credit (`img/CREDITS.md`) rather than redrawn. |
| P-t5.9 | Move the objectives stepper (BERT-style, i.i.d., spans on one sentence) into the Span corruption section | Built: it is a before/after of the method against the one it replaced, so it belongs beside the claim. The playground went into a closed block under it. |
| P-t5.10 | Move the target-length cost chart into Objectives | Built: it is the evidence for "choose on cost"; at 390 px it is taller and the three x = 512 labels are stacked. |
| P-t5.11 | Bucket slider and learning-rate chart | Kept, closed: the T5 bias in general belongs to Positional encodings; the schedule is recipe detail. |
