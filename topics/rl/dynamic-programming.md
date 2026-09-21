# Dynamic programming: planning with a known model

⏱ 5 min read · +2h 25m resources

### Best resources

- David Silver's UCL course, Lecture 3 "Planning by Dynamic Programming": [https://www.davidsilver.uk/teaching/](https://www.davidsilver.uk/teaching/) (1h 30m): the clearest walkthrough of policy iteration vs value iteration, with the gridworld demo.
- Sutton & Barto, Chapter 4 "Dynamic Programming": [http://incompleteideas.net/book/the-book-2nd.html](http://incompleteideas.net/book/the-book-2nd.html) (45 min): includes the proof sketches (policy improvement theorem, contraction).
- GridWorld: DP demo (Karpathy's REINFORCEjs): [https://cs.stanford.edu/people/karpathy/reinforcejs/gridworld_dp.html](https://cs.stanford.edu/people/karpathy/reinforcejs/gridworld_dp.html) (~10 min): interactive; watch values propagate.

### Setting

Dynamic programming methods assume a **known MDP**: you have the transition model P(s'|s,a) and

reward function R. That makes them **model-based planning**, not learning. They matter because

(a) they define the ideal that model-free methods approximate by sampling, and (b) DP backups are

the template for every TD target you will ever write.

Both control algorithms below are iterative solutions to the Bellman optimality equation (the

other two from the classical list, SARSA and Q-learning, are the model-free versions in

[Model-free methods: Monte Carlo, TD, SARSA, Q-learning](model-free-methods.md)).

### Policy evaluation (the prediction problem)

Estimate V_pi, the value function (expected long-term reward) of a **given, fixed** policy.

1. Start with an arbitrary (e.g. all-zero) value function.
2. For each state, take one step of the policy and look at where it leads.
3. Update each state's value to the expected one-step return: the immediate reward plus the
   discounted value of the successor states, weighted by their probabilities. This is a synchronous

   sweep applying the Bellman expectation equation as an update rule:

   V_{k+1}(s) = sum_a pi(a|s) [ R(s,a) + gamma sum_{s'} P(s'|s,a) V_k(s') ]

4. Repeat until convergence.
Convergence is guaranteed: the Bellman expectation operator is a gamma-contraction, so iteration

converges to the unique fixed point V_pi from any initialisation.

### Policy iteration (control, with an explicit policy)

Finds the optimal policy by alternating two phases until the policy stabilises:

**policy evaluation** (compute values for the current policy) and **policy improvement**

(make the policy greedy with respect to those values).

1. Start with a random value function and a random policy.
2. Evaluate: for each state, follow the current policy (one or more evaluation sweeps) and update
   each state's value to the expected value of acting under that policy.

3. Improve: update the policy to the greedy policy, pi'(s) = argmax_a [ R(s,a) + gamma E V(s') ].
4. Follow the new policy, evaluate again, improve again.
5. Repeat until the policy stops changing; the fixed point is the optimal policy pi*.
Why it works: the **policy improvement theorem** guarantees the greedy policy is at least as good

as the old one everywhere; with finitely many deterministic policies, strict improvement must stop,

and stopping means the Bellman optimality equation holds.

There is an explicit policy throughout, so this is the policy-flavoured member of the DP pair.

Note: full convergence of evaluation before each improvement is not required; truncating evaluation

to k sweeps still works ("generalised policy iteration"), and k = 1 gives exactly value iteration.

### Value iteration (control, no explicit policy)

Finds the optimal policy by iteratively improving the value estimate of each state directly, with

no policy stored anywhere.

1. Start with an arbitrary value function.
2. For each state, look at **all** possible actions and back up the best one:
   V_{k+1}(s) = max_a [ R(s,a) + gamma sum_{s'} P(s'|s,a) V_k(s') ]

   This is the Bellman optimality equation used as an update; it is classic dynamic programming

   ("answer = best action's immediate reward + best answer for the successor").

3. Repeat until values converge, then read off the optimal policy greedily at the end.
It looks like policy evaluation, but the crucial difference: no policy is being followed. Each

sweep takes a max over all actions rather than an expectation under some pi.

### Policy iteration vs value iteration

|  | Policy iteration | Value iteration |
| --- | --- | --- |
| Flavour | Policy-based (explicit policy stored and improved) | Value-based (no explicit policy until the end) |
| Model needed | Yes: model-based | Yes: model-based |
| Update rule | Bellman expectation equation + greedy improvement | Bellman optimality equation directly |
| Intermediate values | At every step, V corresponds to some actual policy | Intermediate V may correspond to **no** policy; only the final V corresponds to (the optimal) one |
| Per-sweep cost | Cheaper sweeps (expectation under pi), but needs an evaluation loop inside the outer loop | Each sweep maxes over all actions; single loop |
| Typical behaviour | Few outer iterations; policy often stabilises before values fully converge | More iterations, each simple |

Both converge to the same V* and pi*. Complexity per sweep is O(|S|^2 |A|) for V-based backups,

which is why DP needs the full model and small-to-medium state spaces; when the state space is

huge or the model unknown, you sample instead: that is [Model-free methods: Monte Carlo, TD, SARSA, Q-learning](model-free-methods.md).

### Why this still matters for LLM work

- The evaluation/improvement alternation ("generalised policy iteration") is the shape of nearly
  every RL algorithm, including PPO-RLHF: the critic update is approximate policy evaluation, the

  policy-gradient step is approximate policy improvement.

- The one-step backup V(s) <- r + gamma V(s') is the template for TD targets, DQN targets, and GAE.
