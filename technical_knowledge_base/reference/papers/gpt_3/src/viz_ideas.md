# GPT-3 (Language Models are Few-Shot Learners): visualisation ideas

The question the paper keeps returning to: **does the ability to learn from the prompt grow with scale, and how far can a frozen model go on prompts alone?** Its evidence is one big table (Table H.1: 63 evaluations × 8 sizes × 3 settings), so the page's visuals make that table measurable rather than illustrate a mechanism.

Existing visuals on the old page: none. Outbound links: arXiv, the OpenAI API post, four explainers (Alammar, Albanie, freeCodeCamp, Sik-Ho Tsang).

## Ranked (scores: reproduces ×2, computable ×2, parameter to move, shows what a sentence cannot, corrects a misconception, central question, novel, animation; minus build cost)

| Id | Idea | Placement | Score | Data and formulas | Status |
|---|---|---|---|---|---|
| P-gpt_3.1 | **Refit the scaling curves**: any Table H.1 row (or the 41-task average) against log parameters in zero-, one- and few-shot, fine-tuned SOTA and nominal chance lines; a straight line fitted on the smallest n models (slider 3 to 7) predicts 175B; a residual strip of all 41 accuracy tasks, clickable | Own tab (live ingredient) | 13 | Table H.1 (arXiv HTML A8.T1) parsed by `parse_h1.py` / `mk_tables.py`; Table D.1 parameter counts; `recompute.py` linfit; defaults reproduce recompute (13 above trend, 12 within 5, 16 below) | built |
| P-gpt_3.2 | **Few-shot minus zero-shot, averaged** (Figure 1.3's claim recomputed): 1.8, 2.6, 3.7, 4.2, 5.9, 6.0, 9.2, 14.8 points; gap grows on 36 of 41 tasks | Reading predict reveal; Refit tab "few minus zero" view; headline card | 12 | Table H.1 acc rows (41; 42 with SQuAD 2.0 EM) | built |
| P-gpt_3.3 | **In-context against fine-tuning, animated** on Figure 2.1's own task (three En→Fr pairs, "cheese =>"), context strip to scale against 2,048 tokens with exact r50k_base token counts, counters for tokens, gradient steps, weights changed, model copies | Reading, Idea | 11 | Figure 2.1; `count_tokens.py` (tiktoken r50k_base: 7, 10, 11, 11, 3, 2 tokens) | built |
| P-gpt_3.4 | **Figure 4.2 rebuilt from Table C.1**, with the relative difference recomputed (QuAC 22.1 against printed 20, DROP −19.2 against −21, Reversed Words −25 against −26) | Reading predict reveal; Tables tab | 10 | Table C.1 | built |
| P-gpt_3.5 | **A second draw for free**: Table C.1 was run with another seed for the demonstrations; compared with Table H.1 it gives the paper's only seed-to-seed spread (25 of 41 identical, mean 0.4, WiC 3.9) | Tables tab C.1 column; How much to believe | 10 | Tables C.1 and H.1 | built |
| P-gpt_3.6 | **Arithmetic by size**, ten tasks, setting toggle, with the line's 7.6% prediction for 3-digit addition against the actual 80.4% and the Schaeffer et al. metric caveat | Reading predict reveal | 9 | Table H.1 | built |
| P-gpt_3.7 | **Parameter recount** of all eight sizes from Table 2.1 (12Ld² + 13Ld + embeddings, V = 50,257, positions 2,048): within 0.32% of Table D.1, 13B only with d = 5,120; XL's heads × d_head ≠ d_model | Tables tab; Reading, Model | 9 | Tables 2.1, D.1 | built |
| P-gpt_3.8 | **Table 2.2 epochs recomputed**: WebText2 3.47 against 2.9, Wikipedia 3.0 against 3.4; weights sum to 101% | Tables tab; Reading data chart | 8 | Table 2.2 | built |
| P-gpt_3.9 | **Figure 2.2 rebuilt from Table D.1** (6ND, PF-days; all reproduce independently) | Reading, Training and compute; Tables tab | 7 | Table D.1 | built |
| P-gpt_3.10 | **Loss law slider**: Figure 3.1's printed legend L = 2.57 · C^−0.048, models placed at Table D.1 compute, labelled illustrative | Refit tab | 6 | Figure 3.1 legend (transcribed label) | built |
| P-gpt_3.11 | **Tokens per parameter** across GPT-3, Chinchilla (actual and its Table 3 optimal 175B), LLaMA, Llama 3, with the ≈20 line | Reading, Why it matters | 7 | Chinchilla Tables 1 and 3, LLaMA Table 2, Llama 3 §1 | built |
| P-gpt_3.12 | **Human detection with intervals** (Tables 3.11 and 3.12) | Tables tab | 5 | Tables 3.11, 3.12 | built |
| P-gpt_3.13 | **Checks on the paper's own numbers**: 16 text-against-table disagreements (80.2/80.4, word tasks quoted from the other draw, "200B", ANLI R3 1,500 dev against 1,200 test, the 1DC parentheses in the released data, Appendix E's 718 participants against the tables' 873) and 13 that reproduce | Tables tab | 8 | `recompute.py`, `check_released_data.py` | built |

## Rejected

| Id | Idea | Why not |
|---|---|---|
| P-gpt_3.14 | A toy language model trained to show in-context learning emerging with size | Would show a toy's phenomenon, not GPT-3's; the paper's evidence is its table, which is already rich, and a toy cannot reach the regime (13B to 175B) where the paper's effects appear |
| P-gpt_3.15 | Redrawing Figures 1.2, 3.1 curves, 3.8 (K sweep) | Images only, no printed values; the method forbids reading curves (only Figure 3.1's legend label is transcribed) |
| P-gpt_3.16 | Multiple-choice scoring demo (per-token against unconditional normalisation) with invented log-probabilities | No released log-probabilities; any numbers would be invented |
| P-gpt_3.17 | Then and now tab | The recipe's fate (Chinchilla, RLHF, closed weights) fits in Why it matters with one chart; a morph of an unchanged decoder shows little |
| P-gpt_3.18 | Training-bill or cost tab | A pattern Khalid removed; the paper gives no cost |

## Inspiration

Distill's predict-then-reveal; the T5 page's "checks on the paper's own tables"; Epoch-style refits. What the methodology lacked here: a rule for papers whose live ingredient is a refit of a results table with no fitted law of its own. The page uses the simplest trend (linear in log parameters) and says it is not the paper's method.
