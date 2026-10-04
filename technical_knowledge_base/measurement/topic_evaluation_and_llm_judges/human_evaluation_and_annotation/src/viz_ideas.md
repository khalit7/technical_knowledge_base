# Visualisation ideas: Human evaluation and annotation (2026-10-04)

Central question: how much can you trust a human label, and what do you do when you cannot?

| # | Idea | Placement | Score (reproduces / computable / shows what text cannot / animation) | Data and formulas | Status |
|---|---|---|---|---|---|
| H1 | **One set of votes, scored three ways** (before/after): 370 MT-Bench turn-1 items as columns of squares; raw pair agreement, pooled chance, Fleiss kappa, coincidence matrix and alpha, ordinal alpha; modes: ties counted, ties dropped, HelpSteer2 coherence (prevalence) | Reading, Agreement | 3+3+3+3 = 12 | lmsys/mt_bench_human_judgments (expert votes), nvidia/HelpSteer2 disagreements; Krippendorff 2011 formulas; reproduces Zheng Table 5 exactly | built |
| H2 | **One test set before and after its audit** (before/after): 18 open models on MMLU-Redux Virology and College Chemistry re-ranked as flagged items are removed and wrong keys corrected, with intervals; ImageNet mode from Northcutt Table S1 (34 models) | Reading, Auditing | 3+3+3+3 = 12 | Open LLM Leaderboard v1 per-question log-likelihoods, MMLU-Redux 2.0 verdicts, Northcutt Tables 2 and S1 | built |
| H3 | **Agreement lab**: every statistic on 7 datasets, toggles for ties and the HelpSteer2 retention rule, coincidence matrix, Krippendorff bands | Own tab | 3+3+2+0 = 8 | same as H1 | built |
| H4 | **Audit lab**: three suspect rankings (self-confidence, normalized margin, consensus votes), review budget, found/precision/recall against random and perfect queues, the queue with question text, accuracy table original/sound/corrected | Own tab | 2+3+3+0 = 8 | same as H2 | built |
| H5 | HelpSteer2 Table 1 bars (kappa by guideline stage) | Reading, Rubrics | 3+3+1+0 = 7 | Table 1 | built |
| H6 | Prevalence paradox widget: 2x2 table at fixed 90% agreement, prevalence slider, kappa and AC1 | Reading, Agreement | 0+3+2+0 = 5 (illustrative, labelled) | Cohen, Gwet formulas | built |
| H7 | Annotation budget calculator with sourced presets (Prolific rate, Arena minutes, GPQA minutes) | Reading, Who and cost | 1+2+1+0 = 4 | rates illustrative except Prolific | built |
| H8 | ChaosNLI "how many raters do you need" resampler (majority of 5 vs 100) | none | 3+2+3+1 = 9 | data hosted outside HF; time budget | rejected for now (good follow-up) |
| H9 | Noise-prevalence crossing (Northcutt Fig. 4) | none | needs per-model benign-set accuracies the paper does not tabulate; would be fitted | rejected |
| H10 | MMLU-Redux published Table 2 ranks as a third mode | none | ranks are among different denominators (HELM list against top 10) | rejected; quoted in text |
| H11 | Dawid-Skene simulator | none | MT-Bench raters too sparse per expert to fit well; mechanism adequately described | rejected |

What the methodology lacked: guidance for data whose "truth" is itself a human label (the audit lab scores model-proposed suspects against another human audit, which is also fallible; said on the page).
