# Visualisation ideas: Agora

The question the paper keeps returning to: does a shared, append-only commit graph let independently scheduled agents build on each other, and how much of the run's result does it explain?

Scores: teaches / data (reproduces or computable) / effort, each 0 to 5.

| id | idea | score | placement | status |
|---|---|---|---|---|
| P-agora.1 | **Rebuild the winning prior on CPU**: Stage A of the agents' recipe (GPT-2 small's next-token log-softmaxes under the paper's 28 contexts, unigram anchor, rank-671 randomized SVD with oversampling 32 and one power iteration) measured in bits per byte on 200 FineWeb-Edu texts; a ladder beside Table 4, a rank explorer (1 to 671 and the full table, 1 or 28 contexts, T = 1 or the paper's temperatures) | 5 / 5 (one-context rank-671 lands on Table 4's 2.1284 independently) / 3 | Own tab (live ingredient) | built |
| P-agora.2 | **Replay one passage through four models** (uniform, unigram anchor, Stage A prior at any rank, GPT-2 with context): token chips coloured by bits, running bits per byte, top-3 guesses | 4 / 5 / 2 | Rebuild tab | built |
| P-agora.3 | **The descent, animated** (Table 4 at UTC time): whole-descent and last-0.03 modes, the second against the paper's cross-hardware noise band, counters for best, share of descent, gap closed | 5 / 5 / 2 | Reading, Results | built |
| P-agora.4 | **Frontier calculator** on a small illustrative graph: Eq. 2 with self-citations struck out, Eq. 3 terms per candidate, single-link clusters and k_eff at a movable threshold, D switch | 4 / 3 (formulas exact, graph illustrative) / 3 | Reading, Frontier | built |
| P-agora.5 | **Figure 2 decoded** from the vector PDF in the arXiv source (stacked bars per day, events marked) | 3 / 5 (sums to 1,703 and 165 exactly) / 1 | Reading, The run; Tables | built |
| P-agora.6 | **Predict, then reveal**: slice-copying against random init; share of the descent from the first 18 contributions; D = 1.0 lets an untested idea outrank the leader; the clustering threshold behind "a third of all activity" | 4 / 5 / 1 | Reading | built |
| P-agora.7 | **Version diff of all four arXiv versions** (sentence-level, numbers only) with the project website's stale figures | 4 / 5 / 1 | Tables | built |
| P-agora.8 | **Noise of a 200-text evaluator**: bootstrap over texts on the rebuild, absolute against paired standard errors, halves | 4 / 5 / 1 | Rebuild tab, How much to believe | built |
| P-agora.9 | **Stage B band map** (672 dimensions, bands B0 to B6, per-layer reads and writes with scalars) | 2 / 5 / 1 | Reading, Recipe | built |
| P-agora.10 | Simulated community with and without the diversity views | rejected: the outcome would be set by the made-up landscape; the paper has no matched comparison to check it against |
| P-agora.11 | Figure 3 (every scored contribution) and Figure 4 (the whole graph) rebuilt | rejected: both are raster images and the contribution export is not released |
| P-agora.12 | Stage B rebuilt on the real target | rejected: the target architecture's code is not released (its SSM block and parameter layout cannot be recovered from the text) |

What the methodology lacked for this page: a rule for platform papers whose evidence is one unreleased run. The useful live ingredient was the method the agents found, not the platform: rebuilding it from the text gave an independent check of the run's headline number, which the paper itself never reran. And for a paper revised four times in two weeks, diffing the versions is a source of findings in its own right.
