# Visualisation ideas: Statistics for ML (2026-10-05)

Central question: **how much would this number change on another sample, and is a difference bigger than that?** A visual earns its place when it makes that wobble measurable on a case whose truth is known.

Scores 0 to 2 on: parameter to move, reproduces a stated figure (x2), computable from public data or exact maths (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere. Build cost subtracted.

| Rank | Idea | Placement | Score | Reproduces / data |
|---|---|---|---|---|
| 1 | 100 repeated experiments with their 95% intervals; before/after: bell n = 30 against skewed lognormal n = 5 (plus the tiny model's loss), t against 1.96 | Reading s5 (animation) | 13 | seeded draws in `inputs/sims_anim.json`; counts recomputed by `recompute.py` (95, 99, 82 covered); long-run rates from the grid |
| 2 | CI and test lab: six populations x seven n x four methods; coverage curve, one-sided misses, width, power curve via CI-test duality | Tab `t-lab` | 13 | `sims_grid.json`, 5,000 experiments x 999 resamples per cell; check: t on normal 94.8 to 95.4% (exact 95%) |
| 3 | Double descent decomposed: bias^2 and variance against p, with Belkin, Hsu and Xu's Theorem 1 as exact circles; ridge toggle; singular values | Reading s11 (inline) and tab `t-dd` | 14 | `sims_dd.json`, 1,000 training sets; reproduces Theorem 1 independently to 3.2% away from the threshold |
| 4 | CLT animation: sampling distribution of the mean stepped n = 1 to 1000, four populations including infinite variance | Reading s4 | 11 | `sims_clt.json`, 20,000 samples per cell |
| 5 | Bootstrap world against real world: two histograms, a sample where it works (tiny model) and one where it fails (lognormal n = 10 missing its tail) | Reading s6 | 11 | `sims_boot.json` |
| 6 | Tail bounds against the exact binomial tail, n slider | Reading s10 | 9 | exact binomial in `sims_conc.json`; bounds closed form; reproduces the handoff's 0.16 and 738 |
| 7 | Exact table of three entropy estimators (MC, plug-in, Miller-Madow) | Reading s2 (table) | 8 | exact multinomial enumeration |
| 8 | Peeking table: false-positive rate against number of looks | Mistakes | 7 | 200,000 simulated runs |

Rejected:
- A live JavaScript simulation of coverage: Monte Carlo noise would make page numbers disagree with `recompute.py`; precomputed seeded grids instead, labelled simulated.
- A 1-D polynomial or random-ReLU double descent: tried (see scratch prototypes); 1-D designs are so ill-conditioned that averages are dominated by catastrophic fits, and the Regularisation page already shows random ReLU features on real digits. The Gaussian weak-features model has an exact published formula to reproduce.
- Small-n binomial interval coverage: owned by Eval statistics (Small-n intervals tab); linked.
- A sample-size calculator: owned by Eval statistics; linked.
- Real model logits for the running example: the tiny model's known distribution is what makes coverage measurable (the truth is known); real evals with real models are on Eval statistics.

What the methodology lacked: a rule for simulation-backed numbers. Used here: every simulated number is seeded, stored in `inputs/`, labelled "simulated" on the page with its repetition count and Monte Carlo error where it matters, and quoted from one simulation only (the CLT figure and the lab use different runs and the text says which).

## 2026-10-24 rebuild
Added (inline, each beside its claim): hero (population, sampling distribution, one interval; static); estimator bias² + variance bars from the exact entropy table (static small multiples); log-likelihood against its normal approximation for 9/10, 90/100, 900/1000 (toggle; shows asymptotic normality and the Wald interval past 1); sum of squares against the centre (static, why n - 1); null distribution of heads (static); power curves (one slider, n; defaults reproduce 78.2% at n = 30, by formula); McNemar 2 x 2 table; permutation dot plot of all 256 sign patterns; Bonferroni, Holm and BH thresholds on the ten p-values (static); conjugate Beta posterior (prior toggle); ridge line (lambda slider; lambda = 42 halves the slope); CV folds (static). Moved: Double descent lab tab into Reading section 13. Rejected: a Galton-board photo for the CLT (decoration; the CLT animation teaches more); a live A/B calculator (Eval statistics owns the calculator).
