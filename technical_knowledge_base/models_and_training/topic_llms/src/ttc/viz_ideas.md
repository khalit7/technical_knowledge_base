# Reasoning models and test-time compute: visualisation ideas

Written for the former child page; that page is now the "Deeper: test-time compute" tab of Topic: llms (`parts/34_tab_ttc.html`). "Reading" below means that page's Reading tab, whose visuals now sit in the deep tab; the Sampling lab and Published curves tabs are sections of it.

Central question: how much thinking to buy and where to spend it (longer, wider, or deeper inside the network), and what each choice returns. Lab pages already own OpenAI's ARC-AGI-3 harness animation, Anthropic's effort and cost per task, and Google's thinking-level matrix, so this page is the general, comparative one.

## Built (score out of 14: control, reproduces x2, computable x2, beyond prose, misconception, central, new; minus build cost)
1. **One problem, one chain against five chains (vote / verifier)**, Reading animation `#sp`. 13. Same 10,000-token budget, wall-clock to scale (200 s against 40 s at an illustrative 50 tok/s), KV counters at 240 KiB a token; vote 0.683 (one wrong answer) or 0.835 (four), verifier pass@5 0.990, all from recompute.py. Shows revision is only possible in the serial chain and that parallel lives on its selector.
2. **Ordinary forward pass against recurrent depth**, Reading animation `#lp`, three modes on the same 8 layers: depth by writing (D = L x T = 32), Huginn's looped core (2 + 4 x 7 + 2 = 32 in one token; 2 + 4 x 32 + 2 = 132 at the training mean, Geiping et al. 2502.05171), RLT's carried state (path grows 4 a token; 48t in the 48+48 illustration, RLT project page). 12.
3. **KV and serial-depth calculator**, Reading. Defaults reproduce the page's 240 KiB and 7.5 GiB by construction. 9.
4. **Three selectors on one problem** (perfect verifier, plurality vote with m wrong answers), Reading. Exact plurality by enumeration, checked by brute force in recompute.py (0.5491 both ways). 12.
5. **Chen estimator widget**, Reading: 56/252 = 0.778 and the biased naive form. 8.
6. **Best-of-n against a reward model** (Gao et al. functional form, illustrative alpha/beta), Reading. Peak near n = 147, 0.876 at 4,096. 10 (coefficients are plots only in the paper, so illustrative).
7. **GRPO group advantages and zero-signal share** p^G + (1 - p)^G, Reading. 81% at G = 4, p = 0.05; 44% at G = 16. 9.
8. **RL sharpening against base pass@k** (illustrative ten problems), Reading, linked to tab 10. 10.
9. **Sampling lab tab** (new this round): benchmark with p ~ Beta(alpha, beta); exact mean pass@k = 1 - B(alpha, beta + k)/B(alpha, beta), exact plurality vote on a fixed p grid, vote ceiling P(p > 1/(m + 1)), power-law failure k^-alpha (Schaeffer et al. 2502.17578) with measured slope, Monte Carlo benchmark (200 problems, 64 samples, Chen estimator) as a check. Brown preset solved from 82.9% at 100 and 98.44% at 10,000 (by construction); does not reproduce Brown's 40.5%/41.4% voting plateau, stated. 13.
10. **Published curves tab**: Brown et al. coverage fits against their stated numbers (independent: within 2 points except Gemma-2B CodeContests 9.5% vs 7.1%), selector bars (o1 74/83/93 on AIME 2024; R1 79.8/86.7/90.0; Llama-3-8B MATH 41.41 vs 98.44; Wang 60.1 to 78.0), Yue et al. Tables 3-4 pass@1 against pass@256. 12.

## Rejected
- Router simulator: no published routing data (as O5 on the OpenAI page).
- ARC-AGI-3 harness animation, effort-vs-cost, thinking-level matrix: owned by lab pages; linked.
- o1 test-time scaling curve redraw: data exists only as an image without axis values.
- Huginn accuracy-vs-recurrence chart: would need figure digitising; numbers only in plots.
- Price/compute-history tabs: Khalid removed this pattern.

## Methodology notes
- Missing from the methodology: a rule for aggregate-vs-per-item maths (a per-problem formula is not the benchmark curve; Schaeffer's distributional view is what reconciles them), and for fitting a distribution to two published points (it matches them by construction and its implied extras, here pass@1 12.2%, must be labelled derived, not measured).
