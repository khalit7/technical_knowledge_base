# Handoff to Human evaluation and annotation (3ef5c17b0d0d819485bcc54a45d49420)

From: Production eval engineering (3c65c17b0d0d81b39ad9e96193d21adc), rebuilt 2026-10-04. Gold-label auditing and gold-error-aware scoring now belong to Human evaluation and annotation; the production page summarises them in one paragraph ("Moved") and links there. Below: the old text verbatim (copied by script from src/live.md, fetched 2026-10-04, last edited 2026-09-22), then notes.

## Old text, verbatim

### Resources (from the old "Best resources" list)
- [Do Large Language Model Benchmarks Test Reliability? / PlatinumBench (arXiv:2502.03461)](http://platinum-bench.csail.mit.edu/) (45 min): label-error rates in standard benchmarks and what cleaning them changes.
- [How to Correctly Report LLM-as-a-Judge Evaluations (arXiv:2511.21140)](https://arxiv.org/abs/2511.21140) (45 min): bias-correcting judge-derived metrics.

## Gold-label auditing and gold-error-aware scoring
Your gold labels are wrong at rates that dominate small deltas. Northcutt et al. found pervasive test-set label errors across ML benchmarks; MMLU-Redux re-annotated 5,700 MMLU questions across all 57 subjects and estimates that about 6.5% contain an error of some kind, counting wrong gold labels together with unanswerable, ambiguous and multiple-correct-answer items, so the wrong-gold-label rate on its own is lower than that headline ([Are We Done with MMLU?, arXiv:2406.04127](https://arxiv.org/abs/2406.04127), 45 min; the virology subset runs at 57%). About 5% of GSM8K items are wrong, and PlatinumBench found that after cleaning, a majority of residual "model failures" on many benchmarks were label noise. Consequences: ceiling effects are artificial, model rankings can flip by 10-15 points on cleaned sets, and a regression gate can fail a genuinely better model for disagreeing with wrong gold. The per-benchmark rates, and the expert re-grading of six physics suites that generalises them, are in <mention-page url="https://app.notion.com/p/3c65c17b0d0d810f8574da3ffb860be5"/>.
The generic pattern (gold-error-aware consensus scoring), applicable to any internal golden set:
1. Never treat gold as infallible; store a confidence/provenance field per label.
2. Route model-vs-gold disagreements through a consensus battery: multiple strong, family-diverse models (or judges with retrieval/tools) re-answer the item independently; strong consensus against gold flags the label, not the model.
3. Human-adjudicate flagged items; the output is a corrected label or an "ambiguous, exclude from gating" tag: ambiguity is a valid label state and forcing it corrupts metrics.
4. Score with error-awareness: report metrics on the platinum (verified) subset for gating, full set for tracking; or down-weight low-confidence labels.
5. Make it continuous: every gate failure triggers label audit of the failing items before the failure is believed. In mature systems, disagreement mining doubles as golden-set quality control and as discovery of genuinely hard items.
This is the same machinery as judge calibration pointed at the dataset instead of the judge: the eval system has three fallible components (model, judge, gold) and any observed delta must be attributed to one of them before action.

## Notes and checks (2026-10-04)

1. MMLU-Redux figures (5,700 questions, 57 subjects, about 6.5% with an error of some kind, virology 57%) agree with the root page and with the Knowledge and reasoning benchmarks page (3c65c17b0d0d810f8574da3ffb860be5), which owns per-benchmark error rates; the old text already distinguishes "error of some kind" from wrong gold labels. Keep that distinction.
2. Not re-verified by this builder, please check against the papers before carrying: "About 5% of GSM8K items are wrong"; "PlatinumBench found that after cleaning, a majority of residual model failures on many benchmarks were label noise"; "model rankings can flip by 10-15 points on cleaned sets"; Northcutt et al. "pervasive test-set label errors" (no rate given in the old text; the paper's own figure should be quoted).
3. The three-fallible-components point (model, judge, gold) is shown on the root page with the physics re-grading attribution animation (250 rejections: 143 benchmark errors, 95 grader errors, 12 model errors) and the paper page Re-grading six physics benchmarks (3e25c17b0d0d8165b0c8d15600421259): link rather than rebuild.
4. The production page keeps one rule from this section in its own words: every gate failure triggers an audit of the failing items before the failure is believed, and "ambiguous, exclude from gating" is a valid label state.
