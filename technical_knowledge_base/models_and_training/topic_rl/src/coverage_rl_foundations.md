# Coverage: RL foundations (folded into Topic: rl)

Source: `src/live_rl_foundations.md`, the Notion page "RL foundations" (3c65c17b0d0d810b8c5ce46696baf31f) fetched read-only on 2026-10-03 (text as of 2026-09-30). Khalid's decision: the page is folded into the root's Reading tab. Every fact below is carried; section ids are in `#t-read`.

| # | Fact in RL foundations | Where it is now |
|---|---|---|
| 1 | Embed "Interactive: RL foundations"; "23 min read · +5h 50m resources" | Superseded by the root page; resources in `#t-more` |
| 2 | RL definition: agent, environment, action, observation, scalar reward, maximise total reward over time; nobody says the correct action | `rd-over` |
| 3 | Three differences from supervised learning: score not label; delayed feedback and credit assignment; actions decide the data (not fixed, not independent) | `rd-what` list |
| 4 | Scope: the vocabulary and skeleton every RL page reuses; the classifying distinctions; RLHF and RLVR treat token generation as an MDP | `rd-over`, `rd-loop` (LLM case), `rd-llm` |
| 5 | Loop at step t (Silver L1): receive O_t and R_t, execute A_t, environment emits O_{t+1}, R_{t+1}; reward after A_t is R_{t+1}; Silver and Sutton-Barto indexing; r_t convention shifts the subscript | `rd-loop` |
| 6 | Silver's examples: helicopter stunts, backgammon, Atari | `rd-what` |
| 7 | Learning (unknown environment, interact) against planning (known model, compute; tree search over known rules) | `rd-what` last paragraph |
| 8 | Reward: scalar feedback; maximise cumulative not immediate; refuelling helicopter, investment examples | `rd-what` |
| 9 | Reward hypothesis: an assumption; LLM goals have no definition, so a proxy (RM, test suite, LLM judge); shortcuts: length, agreeing with wrong claims, special-casing tests; reward hacking page | `rd-what`, `rd-llm` reward-hacking subsection |
| 10 | History H_t formula; ends with O_t, R_t, excludes A_t; grows without bound | `rd-loop` formula box |
| 11 | State is any function of history; environment state (private, may be irrelevant, for reasoning about the environment) and agent state (the agent's summary, what algorithms use) | `rd-loop` |
| 12 | Markov property formula and gloss; sufficient statistic; environment state and full history are Markov; design problem: compact Markov agent state; single Atari frame not Markov, DQN stacks frames | `rd-loop` (with the DQN paper link for the four-frame stack) |
| 13 | Fully observable: O_t = S^a = S^e, MDP, most theory | `rd-loop` |
| 14 | Partially observable: robot camera, trading agent, poker; POMDP; agent state choices: full history, belief vector, RNN state formula with σ, W_s, W_o | `rd-loop` |
| 15 | LLM: full-prefix decoder is the S^a = H_t choice; nothing hidden; generation is a fully observable MDP | `rd-loop` |
| 16 | Student chain states (Class 1, 2, 3, Pass, Pub, Facebook, Sleep terminal), Silver L2 | `rd-mdp` |
| 17 | Markov process ⟨S, P⟩, P_ss′ formula, rows sum to 1; every transition probability of the student chain | `rd-mdp` (all probabilities verbatim) and the diagram `#rd-sm` |
| 18 | MRP ⟨S, P, R, γ⟩, R_s definition; rewards −2 per class, Facebook −1, Pub +1, Pass +10, Sleep 0 | `rd-mdp` |
| 19 | MDP ⟨S, A, P, R, γ⟩, P^a and R^a formulas; agency the only new ingredient; every action of the student MDP with reward and successor | `rd-mdp` and `#rd-sm` (MDP modes) |
| 20 | Policy π(a given s); fixing a policy gives an MRP with P^π and R^π formulas | `rd-mdp` |
| 21 | Return G_t formula, γ meaning, myopic and far-sighted, weights sum to 1/(1 − γ): 0.9 about 10, 0.99 about 100; episodic sum stops | `rd-ret` and the discount slider `#rd-disc` |
| 22 | Why discount: cycles, uncertainty, convenience (contractions), preference | `rd-ret` ordered list |
| 23 | γ = 1 fine when every sequence terminates; LLM RL uses γ = 1 | `rd-ret` |
| 24 | Worked returns: Class 1, 2, 3, Pass, Sleep at γ ½ gives −2.25; Class 1, Facebook, Facebook, Class 1, Class 2, Sleep gives −3.125; return random, value its average | `rd-mdp` and the sampler `#rd-mc` |
| 25 | V in an MRP; V_π and Q_π definitions with glosses | `rd-val` |
| 26 | V = Σ π Q; Q = R + γ Σ P V (needs the model) | `rd-val` |
| 27 | Q is what you want for model-free control (argmax lookup) | `rd-val` |
| 28 | Optimal V_* and Q_*; argmax Q_* is optimal; an optimal policy exists, better in every state, and a deterministic one exists | `rd-val` |
| 29 | Bellman: one-step pieces; derivation from G_t = R + γG_{t+1}; Markov allows replacing the tail; MRP form | `rd-val` |
| 30 | Bellman expectation equations for V_π and Q_π, linear; matrix form and (I − γP^π)^{-1}R^π; O(n³), only small problems | `rd-val` |
| 31 | Bellman optimality equations for V_* and Q_*; max makes them nonlinear; solved iteratively by VI and PI with a model, Q-learning and SARSA with exploration decaying to greedy without | `rd-val` |
| 32 | "Everything downstream ... is a way of approximately solving one of these equations" | `rd-val` (bold) |
| 33 | Student MRP values table at γ 0, 0.9, 1 for six states | `#rd-sm` computes every cell exactly (γ slider; reproduces the table); `rd-val` text quotes −12.5, −22.5, 1.5, 4.3, 0.8 |
| 34 | γ = 0 values equal immediate rewards; Facebook at γ 1: 10 steps at −1 then Class 1 at −12.5, total −22.5; Silver rounds to −13 and −23 | `rd-val` and the widget's note |
| 35 | Bellman check at Class 3: −2 + 1 × (0.6 × 10 + 0.4 × 0.8) = 4.32 | `rd-val` (and the widget shows it when Class 3 is clicked) |
| 36 | Uniform policy V_π: −1.3, 2.7, 7.4, −2.3, with the Class 3 check | `rd-val` list and `#rd-sm` uniform mode |
| 37 | Optimal V_*: 6, 8, 10, 6, with all eight action values | `rd-val` list and `#rd-sm` optimal mode |
| 38 | One improvement step: Q_π values 0.69 / −3.31, 5.38 / 0, 10 / 4.77, −1.31 / −3.31; greedy gives the optimal policy; prediction serving control | `rd-val` list and the uniform-mode caption |
| 39 | Optimal policy Study, Study, Study, Quit; Q_* needs no model, V_* would need 0.2, 0.4, 0.4 | `rd-val` |
| 40 | Silver prints Q_*(Pub) 8.4; arithmetic gives 9.4; Study still wins | `rd-val` correction box |
| 41 | Agent components: policy (deterministic or stochastic; an LLM is a stochastic token policy), value function, model (transition and reward model with hats); LLM "reward model" meaning, not planned with | `rd-agent` |
| 42 | Taxonomy by what is stored (value-based, policy-based with REINFORCE description, actor-critic) and by model use (model-free list, model-based: DP, AlphaZero, MuZero); axes independent | `rd-agent` |
| 43 | Table of 8 algorithms (value iteration, SARSA, Q-learning, DQN, REINFORCE, A2C, PPO, GRPO) with stores, model, learns from | `rd-agent` table (all 8 rows, plus TRPO, DDPG/TD3/SAC, AlphaZero, MuZero) |
| 44 | Exploitation and exploration definitions; restaurant, oil, game-move examples; balance; pure exploitation stuck, pure exploration never cashes in | `rd-band` |
| 45 | Multi-armed bandit: an MDP with a single state | `rd-band` |
| 46 | ε-greedy formula with ε/m; ε 0.1, m 4 gives 0.925 and 0.025 (Silver L5) | `rd-band` |
| 47 | GLIE definition; on the model-free page | `rd-band`, `rd-samp` |
| 48 | Optimistic initialisation; entropy bonuses; temperature and sampling diversity in LLM rollouts (around 1, spread of rewards for GRPO) | `rd-band` (optimistic agent also run live in `#rd-bd`) |
| 49 | Prediction (evaluate V_π, Q_π) and control (find π_*); solve prediction to solve control; policy evaluation, policy iteration, value iteration with a model; MC and TD for prediction, SARSA and Q-learning for control without | `rd-agent` paragraph, `rd-plan`, `rd-samp` |
| 50 | Bootstrapping and sampling definitions (Silver L4 unified view), depth and width | `rd-samp` |
| 51 | Three targets DP, TD, MC side by side; the sampling update | `rd-samp` (2×2 table with targets) and the incremental-update box |
| 52 | 2×2 table: DP, TD, exhaustive search, MC | `rd-samp` table |
| 53 | Bootstrapping buys lower variance and early updates, costs bias; sampling buys model independence, costs variance; student example −2.25 or −3.125 against −2 + ½V(Class 2) | `rd-samp` |
| 54 | On-policy ("learn on the job") and off-policy ("look over someone's shoulder") with target π and behaviour μ; four uses (Silver L5) | `rd-samp` |
| 55 | Importance sampling ratio formula and the expectation identity; example ρ = 2 and weight 0; ratios multiply, off-policy MC high variance; one-step Q-learning needs no ratio | `rd-samp` |
| 56 | LLM: PPO and GRPO rollouts from a stale copy, inference engine probabilities differ, mildly off-policy, the per-token clipped ratio is this correction | `rd-samp` last paragraph, `rd-llm` |
| 57 | Trade-offs: value/policy/actor-critic (incl. PPO-RLHF value model as large as the policy, what GRPO deletes); model-free/model-based (compounding errors; known small DP, known huge search, unknown learn or MuZero); MC/TD; on/off-policy; the discount (horizon, variance, slower convergence) | `rd-when` details paragraph and table; `rd-ret` for the discount |
| 58 | Common mistakes: reward is not value (Class 2 example); observation is not state; history excludes the action; greedy on V needs a model; optimality equation not linear; γ = 1 not always wrong; on-policy not online; LLM reward model not model-based; reward hypothesis an assumption | `rd-wrong` (all nine) |
| 59 | How it connects: Topic: rl, DP, model-free, deep RL, RL for LLMs (token MDP description), reward hacking | `#t-more` (children and neighbours with descriptions) |
| 60 | Best resources: Silver lectures 1 and 2 (3h), Sutton and Barto chapters 1 to 3 (2h), Weng "Long Peek" (~35 min), Spinning Up Key Concepts (~15 min) | `#t-more` (Silver and Sutton-Barto entries name these parts and times; Weng 35 min; Spinning Up entry names Key Concepts, 15 min) |

Nothing was dropped. Additions beyond the old page: Silver's examples of state construction are kept as given; Sutton and Barto page anchors added; the MRP, MDP and return examples are computed live and checked against `read/recompute.py`.
