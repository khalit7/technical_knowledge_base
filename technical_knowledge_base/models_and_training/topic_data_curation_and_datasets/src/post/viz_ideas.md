# Post-training data lab: visual ideas (2026-10-15)

Central question: what is in post-training data, and what do cheap checks (filters, checkers, decontamination)
catch or wrongly remove? Scores 0 to 2 per methodology question (parameter, reproduces, computable, beyond a sentence,
corrects a misconception, central, absent elsewhere); reproduce and computable count double; build cost subtracted.

## Built
| Idea | Score | Why it earns its place |
|---|---|---|
| Filter before/after on the same sample (canvas, one square per row, rules applied in order, optional rules toggled) | 11 | The before/after pattern on the same input; shows that the "obvious" rules (English-only, refusals, near-dup IF prompts) remove whole subsets while Ai2's real filters remove 0.6% |
| Example browser per dataset (stats cards, length histogram with field and subset, real rows with flags) | 9 | The brief's core; real rows teach what one row of each kind is |
| Judge-score heatmap and length-bias bars by margin (UltraFeedback) | 9 | Makes ties (diagonal) and the mild length bias visible; corrects "chosen means better" |
| Checker table on reference solutions plus disagreement examples | 10 | Corrects the belief that a checker is neutral: 79 GSM8K prompts are unwinnable under Tulu 3's checker |
| Rephrasing animation (source morphing into output, copied 4-grams green, dropped numbers struck) with WRAP styles and a Cosmopedia seed pair | 9 | Before/after on the same page; separates rephrasing from seeded generation |
| Cosmopedia seed vs output edu-score scatter | 7 | Shows the generator writes in the classifier's favoured register |
| Contamination checker over real pairs with n and threshold sliders | 10 | Reproduces the child page's numbers live; shows misses and false alarms of each rule |
| Predict-then-reveal on the 2% rule | 6 | The per-benchmark threshold misconception |

## Rejected
- Rebuilding the Decontamination child's animations (owned there; linked instead).
- Model-collapse simulation (already in Reading section 8 and on the Synthetic data child).
- A judge-bias re-run with a local judge model (GPU work; belongs to the post_training_data child).
- A per-row embedding near-duplicate view (the Decontamination child has embeddings; the Dedup lab owns near-dup).

## Pending
- Checkers on Qwen3-1.7B answers (run_pending.sh): fills the pending box in section 4.
- Rephrasing of 200 documents (Synthetic data child's job): refills section 5.
