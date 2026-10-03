# Coverage: RL foundations (folded into Topic: rl)

Source: `src/live_rl_foundations.md` (3c65c17b0d0d810b8c5ce46696baf31f, text as of 2026-09-30). Since Khalid's instruction of 2026-10-04 the root's Reading tab is an intuitive overview, so most of this page's worked material moves to child pages. Each fact is either in the root (id in `#t-read`, or a root tab) or **moved to a child page**, with its full text and widgets archived in `src/for_children/reading_full/` ("archive", with the long tab's section ids) and the checks in `src/for_children/reading_full_checks/`.

Proposed owners among the approved children: **Bandits** = Bandits and exploration; **DP** = Dynamic programming; **MF** = Model-free prediction and control. The foundations material without a natural child (history, observability, MRP, Bellman equations in full, the student examples) is assigned to **DP**, the first classical child, unless Khalid prefers otherwise.

| # | Fact | Where it is now |
|---|---|---|
| 1 | Embed; 23 min read | Superseded |
| 2 | RL definition | `rd-over` |
| 3 | Score not label; delayed feedback and credit assignment; actions decide the data | `rd-what` |
| 4 | Scope; RLHF and RLVR treat generation as an MDP | `rd-over`, `rd-llm` |
| 5 | Loop at step t; R_{t+1} indexing; r_t convention | `rd-loop` (indexing stated); r_t convention moved to DP (archive `rd-loop`) |
| 6 | Helicopter, backgammon, Atari | `rd-what` |
| 7 | Learning against planning | `rd-what` |
| 8 | Cumulative reward; refuelling and investment examples | `rd-what` (refuelling); investment moved to DP (archive `rd-what`) |
| 9 | Reward hypothesis, proxies, reward hacking | `rd-what` |
| 10 | History H_t formula | Moved to DP (archive `rd-loop`); `rd-loop` says the agent summarises what it has seen |
| 11 | Environment state against agent state | Moved to DP (archive `rd-loop`) |
| 12 | Markov property; Atari frame; DQN frame stack | `rd-loop` (intuitive); formula moved to DP (archive) |
| 13 | Fully observable, MDP | `rd-loop` |
| 14 | Partially observable examples; POMDP; history, belief and RNN states | `rd-loop` (poker, robot; agent builds its state); belief and RNN formulas moved to DP (archive) |
| 15 | LLM generation is fully observable | `rd-loop` |
| 16 to 19 | Student chain, MRP, MDP with every probability and reward | MDP named and defined in `rd-loop`; the student example ("a lecture costs −2 yet the state is worth +1.5") in `rd-loop`; every probability and reward moved to DP (archive `rd-mdp`, widget `rd-sm`) |
| 20 | Policy; fixing a policy gives an MRP | Policy in `rd-loop`; the MRP reduction moved to DP (archive) |
| 21 | Return, γ, 1/(1 − γ) horizons | `rd-loop` |
| 22 | Four reasons to discount | `rd-loop` (finiteness, convergence); uncertainty and preference moved to DP (archive `rd-ret`) |
| 23 | γ = 1 for terminating tasks and LLM RL | `rd-loop`, `rd-wrong` |
| 24 | Sampled returns −2.25 and −3.125 | Moved to DP (archive `rd-mdp`, sampler `rd-mc`) |
| 25, 26 | V_π and Q_π definitions; V = ΣπQ, Q = R + γΣPV | Definitions in `rd-loop`; relations moved to DP (archive `rd-val`) |
| 27 | Q for model-free control | `rd-loop` |
| 28 | Optimal values; deterministic optimal policy exists | Optimality equation named in `rd-idea`; existence results moved to DP (archive `rd-val`) |
| 29 | Bellman derivation from the return recursion | `rd-idea` (in words and one equation) |
| 30, 31 | Expectation and optimality equations, linearity, matrix solution, O(n³), nonlinearity | Moved to DP (archive `rd-val`); `rd-idea` keeps the expectation equation and the max version in words |
| 32 | "Everything downstream solves one of these equations" | `rd-idea` (the one idea) |
| 33 to 40 | Student MRP table, Facebook −22.5, Class 3 check, uniform and optimal V and Q, one-step improvement, Q* needs no model, Silver's 8.4 against 9.4 | Moved to DP (archive `rd-val`, widget `rd-sm`, correction box); `rd-loop` keeps "reward is not value" with Class 2's −2 and +1.5 |
| 41 | Agent components: policy, value, model; LLM reward model is not a planning model | Three axes in `rd-fam`; reward model point in `rd-wrong`; component definitions in `#t-tax`; archive `rd-agent` |
| 42, 43 | Taxonomy and the 8-row table | `#t-tax`, `#t-atlas`; `rd-fam` intro |
| 44, 45 | Exploration against exploitation; restaurant and oil examples; bandit as single-state MDP | `rd-what`, `rd-f-band`; the everyday examples moved to Bandits (archive `rd-band`) |
| 46 | ε-greedy formula, 0.925 and 0.025 | ε-greedy in `rd-f-band`; formula and numbers moved to Bandits (archive) |
| 47 | GLIE | Moved to MF (existing Model-free page already has it); named in the `rd-f-band` Go deeper note |
| 48 | Optimistic initialisation, entropy bonuses, temperature in LLM rollouts | `rd-f-band` |
| 49 | Prediction against control; evaluate then improve | `rd-f-plan` (evaluate a little, improve a little); definitions moved to DP (archive `rd-agent`) |
| 50 to 53 | Bootstrapping and sampling; three targets; 2×2 table; costs; student example | `rd-idea` spine table and `rd-f-samp` ("bootstrapping"); the 2×2 table and examples moved to MF (archive `rd-samp`) |
| 54, 55 | On- and off-policy; importance sampling with ρ = 2 example; one-step Q-learning needs no ratio | `rd-f-samp` (both, intuitively); formula and example moved to MF (archive `rd-samp`) |
| 56 | LLM RL mildly off-policy; clipped ratio is this correction | `rd-f-samp` (PPO's and GRPO's ratios are this correction) |
| 57 | Trade-offs | `rd-when` |
| 58 | Nine common mistakes | `rd-wrong` keeps reward/value, observation/state, γ = 1, on-policy/online, reward model; history-excludes-action, greedy-on-V, optimality-not-linear moved to DP (archive `rd-wrong`); reward hypothesis in `rd-what` |
| 59 | How it connects | `#t-more` |
| 60 | Best resources | `#t-more` |
