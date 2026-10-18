# Block lab: visuals built and rejected

Scores 0 to 2 on the criteria of the explainer-page skill (visuals/choosing.md); double-weighted criteria counted twice.

## Built
| visual | score | why |
|---|---|---|
| One token through one block, 14 steps (stepped mechanism, type 2), real recorded vectors of the trained tiny GPT, shapes and counters for the tiny GPT or a real config (CC), code at file:line | 13 | the brief's centrepiece; real values (no paper prints them); counters end on the block totals the table quotes; model selector ties the toy to Llama shapes |
| "In one screen" table of every step (shape, parameters, FLOPs per token), model selector | 10 | recomputes published counts (Llama 3.1 8B lands on the Hub's 8,030,261,248 through CC) |
| FLOPs by operation against context, decode or prefill, crossover marker (calculator, type 8) | 14 | one movable parameter, defaults reproduce the FlopCounterMode count independently (formula vs counter), corrects "attention is the expensive part" for short contexts and "6N" for long ones |
| Residual-stream norm through 12 sub-layers, pre-norm against post-norm on the same token (before/after, type 1), init or trained, token or median | 13 | the brief's before/after; measured; shows the cost of pre-norm (growth) and the property of post-norm (fixed scale) |
| Held-out loss curves at several learning rates, pre against post, unigram line (recorded runs, type 4) | 12 | the failure (post-norm stuck at the unigram level) is visible, with the learning rates it needs |
| Gradient norm by block on a log axis, init and trained | 11 | shows why post-norm fails: almost no gradient reaches the lower blocks |
| Shape drills (predict, then reveal, type 10) x 3 | 8 | the shapes readers get wrong (nn.Linear stores (out, in); heads before T; FFN dominates at short context) |
| Real mistakes table (four silent bugs, real losses and continuations) and real error messages | 9 | real bad outputs, not invented |

## Rejected
- Animating attention weights flowing between all 256 tokens: repeats the Inside a real model tab's attention explorer; this lab shows one token's row only.
- A GELU against SwiGLU toggle inside the walkthrough with recorded values: would need a second trained model traced; the shapes and parameter counts switch through the model selector instead, and Activation functions owns the comparison.
- Time by operation on MPS: timings on a shared laptop teach little that the FLOP split does not, and decode time is bandwidth-bound (Performance math owns that); not run.
- No-mask training demo (kept in mistakes.py output, not shown): in 400 CPU steps (batch 8) the model trained without a causal mask did NOT yet learn to copy the future (train loss 4.06 vs 3.85 with the mask), so it would not show the textbook collapse at this budget; showing it would need a longer run. The inference-time version of the bug (loss 1.96 to 3.64) is shown instead.
- A log-scale stacked bar of FLOPs: rejected by the skill's rules (stacked bars on a log axis lie about sums); the share chart is a linear stacked area against a log context axis.
