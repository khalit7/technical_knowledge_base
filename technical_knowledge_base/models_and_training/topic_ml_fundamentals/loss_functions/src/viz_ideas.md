# Visualisation ideas: Loss functions (2026-10-03)

Central question: **what does a loss make the model estimate, and which examples drive its gradient?**

Already on the parent root (linked by tab name, not rebuilt): step 3 loss explorer (CE, label smoothing, focal; push on the right logit), thread 1 "cross entropy = entropy + KL" with four targets, Training lab (CE / MSE / label smoothing / focal swapped live), When training goes wrong (focal with α = 0.25 on imbalance), Defaults across models (z-loss, label smoothing per model). Alignment owns preference losses (eight losses on one pair), Distillation owns forward/reverse KL, the Contrastive sibling owns InfoNCE.

Scores: quantity the reader moves (0-2), reproduces a published figure (x2), computable from public data (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, animation against the method it replaced; minus build cost.

| # | Idea | Score | Data and formulas | Placement | Status |
|---|---|---|---|---|---|
| LF1 | **Outlier before/after animation**: Anscombe III and the CYG OB1 stars, MSE against Huber / MAE / log-cosh side by side, 6 steps (clean fit, outliers arrive, pulls to one scale, line moves, balance), counters (slope, outliers' share of pull and of lever, error on the clean points) | 14 | Anscombe 1973 (R datasets), robustbase starsCYG; exact fits; reproduces y = 3.00 + 0.500x | Reading, Outliers | built |
| LF2 | **Fit a line lab**: six losses, δ and τ, four real datasets plus tap-to-edit points, per-point pull and lever bars, exact fits table | 12 | same; LP vertex enumeration for L1 / pinball / MAPE, IRLS for Huber / log-cosh | Own tab | built |
| LF3 | **Which number each loss picks** on 141 real river lengths: mean, median, τ-quantile, Huber, log-cosh, MAPE's β-median; toggle a 0.5-mile river to collapse MAPE | 12 | R rivers (USGS); Gneiting 2011 (MAPE consistent for median of order -1) | Reading, Regression | built |
| LF4 | **Loss shapes**: regression ρ, ψ and second derivative against u; classification φ and pull against the margin; focal factor with Lin et al.'s 100x / 1000x reproduced; conditional-risk minimum for any η (hinge sign only, focal pulled to 0.5) | 11 | Bartlett et al. 2006 Examples 1 to 3, Theorem 6; Lin et al. 2017 | Own tab | built |
| LF5 | **z-loss on real logits**: GPT-2, SmolLM2-135M, Qwen2.5-0.5B on one sentence; shift c: CE constant, z-loss and bf16 damage move | 10 | real_logits.py (float32 logits, torch.bfloat16 rounding); PaLM z-loss 1e-4 log²Z | Reading, On the logits | built |
| LF6 | **GAN generator gradient**, minimax against non-saturating, against D(G(z)) | 8 | Goodfellow et al. 2014 section 3; derivatives by hand, autograd-checked | Reading, Adversarial | built |
| LF7 | Interactive "which loss" chooser | 6 | | none | rejected: a static table with sources ("In one screen") says the same thing faster; a quiz adds clicks, not knowledge |
| LF8 | MAPE asymmetry widget on its own | 6 | | none | rejected as a separate widget: the asymmetry is two derived numbers in prose, and MAPE's bias is shown live in LF3 |
| LF9 | Train a toy network with z-loss to show logit drift | 6 | | none | rejected: Wortsman et al. need high learning rates and long runs to show divergence; a toy in budget would show nothing, and the parent's Training lab owns live training |
| LF10 | Rebuild the CE / label smoothing / focal explorer or entropy + KL bars | | | none | rejected: on the parent root, linked by name |
| LF11 | Preference-loss or InfoNCE visual | | | none | rejected: owned by Alignment and the Contrastive sibling |

Rule proposed for section 2: when a robustness claim is checked on data, test both kinds of outlier (bad target, unusual input); the stars showed MAE doing worse than MSE under leverage, which no curve plot reveals.
What the methodology lacked here: a pattern for "what does this objective estimate" (the minimiser of the expected loss) as a visual; LF3 and LF4's third panel are that pattern, reusable for any loss or scoring-rule page.
