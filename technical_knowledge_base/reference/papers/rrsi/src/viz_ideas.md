# Visualisation ideas: RRSI

The question the page keeps returning to: does regularising the harness search buy transfer, or only a lower evolve score, and do the authors' own records support the numbers?

| id | Idea | Placement | Score (reproduce, computable, beyond a sentence, central, animation) | Status | Data and formulas |
|---|---|---|---|---|---|
| P-rrsi.1 | **Replay the released runs**: four runs round by round, recorded decisions against "keep the best score" (Eq. 2) on the same candidates, floor S* − δ drawn, critic first-draft rejections shown | Own tab (live ingredient) | 2+2+2+2+2 = 10 | built | regularized-rsi.com/data/evolution.js via mk_runs.py |
| P-rrsi.2 | **Re-judge the recorded candidates**: Algorithm 2 ported from rrsi/selection.py, δ, β1, w_c sliders, decisions that flip listed, candidates on the (ΔS, ΔC) rule plane | Replay tab | 2+2+2+2+0 = 8 | built; defaults reproduce 37/37 coding and 31/32 lab decisions independently | Eq. 5, 7, 17; repository configs |
| P-rrsi.3 | **Noise-chasing toy, before/after on one candidate stream** (keep the best score against RRSI's selection rules), 400-seed averages, sliders for mean effect, benchmark-specific share, critic, δ, w_s | Reading, Problem (predict reveal) | 1+2+2+2+2 = 9 | built; does not reproduce the paper's transfer advantage, said | candidate spread fitted to the released coding run; mean set by simulation so the median measured change is -2.8 points |
| P-rrsi.4 | **Edit budget of every round** (Eq. 4) per instance, with the never-run t = T bar | Reading, Method | 2+2+1+1+0 = 6 | built; shows b_min = 1 is never reached | Table 5 |
| P-rrsi.5 | **Figure 1(a) and Figure 4(a) rebuilt**, recomputed from Tables 1 and 2 and checked against points decoded from the vector PDFs, ablation arms added to 4(a) | Reading, Results | 2+2+1+2+0 = 7 | built; reproduce within 0.001 points | decode_figs.py |
| P-rrsi.6 | **Figure 3 rebuilt** with a gain view, evolve splits marked | Reading, Results | 2+2+1+2+0 = 7 | built | printed labels in main_results.pdf |
| P-rrsi.7 | **Noise bars**: each held-out gain against its binomial standard error | Tables tab; How much to believe | 1+2+2+2+0 = 7 | built | Appendix A sizes |
| P-rrsi.8 | **Paper against record**: Harvey LAB held-out, tokens, Terminal-Bench champion | Replay and Tables tabs | 2+2+2+2+0 = 8 | built; three numbers do not reproduce | runs.json heldout and trajectories |
| P-rrsi.9 | Granularity checks (scores as whole counts of tasks or trials) | Tables tab | 2+2+1+1+0 = 6 | built; GDPval and two APEX scores fail | recompute.py |
| P-rrsi.10 | Champion diff viewer (the released patches) | none | rejected: 16 to 32 KB of diff per run would push the page past 300 KB and the project page already shows them |
| P-rrsi.11 | Toy tuned until RRSI transfers better (e.g. making expensive edits benchmark-specific) | none | rejected: tuning a toy to agree with the paper; the honest toy result is shown instead |
| P-rrsi.12 | Counterfactual greedy path through the recorded runs | none | rejected: later candidates were drafted on RRSI's incumbent, so a greedy path would invent data; the replay compares one round at a time |

What the methodology lacked here: a rule for papers that release run records whose numbers differ from the printed ones. This page shows both side by side, labels which is which, and treats the records as the more primary source for what the code did.
