# Estimator lab (tab `t-lab`): ideas, scores, decisions

Question the tab makes measurable: the page's through-line, one target (the expected return) and many estimators of it. Each experiment puts two estimators of the same target side by side on the same experience, and its defaults are the settings of a figure in Sutton and Barto, *Reinforcement Learning: An Introduction*, 2nd ed., 2018 ([book page](https://incompleteideas.net/book/the-book-2nd.html), [PDF](https://incompleteideas.net/book/RLbook2020.pdf); PDF page = book page + 22).

Khalid's choice (2026-10-03): classic tabular RL run live, seeded and deterministic, defaults reproducing the book's figures, said independently or by construction, and saying plainly where a figure does not reproduce; values never read off figure images.

## Scores (Methodology, section 2 of `html_utils/interactive-html-ideas.md`)

Columns: parameter the reader moves; reproduces a stated figure (x2); computable from public data (x2); shows what a sentence cannot; corrects a misconception; measures the central question; absent from the page and the main explainers; step-by-step or before/after animation; build cost (subtracted).

| # | Idea | Param | Repro x2 | Comp x2 | Shows | Misc. | Central | Absent | Anim | Cost | Total | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LB-1 | **Model or samples** (Example 4.1, Figure 4.1): the 4 x 4 gridworld, two panels, each running policy evaluation, value iteration, policy iteration (expected updates) or TD(0) / Monte Carlo (sampled updates), equal work per frame (56 look-ups or 56 sampled steps), values to two significant digits, greedy arrows, error chart, live check of every printed value of Figure 4.1 | 2 | 4 | 4 | 2 | 1 (the greedy policy is optimal long before the values converge) | 2 | 1 | 2 | -1 | 17 | built |
| LB-2 | **TD or Monte Carlo** (Example 6.2, Figure 6.2): the same walks through TD(0) and constant-alpha MC step by step (caption with the arithmetic of each update), the book's left-graph snapshots at 0, 1, 10, 100 episodes, then the right graph averaged over 100 runs, online and batch | 2 | 2 (shape) | 4 | 2 | 2 (batch MC is optimal on the data seen yet loses) | 2 | 1 | 2 | -1 | 16 | built |
| LB-4 | **Whose next action** (Example 6.6): Sarsa and Q-learning (or Expected Sarsa) on the cliff side by side, episode by episode or step by step, Q shading, greedy arrows, trails with falls; averaged return curves; exact epsilon-greedy value of the optimal path by policy evaluation | 2 | 2 (shape + an exact independent check) | 4 | 2 | 2 (Q-learning "learns the optimal policy" yet earns less) | 2 | 1 | 2 | -1 | 16 | built |
| LB-3 | **The dial** (Example 7.1, Figures 7.2, 12.3, 12.6): one 19-state episode through n-step TD and TD(lambda) side by side (which state each update reaches, traces drawn), then error against alpha for every n or lambda, 100 runs, the book's comparison family dashed | 2 | 2 (shape) | 4 | 2 | 1 (more lookahead is not better; lambda = 1 is worst) | 2 | 1 | 2 | -2 | 14 | built |
| LB-5 | 10-armed testbed, epsilon-greedy and UCB (Figures 2.2, 2.4) | 2 | 4 (text numbers: about 1.54 best possible = E[max of 10 normals] = 1.539; at most 91% optimal for epsilon = 0.1; greedy finds the best arm in about a third of tasks) | 4 | 1 | 1 | 0 (one state, no bootstrapping: exploration, not the estimator through-line) | 1 | 1 | -1 | 13 | rejected: lowest on the page's question; exploration belongs to the Reading tab and the Model-free child page; a fifth experiment would lengthen the tab past what a root page needs |
| LB-6 | Expected Sarsa across alpha (Figure 6.3, interim and asymptotic) | 2 | 2 | 4 | 1 | 1 | 1 | 1 | 0 | -2 | 10 | rejected: the asymptotic curve needs 100,000 episodes per setting, too slow on a phone; Expected Sarsa is offered as a third agent in LB-4 instead |
| LB-7 | Maximization bias, Q-learning against Double Q-learning (Figure 6.5) | 2 | 2 | 4 | 2 | 2 | 1 | 1 | 1 | -1 | 14 | not built: not on Khalid's list; a strong candidate for the Model-free methods child page |
| LB-8 | Value iteration against policy iteration as a separate experiment | | | | | | | | | | | merged into LB-1 as method choices (VI: 3 sweeps; PI: 179 frames, almost all evaluating the random policy) |
| LB-9 | Blackjack Monte Carlo surfaces (Figures 5.1, 5.2); windy gridworld (Example 6.5) | | | | | | | | | | | rejected: 3-D surfaces are images only and belong to the child page; windy gridworld repeats Sarsa with nothing to compare |

## What reproduces (see `check_result.json`)

- Figure 4.1: independently. 92 of 96 printed values match at two significant digits (synchronous sweeps; in-place sweeps do not match). The four misses are the exact -1.75 at k = 2 printed -1.7, while the figure prints -2.875 as -2.9: a rounding slip in the figure. Caption claim checked: greedy optimal from k = 3, not at k = 2.
- Example 6.2: shape. Every TD curve below every MC curve at 100 of 100 episodes; Exercise 6.5's down-then-up at alpha = 0.15 (minimum 0.053 at episode 23, 0.072 at 100). Starting error sqrt(1/18) = 0.236 computed.
- Figure 6.2: shape. Batch TD at or below batch MC at all 100 episodes, strictly from episode 2 (equal after one episode by construction). After one episode both are 0.412, above the figure's 0.25 axis top: the book's plot is cut off there (not stated).
- Figure 7.2: shape. Best n = 4 (0.278 at alpha = 0.35); best alpha falls as n grows; every curve starts at sqrt(0.3) = 0.548 (axis top 0.55).
- Figure 12.3: shape. Best lambda = 0.8 (0.2773) slightly better than best n-step (0.2782), and better at alpha = 1 (0.335 against 0.394), as the caption says.
- Figure 12.6: partly. TD(lambda) worse at alpha = 1 for every lambda from 0.8, diverging for lambda >= 0.9 (caption). "Virtually identical" below the best alpha does not hold exactly: gaps up to 0.031 (on-line against off-line updates; nonzero even at lambda = 0).
- Example 6.6: shape. Sarsa -27.4 against Q-learning -50.3 over episodes 401 to 500 (100 runs, alpha = 0.5 assumed: the book does not state alpha or runs). Q-learning's greedy path 13 steps in 100/100 runs; Sarsa's longer in 84 (17: 73, 19: 10, 21: 1; 16 loop through unvisited cells). Exact epsilon-greedy return around the optimal path -50.80 (policy evaluation, also by linear solve), matching Q-learning's simulated -50.3.

## Implementation decisions

- One engine file (`parts/32_js_lab_a.js`) with no DOM, loaded in Node by `dump_js.mjs`; `check.py` ports it line by line and matches every number bit for bit (mulberry32 streams keyed by seed, purpose and run; the same floating-point order).
- Batch updating is computed at its fixed point (sample means for MC; certainty equivalence by Gaussian elimination for TD); `check.py` replays batches with alpha = 0.001 to the same values within 5e-10.
- The off-line lambda-return takes targets from the values at the start of the episode (the weights do not change during the episode) and applies equation 12.4 in time order. Other readings exist (Zhang's reproduction recomputes targets with the values as they are updated); the difference is small and stated on the page.
- alpha grid for the 19-state sweeps: 0, 0.01 to 0.05, 0.075, 0.1, then 0.15 to 1 in steps of 0.05 (26 values), finer near 0 where the curves for large n and lambda rise steeply.
- Equal work per frame in LB-1 (one sweep = 14 states x 4 moves = 56 model look-ups against 56 sampled steps) so the two kinds of update are compared fairly.

## Rejected visuals within the built experiments

- An in-place DP option for Figure 4.1: its intermediate values do not match the figure (checked) and would confuse the reproduction.
- Plotting the cliff curves without the book's -100 floor: early episodes cost several hundred and would flatten the part the book shows.
- A 3-D surface of error over (n, alpha): harder to read than the book's family of curves, which the tab redraws.

## What the methodology lacked here

A rule for experiments whose published results are stochastic curves with no printed values: the shapes and orderings the text states become checks computed live on the page (with the count of episodes or runs where each holds), and the page states which claims are only checked in shape.
