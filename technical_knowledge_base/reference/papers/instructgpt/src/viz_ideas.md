# InstructGPT: visualisation ideas

The question the paper keeps returning to: **how much does optimising a learned stand-in for human judgement buy, and what does it cost (in over-optimisation and in lost capability)?** Every visual below either runs that trade or checks the paper's own numbers for it.

Scores follow the Methodology (interactive-html-ideas.md section 2): quantity the reader moves (0 to 2), reproduces a published figure (0 to 2, counts double), computable from public data (0 to 2, counts double), shows what a sentence cannot (0 to 2), corrects a misconception (0 to 2), measures the central question (0 to 2), absent from existing explainers (0 to 2), step animation against the method it replaced (0 to 1), minus build cost (0 to 3).

## Built

| # | Idea | What it shows, what the reader does | Placement | Score | Data and formulas |
|---|---|---|---|---|---|
| P-instructgpt.1 | **Run the three steps**: a real toy RLHF pipeline trained live in the page (pretrain, SFT with 10% pretraining mix, linear bag-of-words RM fit with Eq. 1 on simulated rankings, PPO with per-token KL and the ptx term), presets and β / γ / seed controls, four live curves (labelers' true score, RM score, KL, pretraining loss), samples from every model, a Figure 1 style win rate | Over-optimisation (β = 0 turns every answer into "sure" eight times while the RM score climbs to 11.7), the alignment tax (pretraining loss 1.42 to 4.55), and the ptx repair (1.66 at almost the same win rate) on one screen | Own tab | 2+2x2+2x2+2+2+2+2+1-3 = 18 | `parts/20_js_toy_core.js`; gradients checked against PyTorch (`check_grad.py`, PASS to 5e-16); `sweep.cjs` |
| P-instructgpt.2 | **Trade-off frontier**: win rate against SFT against pretraining loss for the β sweep (no mix) and the γ sweep (β = 0.3), means of 3 seeds with seed ranges | Raising β moves along a curve that loses preference; adding γ moves almost straight left. The paper's Figure 33 against Figure 34 in one chart, which the paper never draws | Run tab | 2+2+4+2+2+2+2-1 = 15 | `model/sweep.json` |
| P-instructgpt.3 | **One PPO episode, PPO against PPO-ptx, animated**: prompt, each word with π and π_SFT bars to scale, the per-token penalty, the RM score at the end, return, value and advantage, one illustrative update (dashed bars), and in ptx mode the pretraining gradient's effect on the pretraining loss of 8 windows per word | Eq. 2 term by term on real toy numbers; the ptx step visibly pulls pretraining loss down where PPO alone pushes it up | Reading, Step 3 | 1+0+4+2+1+2+1+1-2 = 10 | live toy; illustrative step size 0.5 labelled |
| P-instructgpt.4 | **Reward-model widget**: K = 4 to 9 live SFT answers, one simulated labeler's ranking, every pair's -log σ(r_w - r_l), the per-prompt mean (Eq. 1), and the forward-pass count K against K(K-1) | Corrects the old summary's "K times cheaper" (it is K - 1 against separate pairs); shows ties dropped | Reading, Step 2 | 2+0+4+2+2+1+1-1 = 11 | live toy |
| P-instructgpt.5 | **Figures decoded from the arXiv SVGs**: 1, 3, 4, 5, 6, 7, 30, 33, 34, 36 (every bar, point and error bar from the vector coordinates, ticks fitted to labels to 1e-6) | Exact numbers the paper never prints; enables every check below | Reading and Tables | 0+4+4+1+1+2+2-2 = 12 | `decode_figs.py`, `svgparse.py`, `inputs/figs.json` |
| P-instructgpt.6 | **Bradley-Terry head-to-head calculator** from Figure 1 | Reproduces the printed 85 ± 3% (86.0%) and 71 ± 4% (73.6%) independently, and gives the implied 78% for 1.3B InstructGPT against 175B GPT-3, which the paper never measured | Reading reveal, Tables | 2+4+4+2+2+2+2-1 = 17 | σ(logit w_a - logit w_b) |
| P-instructgpt.7 | **Every number in the text, checked** (24 checks with verdicts) | Finds: TruthfulQA "twice" is 1.4 to 1.5x by human labels; "25% less toxic" is 16 to 20%; "21% vs 41%" hallucination matches neither Figure 4 nor Figure 30, and the two figures are mutually inconsistent; 73.4% (§1) against Figure 1's 66.0%; §1's FLAN/T0 win rates do not combine into the printed 78/79%; Table 14 prints CNN/DM and TLDR identically (also in the PDF); three appendix-versus-main-text differences | Tables tab | 0+4+4+2+2+2+2-1 = 15 | `recompute.py` |
| P-instructgpt.8 | Predict-then-reveal: β = 0 (reveal: toy curves), 1.3B against 175B (reveal: Figure 1 decoded), KL or ptx for the tax (reveal: Figures 33 and 34 decoded plus the toy's means) | Belief elicitation at the three points where intuition fails | Reading | 1+2+4+1+2+2+1-1 = 12 | sweep, figs.json |
| P-instructgpt.9 | Table 14 explorer: size toggle, row filter, sort by PPO or PPO-ptx minus GPT | The alignment tax row by row; HellaSwag surpassed, DROP and SQuAD v2 still behind | Tables tab | 2+2+4+1+0+2+1-1 = 11 | Table 14 as printed |
| P-instructgpt.10 | Then and now: the recipe's seven lines through Bai et al., ChatGPT, Constitutional AI, DPO, Llama 2, GRPO, Tülu 3, DeepSeek-R1, every change quoted, carried-over lines marked as not confirmed | What survived (SFT first, comparisons, KL, iteration) and what was replaced (value function, learned RM for verifiable tasks, RL itself in DPO) | Own tab | 1+0+4+1+1+1+1+0-1 = 8 | `inputs/later_extracts.txt` |
| P-instructgpt.11 | Figure 2 redrawn with Table 6's training-set sizes to scale; Table 1 bars | The three datasets and the use-case mix the FLAN/T0 argument rests on | Reading | 0+2+4+1+0+1+0-0 = 8 | Tables 1, 6 |

## Rejected

| # | Idea | Why not |
|---|---|---|
| P-instructgpt.12 | A toy transformer policy (as on the Transformer page) | The paper's mechanism is the training loop, not the architecture; a 3-word MLP keeps the whole pipeline at about 1 s plus 2 s per PPO run, so it can train live and every setting reproduces the offline sweep exactly |
| P-instructgpt.13 | A learned (neural) toy reward model | A bag-of-words RM makes the over-optimisation mechanism legible (the "sure" weight is visible) and keeps step 2 at 0.1 s; a neural RM would hide why the policy finds the hole |
| P-instructgpt.14 | Held-out labeler experiment in the toy | The toy's labelers share one utility by construction; any "generalisation" would be built in |
| P-instructgpt.15 | GPT-3 (prompted) baseline in the toy | The toy sees 3 words, so a few-shot prefix cannot change its output; said in the toy's notes |
| P-instructgpt.16 | Training-compute or labeling-cost tab | A pattern Khalid removed; the two compute numbers fit in the card and one check |
| P-instructgpt.17 | Redrawing Figures 28, 29 (all benchmarks by size) | Table 14 prints the same numbers exactly; the explorer covers it |
| P-instructgpt.18 | Figure 39 (toxicity by prompt toxicity) decoded to hunt for the 25% | Possible, but without a stated subset any match would be cherry-picked; reported as not reproduced instead |

## Inspiration and sources

- The paper's arXiv HTML (vector SVG figures with data-text glyphs; that is what made exact decoding possible): https://arxiv.org/html/2203.02155v1
- Gao, Schulman, Hilton (2022), synthetic gold-RM setup, the model for the toy's "true score": https://arxiv.org/abs/2210.10760
- Huang et al. (2024), N+ implementation details (whitened advantages, per-token KL, value initialisation): https://arxiv.org/abs/2403.17031
- Hugging Face "Illustrating RLHF" and Chip Huyen's RLHF post: the existing static explainers this page does not repeat.

## What the methodology lacked for this page

- A rule for **figures available only as vector graphics inside the HTML**: decoding glyph-tagged SVGs is exact transcription, not curve reading; it should be the first thing tried for any arXiv HTML paper (it found three of the paper's own inconsistencies here).
- A rule for **toys of training procedures with a ground truth**: when the paper's quantity of interest is an unobservable (true human preference), give the toy a known truth and show proxy against truth; label the truth as the toy's construction.
- Units: a toy's hyperparameters (β, γ) are in its own units; say so wherever the paper's values appear beside them.
