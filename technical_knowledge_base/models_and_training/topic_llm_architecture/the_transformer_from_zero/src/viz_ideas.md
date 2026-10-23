# The transformer from zero: visuals built and rejected

Scores 0 to 2 on the criteria of the explainer-page skill (visuals/choosing.md); double-weighted criteria counted twice.

## Built
| visual | score | why |
|---|---|---|
| Build it up stepper (tab): the nine steps of gpt_zero.py with real code lines, real shapes on the running sequence (numbers and letters, since T = D = 256), each step's test output, file-progress bar, play/step/scrub | 12 | the brief's build-it-up lab; stepped mechanism (type 2); every value from steps.py |
| One run, twelve snapshots (Reading 8): held-out curve with unigram and bigram lines, the running sequence coloured by per-token loss, greedy continuation per snapshot | 13 | before/after on the same input across training (type 1); shows what "reading the loss curve" means; landmarks calculated from counts |
| Temperature and top-k explorer on real logits (Reading 9) plus real samples at six settings | 10 | one movable parameter on real data; entropy and true-token probability counters |
| Ablation explorer (tab): loss curves of every run, the running sequence through baseline / ablation / difference (animated before, after, difference), samples for 8 prompts | 14 | the brief's ablation explorer; equal budgets; before/after on the same sequence |
| Shape drill (tab): generated questions over 9 real configs plus the tiny GPT (weight and activation shapes, layer and total parameters, KV bytes, FLOPs) with formula reveals; JS formula checked against accounting.py | 11 | the brief's shape drill; totals reproduce Hub counts (residuals explained) |
| Real-config parameter table (Reading 10): formula vs Hub safetensors count with residuals named | 10 | recompute a published figure; corrects "the Hub count is the parameter count" |
| Three predict-then-reveal drills in Reading (token 0's self-weight, state_dict count, Llama layer parameters) | 7 | the counts readers get wrong |

## Rejected
- Rebuilding one token through one block or the FLOPs-by-operation calculator: the root Block lab owns both (linked).
- An attention-map viewer: the root's Inside a real model and the AIAYN paper page own it.
- Animating backprop through the block: Matrix calculus and backprop owns it; this page only counts the backward FLOPs (measured 3.0x).
- A param-matched "no FFN" run (18 attention-only layers): would separate the FFN's role from its parameter count, but triples attention cost per step; the confound is stated instead. Candidate for a later run (about 8 min).
- A no-causal-mask training run: the Families and objectives child measured the leak (0.21 under the leak, 7.02 under the mask); linked.
- Timing per operation on MPS: laptop timings teach little (Block lab rejected it too).

## 2026-10-23 rebuild (teaching contract)
| visual | kind | where | why |
|---|---|---|---|
| Hero: the tiny GPT end to end, shapes, parameters, ablation tags, boxes link to sections | static annotated diagram | top | the whiteboard picture; ties every section and section 11's results to one figure |
| Two lookups and a sum | static | section 2 | the position table's job, with the measured cosine 0.433 and difference 0.0 |
| One head: score, mask, softmax, mix, edit test | stepper (5 frames) | section 3 | a process; the edit test is why one pass is T examples |
| Largest softmax weight, scaled against unscaled | static bars | section 3 | the scale's effect from measured numbers |
| Split, attend, merge | static shape diagram | section 4 | reshape and transpose are structure |
| FFN matrices to scale: GELU, SwiGLU, Llama | toggle-compare | section 5 | the 2/3 rule and 3.5 D seen as area |
| Pre-norm block with init numbers | static | section 6 | structure; replaces prose about where the norm sits |
| Targets shifted by one | static, real tokens | section 7 | the shift is the loss |
| Recompute against KV cache, same 10 tokens | before/after stepper, derived FLOPs | section 9 | a method against the one it replaced; nobody else draws it |
| One block's matrices to scale, tiny GPT against Llama 3.1 8B | toggle-compare | section 10 | 12D^2 and why GQA and SwiGLU break it (the predict's answer) |
| Ablation curves and per-token before/after | moved from the Ablation explorer tab | section 11 | inline beside the claim |
| Shapes and counts | tool tab (was a quiz) | tab | used by every section; quizzes retired by the contract |

Rejected in the rebuild: real attention weights in the one-head grid (needs the trained checkpoint, which lives in scratch; a
CPU extract of layer 1's weights for ten tokens would take seconds and is proposed for the next run); a FLOPs slider over
context (the root Block lab owns it); a parameter-share bar per model (the root's section 3 figure draws it).
