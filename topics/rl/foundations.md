# RL foundations

⏱ 8 min read · +5h 50m resources

### Best resources

- David Silver's UCL course, Lectures 1-2 (Intro, MDPs): [https://www.davidsilver.uk/teaching/](https://www.davidsilver.uk/teaching/) (3h): the source most of this page's framing comes from; slides plus YouTube videos.
- Sutton & Barto, *Reinforcement Learning: An Introduction*, Chapters 1-3: [http://incompleteideas.net/book/the-book-2nd.html](http://incompleteideas.net/book/the-book-2nd.html) (2h): free PDF, the canonical treatment of MDPs and Bellman equations.
- Lilian Weng, "A (Long) Peek into Reinforcement Learning": [https://lilianweng.github.io/posts/2018-02-19-rl-overview/](https://lilianweng.github.io/posts/2018-02-19-rl-overview/) (~35 min): the best single-page compression of everything below.
- Spinning Up, "Key Concepts in RL": [https://spinningup.openai.com/en/latest/spinningup/rl_intro.html](https://spinningup.openai.com/en/latest/spinningup/rl_intro.html) (~15 min): crisp notation reference.

### Definition

RL is a type of machine learning where an agent learns to make decisions by interacting with an

environment: it takes actions, and receives feedback as rewards (positive) or penalties (negative).

At each step t the agent executes action A_t, receives observation O_t, and receives scalar reward R_t.

### Reward and the reward hypothesis

- A reward R_t is a scalar feedback signal for how well the agent is doing at step t, and the
  agent's job is to maximise cumulative, not immediate, reward.

- RL rests on the **reward hypothesis**: all goals can be described as the maximisation of an
  expected cumulative scalar reward. This is an assumption, and it is exactly the assumption that

  breaks in interesting ways for LLMs (see [Reward Hacking](../llm-training-and-post-training/reward-hacking.md)).

### History and state

- The **history** H_t = (A_1, O_1, R_1), ..., (A_t, O_t, R_t) is everything seen so far. The next
  action depends only on H_t, but the history is unwieldy.

- A **state** is a summary of the history: S_t = f(H_t), with enough information to determine the
  next action. Two kinds:

  1. **Environment state**: the environment's private internal state. Useful for us to reason about
     the environment, but the agent cannot use it as an information source.

  2. **Agent state**: the agent's own summary of the history, S_t = f(H_t); this is what the agent
     actually conditions its next action on.

- **Markov property**: a state is Markov if the future depends only on the current state, not the
  rest of the history. A good state definition contains enough information to make this true.

### Observability

- **Fully observable**: the agent sees the environment state directly, so
  O_t = agent state = environment state. This is the MDP setting.

- **Partially observable (POMDP)**: the agent sees only part of the environment state, so agent
  state and environment state differ and the agent must construct its own representation, e.g.:

  - S_t = H_t (use the full history as state), or
  - a learned recurrent summary, S_t = sigma(W_s S_{t-1} + W_o O_t): an RNN state.
  LLM connection: a decoder conditioning on its full token prefix is the "S_t = H_t" choice.

### What an RL agent may contain

An agent might have any subset of three components:

- **Policy** pi: the behaviour function, a map from state to action (deterministic a = pi(s), or
  stochastic pi(a|s)).

- **Value function**: a prediction of expected future reward; how good each state (or state-action
  pair) is.

- **Model**: the agent's representation of the environment, predicting what the environment does next:
  - transition model: predicts the next state, P(s'|s,a);
  - reward model: predicts the next immediate reward, R(s,a).

### Taxonomy of RL agents

By what is stored:

1. **Value-based**: store a value function only; the policy is implicit (act greedily with respect
   to the values). Example: Q-learning, DQN.

2. **Policy-based**: store the policy directly, never an explicit value function. Example: REINFORCE.
3. **Actor-critic**: store both a policy (actor) and a value function (critic). Example: A2C, PPO.
By use of a model:

1. **Model-free**: do not try to explicitly model the environment; go directly from experience to a
   policy or value function.

2. **Model-based**: build a model of the environment, then plan or simulate with it to predict how
   the environment responds to actions.

### Exploration vs exploitation

- **Exploitation**: use current knowledge to take the action believed best, maximising reward now.
- **Exploration**: deliberately try actions that look suboptimal to gather information that may pay
  off later.

- Every RL agent must balance the two: pure exploitation gets stuck on the first decent behaviour
  it finds; pure exploration never cashes in. Standard mechanisms: epsilon-greedy (see

  [Model-free methods: Monte Carlo, TD, SARSA, Q-learning](model-free-methods.md)), optimistic initialisation, entropy bonuses (deep RL),

  and temperature/sampling diversity in LLM rollouts.

### Prediction vs control

- **Prediction**: given a fixed policy, how much reward will I get? (Evaluate pi: compute V_pi.)
- **Control**: find the optimal policy.
- You typically need to solve prediction to solve control: you must be able to evaluate policies to
  find the best one. Prediction is solved by policy evaluation; control by policy iteration or value

  iteration (see [Dynamic programming: planning with a known model](dynamic-programming.md)).

### Bootstrapping vs sampling

Two independent axes for how a value update is built (Silver's "unified view" diagram):

- **Bootstrapping**: update a value estimate from another value estimate one step ahead
  ("solve one step, then trust your own answer for the rest"). Depth of update = 1 step.

  Dynamic programming and TD both bootstrap.

- **Sampling**: estimate expectations from sampled trajectories rather than full expectations over
  all successors. Width of update = 1 trajectory. Monte Carlo and TD both sample.

The 2x2: TD samples and bootstraps (depth 1, width 1); DP bootstraps without sampling (depth 1,

full width); Monte Carlo samples without bootstrapping (full depth, width 1); exhaustive search

does neither (full depth, full width).

### On-policy vs off-policy

- **On-policy**: learn about policy pi from experience sampled from pi itself.
- **Off-policy**: learn about pi from experience sampled from a different behaviour policy mu.
  Useful for: learning from human demonstrations; reusing old policies' data (replay buffers);

  learning a greedy target policy while behaving exploratorily; learning about multiple policies

  from one stream of behaviour.

- LLM connection: GRPO/PPO rollouts generated by a slightly stale policy make LLM RL mildly
  off-policy; importance ratios are the correction (see [RL for LLMs: RLHF, GRPO, RLVR](rl-for-llms-rlhf-grpo-rlvr.md)).

### Value functions: V and Q

1. **State value function** V_pi(s) = E[G_t | S_t = s]: expected return from state s under policy pi.
2. **Action value function** Q_pi(s,a) = E[G_t | S_t = s, A_t = a]: expected return from taking
   action a in state s, then following pi. Q is what you want for model-free control: choosing

   argmax_a Q(s,a) needs no environment model, whereas acting greedily on V requires knowing the

   transition dynamics.

### Markov process to MRP to MDP

Build up in three steps:

1. **Markov process (Markov chain)**: (S, P). States plus transition probabilities; the future
   depends only on the current state.

2. **Markov reward process (MRP)**: (S, P, R, gamma). Same, plus a reward attached to transitions.
   Defines the discounted return G_t = R_{t+1} + gamma R_{t+2} + gamma^2 R_{t+3} + ...

   and the value function V(s) = E[G_t | S_t = s].

3. **Markov decision process (MDP)**: (S, A, P, R, gamma). Same as an MRP, except you do not move
   between states randomly: an action moves you. The only new ingredient is agency.

**Why discount (gamma < 1)?**

1. Cycles: avoids infinite returns in cyclic or infinite-horizon processes.
2. Uncertainty: the future is less certain than the present, so weight it less (be a bit greedy).
Also mathematically convenient: makes the Bellman operator a contraction, guaranteeing convergence.

### Bellman equations

The Bellman equation breaks a long-horizon problem into recursive one-step pieces: the value of a

state is the immediate reward plus the discounted value of the successor state. Starting from

V(s) = E[G_t] = E[R_{t+1} + gamma R_{t+2} + ...], bootstrap the tail:

- **Bellman expectation equation** (for a fixed pi):
  V_pi(s) = E_pi[R_{t+1} + gamma V_pi(S_{t+1}) | S_t = s]

  Q_pi(s,a) = E[R_{t+1} + gamma E_{a'~pi} Q_pi(S_{t+1}, a') | S_t = s, A_t = a]

  Linear in V; solvable exactly (matrix inversion) for small MRPs, iteratively otherwise.

- **Bellman optimality equation** (for the optimal policy):
  V*(s) = max_a E[R_{t+1} + gamma V*(S_{t+1}) | S_t = s, A_t = a]

  Q*(s,a) = E[R_{t+1} + gamma max_{a'} Q*(S_{t+1}, a') | S_t = s, A_t = a]

  Nonlinear (because of the max); no closed form; solved iteratively by value iteration, policy

  iteration, Q-learning, or SARSA (the next two pages).

Everything downstream, from value iteration to DQN's TD target to the value model in PPO-RLHF, is a

way of (approximately) solving one of these two equations.
