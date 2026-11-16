# Visual ideas for the Dense Rewards in GRPO page

| id | Idea | Status | Why |
|---|---|---|---|
| P-dense_rewards_grpo.1 | Hero: the same eight methods minus outcome-only GRPO re-plotted on four yardsticks (equal updates, equal tokens, equal GPU-hours, full training time), a step animation (RD.anim) with a yardstick chooser | built (Fig. 1) | the paper's whole argument is that the ranking depends on the yardstick; one bar chart that changes axis shows the flip from +1.0 to −14.9 to −7.8 |
| P-dense_rewards_grpo.2 | The Monte-Carlo reward on one completion: group, cuts, continuations, prefix values, segment credits, the token tally | built (Fig. 2, six explained steps) | a process; the credit rule and the 91% cost in one picture. The completion's outcomes are illustrative and labelled so |
| P-dense_rewards_grpo.3 | Budget strips: tokens per run (rollouts against continuations, updates) and seconds per run by stage | built (Fig. 3, static) | shows why tokens and GPU-hours rank differently: equal tokens, a third of the time |
| P-dense_rewards_grpo.4 | The gradient test's overestimate per reward against the band of gains the paper measured | built (Fig. 4, static) | "ranks but cannot certify" as one comparison of sizes |
| P-dense_rewards_grpo.5 | Scatter of the candidates' mean predicted success against the filter's gain, twelve settings, dashed line at 1/2, rings on preregistered tests | built (Fig. 5, static) | the account the paper tests; a scatter reads best flat |
| P-dense_rewards_grpo.6 | The paper's Figure 5 (three of ten panels, cropped) and Figure 6 as real images | built (Figs. 6 and 7) | the lead over training and the learning-rate retune are curves; no per-evaluation data is printed, and curves are never read by eye |
| P-dense_rewards_grpo.7 | A 3D stage of the rollout tree (completion, cuts, continuation fans) | rejected | nothing here is spatial; depth would only decorate a tree that reads well flat |
| P-dense_rewards_grpo.8 | A slider for k (continuations per cut) driving token share and update count | rejected | the paper prints all three points (70%, 83%, 91%; 163, 92, 50 updates), so Fig. 3 shows them directly; a slider would interpolate values the paper does not measure |
| P-dense_rewards_grpo.9 | A live toy GRPO run with and without a dense reward | rejected | the claim is about compute accounting at real model scale; a CPU toy would be tuned to agree, and the trainer is not released |
