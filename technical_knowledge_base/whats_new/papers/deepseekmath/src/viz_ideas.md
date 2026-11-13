# Visualisation ideas: DeepSeekMath (GRPO)

The question the paper keeps returning to: does dropping PPO's critic for a group baseline cost or gain anything, and what does each post-training method actually do to the gradient? Score: reproduce/computable count double; build cost subtracted (methodology in `.claude/skills/explainer-page/visuals/choosing.md`).

| # | Idea | Placement | Score | Data | Status |
|---|---|---|---|---|---|
| P-deepseekmath.1 | **Train all six methods** (SFT, RFT, Online RFT, DPO, PPO, GRPO, GRPO+PS, Dr. GRPO) live from one toy base model with one rule reward and one sample budget; exact accuracy, KL, Maj@K, Pass@K; heatmap by question; reproduces the sweep exactly; JS gradients against PyTorch autograd of the paper's objectives (2.2e-16) | Own tab | 2+2+4+2+2+2+2+1-2 = 15 | `toy_sweep.mjs`, `check_engine.py` | built |
| P-deepseekmath.2 | **PPO against GRPO on one question, animated**: one output with per-token KL rewards, critic values and GAE advantages, against a group of eight with z-scored advantages shared by every token; counters for networks in memory and trained | Reading, GRPO | 1+0+4+2+1+2+1+1-1 = 11 | live toy (100-step PPO run in the browser) | built |
| P-deepseekmath.3 | **Mining a synthetic web, with and without domain discovery** (illustrative): recall by round, styles recognised, domains flagged, overlap with the last round | Reading, corpus | 1+0+2+2+1+1+2+1-1 = 9 | mechanism from §2.1 only | built |
| P-deepseekmath.4 | **Gradient-coefficient widget**: each Table 10 method's GC on the same eight sampled outputs, one scale | Reading, unified view | 1+0+4+2+1+2+2-1 = 11 | live toy | built |
| P-deepseekmath.5 | **Figures 5, 6, 7 decoded from vector SVGs** with a ±1 standard-error band; Figures as numbers in the Tables tab | Reading; Tables tab | 0+4+4+1+2+2+1-1 = 13 | `decode_figs.py` | built |
| P-deepseekmath.6 | **GAE reach**: weight of the final reward in each token's advantage, λ^(L−1−t), for L up to 32,768; explains R1's λ finding | Reading, GRPO | 2+2+4+2+1+2+1-0 = 14 | derived | built |
| P-deepseekmath.7 | **k3 gradient widget**: exact ∇KL(π‖π_ref) against the expected gradient of k3 as a loss (= ∇KL(π_ref‖π)) on a 5-outcome step | Reading, GRPO | 2+2+4+2+2+1+2-1 = 14 | derived; Tang and Munos 2025 | built |
| P-deepseekmath.8 | **Memory: PPO against GRPO** for the 7B config, learned reward model or rule (249 against 138 GB) | Reading, GRPO | 1+0+4+1+2+2+1-0 = 11 | `recompute.py`, HF config | built |
| P-deepseekmath.9 | Predict-then-reveal: arXiv-only training (falls), the clip at one update per batch (does nothing), Pass@64 after RL (slightly lower) | Reading | 1+2+4+1+2+2+1-0 = 13 | Tables 8, 9; §4.2, A.1.5; Figure 7 | built |
| P-deepseekmath.10 | **Then and now: GRPO's objective term by term** (R1, DAPO, Dr. GRPO, Tang and Munos, GSPO), each with what the toy can see | Own tab | 1+0+4+1+1+1+1+1-1 = 9 | `inputs/later_extracts.txt` | built |
| P-deepseekmath.11 | Tables 1 to 10 explorer (sort, difference from baseline) and 20 claims checked | Tables tab | 1+2+4+1+2+1+1-1 = 11 | `mk_tables.py`, `recompute.py` | built |
| P-deepseekmath.12 | Table 1, Table 5 and data-mix bars; arXiv bars in the reveal | Reading | 0+2+4+1+0+1+0-0 = 8 | tables.json | built |
| P-deepseekmath.13 | Group advantage calculator for any G | | | | rejected: already on Topic: llm-landscape (Deeper: test-time compute), linked |
| P-deepseekmath.14 | Figure 3 (corpus curves) redrawn | | | | rejected: raster PNG in the paper; reading curves is not allowed |
| P-deepseekmath.15 | Held-out questions in the toy (the paper's out-of-domain gains) | | | | rejected after trying: every method lowered held-out accuracy at this scale (`heldout_trial.mjs`); said on the page |
| P-deepseekmath.16 | Iterative RL and a learned reward model in the toy | | | | rejected: with a rule reward there is nothing to retrain; a learned toy RM would add a hackable channel the comparison is meant to remove |
| P-deepseekmath.17 | Long outputs in the toy (λ, length bias) | | | | rejected: enumerating outputs exactly needs 3 tokens; the GAE widget carries the length argument instead |

What the methodology lacked here: a rule for when the paper's comparison is confounded (Rule against Model reward): the toy removes the confound by design and says so, rather than reproducing it.

## 2026-10-25 light pass
- P-deepseekmath.h1 (built): the hero, MATH at each stage (Base, Instruct, RL) against GPT-4 and the best earlier open model, beside PPO's four models against GRPO's three and one group's normalised rewards; static.
- Moved, not new: the arXiv ablation chart and Figure 7 out of predict reveals into cards after their questions; the GAE reach and k3 gradient widgets into closed blocks (their mechanisms are owned by Policy gradients and actor-critic and are beyond the paper).
- Rejected: embedding the paper's Figure 4 (arXiv non-exclusive licence); a real image (nothing physical to show).

## 2026-11-13 layout rollout
- P-deepseekmath.s1 (built): Fig. 1, the corpus pipeline as a 3D stage on the page's synthetic web (MINE): 48 domain tiles with their math pages as columns by style, solid once found; the classifier as a glass plate; the seed as bars by style with the 12-positive line; flows for training, recall and annotation; with and without domain discovery. Replaces the 2D mining animation.
- P-deepseekmath.s2 (built): Fig. 2, PPO against GRPO on one toy question as a 3D stage: the four models as glass plates (the value model's plate empty in GRPO mode), the output's tokens, r_t, V_t and A_t as signed bars on one plinth, the group's rewards and advantages with the mean as a sinking glass plane; READTOY data. Replaces the 2D PPO/GRPO animation; R1's group stage (sixteen answers, length) is not repeated.
- Kept 2D: the hero (scores on an axis), Table 1, the data mix, the arXiv chart, Table 5, the memory bars, the GAE and k3 widgets, the gradient-coefficient widget, Figures 5 to 7, the run tab's charts and heatmap, Then and now (a formula morph, text).
- Rejected: the gradient-coefficient widget as a 3D bar field (a widget with a method switch and question slider; flat bars by token compare more easily); the hero in 3D (its message is numbers on an axis; Fig. 2 shows the models).
