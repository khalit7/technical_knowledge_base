# Handoff to Eval statistics (3ef5c17b0d0d8187a7b4e5b4ec4a546d)

From: Production eval engineering (3c65c17b0d0d81b39ad9e96193d21adc), rebuilt 2026-10-04. The old page's statistics now belong to Eval statistics; the production page summarises them in one paragraph ("Moved") and links there. Below: the old text verbatim (copied by script from src/live.md, fetched 2026-10-04, last edited 2026-09-22), then corrections found while moving it.

## Old text, verbatim

### Resources (from the old "Best resources" list)
- [Adding Error Bars to Evals (Evan Miller, Anthropic, arXiv:2411.00640)](https://arxiv.org/abs/2411.00640) (45 min): the statistical framework: central-limit-theorem (CLT) confidence intervals (CIs), clustered standard errors (SEs), paired tests, power analysis. Read first.
- [statsforevals.com](https://statsforevals.com/) (\~30 min): companion resources adapting that framework to small (20-100 item) developer evals.

## Statistical rigour
The central failing of eval practice is reporting point deltas without noise quantification. The Miller framework, adapted:
- **Question-level variance**: eval score = mean over items; standard error of the mean (SEM) = s/sqrt(n). With n=100 binary items at p around 0.7, SEM is about 4.6 points: a "2-point regression" on a 100-item set is noise. With n=1000 it is 1.4 points. Rule of thumb for binary metrics: detectable effect at 95%/80% power is roughly 2.8 \* sqrt(2p(1-p)/n); invert for the n you need. Detecting a 2-point drop near p=0.7 needs roughly n=3500 paired-free; far fewer paired (next point).
- **Paired tests**: always compare models on the same items and test the per-item differences (paired t-test / McNemar for binary). Item difficulty is shared, so pairing removes most variance; typical correlations cut required n by 3-10x. This is the single highest-value practice for regression gates.
- **Sampling variance of generation**: nondeterministic decoding means the same model rescores differently; estimate by K resamples per item and use the variance decomposition (between-item + within-item/K). For small golden sets, K=3-5 resamples materially tightens CIs.
- **Clustered errors**: items generated from shared sources/templates are not independent; use clustered standard errors or you will overstate significance.
- **Multiple comparisons**: gating 20 slices at p\<0.05 fires falsely all the time; use stricter per-slice alpha or hierarchical gating (aggregate first, slices as diagnostics).
- Small-set reality: a 50-item gate can only detect large regressions; be explicit about the minimum detectable effect of each gate instead of pretending sensitivity you don't have. Escalate borderline gate results to more samples or human review rather than re-running until green.
### Worked example: sizing a model-swap gate
Champion passes 78% of a 300-item golden set. You care about regressions of 5+ points.
- Unpaired: SE of the difference is sqrt(2 * 0.78 * 0.22 / 300) = 3.4 points; a 5-point drop is only 1.5 SE: the gate cannot reliably see it. You would need roughly n = 16 \* 0.17 / 0.05\^2 = 1100 items.
- Paired (score both models on the same 300 items, McNemar on discordant pairs): if the models disagree on \~15% of items (typical for a same-tier swap), the effective n is the \~45 discordant items but the variance of the paired delta shrinks by the agreement rate; in practice a 5-point true regression is detected with high power at n=300. Pairing turned an underpowered gate into a working one at zero extra labelling cost.
- Add K=3 generations per item for both models if decoding is nondeterministic; report the delta CI from the paired bootstrap over items.
The general lesson: state each gate's minimum detectable effect next to its threshold, and get sensitivity from pairing and resampling before buying it with more labels.

## Corrections and checks (2026-10-04)

1. **"Detecting a 2-point drop near p=0.7 needs roughly n=3500 paired-free" does not follow from the page's own rule of thumb.** With MDE = 2.8 x sqrt(2p(1-p)/n), n = 2.8^2 x 2 x 0.21 / 0.02^2 = 8,232 items (per configuration, unpaired, two-sided 95%, 80% power). Even one-sided (2.49) gives about 6,500; using p(1-p) instead of 2p(1-p) gives about 4,100. None gives 3,500. Suggest: about 8,200.
2. **Worked example, paired case: "in practice a 5-point true regression is detected with high power at n=300" is too optimistic for the stated numbers.** With 15% discordant items (45 of 300) and a 5-point regression (b - c = 15, so b = 30, c = 15), McNemar's z under the alternative is about 15 / sqrt(45) = 2.24, so power at two-sided 0.05 is about Phi(2.24 - 1.96) = 61%. 80% power needs n of about 2.8^2 x 0.15 / 0.05^2 = 470 at the same discordance. Pairing still helps a lot (the unpaired case needs about 1,100), but "high power at 300" should read "about 60% power at 300; about 470 items for 80%".
3. Arithmetic that checks out: SEM at n=100, p=0.7: sqrt(0.21/100) = 4.58 points; n=1000: 1.45; unpaired SE of the difference at 78% on 300: sqrt(2 x 0.78 x 0.22 / 300) = 3.38 points; 5 / 3.38 = 1.48 SE; n = 16 x 0.17 / 0.05^2 = 1,088 (16 is about 2 x 2.8^2 = 15.7; 0.17 is about 0.78 x 0.22 = 0.1716).
4. "typical correlations cut required n by 3-10x": no source given; treat as unconfirmed unless Miller (arXiv:2411.00640) states it.
5. Gate thresholds on many slices: the production page's Gate designer shows real numbers. On MT-Bench's released GPT-4 grades (34 models, 1,122 ordered swaps), an aggregate gate at a 0.25-point tolerance passes 626 swaps; in 67 of them a per-slice gate (drop of 0.5 or more with a 95% paired t interval wholly below zero) fails at least one slice. Data: production_eval_engineering/src/inputs/gate_data.json (all 34 models' 160 grades, encoded; decoder in src/parts/21_js_common.js; recompute in src/recompute.py). Usable for a real paired-vs-unpaired demonstration: claude-v1 vs claude-instant-v1 aggregate change -0.03 (paired 95% interval -0.48 to +0.41, n = 159); writing slice -0.95 (-1.51 to -0.39, n = 20).
6. A judge parse failure inside a published number (useful for the statistics page's "what goes into a mean" point): LMSYS's leaderboard prints MT-Bench 7.85 for Claude-Instant-1; the released file gives 7.906 over 159 valid grades, and averaging the one failed grade in as -1 over 160 gives exactly 7.850.
