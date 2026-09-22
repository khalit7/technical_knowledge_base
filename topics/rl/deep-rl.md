# Deep RL: from DQN to PPO to MuZero

⏱ 9 min read · +32h 35m resources

### Best resources

- OpenAI Spinning Up: [https://spinningup.openai.com](https://spinningup.openai.com/) (docs, ~3h for the core pages): especially "Intro to Policy Optimization" and the algorithm docs (VPG, TRPO, PPO, DDPG, SAC) with reference implementations.
- Lilian Weng, "Policy Gradient Algorithms": [https://lilianweng.github.io/posts/2018-04-08-policy-gradient/](https://lilianweng.github.io/posts/2018-04-08-policy-gradient/) (~45 min): the best single derivation chain from REINFORCE through TRPO/PPO to SAC.
- Berkeley CS285 (Sergey Levine), Deep RL course: [https://rail.eecs.berkeley.edu/deeprlcourse/](https://rail.eecs.berkeley.edu/deeprlcourse/) (course, ~25h): lecture-depth treatment of everything here.
- "The 37 Implementation Details of PPO": [https://iclr-blog-track.github.io/2022/03/25/ppo-implementation-details/](https://iclr-blog-track.github.io/2022/03/25/ppo-implementation-details/) (~50 min): mandatory before implementing PPO or GRPO; most "algorithm" gains live in these details.
- David Silver's Lecture 6-7 (function approximation, policy gradients): [https://www.davidsilver.uk/teaching/](https://www.davidsilver.uk/teaching/) (3h): bridges the classical material to this page.

### Why deep RL

Tabular methods die when states are images or token sequences. Replace tables with neural networks:

Q(s,a; theta), pi(a|s; theta), V(s; theta). The catch: RL data is non-i.i.d. (sequential,

correlated) and non-stationary (targets move as the policy changes), so naive supervised training

diverges. Deep RL history is largely a list of stabilisation tricks.

### Value-based line: DQN and variants

**DQN** (Mnih et al. 2013/2015, Atari): Q-learning with a CNN, made stable by two tricks:

- **Experience replay**: store transitions (s, a, r, s') in a buffer, train on random minibatches;
  breaks temporal correlation and reuses data (possible because Q-learning is off-policy).

- **Target network**: compute the TD target r + gamma max_a' Q(s', a'; theta^-) with a frozen copy
  theta^-, updated only periodically; stops the chase-your-own-tail instability.

Variants, each fixing a specific pathology:

- **Double DQN**: vanilla max over noisy Q-values is upward-biased (it both selects and evaluates
  with the same noise). Decouple: select a' with the online network, evaluate with the target

  network. Target: r + gamma Q(s', argmax_a' Q(s',a'; theta); theta^-).

- **Dueling DQN**: split the head into state value V(s) and advantage A(s,a), recombine as
  Q = V + (A - mean A). Learns "is this state good at all" independently of "which action", which

  helps when actions barely matter in most states.

- **Rainbow** (2017): combine six improvements (double, dueling, prioritized replay, n-step
  returns, distributional Q-learning (C51), noisy nets for exploration); ablations showed

  prioritized replay and n-step mattered most.

### Policy-gradient line

Optimise the policy directly: maximise J(theta) = E[return]. The **policy gradient theorem** gives

grad J = E_pi [ grad log pi(a|s; theta) * Q_pi(s,a) ]: push up log-probabilities of actions in

proportion to how good they turn out.

**REINFORCE** (Monte Carlo policy gradient): use the sampled return G_t as the estimate of Q:

grad J ~ sum_t grad log pi(a_t|s_t) * G_t. Unbiased but very high variance.

**Baselines**: subtracting any state-dependent baseline b(s) from G_t leaves the gradient unbiased

(E[grad log pi * b(s)] = 0) but can slash variance. The natural choice is b(s) = V(s), giving the

**advantage** A(s,a) = Q(s,a) - V(s): "how much better than average was this action". GRPO's

group-mean baseline is exactly this idea with an empirical per-prompt mean

([RL for LLMs: RLHF, GRPO, RLVR](rl-for-llms-rlhf-grpo-rlvr.md)).

### Actor-critic

Learn the baseline: an **actor** pi(a|s; theta) updated by policy gradient, and a **critic**

V(s; w) trained by TD to supply the advantage estimate, e.g. A ~ r + gamma V(s') - V(s) (the TD

error), or GAE (generalised advantage estimation), which is a TD(lambda)-style blend of n-step

advantages trading bias against variance.

- **A3C** (2016): many parallel actors on CPU threads update shared weights asynchronously;
  parallelism decorrelates data (replay-buffer role, but on-policy).

- **A2C**: the synchronous version (wait for all actors, one batched update); simpler, GPU-friendly,
  and works just as well. Modern LLM RL loops are structurally A2C: batch rollouts, one update.

### TRPO to PPO: the clipped objective

Problem: policy gradients are only valid near the current policy (the data came from it). A too-big

step can collapse performance, and the next batch is then sampled from the broken policy, so you

may never recover. You want the biggest step that is still safe.

**TRPO** (2015) formalises this: maximise the surrogate E[ r_t(theta) * A_t ], where

r_t(theta) = pi_theta(a_t|s_t) / pi_old(a_t|s_t) is the importance ratio, subject to a trust-region

constraint KL(pi_old || pi_theta) <= delta. Works, but needs second-order machinery (conjugate

gradient on the Fisher matrix): heavy and awkward.

**PPO** (2017) gets the same effect with a first-order trick. Intuition for the clipped objective:

- The surrogate r_t * A_t says "raise the probability of good actions (A > 0), lower it for bad
  ones (A < 0)". Unconstrained, the optimiser will crank r_t to extremes, leaving the trust region.

- PPO clips the ratio to [1 - eps, 1 + eps] (eps ~ 0.2) and takes
  L = E[ min( r_t A_t, clip(r_t, 1-eps, 1+eps) A_t ) ].

- The min makes the clip one-sided in exactly the right way: once the ratio has already moved more
  than eps in the direction the advantage wants, the objective goes flat, gradient zero, no

  incentive to move further. But if the ratio has moved the *wrong* way (e.g. r < 1 with A > 0),

  the unclipped term is the smaller one, so the gradient still pulls it back. Free to fix mistakes,

  capped when exploiting.

- Result: TRPO-like stability from a pessimistic first-order objective; multiple epochs of
  minibatch SGD on each rollout batch become safe. This exact objective, ratios and clip included,

  is the core of RLHF-PPO and GRPO.

### Off-policy continuous control (brief)

- **DDPG**: deterministic actor + Q critic, replay buffer and target networks (DQN's tricks) for
  continuous actions; sample-efficient but brittle. TD3 fixes overestimation (twin critics, delayed

  updates, target smoothing).

- **SAC**: stochastic actor with **maximum entropy** RL: maximise reward + alpha * entropy. The
  entropy bonus keeps exploration alive and training robust; the go-to model-free algorithm for

  robotics. The entropy-regularisation idea reappears in LLM RL as the KL/entropy terms that stop

  policies collapsing onto single modes.

### The model-based line: AlphaGo to MuZero

- **AlphaGo** (2016): policy network from supervised learning on human games plus RL self-play,
  value network, and Monte Carlo tree search (MCTS) using the known rules of Go as a perfect model.

- **AlphaZero** (2017): drops human data entirely. One network with policy and value heads;
  MCTS-improved move distributions serve as policy targets, game outcomes as value targets:

  self-play policy iteration where search is the improvement operator. Same recipe masters Go,

  chess, shogi.

- **MuZero** (2019): drops the known rules. Learns a latent dynamics model (representation,
  dynamics, prediction networks) trained end-to-end to predict reward, value, and policy, then

  plans with MCTS **inside the learned latent model**. Model-based RL without a hand-given model;

  matches AlphaZero on board games and set SOTA on Atari.

This line matters for LLMs as the ancestry of "search + learned value" test-time-compute ideas

(compare o1/R1-style long reasoning as sequential search in token space, and MCTS-based

decoding papers).

### Map back to the taxonomy

DQN family: value-based, model-free, off-policy. REINFORCE: policy-based, model-free, on-policy.

A2C/PPO: actor-critic, model-free, on-policy (PPO approximately so). DDPG/SAC: actor-critic,

model-free, off-policy. AlphaZero/MuZero: actor-critic, model-based (given vs learned model).
