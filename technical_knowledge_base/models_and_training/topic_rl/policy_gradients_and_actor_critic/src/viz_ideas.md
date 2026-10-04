# Visualisation ideas: Policy gradients and actor-critic

Question the page makes measurable: what weights each action's log-probability (return, return minus a baseline, a critic's TD error, a GAE blend, a clipped ratio times an advantage, a critic's slope) and how far one batch may move the policy; what each choice costs in bias, variance and data. Scores follow `html_utils/interactive-html-ideas.md` section 2 (0 to 2 each; reproduction and computability x2; +1 animation; cost subtracted).

| # | Idea | Placement | Score | Reproduces | Decision |
|---|---|---|---|---|---|
| PG-1 | Policy gradient with and without a baseline: one softmax policy, same random draws, 60 updates, 200-run bands, reward offset (before/after animation) | Reading, inline | 15 | Old page's worked numbers (gradient, variance 7.56 to 1.56) exactly; 86 of 200 runs stuck at offset 10 (derived) | reused from Topic: rl reading_full |
| PG-2 | Variance against any constant baseline, with b = 0, b = V and b* marked; logit slider makes b* leave V | Reading, inline | 11 | Greensmith et al.'s optimal-baseline formula, checked by golden-section minimisation | built (old embed idea) |
| PG-3 | GAE computed backwards, A_t = delta_t + gamma lambda A_{t+1}, on the worked episode and an 8-step chain with a wrong critic; A_0 against lambda (animation) | Reading, inline | 13 | Old page's 0.1 / 0.4705 / 0.5 exactly; checked against the k-step weighted-average form | built (old embed idea, animated) |
| PG-4 | Clipped surrogate against the ratio for A > 0 and A < 0 side by side, with both terms and gradient status | Reading, inline | 10 | Old page's four-case table exactly | built (old embed idea, both signs) |
| PG-5 | PPO: one sample, ten epochs, with and without the clip; overshoot shows the clip does not bound the ratio (before/after animation) | Reading, inline | 13 | Illustrative; supports Engstrom et al.'s finding qualitatively | reused from Topic: rl reading_full |
| PG-6 | Maximum entropy on a 1-D action: soft-optimal policy exp(r/alpha)/Z, best Gaussian actor, entropy against alpha, SAC's automatic alpha (target -dim(A)) | Reading, inline | 12 | Illustrative reward; exact computation (closed form vs quadrature checked); shows the Gaussian's mode switch | built |
| PG-7 | Short corridor: J(p) exact with three learners moving on it (REINFORCE, with baseline, actor-critic) (before/after animation) | tab | 16 | Example 13.1's 0.59, -11.6, -44, -82 exactly and independently | built |
| PG-8 | Figures 13.1 and 13.2 rerun: 100 runs x 1,000 episodes per curve in the browser, floor toggle, summary table | tab | 15 | 13.2 in shape (baseline far faster); 13.1's 2^-13 and 2^-14 in shape; 13.1's 2^-12 plateau NOT reproduced (said on the page) | built |
| PG-9 | One-step actor-critic with an aliased one-number critic on the corridor | tab (+ Reading text) | 10 | New: drifts to the 0.95 floor (-44), a concrete case of actor-critic bias | built |
| PG-10 | Natural gradient against vanilla gradient on a 2-action softmax: same Euclidean step, different KL | Reading text with derived numbers | 7 | KL 0.120 vs 0.0037; quadratic approximation's looseness at p 0.99 | numbers in prose only; a widget would add little over the two numbers |
| PG-11 | TD3 twin-critic minimum: E[min] vs E[max] of noisy estimates | Reading text | 6 | -sigma/sqrt(pi) exactly | prose only; the max-bias widget lives on Model-free prediction and control |
| PG-12 | PPO vs TRPO vs no clip on a small continuous-control task trained live (e.g. Pendulum) | tab | 9 | Would not reproduce any published number; seconds per run too slow on a phone; Engstrom's point is about code-level details a toy cannot show | rejected (cost, no reproduction) |
| PG-13 | PPO Table 1 ablation as a bar chart | Reading | 6 | Table values | rejected for a table: seven numbers read better as a table |
| PG-14 | Quiz like the old embed | Reading | n/a | n/a | kept as a collapsible "Check yourself" list |
| PG-15 | Clip on a rare token, PPO vs clip-higher vs CISPO | n/a | n/a | n/a | not built: exists on RL for LLMs (linked) |

What the methodology lacked: guidance for a published learning-curve figure that a faithful reimplementation does not reproduce when the source omits settings (start policy, probability bounds). Here: state the assumed settings with a source (the widely used reproduction), show the toggle for the uncertain one, and say plainly which curve does not reproduce.
