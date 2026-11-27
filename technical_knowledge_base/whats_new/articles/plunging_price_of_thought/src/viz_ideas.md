# Visuals: built and rejected

## Built
- **Hero and live ingredient: the staircase explorer** (P-plunging_price_of_thought.1). Record cost per question against release date, log scale, for any primary benchmark and score level, with a toggle for the five corrected release dates. Opens on GPQA 75% (the article's 725x example); read-outs give first and latest record, the fall, its yearly rate, and the article's statistic at that one level. Drawn from the record-setting runs only (derived by recompute.py; C(t, a) from them equals the full-data frontier). JS rate checked against recompute.py at 13 benchmark-level pairs. Teaches what the text cannot: the rate depends on the level, the steps are few and big, and the date error changes the speed.
- **Technology bars in log points a quarter** (P-.2): the article's Figure 1 data; shows why "54 times faster" is a log-point ratio and puts the multiples on the figure.
- **Rate against quarters since SOTA debut** (P-.3): the article's Table 2 (fitted) against our model-free age bins, pooled or per benchmark. The page's test of the article's second finding.
- **Sensitivity dots** (P-.4): fifteen variants (data fixes, horizons, lattices, score thirds, leave-one-model-out), pooled and per benchmark, beside "How much of this to believe".

## Rejected
- Redrawing the article's 3-D surfaces or heat maps (Figures 4 to 6): the authors' overlay page is interactive and better; the page's argument does not rest on the fitted surfaces.
- A lattice animation (nodes lighting up quarter by quarter): the explorer's per-level rate plus one sentence carry it.
- Embedding Figure 2 (CC BY would allow it): the explorer reproduces its traces and lets the reader pick any level.
- Rerunning the Box-Tidwell fits: hours of porting for a model the article itself treats as a summary; the model-free numbers carry the claims tested.
