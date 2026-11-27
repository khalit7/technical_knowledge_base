# Visuals, built and rejected (2026-11-27)

Built (all static 2D, drawn at the card's width by `parts/22_js_tc_figs.js` from `inputs/recompute.json`):
- **Hero: the IMDb ladder.** Every IMDb accuracy the article prints on one axis, filled for trained on IMDb, hollow for none, coloured by test set (read from the linked notebooks). Lays the article's spine on one axis and exposes the one thing the article does not say (three test sets). Score high: real numbers, corrects a misreading, absent elsewhere.
- **Independence of irrelevant alternatives.** Before/after on the same input: the article's per-option scorer (illustrative scores, computed) keeps the log-odds between two options when a fifth is added; Jev's measured log-odds moved (+0.38 to +0.11, Archer Hume). Shows in one picture why Section 4's recipe is not Jev.
- **RLCR reward curve.** Reward against stated confidence for right and wrong answers, the article's three worked values, and the expected reward at p = 0.7 peaking at q = 0.7. RLCR is owned nowhere else in the knowledge base.

Rejected:
- A calibration reliability-diagram toy: Probability for ML (section 8) and Evaluation metrics already draw reliability diagrams and temperature scaling on real models.
- A live per-option scorer widget (slider for the added option's score): the static before/after says the same at once; one widget would add a control without a new fact.
- Redrawing the article's architecture figures (RNN, CNN, BERT/GPT heads): owned and drawn by Sequence models and Families and objectives; the article's figures are not openly licensed.
- Jev API cheat sheet as a table: a sentence says it.
