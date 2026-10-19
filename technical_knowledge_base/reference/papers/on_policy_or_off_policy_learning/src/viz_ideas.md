# Visual ideas: On-Policy or Off-Policy Learning? (ids P-on_policy_or_off_policy_learning.k)

Scored 0 to 2 on the criteria of `.claude/skills/explainer-page/visuals/choosing.md` (reproduces a source and public inputs count double), minus build cost.

| id | Visual | Where | Score | Status |
|---|---|---|---|---|
| .1 | One prefix, two gradients: the two-token case of Theorem C.2 (spike) and its mirror (blind spot), forward against reverse KL on the same prefix, with a log slider | Reading, "Why: gradients" | 12 | built: the before/after on one input; defaults reproduce Eq. 51 independently |
| .2 | Slide lambda: pi_lambda over routes for one prompt with the paper's safeguards, and the exact change in the expected update against lambda for both directions, with TV distance and the Theorem C.1 / Corollary C.3 bounds as counters | Move the rollout policy, card 1 | 11 | built |
| .3 | Train along the spectrum: the toy's pass@1 and distinct correct routes against lambda, recorded sweep plus an in-browser rerun that must match it | Move the rollout policy, card 2 | 10 | built; shows a non-reproduction (reverse KL flat) |
| .4 | One prompt before and after, four ways (KL x rollout writer), checkpoints every 10 steps, same scale | Move the rollout policy, card 3 | 9 | built (makeAnim) |
| .5 | Figure 1 rebuilt (bars, three measures) | Reading, Result | 11 | built from the decoded SVG |
| .6 | Figure 3 rebuilt (lambda spectrum, three panels, two learning rates) | Reading, The spectrum | 11 | built from the decoded SVG |
| .7 | Figure 5 rebuilt (pass@1 and pass@10 along lambda, two tasks) | Reading, Beyond pass@1 | 10 | built; exposes the pass@1 / pass@10 gap behind the "10 to 15%" claim |
| .8 | RLVR curves summary (Figures 6 and 26) as start / peak / last-50 table per seed | Reading, Beyond pass@1 | 8 | built as a table; exposes the on-policy forward-KL checkpoints that never learn |
| .9 | 2 x 2 grid of rollout writer and KL direction with conventional and crossed pairings | Reading, Two knobs | 7 | built |
| .10 | Claims checked against the paper's own figures | Figures rebuilt tab | 9 | built from recompute.py |
| .11 | Forward against reverse KL shape animation (mass-covering, mode-seeking) | not built | 4 | rejected: the Distillation and Small Language Models page already animates it ("Forward or reverse KL"); linked |
| .12 | Teacher and student routes trained with forward and reverse KL on a graph task | not built | 3 | rejected: the Distillation page's toy tab does exactly this; linked, and its result quoted |
| .13 | Figure 2 learning-rate sweep rebuilt | not built | 6 | rejected for now: the text and Figure 3 carry the point; noted in Result |
| .14 | Figure 4 (likelihoods along lambda), Figure 21 (likelihood dynamics), Figures 22 and 23 (entropy profiles) | not built | 5 | rejected: supporting diagnostics; A.10 told in a details block instead |
| .15 | Toy forgetting / sparsity panels | not built | 2 | rejected: a two-token toy has no general ability to forget; saying so is the honest version |
| .16 | Clipping on / off in the toy | not built | 4 | rejected after the sweep: the toy's batch gradient norm never reaches 1.0, so the two are identical; stated on the page |
