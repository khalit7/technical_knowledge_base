<!-- Notion fetch of "Dynamic programming: planning with a known model" (https://app.notion.com/p/3c65c17b0d0d81baada7e1c05ce69d01), page_last_edited_at 2026-09-30T15:15:38.771Z, fetched 2026-10-04. Parent: Topic: rl. No child pages, no databases, no video. The page content follows verbatim; the embed's signed S3 URL is shortened to its file name (it expires). -->
<embed src="https://prod-files-secure.s3.us-west-2.amazonaws.com/13e79c56-ebab-4528-83aa-967a204b1f04/9c9492ee-3bed-46f2-bc84-62da7677147c/dynamic-programming-planning-with-a-known-model.html">Interactive: Dynamic programming: planning with a known model</embed>

⏱ 17 min read · +2h 25m resources
## What it is and why it matters
Dynamic programming (DP) in reinforcement learning is a family of algorithms that compute value functions and optimal policies **when the full model of the environment is known**: for every state and action you have the transition probabilities $`P(s' \mid s,a)`$ and the expected reward $`R(s,a)`$. Nothing is learned from interaction. The algorithms compute, which makes DP **model-based planning**, not learning.
The idea is the one in Richard Bellman's name for it: a long-horizon problem breaks into one-step pieces. The value of a state is the reward you get now plus the discounted value of the state you land in, so if you had good values for the successors you could compute this state's value in one line. DP starts from a guess for every state and applies that one-line computation, a **backup**, to every state, again and again. Each sweep pushes reward information one more step back from where the reward is earned, and the guesses converge to the true values.
It matters for two reasons. First, DP is the ideal that every model-free method approximates: Monte Carlo, TD learning, SARSA and Q-learning replace DP's exact expectation over all successor states with one sampled successor. Second, the DP backup is the template for every learning target in RL: a TD target, a DQN target and the value target inside PPO are all "reward plus discounted value of the next state".
DP solves two problems. **Prediction**: given a policy, how good is it? That is policy evaluation. **Control**: find the best policy. That is policy iteration and value iteration, both iterative solutions of the Bellman optimality equation. Their model-free counterparts, SARSA and Q-learning, are on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81898a0cd4c05c744969"/>.
## Definitions
A **Markov decision process** (MDP) is the tuple $`(\mathcal{S}, \mathcal{A}, P, R, \gamma)`$: a set of states, a set of actions, a transition model $`P(s' \mid s,a)`$ giving the probability of landing in $`s'`$ after taking action $`a`$ in state $`s`$, an expected immediate reward $`R(s,a)`$, and a discount factor $`\gamma \in [0,1]`$. The Markov property (the next state depends only on the current state and action, not on the history) is what makes a one-step recursion valid. The full vocabulary, from Markov chains to MDPs, is on <mention-page url="https://app.notion.com/p/3c65c17b0d0d810b8c5ce46696baf31f"/>.
- A **policy** $`\pi(a \mid s)`$ is the probability of taking action $`a`$ in state $`s`$. A deterministic policy picks one action, written $`\pi(s)`$.
- The **return** $`G_t = R_{t+1} + \gamma R_{t+2} + \gamma^2 R_{t+3} + \dots`$ is the discounted sum of future rewards.
- The **state value** $`V_\pi(s) = \mathbb{E}_\pi[G_t \mid S_t = s]`$ is the expected return from $`s`$ when following $`\pi`$. The **action value** $`Q_\pi(s,a)`$ is the expected return from taking $`a`$ in $`s`$ and following $`\pi`$ afterwards.
- With a model, one is computed from the other by a **one-step lookahead**, and this is the step that needs the model:
$$
Q_\pi(s,a) = R(s,a) + \gamma \sum_{s'} P(s' \mid s,a)\, V_\pi(s')
$$
- The **optimal** value $`V_*(s) = \max_\pi V_\pi(s)`$ is the best achievable expected return from $`s`$, and an optimal policy $`\pi_*`$ is one that achieves it in every state. Every finite MDP has at least one deterministic optimal policy.
The two Bellman equations are the fixed-point conditions these values satisfy. The **Bellman expectation equation** holds for any fixed policy:
$$
V_\pi(s) = \sum_{a} \pi(a \mid s) \Big[ R(s,a) + \gamma \sum_{s'} P(s' \mid s,a)\, V_\pi(s') \Big]
$$
The **Bellman optimality equation** holds for the optimal values, with a max over actions in place of the average under a policy:
$$
V_*(s) = \max_{a} \Big[ R(s,a) + \gamma \sum_{s'} P(s' \mid s,a)\, V_*(s') \Big]
$$
where:
- $`s`$ is the current state, $`a`$ an action, $`s'`$ a possible next state;
- $`\pi(a \mid s)`$ is the policy's probability of choosing $`a`$ in $`s`$;
- $`R(s,a)`$ is the expected immediate reward for taking $`a`$ in $`s`$;
- $`P(s' \mid s,a)`$ is the probability that $`a`$ taken in $`s`$ leads to $`s'`$;
- $`\gamma`$ is the discount factor, weighting a reward one step later by $`\gamma`$;
- the bracket is the one-step lookahead value of action $`a`$.
The expectation equation is **linear**: one equation per state, as many unknowns as states. For a small problem it can be solved directly, $`V_\pi = (I - \gamma P_\pi)^{-1} R_\pi`$, where $`P_\pi`$ is the state-to-state transition matrix under $`\pi`$ and $`R_\pi`$ the vector of expected rewards under $`\pi`$; the inversion costs of the order of the number of states cubed. The optimality equation is **nonlinear** because of the max and has no closed form. DP solves both by iteration.
Three words recur below. A **backup** is one application of the right-hand side of a Bellman equation to one state, as an update. A **sweep** backs up every state once. A **synchronous** sweep computes every new value from the previous sweep's values, so it keeps two arrays; an **in-place** sweep overwrites values as it goes, so states later in the sweep already see this sweep's new values. In-place needs one array and usually converges faster, and the order in which states are swept then matters ([Sutton and Barto, Chapter 4](http://incompleteideas.net/book/the-book-2nd.html)).
## Policy evaluation (the prediction problem)
Estimate $`V_\pi`$, the value function of a **given, fixed** policy, by turning the Bellman expectation equation into an update rule:
$$
V_{k+1}(s) = \sum_{a} \pi(a \mid s) \Big[ R(s,a) + \gamma \sum_{s'} P(s' \mid s,a)\, V_k(s') \Big]
$$
where $`V_k`$ is the estimate after $`k`$ sweeps, $`V_{k+1}`$ the estimate after one more, and every other symbol is as in the Bellman equations above.
1. Start with an arbitrary value function, usually all zeros. Terminal states have value 0 and stay there.
2. For every state, look one step ahead: for each action the policy might take, the immediate reward plus the discounted value of each possible successor, weighted by its probability.
3. Set the state's new value to the policy-weighted average of those lookahead values.
4. Repeat the sweep until the largest change in any state, $`\max_s |V_{k+1}(s) - V_k(s)|`$, falls below a small threshold $`\theta`$.
Convergence is guaranteed: the backup is a $`\gamma`$-contraction (explained under *Why it converges, and how fast* below), so the iteration converges to the unique fixed point $`V_\pi`$ from any starting values. With $`\gamma = 1`$ the contraction argument does not apply, and convergence instead needs every state to reach a terminal state eventually under $`\pi`$ ([Sutton and Barto, Chapter 4](http://incompleteideas.net/book/the-book-2nd.html)).
## Policy improvement
Once you know $`V_\pi`$, you can do better than $`\pi`$ by acting greedily with respect to it. Compute the lookahead value $`Q_\pi(s,a)`$ of every action (the one-step lookahead formula above) and pick the best:
$$
\pi'(s) = \arg\max_{a} \Big[ R(s,a) + \gamma \sum_{s'} P(s' \mid s,a)\, V_\pi(s') \Big] = \arg\max_{a} Q_\pi(s,a)
$$
where $`\pi'`$ is the new, deterministic policy and $`\arg\max_a`$ returns the action with the largest bracket.
The **policy improvement theorem** says why this helps. If a policy $`\pi'`$ satisfies $`Q_\pi(s, \pi'(s)) \ge V_\pi(s)`$ in every state, then $`V_{\pi'}(s) \ge V_\pi(s)`$ in every state: taking the better action once and then following $`\pi`$ is at least as good as following $`\pi`$, and applying that argument at every later step as well only adds more improvement. The greedy policy satisfies the premise automatically, because the best action's value is at least the policy-weighted average of all actions' values, which is $`V_\pi(s)`$. And if greedy improvement changes nothing, then $`V_\pi(s) = \max_a Q_\pi(s,a)`$ in every state, which is exactly the Bellman optimality equation: $`\pi`$ is already optimal.
## Policy iteration (control, with an explicit policy)
Finds the optimal policy by alternating the two steps above until the policy stops changing: **policy evaluation** (compute the values of the current policy) and **policy improvement** (make the policy greedy with respect to those values).
1. Start with an arbitrary policy, for example uniformly random, and arbitrary values.
2. Evaluate: run policy evaluation sweeps for the current policy until the values settle (or solve the linear system directly).
3. Improve: replace the policy with the greedy policy on those values.
4. If the policy did not change, stop: it is optimal. Otherwise go back to step 2 with the new policy.
Why it terminates: a finite MDP has finitely many deterministic policies (the number of actions raised to the number of states), each improvement produces a policy at least as good in every state and strictly better in at least one unless it is already optimal, so no policy can repeat, and the loop must end at a policy satisfying the Bellman optimality equation. In practice it needs few outer iterations, because the policy changes in whole jumps and often becomes optimal long before its values have fully converged.
There is an explicit policy throughout, so this is the policy-flavoured member of the DP pair.
**Evaluation does not have to converge.** Stopping evaluation after $`k`$ sweeps and improving anyway still converges to the optimal policy; this is **modified policy iteration**, and the general pattern of interleaving any amount of evaluation with any amount of improvement is **generalised policy iteration** (GPI). In Silver's 4 by 4 gridworld (reward of minus 1 per step, uniform random starting policy, no discount), $`k = 3`$ evaluation sweeps were already enough for the greedy policy to be optimal ([Silver, Lecture 3 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-3-planning-by-dynamic-programming-.pdf)). Taking $`k = 1`$, one evaluation sweep between improvements, is exactly value iteration. One catch: with truncated evaluation, "the policy did not change" no longer proves optimality, because the values the policy was greedy on were not yet its own values. Stop only when the policy is unchanged **and** the values have stopped changing.
## Value iteration (control, no explicit policy)
Finds the optimal values directly by turning the Bellman optimality equation into an update rule, with no policy stored anywhere:
$$
V_{k+1}(s) = \max_{a} \Big[ R(s,a) + \gamma \sum_{s'} P(s' \mid s,a)\, V_k(s') \Big]
$$
where $`V_k`$ is the estimate after $`k`$ sweeps and the max runs over every action available in $`s`$.
1. Start with an arbitrary value function, usually all zeros.
2. For every state, compute the lookahead value of **every** action and keep the best one.
3. Repeat until the largest change in a sweep falls below a threshold.
4. Read off the policy once at the end, greedily: $`\pi(s) = \arg\max_a`$ of the same bracket.
It looks like policy evaluation, with one crucial difference: no policy is being followed. Each sweep takes a max over all actions rather than an average under some $`\pi`$. Equivalently, each sweep is one evaluation sweep of the policy that is greedy on the current values, so value iteration is policy iteration with the evaluation cut to a single sweep. A consequence: the intermediate value functions need not be the value of any policy at all; only the limit is, and it is the value of the optimal policy ([Silver, Lecture 3 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-3-planning-by-dynamic-programming-.pdf)).
## Worked example: a three-state corridor
Three states in a row, A, B and C, with a terminal goal G to the right of C. Two actions, left and right, both deterministic. Moving right from C enters G, earns a reward of 10 and ends the episode; every other move earns 0; moving left from A bumps into the wall and stays in A. The discount is $`\gamma = 0.9`$ and $`V(G) = 0`$ always.
**Value iteration**, synchronous, starting from all zeros. The backups are $`V(A) \leftarrow \max(0.9\,V(A),\ 0.9\,V(B))`$, $`V(B) \leftarrow \max(0.9\,V(A),\ 0.9\,V(C))`$ and $`V(C) \leftarrow \max(0.9\,V(B),\ 10 + 0.9 \cdot 0)`$.
<table header-row="true">
<tr>
<td>Sweep</td>
<td>V(A)</td>
<td>V(B)</td>
<td>V(C)</td>
<td>What happened</td>
</tr>
<tr>
<td>0</td>
<td>0</td>
<td>0</td>
<td>0</td>
<td>Initial guess</td>
</tr>
<tr>
<td>1</td>
<td>0</td>
<td>0</td>
<td>10</td>
<td>C: right gives 10 + 0.9 times 0 = 10, left gives 0.9 times 0 = 0</td>
</tr>
<tr>
<td>2</td>
<td>0</td>
<td>9</td>
<td>10</td>
<td>B: right gives 0.9 times 10 = 9</td>
</tr>
<tr>
<td>3</td>
<td>8.1</td>
<td>9</td>
<td>10</td>
<td>A: right gives 0.9 times 9 = 8.1</td>
</tr>
<tr>
<td>4</td>
<td>8.1</td>
<td>9</td>
<td>10</td>
<td>No change: converged</td>
</tr>
</table>
So $`V_* = (8.1,\ 9,\ 10)`$ and the greedy policy is right in every state. The reward travelled back one state per sweep, which is the general picture: after $`k`$ sweeps, synchronous value iteration has only seen rewards up to $`k`$ steps away. An **in-place** sweep in the order C, B, A converges in a single sweep instead (C becomes 10, then B sees the new C and becomes 9, then A becomes 8.1), which is why sweep order matters for in-place DP.
**Policy iteration**, starting from the uniformly random policy (left and right with probability 0.5 each). Evaluation backups: $`V(A) \leftarrow 0.45\,V(A) + 0.45\,V(B)`$, $`V(B) \leftarrow 0.45\,V(A) + 0.45\,V(C)`$ and $`V(C) \leftarrow 0.45\,V(B) + 5`$, where 0.45 is 0.5 times 0.9 and 5 is 0.5 times the reward of 10. From zeros the sweeps give (0, 0, 5), then (0, 2.25, 5), then (1.0125, 2.25, 6.0125), then (1.4681, 3.1612, 6.0125), converging to the exact solution of the three linear equations, $`V_\pi \approx (4.29,\ 5.24,\ 7.36)`$.
Improvement on those values compares the lookahead value of each action: in A, left is 0.9 times 4.29 = 3.86 and right is 0.9 times 5.24 = 4.72; in B, left is 3.86 and right is 0.9 times 7.36 = 6.62; in C, left is 0.9 times 5.24 = 4.72 and right is 10. Right wins everywhere, so one improvement already gives the optimal policy. Evaluating it gives (8.1, 9, 10), the next improvement changes nothing, and policy iteration stops after two outer iterations.
Evaluation did not need to converge: after only three sweeps, with values (1.0125, 2.25, 6.0125), the greedy comparison is already right everywhere (in A, right is 0.9 times 2.25 = 2.025 against left 0.9 times 1.0125 = 0.91; in B, right is 5.41 against 0.91; in C, 10 against 2.025). That is modified policy iteration paying off.
## Why it converges, and how fast
Measure the distance between two value functions $`u`$ and $`v`$ by the largest difference in any state, $`\|u - v\|_\infty = \max_s |u(s) - v(s)|`$. Write $`T`$ for one full sweep of backups (either the expectation backup for a fixed $`\pi`$ or the optimality backup). Both are $`\gamma`$-contractions ([Silver, Lecture 3 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-3-planning-by-dynamic-programming-.pdf)):
$$
\| T u - T v \|_\infty \le \gamma \, \| u - v \|_\infty
$$
where $`T u`$ is the value function after applying one sweep to $`u`$. One sweep brings any two value functions at least a factor $`\gamma`$ closer. By the contraction mapping theorem, repeated sweeps converge to a unique fixed point ($`V_\pi`$ or $`V_*`$) from any start, at a linear rate. Since the true values are a fixed point, $`T V_* = V_*`$, the error after $`k`$ sweeps obeys
$$
\| V_k - V_* \|_\infty \le \gamma^k \, \| V_0 - V_* \|_\infty
$$
where $`V_0`$ is the starting guess and $`V_k`$ the estimate after $`k`$ sweeps. To shrink the initial error by a factor $`1/\varepsilon`$ you need $`\gamma^k \le \varepsilon`$, that is
$$
k \ge \frac{\ln(1/\varepsilon)}{\ln(1/\gamma)}
$$
With $`\gamma = 0.9`$, cutting the error by a factor of 1,000 takes 66 sweeps ($`0.9^{66} \approx 0.00096`$). With $`\gamma = 0.99`$ it takes 688. The cost of DP grows roughly with the effective horizon $`1/(1-\gamma)`$, because rewards that far away still matter and each sweep reaches one step further.
**A small change is not a small error.** If one sweep changes no value by more than $`\theta`$, the contraction gives $`\|V_{k+1} - V_*\|_\infty \le \gamma\theta/(1-\gamma)`$. With $`\gamma = 0.99`$ and $`\theta = 0.001`$ the values can still be off by up to 0.099, about a hundred times the last change.
## Policy iteration vs value iteration
<table header-row="true">
<tr>
<td></td>
<td>Policy iteration</td>
<td>Value iteration</td>
</tr>
<tr>
<td>Flavour</td>
<td>Policy-based (explicit policy stored and improved)</td>
<td>Value-based (no explicit policy until the end)</td>
</tr>
<tr>
<td>Model needed</td>
<td>Yes: model-based</td>
<td>Yes: model-based</td>
</tr>
<tr>
<td>Update rule</td>
<td>Bellman expectation equation + greedy improvement</td>
<td>Bellman optimality equation directly</td>
</tr>
<tr>
<td>Intermediate values</td>
<td>At every step, V corresponds to some actual policy</td>
<td>Intermediate V may correspond to **no** policy; only the final V corresponds to (the optimal) one</td>
</tr>
<tr>
<td>Per-sweep cost</td>
<td>An evaluation sweep under a deterministic policy looks at one action per state, so it is cheaper than a value iteration sweep by a factor of the number of actions; only the improvement step looks at all actions. But evaluation is a loop inside the outer loop</td>
<td>Every sweep maxes over all actions; single loop</td>
</tr>
<tr>
<td>Typical behaviour</td>
<td>Few outer iterations; policy often stabilises before values fully converge</td>
<td>More sweeps, each simple</td>
</tr>
<tr>
<td>Stops when</td>
<td>The policy does not change: an exact, finite stopping point</td>
<td>The largest change in a sweep is below a threshold: an approximate stopping point</td>
</tr>
</table>
Both converge to the same $`V_*`$ and $`\pi_*`$. Neither dominates: policy iteration wins when evaluation is cheap (few actions, or a linear solve that is affordable) and value iteration wins when each state has many actions or the policy would change many times. Modified policy iteration, with a handful of evaluation sweeps per improvement, sits between them and is often the practical choice.
## Cost, scale and asynchronous DP
One sweep backs up every state, and each backup looks at every action and every possible successor. With $`n`$ states and $`m`$ actions, a sweep over state values costs $`O(m n^2)`$; a sweep over action values $`Q(s,a)`$ costs $`O(m^2 n^2)`$, because there are $`mn`$ entries and each backup looks at $`mn`$ successor pairs ([Silver, Lecture 3 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-3-planning-by-dynamic-programming-.pdf)). These are **full-width backups**: every successor and every action is considered, using the known model.
That is fine for medium-sized problems (Silver's slides put the limit at millions of states), but the number of states grows exponentially with the number of state variables, Bellman's **curse of dimensionality**: ten state variables with ten values each already make ten billion states, and at that size even one backup can be too expensive.
**Asynchronous DP** backs up states in any order rather than in full sweeps, and still converges as long as every state keeps being backed up ([Silver, Lecture 3 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-3-planning-by-dynamic-programming-.pdf), [Sutton and Barto, Chapter 4](http://incompleteideas.net/book/the-book-2nd.html)):
- **In-place DP**: one array, each backup immediately visible to the next (the corridor above converges in one sweep with the right order).
- **Prioritised sweeping**: back up the state with the largest Bellman error (the size of the change its backup would make) first, kept in a priority queue; after each backup, update the errors of its predecessor states, which needs the reverse dynamics.
- **Real-time DP**: back up only the states an agent actually visits, so computation goes where the agent's experience is.
Beyond that the model has to go or the table has to go. **Sample backups** replace the full sum over successors with one sampled transition, which removes the need for the model and makes the cost of a backup independent of the number of states: that is <mention-page url="https://app.notion.com/p/3c65c17b0d0d81898a0cd4c05c744969"/>. **Approximate DP** replaces the table with a function approximator and backs up only sampled states, as in fitted value iteration, which leads to DQN on <mention-page url="https://app.notion.com/p/3c65c17b0d0d8180b808c8c0cf8ddbe6"/>.
## Common mistakes and misconceptions
- **Calling DP learning.** It never interacts with an environment; it computes from a model it is given. Without the model you need the sampling methods on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81898a0cd4c05c744969"/>.
- **Acting greedily on V without a model.** The greedy step needs the one-step lookahead, which needs $`P`$ and $`R`$. Model-free control uses $`Q(s,a)`$ precisely so that the greedy step becomes a plain argmax.
- **Reading value iteration's intermediate values as a policy's value.** Before convergence they may belong to no policy.
- **Trusting a small last change.** A last change of $`\theta`$ can hide an error of up to $`\gamma\theta/(1-\gamma)`$, a hundred times $`\theta`$ at $`\gamma = 0.99`$.
- **Letting policy iteration flip between equally good actions.** If ties in the argmax are broken arbitrarily, "the policy did not change" may never be true even though the values have stopped improving. Break ties consistently (keep the current action unless another is strictly better) or stop when the values stop changing ([Sutton and Barto, Chapter 4](http://incompleteideas.net/book/the-book-2nd.html)).
- **Assuming full evaluation is required before improving.** A few sweeps are usually enough; one sweep is value iteration.
- **Stopping modified policy iteration on an unchanged policy alone.** After a truncated evaluation the values are not yet the policy's own, so an unchanged greedy policy can still be suboptimal; also require the values to have converged.
- **Using **$`\gamma = 1`$** carelessly.** Without discounting the contraction argument is gone, and evaluation converges only if every policy you evaluate eventually reaches a terminal state.
- **Treating DP as obsolete.** Its structure, evaluate then improve, and its backup, reward plus discounted next value, are inside every modern RL algorithm (next section).
## How it connects, and why it still matters for LLM work
- **Up the tree**: <mention-page url="https://app.notion.com/p/3c65c17b0d0d8195a6c6c11ad093c16e"/> places DP as the model-based solution of the Bellman equations whose vocabulary is on <mention-page url="https://app.notion.com/p/3c65c17b0d0d810b8c5ce46696baf31f"/>.
- **Generalised policy iteration is the shape of nearly every RL algorithm**, including PPO for RLHF: the critic update is approximate policy evaluation and the policy-gradient step is approximate policy improvement. AlphaZero is GPI with Monte Carlo tree search as the improvement operator (<mention-page url="https://app.notion.com/p/3c65c17b0d0d8180b808c8c0cf8ddbe6"/>).
- **The one-step backup is the template for every target**: $`V(s) \leftarrow r + \gamma V(s')`$ is a DP backup with the expectation over successors replaced by one sample. It is the TD target on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81898a0cd4c05c744969"/>, and Q-learning is the sampled form of value iteration. DQN regresses a network onto the same target (<mention-page url="https://app.notion.com/p/3c65c17b0d0d8180b808c8c0cf8ddbe6"/>), and GAE (generalised advantage estimation) is built from the TD errors $`r + \gamma V(s') - V(s)`$ that the critic in PPO produces (<mention-page url="https://app.notion.com/p/3c65c17b0d0d818c9bcff7177325fe56"/>).
- **Token generation is an MDP with a trivial, known transition** (append the token), so the model DP needs is available; what makes DP impossible there is the size of the state space, every possible prefix, which is why LLM RL samples instead (<mention-page url="https://app.notion.com/p/3c65c17b0d0d818c9bcff7177325fe56"/>).
## Best resources
- David Silver's UCL course, Lecture 3 "Planning by Dynamic Programming": [https://www.davidsilver.uk/teaching/](https://www.davidsilver.uk/teaching/) (1h 30m): the clearest walkthrough of policy iteration vs value iteration, with the gridworld demo.
- Sutton & Barto, Chapter 4 "Dynamic Programming": [http://incompleteideas.net/book/the-book-2nd.html](http://incompleteideas.net/book/the-book-2nd.html) (45 min): includes the proof sketches (policy improvement theorem, contraction).
- GridWorld: DP demo (Karpathy's REINFORCEjs): [https://cs.stanford.edu/people/karpathy/reinforcejs/gridworld_dp.html](https://cs.stanford.edu/people/karpathy/reinforcejs/gridworld_dp.html) (\~10 min): interactive; watch values propagate.
