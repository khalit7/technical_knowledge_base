# Visual ideas: Budget Internalization (P-budget_internalization)

Scored as `visuals/choosing.md` says (0 to 2 per criterion, criteria 2 and 3 doubled, minus build cost). Built ones first.

| id | Visual | Score | Decision |
|---|---|---|---|
| P-budget_internalization.1 | Fig. 1, the crossover: base against trained AIME accuracy over the evaluation budget (log axis), seed bands from Table 15, cap lines, model and training-data buttons | 17 | Built as the hero. It is the paper's whole result, every point is a printed table value (Tables 8, 9, 15), and the buttons show the same shape on six math and three Reasoning Gym checkpoints. Static with controls, no autoplay: the change across budgets is read, not watched. |
| P-budget_internalization.2 | Fig. 2, mean length at the largest budget, base against trained, seed whiskers (Table 1) | 12 | Built. The length collapse is the mechanism's visible signature and a sentence cannot show the 5.5x scale. A length toggle on Fig. 1 was dropped for it, so the hero carries one quantity. |
| P-budget_internalization.3 | Fig. 3, a coloured table of trained minus base at the largest budget, AIME, GPQA, LiveCodeBench, math and Reasoning Gym rows | 12 | Built as an HTML table with coloured cells (numbers readable and citable by the AI buddy). Shows at a glance that the damage concentrates on the training task. |
| P-budget_internalization.4 | Fig. 4, the forcing and cue controls as bar deltas, RD.anim, 4 steps | 11 | Built. A process of three interventions whose answers flip the interpretation; deltas only, because the paper prints the forcing-up results only as deltas. |
| P-budget_internalization.5 | Fig. 5, the objective with each budget term highlighted, and every Table 3 ablation placed at (gain at 8k, change at 64k), RD.anim, 6 steps | 17 | Built. The paper's own framing (Eq. 1) made into a stepper, and the trade-off frontier it argues for is visible as an empty corner. |
| P-budget_internalization.6 | Fig. 6, the two rejection fine-tuning arms against base and GRPO over the budget (Table 3) | 11 | Built. The cleanest control: same length limit, different endings, opposite outcomes. |
| P-budget_internalization.7 | Truncation-rate curves for every model and task (Table 12) | 6 | Rejected for the Reading tab: Fig. 2 and one sentence carry the point; the full table is in the tables tab. |
| P-budget_internalization.8 | The paper's own Figure 1 embedded as an image (CC BY 4.0) | 5 | Rejected: Fig. 1 here redraws it from the exact table values and adds the seed bands interactively; the image would repeat it. |
| P-budget_internalization.9 | A toy GRPO run in the browser with a length cap (bandit over "reasoning lengths") | 4 | Rejected: a toy would only show that zero reward for long rollouts shortens rollouts, which is true by construction; the paper's claims (crossover size, transfer, which fixes fail) are measurements at 4B scale that a toy cannot test. |
| P-budget_internalization.10 | Per-seed spaghetti plot of Tables 15 and 16 | 5 | Rejected: Fig. 1's bands show the seed spread; the per-seed values are in the tables tab. |
| P-budget_internalization.11 | Budget-cue figure (Appendix B, Figures 6 to 8) | 3 | Rejected as its own figure: four numbers, folded into Fig. 4's last step. |
| P-budget_internalization.12 | A 3D view of accuracy over (model, cap, budget) | 1 | Rejected: no depth information; the 2026-11-19 rule keeps curves 2D. |
