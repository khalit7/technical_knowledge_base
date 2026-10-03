# Reading tab visuals: what was built, why, and what each reproduces

The page's question: what stands in for the expectation in the Bellman equation, and what does that choice cost in bias, variance, data and compute? Each visual makes one step of that measurable, at the moment the text introduces it. Scores follow `html_utils/interactive-html-ideas.md` section 2 (0 to 2 per question; reproduction and computability count double; +1 for a before/after animation).

| Visual (id) | Section | What it shows | Reproduces | Score |
|---|---|---|---|---|
| Spine table (`rd-spine`) | One screen | Every method against what stands in for the expectation; rows jump to sections | The old page's table | static |
| Discount weights (`rd-disc`) | 3 | γ^k bars, horizon 1/(1 − γ), half-weight point | Derived formulas | 6 |
| Monte Carlo sampler (`rd-mc`) | 4 | Seeded episodes of the student MRP; running mean against the exact value | Silver L2 values (independently) | 11 |
| Student diagram (`rd-sm`) | 5 | MRP, uniform-policy MDP and optimal MDP on one diagram; γ slider; click a state for its Bellman equation with numbers | Silver L2 tables at γ 0, 0.9, 1; corrects Q*(Pub) 8.4 to 9.4 | 14 |
| Bandit (`rd-bd`), animation | 7 | Greedy, ε-greedy, optimistic and UCB on one pre-drawn reward table; regret curves of all four | Illustrative (arms and seeds) | 11 |
| Value iteration against Q-learning (`rd-gw`), before/after animation | 8 | The same 4×3 world solved by sweeps with the model and learned from samples | AIMA Figure 17.3 utilities exactly (independently) | 16 |
| One episode, every target (`rd-one`), animation | 10 | MC, TD, two-step, λ-return, DP, REINFORCE, actor-critic and GRPO on one episode; ten sliders | The old page's worked numbers exactly | 15 |
| The dial (`rd-dl`) with predict-reveal | 10 | Exact bias², variance and MSE against λ for a critic error | The old embed's Explore "dial" | 12 |
| Deadly triad (`rd-tr`), before/after animation | 11 | w → 2w off-policy against on-policy | Sutton and Barto §11.2 factor 1 + α(2γ − 1) | 13 |
| Maximisation bias (`rd-mx`) | 12 | E[max of N noisy zero estimates] against the double estimator | 0.846 (N = 3), 1.539 (N = 10), matching the Deep RL page | 9 |
| Policy gradient with and without a baseline (`rd-pgc`), before/after animation | 13 | One softmax policy, same random draws, 60 updates; 200-run percentile bands; reward offset | Deep RL page's static example (gradient, variance 7.56 to 1.56) | 15 |
| PPO clip (`rd-pp`), before/after animation | 14 | Objective against ratio; ten epochs on one sample with and without the clip; the overshoot | PPO Table 1 is quoted, not recomputed | 13 |
| GRPO group (`rd-gr`), animation | 18 | Sample, score, statistics, advantages, per-token spread; GRPO, Dr. GRPO, RLOO; clickable scores | Old page's +1.732/−0.577; Dr. GRPO's +3.873 against +1.000 | 14 |
| Which family when (`rd-tree`) | After 18 | Decision tree with 13 leaves, table underneath | The old embed's Explore tree, extended | static |

Defaults that reproduce published figures, all independently (from the stated model, not fitted): Silver's student MRP and MDP values; AIMA's 4×3 utilities (0.812, 0.868, 0.918 / 0.762, 0.660 / 0.705, 0.655, 0.611, 0.388); the old page's worked episode; the Deep RL page's softmax-baseline numbers; the Dr. GRPO difficulty-bias numbers. Illustrative and labelled: bandit arm means, the Q-learning step size and starts, the PPO toy, GRPO response lengths, the dial's chain.

Rejected or left to other tabs: random walk, cliff walking and Sutton and Barto's gridworlds (the Estimator lab owns them); an MCTS animation (cost against what it teaches beyond the text; the milestones tab carries the results); a DQN ablation chart (Extended Data Table 3 is an image in the PDF; the method forbids reading values off images); PPO against GRPO memory (built on Topic: llm-training-and-post-training, linked); KL leash (built there, linked); a quiz and flashcards like the old embed's (every answer is in the text; the one predict-reveal that teaches, the λ question, is kept).

`recompute.py` is an independent implementation in Python (same mulberry32 random numbers bit for bit); `check_engine.mjs` runs the page's `parts/21_js_rd_engine.js` in Node and compares every value in `expected.json`.
