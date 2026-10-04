# Visualisation ideas: Model-based RL and planning

Chosen with the Methodology in `html_utils/interactive-html-ideas.md` section 2. Scores are teaching value (T, 1 to 5), data reality (R: real or exactly computed = 5, illustrative = 1), cost (C, 1 cheap to 5 expensive), and whether a sibling or the root already has it (dup).

## What the text needs to be understood
1. That planning is the same backup as learning, on simulated experience, and why it speeds learning (Dyna).
2. That a wrong model can hide improvements (blocking against shortcut maze).
3. How MCTS works step by step, and why visit counts become a policy target.
4. What MuZero's model does and does not predict, compared with AlphaZero's rules.
5. Why learned-model errors compound, and why short rollouts or replanning fix it.
6. The AlphaZero loop (search improves, network distils) on something small enough to inspect.

## Built (ranked)
| # | Idea | Where | T | R | C | Notes |
|---|---|---|---|---|---|---|
| 1 | **Dyna maze, episode 2, n = 0 / 5 / 50** (Figure 8.3 as a before/after animation) | Reading 2 | 5 | 5 | 2 | Same run, same random numbers: planning draws from a second stream, so episode 1 is identical for every n and only planning differs. Counters: arrows, planning updates, V(S) against 0.95^13. |
| 2 | **MCTS stepper on one tic-tac-toe position**: UCT with random playouts / PUCT with an untrained network / PUCT with the trained network | Reading 5 | 5 | 5 | 4 | The four steps shown for 6 simulations, then one frame per simulation; ends with prior p against visit share pi. Real networks from the Self-play lab. The position (O must block the middle row) was chosen in Python as one where UCT at 30 simulations usually misses the only non-losing move (2 of 20 seeds) and PUCT with the trained network finds it. |
| 3 | **Compounding model error on Gymnasium's Pendulum-v1** (open loop against restart every 5 steps) plus error-by-horizon chart with the ensemble's spread | Reading 12 | 5 | 5 | 3 | A 5-member MLP ensemble fitted for this page to 2,000 random-torque transitions (src/fit_pendulum.py). One-step error 0.0016 rad; 0.20 after 50 steps (125 times); restarts every 5 steps keep the mean at 0.0044. |
| 4 | **MuZero vs AlphaZero search-path stepper**, ending with the training unroll (K = 5) and its targets | Reading 8 | 4 | 2 | 2 | A diagram, labelled so: hidden states drawn as strips. Required by the coverage of the old embed's "MuZero training unroll" stepper (entry 118). |
| 5 | **Figures 8.2, 8.4, 8.5 recomputed** | Reading 2, 3 | 4 | 5 | 2 | Defaults reproduce the shapes; the 1,700-step first episode does not (exact expected random walk 869). |
| 6 | **Dyna lab** tab: the three experiments with n, alpha, epsilon, kappa, runs | tab | 3 | 5 | 2 | Sweeps that deserve room (Khalid rejected the root's tabular lab; depth belongs on children). |
| 7 | **Self-play lab** tab: training curves, any position's prior / value / visits / exact result for 5 checkpoints, a table of checkpoints, and a simulations-needed chart | tab | 4 | 5 | 4 | The AlphaZero loop trained offline in about 30 s (src/train_ttt.py); weights int8 (about 2.5 KB per checkpoint). |

## Rejected
- **Prioritised sweeping race on the maze**: the Dynamic programming page's Sweep lab already races in-place, prioritised and synchronous sweeps on this same maze (dup). Linked instead.
- **RTDP racetrack**: also on Dynamic programming (dup).
- **Figure 8.7 (sample against expected updates)**: a closed-form curve; one sentence with the formula carries it.
- **MPC swing-up demo with the learned pendulum model** (random shooting or CEM, live): about 600,000 model calls per episode in the browser, and the compounding-error visual already makes the point MPC answers. Possible later.
- **Connect-four MCTS**: more interesting games but no exact solution small enough to label every move optimal or not; tic-tac-toe's 5,478 positions are solved exactly, which makes "is this move right?" answerable everywhere.
- **Atari sample-efficiency chart across papers**: would put different protocols on one axis, which the root's Milestones tab forbids; built as a table with that warning instead.
- **World Models dream-vs-real bar chart** of Table 2: a five-row table carries it.

## Data and formulas (URLs)
- Sutton and Barto, chapter 8 (http://incompleteideas.net/book/RLbook2020.pdf, PDF page = book page + 22): Example 8.1 parameters (alpha 0.1, epsilon 0.1, gamma 0.95, 30 repetitions, random ties, "about 1700 steps", "about 25 / five / three episodes"), Dyna-Q+ bonus r + kappa sqrt(tau) and its footnote, sample-update error sqrt((b-1)/(b t)).
- Maze layouts: https://github.com/ShangtongZhang/reinforcement-learning-an-introduction/blob/master/chapter08/maze.py (the book does not print the blocking and shortcut parameters; ours: alpha 1, n 50, kappa 1e-3, 20 runs).
- Pendulum dynamics: https://github.com/Farama-Foundation/Gymnasium/blob/main/gymnasium/envs/classic_control/pendulum.py
- PUCT constant 1.25: MuZero's c1 (arXiv 1911.08265, Appendix B). UCT constant sqrt(2): UCB1 with C_p = 1/sqrt(2) (Kocsis and Szepesvari 2006).
- All other sourced numbers: src/inputs/research_A.md and research_B.md (verbatim quotes with page numbers).

## Inspiration
- The DeepSeek MLA explainer (before/after of one input, step controls, counters).
- Sutton and Barto Figure 8.3 for the maze; Figure 8.10 (Chaslot et al.) for the four MCTS steps; MuZero Figure 1 for the search path.

## What the methodology lacked for this page
- A rule for **training a small model for a page** (the tic-tac-toe network, the pendulum ensemble): we kept the training script, its log and seeds, stored the weights quantised and treated the quantised network as the object measured, so the page and Python agree exactly.
- A rule for **diagrams that are not data** (the MuZero stepper): we labelled it "a diagram, not data" in the card.
