# Visualisation ideas: Dream-RSI

The question the paper keeps returning to: **does replaying old search trees let a discovery loop spend fewer evaluations for the same (or better) result, and how far can the reported savings be trusted?**

Existing visuals on the old page: none. Its outbound links: three KB pages (Agora, SoL-Pi, Topic: cuda-and-gpu-programming). Sources searched: arXiv HTML v1 (only version), SimpleTES (arXiv 2604.19341, both versions), project page dream-rsi.com (its demo is illustrative, seeded RNG, no data), GitHub repo (no code), Hugging Face papers API.

Scores: quantity the reader controls / reproduces a published figure (×2) / computable from public data (×2) / shows what a sentence cannot / corrects a misconception / measures the central question / absent elsewhere / step animation, minus build cost.

| id | Idea | Placement | Score | Status | Data |
|---|---|---|---|---|---|
| P-dream_rsi.1 | **Dream over a recorded tree**: §3's replay rules and Eq. 1 run on illustrative 10 × 11 worlds; fixed parallel refine against the dreamed winner as a step animation on the same world (cells revealed per round, batch outlined, closed branches marked, counters N, k, best, V); a dream sweep of 504 candidates (attempts against share of the recorded best, coloured by V) with t, β1, β2 sliders; the winner deployed on 300 fresh worlds, same kind or gains-arrive-later | Own tab (live ingredient) | 1+0+2+2+2+2+2+1 = 12 (−1 build) | built | `14_js_simcore.js`, checked by `check_sim.py` (1,512 pairs, 0 mismatches); generator invented and labelled |
| P-dream_rsi.2 | **The race, round by round**: six of the paper's runs (four kernels, Lasso Pro and Flash) decoded from the vector figures, per-round budget bars to scale above a step chart of round results, both methods stepped together, captions per round with the paper-specific notes (ConvMax's single final jump, Pro Lasso's worsening rounds) | Reading, Setup | 1+2+2+2+2+2+2+1 = 14 (−1) | built | `decode_figs.py` → `tables.json` fig3b, fig4 |
| P-dream_rsi.3 | **Predict: datasets won** (Pro Lasso: 1 of 6), reveal as per-dataset ratio bars for Pro and Flash plus arithmetic and geometric means | Reading, Lasso | 0+2+2+2+2+2+2 = 12 | built | Figure 3(a), `recompute.py` |
| P-dream_rsi.4 | **Predict: VGG16 at matched performance** (770 generations, 1.89× not 2.43×), reveal with the curves and the two marked budgets | Reading, Kernels | 0+2+2+2+2+2+2 = 12 | built | Figure 4 decoded |
| P-dream_rsi.5 | **Predict: can replay beat the record?** (no: the ceiling) | Run tab | 0+0+2+1+2+2+1 = 8 | built | §3 rules |
| P-dream_rsi.6 | **Figure 3(a) against any row**, arithmetic or geometric mean, per-dataset log ratio bars; SimpleTES provenance box (copied row identical to SimpleTES Supp. Table 16; machine ratios 2.12× glmnet; dagger row as same-machine re-timing) | Tables | 2+2+2+2+2+1+2 = 13 | built | Figure 3(a), SimpleTES Supp. Table 16 |
| P-dream_rsi.7 | **Figure 4 at any budget**: budget slider, ratio at equal cost, finals, matched-performance saving | Tables | 2+2+2+1+2+2+2 = 13 | built | Figure 4 decoded |
| P-dream_rsi.8 | Figures 5 and 6 rebuilt (guided runs ahead early; attempts add up to Figure 4's 786) | Tables | 0+2+2+1+1+1+1 = 8 | built | decoded, printed labels |
| P-dream_rsi.9 | Every number checked (56 rows, filter paper / added) | Tables | 0+2+2+1+2+2+1 = 10 | built | `recompute.py` |
| P-dream_rsi.10 | Replaying the project page's demo | none | | rejected: its own caption says the numbers are illustrative (seeded RNG); nothing to measure |
| P-dream_rsi.11 | Toy where outcomes depend on visit order (siblings read each other) | none | | rejected for now: no data on how much the real agent's output depends on siblings; any coupling strength would be invented. Stated in words instead |
| P-dream_rsi.12 | Lasso path solver run in the browser (the discovered program) | none | | rejected: Appendix C's program is described, not released as runnable code, and timings would not compare with the paper's machine |
| P-dream_rsi.13 | Then and now (fixed strategies → EvoX online meta-evolution → Dream-RSI offline replay) | none | | rejected: one line of related work, covered in Problem and Why it matters |
| P-dream_rsi.14 | Training-bill or cost tab | none | | rejected: a pattern Khalid removed; the paper gives no cost beyond call counts |

What the methodology lacked for this page: a rule for **ratios chosen at a favourable point** (budget ratio at worse final performance, or a comparison against the other curve's intermediate round). Suggested rule: for any "x× fewer at comparable performance" or "x× better at similar budget" claim, show the matched-performance and matched-budget versions beside it, computed from the decoded curves.
