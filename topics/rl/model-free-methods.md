# Model-free methods: Monte Carlo, TD, SARSA, Q-learning

⏱ 7 min read · +5h 40m resources

## Best resources

- David Silver's UCL course, Lectures 4-5 ("Model-Free Prediction", "Model-Free Control"): [https://www.davidsilver.uk/teaching/](https://www.davidsilver.uk/teaching/) (3h) ; the driving/near-crash analogy for MC vs TD is from Lecture 4.
- Sutton & Barto, Chapters 5-7 (MC, TD, n-step): [http://incompleteideas.net/book/the-book-2nd.html](http://incompleteideas.net/book/the-book-2nd.html) (2h 15m) ; the random-walk experiments make the MC vs TD trade-off concrete.
- Lilian Weng, "A (Long) Peek into RL", sections on MC/TD/SARSA/Q-learning: [https://lilianweng.github.io/posts/2018-02-19-rl-overview/](https://lilianweng.github.io/posts/2018-02-19-rl-overview/) (~15 min) ; compact equations for everything here.
- GridWorld TD demo (Karpathy): [https://cs.stanford.edu/people/karpathy/reinforcejs/gridworld_td.html](https://cs.stanford.edu/people/karpathy/reinforcejs/gridworld_td.html) (~10 min) ; watch TD learn without a model.

## Model-free vs model-based

The power of model-free RL: you do not need a model of the environment or any understanding of its
dynamics. You just sample from it (interact with it) and figure out the optimal policy from
experience. The price: you can only learn about states you actually visit, which creates the
exploration problem below. Model-based DP (previous file) sweeps all states with known
probabilities; model-free methods replace those expectations with samples.

## Monte Carlo policy evaluation

Core idea: follow the policy for N complete episodes, and average the observed returns to estimate
the value of each visited state. The value function is updated once per episode, after the full
return G_t is known.

- Update: V(S_t) <- V(S_t) + alpha (G_t - V(S_t)); the target is the actual return.
- Unbiased (the target is the true sampled return) but high variance (a whole episode's worth of
  randomness is baked into each G_t).
- Requires **episodic MDPs**: sequential decision problems with a clear start state and terminal
  state, because you must wait for the episode to end before you can compute G_t.

## Temporal-difference (TD) learning

Core idea: update the current state's value from your **estimate** of how good the next state is,
instead of waiting for the real return.

- TD(0) update: V(S_t) <- V(S_t) + alpha (R_{t+1} + gamma V(S_{t+1}) - V(S_t)).
  The bracket is the **TD error**; the target R + gamma V(s') bootstraps off the current estimate.
- Learns from incomplete episodes, so it works on continuing (non-episodic) MDPs.
- Biased (the target uses an estimate) but much lower variance than MC; usually more
  sample-efficient in practice.

### TD(lambda) and the relation to MC

Generalise TD by looking n steps ahead before bootstrapping: the n-step return uses n real rewards
plus the value estimate at step n. TD(lambda) geometrically averages all n-step returns with decay
lambda. The endpoints recover the two pure methods:

- lambda = 0: one-step TD.
- lambda = 1 (equivalently, looking infinitely many steps ahead): Monte Carlo; the "TD" update
  becomes the full sampled return.

So MC and TD are two ends of a single bias-variance dial.

### MC vs TD intuition

Silver's driving analogy: you are driving, a car swerves at you, you nearly crash but do not, and
the episode ends fine. Monte Carlo only sees the final return, so the near-death moment leaves no
trace: the episode ended well, so every state gets credited with a good outcome. TD updates online
from the next state's value: the moment the crash looks imminent, the value estimate plunges, and
the preceding states are immediately updated toward that plunge. TD propagates the "that was
almost a disaster" signal; MC misses it.

| | Monte Carlo | TD |
|---|---|---|
| Target | Actual return G_t | R + gamma V(s') (bootstrapped) |
| Waits for episode end | Yes | No (online) |
| Bias / variance | Unbiased / high variance | Biased / low variance |
| Episodic MDPs required | Yes | No |
| Bootstraps | No | Yes |

## Model-free control: making evaluation + improvement work from samples

Monte Carlo **policy iteration** follows the same two-phase loop as DP policy iteration
(evaluate, then improve), but both phases break when you only sample:

- Evaluation is no longer guaranteed to cover every state: DP sweeps all states; sampling only
  touches the states your trajectories visit.
- Greedy improvement is no longer guaranteed to help, because the values it is greedy over may be
  wrong for unvisited actions: this is the exploration vs exploitation problem showing up in the
  algorithm itself.

Two standard fixes:

1. **Use Q(s,a), not V(s)**, for evaluation. Acting greedily on V requires a model to know where
   each action leads; acting greedily on Q is just argmax over actions you have estimates for.
2. **Epsilon-greedy exploration**: with probability epsilon take a random action, otherwise take
   the greedy action. Decay epsilon over time (be greedier as you have explored more); a schedule
   where every state-action pair is visited infinitely often and the policy converges to greedy is
   called **GLIE** (Greedy in the Limit with Infinite Exploration), and GLIE Monte Carlo control
   converges to Q*.

## SARSA (on-policy TD control)

TD policy iteration: same evaluate/improve loop as MC control, but with TD (one step) as the
evaluation. The update uses the quintuple (S, A, R, S', A'), hence the name:

Q(S,A) <- Q(S,A) + alpha (R + gamma Q(S',A') - Q(S,A))

A' is the action the agent **actually takes next** under its current (epsilon-greedy) policy, so
SARSA is **on-policy**: it learns the value of the policy it is executing, exploration included.
Classification: on-policy, model-free, TD control.

## Q-learning (off-policy TD control)

Same shape, but the bootstrap uses the **best** next action rather than the one actually taken:

Q(S,A) <- Q(S,A) + alpha (R + gamma max_{a'} Q(S',a') - Q(S,A))

The agent behaves with an exploratory policy (e.g. epsilon-greedy) while learning about the greedy
target policy, which makes it **off-policy**: learning about pi from experience generated by mu.
Classification: off-policy, model-free, TD control. It is the sampled, model-free counterpart of
value iteration (the max in the target is the Bellman optimality backup), and it is the direct
ancestor of DQN ([deep-rl.md](deep-rl.md)).

SARSA vs Q-learning in one line: on the cliff-walk gridworld, SARSA learns the safe path (it
accounts for its own exploratory stumbles off the cliff), Q-learning learns the optimal-but-risky
edge path (it evaluates the greedy policy it is not actually following).

## Where this goes next

Everything above stores Q as a table, which dies with large or continuous state spaces. Replacing
the table with a neural network, plus the tricks needed to make that stable, is
[deep-rl.md](deep-rl.md). The MC-vs-TD dial also reappears in LLM RL: GRPO's whole-sequence reward
is a Monte Carlo return; PPO with a value model and GAE sits partway along the TD(lambda) dial
([rl-for-llms.md](rl-for-llms.md)).
