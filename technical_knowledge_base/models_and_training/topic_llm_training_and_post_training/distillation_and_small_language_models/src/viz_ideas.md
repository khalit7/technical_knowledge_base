# Distillation and Small Language Models: visualisation ideas

The question the page keeps returning to: **what does a small model get from a big one, and through which channel (the teacher's text, its probabilities, or its grades on the student's own text)?** A visual earns its place when it makes one of those channels, or its cost, measurable.

Existing visuals elsewhere (not repeated here): the parent's checkpoint strip (same prompt through base, SFT, preference, RLVR, distilled) and Open recipes compared; the Qwen3 paper page's toy Table 21 (on-policy distillation against RL, three seeds) and its "signal per response" route animation; the R1 paper page's tables; the Google page's distillation-storage chart (G8: full teacher distribution against 256 sampled entries).

Scores: R reproduces a published figure (0 to 2, double), C computable from public data (0 to 2, double), S shows what a sentence cannot, M corrects a misconception, Q measures the central question, N new to the knowledge base, A step-by-step or before/after animation; minus build cost B.

| # | Idea | R | C | S | M | Q | N | A | B | Total | Placement | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Toy teacher and student, seven ways to distil** (SFT on teacher samples, forward-KL logit KD at T = 1 and 2, reverse KL on teacher text, on-policy forward and reverse KL, SFT then on-policy), three seeds, curves against steps and against model FLOPs, failure reasons, routes sampled from checkpoints (before/after scrub) | 0 | 2 | 2 | 1 | 2 | 2 | 2 | 2 | 4+2+2+1+2+2+2-2 = 13 | Own tab | built |
| 2 | **One prompt graded three ways, animated** (SFT target, logit target, on-policy reverse-KL grade at every position of a real teacher route and a real student route, with the toy models' probabilities, counters for positions, teacher numbers used, off-route states) | 0 | 2 | 2 | 1 | 2 | 2 | 2 | 1 | 14 | Reading, Whose text | built |
| 3 | **Dark knowledge at any temperature, real logits** (Qwen2.5-0.5B-Instruct, four prompts, top 40 exact plus a binned tail; T slider; top-token mass, mass a hard label discards, second/first ratio, entropy) | 1 | 2 | 2 | 1 | 2 | 2 | 0 | 1 | 2+4+2+1+2+2-1 = 12 | Reading, Soft targets | built (reproduces the model's own probabilities by construction) |
| 4 | **Forward against reverse KL, animated** (two-mode teacher, one-bump student, exact gradient descent in the browser, before/after toggle and "both") | 0 | 2 | 2 | 2 | 1 | 2 | 2 | 1 | 12 | Reading, Forward or reverse KL | built (teacher labelled illustrative) |
| 5 | **Token budgets of pruned and distilled students** on a log axis, with each paper's ratio recomputed (Minitron 40x and 1.8x, Llama-3.1-Minitron 150x, MN-Minitron 40x, Nemotron Nano 9B v2, Llama 3.2, Gemma 2 and 3, Sheared-LLaMA) | 2 | 2 | 1 | 2 | 1 | 2 | 0 | 1 | 4+4+1+2+1+2-1 = 13 | Reading, Prune then distil | built |
| 6 | **Small models compared**: total parameters against Artificial Analysis's own runs (8 measures), best-at-this-size-or-smaller line animated by quarter, recipe rings where the maker says | 0 | 2 | 2 | 1 | 1 | 2 | 2 | 2 | 10 | Own tab | built |
| 7 | **Distil or RL**: R1 Table 16 and Qwen3 Table 21 as bars, with Thinking Machines' 9x and 30x recomputed | 2 | 2 | 1 | 2 | 2 | 1 | 0 | 0 | 4+4+1+2+2+1 = 14 | Reading, Distil or RL | built (compact; the paper pages own the tables) |
| 8 | Predict, then reveal: Hinton's 3%-of-data result (Table 5) | 2 | 2 | 1 | 1 | 1 | 2 | 0 | 0 | 11 | Reading | built |
| 9 | Tokenizer mismatch, real splits and ids (Qwen2.5 against GPT-2) | 1 | 2 | 1 | 1 | 1 | 2 | 0 | 0 | 9 | Reading, Practical notes | built |
| 10 | Live in-browser student (ship weights, sample any prompt) | 0 | 2 | 1 | 0 | 1 | 1 | 1 | 2 | 3 | none | rejected: 7 students x 20K parameters would add about 150 KB for what the replayed samples already show |
| 11 | Real LLM teacher and student logits on the same text (forward/reverse KL per token on Qwen2.5-0.5B against a smaller model) | 0 | 1 | 1 | 0 | 1 | 2 | 0 | 2 | 3 | none | rejected: no smaller model with the same tokenizer is cached; the toy shows the per-token KL with exact numbers |
| 12 | Gemma 3 teacher-size crossover (Figure 8) redrawn | 0 | 0 | 1 | 2 | 1 | 2 | 0 | 1 | 5 | none | rejected: figure only, no printed values (the method forbids reading curves); described in words |
| 13 | Training-bill tab for distillation runs | | | | | | | | | | none | rejected: a pattern Khalid removed; the Llama 3.2 GPU-hours sit in the budget chart's details |

## Data and formulas
- Soft targets: q_i = exp(z_i/T) / Σ exp(z_j/T) (Hinton §2). Tail binning error measured in `real_logits.py` (max 3.0e-5 relative on the normaliser for T in 0.25..10).
- KL fit: forward Σ p log(p/q), reverse Σ q log(q/p), over 40 tokens, gradients by central differences (h = 1e-4).
- Budgets: `recompute.py` (every ratio with its formula; Gemma 2's "more than 50x" does not reproduce at 20 tokens per non-embedding parameter: 49.4 and 48.1).
- Thinking Machines: 1.5e21 / (8.4e19 + 8.2e19) = 9.0; (3.4e21 + 1.5e21) / 1.66e20 = 29.5.
- Toy compute: 6N per trained token, 2N per scored token, 2N per generated token (N of whichever model), attention ignored.
- Sources: `inputs/source_extracts.txt` (quotes with URLs), `inputs/aa_small.json`, `inputs/real_logits.json`, `inputs/toy.json`.

## Inspiration
Thinking Machines' post (its per-token grading illustration), GKD's Figure 1 (methods by student size), Eric Jang's mode-seeking note (linked from Thinking Machines), the Qwen3 paper page's toy Table 21 (protocol: same start, same samples per step, three seeds), Polo Club's Transformer Explainer (real numbers in an explanatory picture).

## What the methodology lacked for this page
- A rule for toy experiments whose outcome is not a published figure: here the toy reproduces nothing by design, so the page says what it can and cannot show and reports every method's spread over seeds, including results that contradict the usual story.
- Third-party leaderboards carry their own errors (Artificial Analysis lists DeepSeek LLM 67B at 7B and dates Phi-4-mini a year early); the rule "check a curated table row by row" applies to independent trackers too.
