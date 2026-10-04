Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d8180b808c8c0cf8ddbe6 as of 2026-09-30T15:38:35.686Z:
<page url="https://app.notion.com/p/3c65c17b0d0d8180b808c8c0cf8ddbe6">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d8195a6c6c11ad093c16e" title="Topic: rl"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Deep RL: from DQN to PPO to MuZero"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
<embed src="https://prod-files-secure.s3.us-west-2.amazonaws.com/13e79c56-ebab-4528-83aa-967a204b1f04/7036e0af-1020-4351-8c71-ac8526ed2605/deep-rl-from-dqn-to-ppo-to-muzero.html?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466QPV2R36Y%2F20261004%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261004T001053Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEPD%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJIMEYCIQDmjcS%2FxB2bX8Vai9k2mPVWVMciwI6Y1ye5PrLp95rW9wIhAMj2yfRJNt%2BOCiOPjWrFTsfOMF%2BHovRmkXeE%2Fkc77WNCKogECLj%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1IgxXCpnPosFFa6YAaTwq3AOt3nqkt5Z6APqha003LB8ecdyIf5o5LRJ8hV75DW0Iu8gPkdwefDTyeOwbvEiP2UTfaz7%2FCOCewpZjhXtmL7cEwjJWYXsi5%2BdT1t%2F5Ldct5jsjgCD%2FoUxN2g%2BkS41JdliUMr3UGMQRoagdRlKJ%2FOzjJF4MPME05kLvEuBe%2BEA5wbZ%2BwZMqCM1MPfD9DyBTvKUT53vFti0%2F1uRL0gL%2BIRlB0QV4NXbQEwWQorGbvXEXfUtXQAeuXE4s%2BAEKHyzNfzTWZ9WUa2%2BXBtMvy%2BIgd6YefZEj%2BgVDO0k3yVhn0znBTuwtUK31JDmihtiFAP5kzr4sUzq7EmrdTrHWCNanLAVFk0jZj8K1b%2FjaZ4o%2BKHzLIwEswNf6WIJPRffJ3QrnSz3DdtbrE%2FXikP%2Bdb%2FLSZimFDNeOfXmVBAssWXYIvwtAZgC2LuBsRmew8WI3cqucGOdCz0YRtYecRXT4jt8ERZsjKTiYKZAFTOSkbCp7Hg9XfiyglBnQqNtvjtiEjPLDDzEsKDIBs6sXajOHWK9Mnc15SbmoU9Ir48%2F%2BekAFlRifQO%2BrAVpaRR4bE0lrO7YooT3ywesoUdNRbH4acyqS87%2FLpk6FC6wo%2Bm4Z8T6gNop4IPzOpT3xCKpSkfBY%2FjC7p4bWBjqkARyTPrDTeL8%2BR2chS7p8%2F7SbnAsk1C%2F6C2aGQ3QNPQQLiQuQBXhLTYbCgqOZ5QRcimXIXiShi9PI%2Bm5QG%2BtwN3rjGfq7u7TIFrbhoOt%2Bq7nqre01f9lDXT6%2F9O1Q4O%2FyKBV1x3yVx8Ftar8xXQGuhZH5L3cs6lehh0qCgr7TsFTaf%2BlGrJJ47nav7VAGl2MdhT59sR5QcGATHwaN6zF2Rw5D2eec&X-Amz-Signature=7db2828be0e8cae37aef2517556f1610e4a23d5b03225b031fc2c57753c44985&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.62bbec99-9269-4d5c-af78-2fba3b3bb5da.13e79c56-ebab-4528-83aa-967a204b1f04">Interactive: Deep RL: from DQN to PPO to MuZero</embed>
⏱ 25 min read · +32h 35m resources
## What it is and why it matters
Classical RL stores one number per state or per state-action pair in a table. That works for a gridworld and fails the moment a state is an Atari screen, a robot's joint readings or a token prefix: there are far too many states to visit, let alone store, and two states that look almost the same share nothing in a table. **Deep RL** replaces the tables with neural networks that generalise across similar states: a Q-network $`Q(s,a;\theta)`$, a policy network $`\pi(a \mid s;\theta)`$, a value network $`V(s;\theta)`$, where $`\theta`$ are the network weights.
The catch is that RL breaks the assumptions that make supervised training of a network stable, so the history of deep RL is largely a list of stabilisation tricks, grouped into three lines that this page follows in turn:
- **Value-based**: learn $`Q`$ and act greedily on it. DQN (deep Q-network) and its refinements.
- **Policy-gradient and actor-critic**: optimise the policy directly, with a learned value function (the critic) to reduce variance. REINFORCE, A2C, TRPO, PPO, and for continuous actions DDPG, TD3 and SAC.
- **Model-based with search**: plan with tree search inside a model of the environment, given (AlphaGo, AlphaZero) or learned (MuZero).
It matters for LLM work because PPO's clipped objective, the advantage and the baseline are the machinery of RLHF and GRPO (<mention-page url="https://app.notion.com/p/3c65c17b0d0d818c9bcff7177325fe56"/>), and the AlphaZero line is the ancestry of search plus a learned value at test time.
## Why tables stop working, and why networks are hard to train
A table entry changes only when its own state is updated. A network shares weights, so an update for one state moves the estimates of every similar state: that generalisation is the point, and also the problem. Three properties of RL data make naive training diverge:
- **Correlated data.** Consecutive transitions of one trajectory are nearly identical, so gradient steps on them in order are like training a classifier on a thousand pictures of the same cat. Stochastic gradient descent assumes roughly independent, identically distributed (i.i.d.) samples.
- **Moving targets.** A temporal-difference (TD) target such as $`r + \gamma \max_{a'} Q(s',a';\theta)`$ is computed with the very weights being trained, so every update moves the target it is chasing.
- **The data depends on the policy.** As the policy changes, the states it visits change, so the training distribution shifts under the network. A bad update produces bad data, which produces worse updates.
Sutton and Barto name the dangerous combination the **deadly triad**: function approximation, bootstrapping (targets built from current estimates) and off-policy data together can make value estimates diverge, even though any two of the three are usually fine. Each method below is best read as a specific defence against one of these failure modes. The tabular methods they grow out of, Monte Carlo, TD and Q-learning, are on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81898a0cd4c05c744969"/>: in one line, Q-learning moves $`Q(s,a)`$ towards $`r + \gamma \max_{a'} Q(s',a')`$ after every step, learning the greedy policy while behaving exploratorily.
## Value-based line: DQN and its variants
### DQN: Q-learning with a network, made stable
**DQN** (deep Q-network) is Q-learning with a convolutional network that reads raw pixels and outputs one Q-value per action. The first version ([Mnih et al. 2013](https://arxiv.org/abs/1312.5602)) learned seven Atari games from pixels with **experience replay**; the Nature version ([Mnih et al. 2015](https://storage.googleapis.com/deepmind-media/dqn/DQNNaturePaper.pdf)) added a **target network** and played 49 games with one architecture and one set of hyperparameters. Its input is the last 4 frames stacked, because a single frame shows where the ball is but not where it is going.
The network is trained by regression on the TD target, minimising
$$
L(\theta) = \mathbb{E}_{(s,a,r,s') \sim \mathcal{D}}\Big[\big(r + \gamma \max_{a'} Q(s',a';\theta^-) - Q(s,a;\theta)\big)^2\Big]
$$
where $`\theta`$ are the online network's weights (the ones being trained), $`\theta^-`$ are the target network's weights, $`\mathcal{D}`$ is the replay buffer, $`(s,a,r,s')`$ is a stored transition (state, action, reward, next state), $`\gamma`$ is the discount factor and $`\max_{a'}`$ takes the best next action. At a terminal $`s'`$ the target is just $`r`$. The Nature paper also clipped the TD error to the range -1 to 1, which amounts to a Huber-style loss.
The two stabilisers, each aimed at one failure mode above:
- **Experience replay**: store transitions in a buffer (the Nature version kept the most recent 1 million) and train on random minibatches from it. Random sampling breaks the temporal correlation, and each transition is reused many times. Replaying old data is legitimate only because Q-learning is off-policy: its target does not depend on which policy chose the stored action.
- **Target network**: compute the target with a frozen copy $`\theta^-`$, overwritten with the online weights only every $`C`$ updates (10,000 in the Nature paper). Between copies the regression target stands still, so the network is no longer chasing its own tail. The paper's explanation: an update that raises $`Q(s_t,a_t)`$ often raises $`Q(s_{t+1},a)`$ too, and so the target, which leads to oscillation or divergence.
Worked example: a stored transition has $`r = 1`$, $`\gamma = 0.99`$, and the target network gives $`Q(s',\cdot;\theta^-) = (2.0,\ 3.5,\ 3.0)`$ for three actions. The target is $`1 + 0.99 \times 3.5 = 4.465`$. If the online network currently says $`Q(s,a;\theta) = 4.0`$, the TD error is 0.465 and the gradient step raises $`Q(s,a)`$ towards 4.465.
### Double DQN: the max is biased upwards
The max over noisy estimates is biased upwards, because the same noise is used both to **select** the best action and to **evaluate** it: whichever action happens to be overestimated gets picked, and its overestimate is what enters the target. Suppose three actions all have true value 0 and each estimate carries independent standard normal noise. Every estimate is unbiased, yet the expected maximum of three standard normals is about 0.85, and of ten about 1.54. Through bootstrapping the bias is copied into the next target, and the next. [van Hasselt, Guez and Silver (2015)](https://arxiv.org/abs/1509.06461) showed DQN suffers substantial overestimation on some Atari games and fixed it by decoupling the two roles:
$$
y^{\text{Double}} = r + \gamma\, Q\big(s', \arg\max_{a'} Q(s',a';\theta);\ \theta^-\big)
$$
where the online network $`\theta`$ selects the next action and the target network $`\theta^-`$ evaluates it. Noise in one network is unlikely to be the same noise in the other, so a lucky overestimate is less often both chosen and believed. Continuing the example: the online network gives $`Q(s',\cdot;\theta) = (2.5,\ 3.0,\ 3.8)`$, so it selects the third action; the target network values that action at 3.0; the target is $`1 + 0.99 \times 3.0 = 3.97`$ instead of 4.465.
### Dueling DQN: value plus advantage
The dueling architecture ([Wang et al. 2015](https://arxiv.org/abs/1511.06581)) splits the network's head into a state-value stream $`V(s)`$ and an advantage stream $`A(s,a)`$ and recombines them as
$$
Q(s,a) = V(s) + \Big(A(s,a) - \frac{1}{|\mathcal{A}|}\sum_{a'} A(s,a')\Big)
$$
where $`|\mathcal{A}|`$ is the number of actions. Subtracting the mean advantage makes the split identifiable: without it, adding a constant to $`V`$ and subtracting it from every $`A`$ would give the same $`Q`$. The network learns "is this state good at all" separately from "which action is better", which helps in states where the action barely matters (most frames of a driving game): every update improves $`V`$, whichever action was taken. Example: $`V = 5`$ and $`A = (1, -1, 3)`$ has mean 1, so $`Q = (5, 3, 7)`$.
### Rainbow: which fixes matter
[Rainbow (Hessel et al. 2017)](https://arxiv.org/abs/1710.02298) combined six extensions to DQN and reached state-of-the-art Atari performance in both data efficiency and final score:
- **Double Q-learning**, as above.
- **Dueling networks**, as above.
- **Prioritised replay**: sample transitions in proportion to the size of their last TD error, so surprising transitions are replayed more often.
- **Multi-step (n-step) returns**: the target uses $`n`$ real rewards before bootstrapping, $`\sum_{k=0}^{n-1}\gamma^k r_{t+k+1} + \gamma^n \max_{a'} Q(s_{t+n},a';\theta^-)`$, which propagates reward faster at the cost of some off-policy bias.
- **Distributional Q-learning (C51)**: predict the whole distribution of the return as probabilities on 51 fixed atoms (Rainbow's support runs from -10 to 10) instead of only its mean.
- **Noisy nets**: exploration from learned noise added to the network's weights, in place of epsilon-greedy.
Removing one component at a time, the paper found prioritised replay and multi-step learning the two most crucial (removing either caused a large drop in median score), distributional Q-learning next, noisy nets helpful in aggregate, and no significant aggregate difference from removing dueling or double Q-learning. The authors hypothesise that double Q-learning mattered little here because the distributional support clips values to -10 to 10, which itself counteracts overestimation.
## Policy-gradient line
### Optimise the policy directly
Value-based methods act by $`\arg\max_a Q(s,a)`$, which needs a max over actions: awkward for continuous actions (a robot's torques) and for huge ones (a vocabulary of 100,000 tokens), and it only ever yields a deterministic policy. Policy-gradient methods instead parameterise the policy $`\pi(a \mid s;\theta)`$ directly, as a softmax over actions or a Gaussian over torques, and do gradient ascent on the expected return
$$
J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta}\big[G(\tau)\big]
$$
where $`\tau = (s_0, a_0, r_1, s_1, a_1, \dots)`$ is a trajectory sampled by running the policy and $`G(\tau)`$ is its (discounted) return.
### The policy gradient theorem
The difficulty is that $`\theta`$ changes which trajectories are sampled, and the environment's dynamics are unknown, so the expectation cannot simply be differentiated. The **log-derivative trick** gets around it: for any distribution $`p_\theta(x)`$, $`\nabla_\theta\, \mathbb{E}_{x \sim p_\theta}[f(x)] = \mathbb{E}_{x \sim p_\theta}[f(x)\, \nabla_\theta \log p_\theta(x)]`$, because $`\nabla p = p\, \nabla \log p`$. The log-probability of a trajectory is a sum of the policy's log-probabilities plus dynamics terms that do not depend on $`\theta`$, so the dynamics drop out of the gradient. The result, the **policy gradient theorem** ([Sutton et al. 1999](https://proceedings.neurips.cc/paper_files/paper/1999/file/464d828b85b0bed98e80ade0a5c43b0f-Paper.pdf)), is
$$
\nabla_\theta J(\theta) = \mathbb{E}_{\pi_\theta}\Big[\sum_t \nabla_\theta \log \pi(a_t \mid s_t;\theta)\; Q_\pi(s_t,a_t)\Big]
$$
where $`\nabla_\theta \log \pi(a_t \mid s_t;\theta)`$ (the **score function**) is the direction in weight space that makes action $`a_t`$ more likely in state $`s_t`$, and $`Q_\pi(s_t,a_t)`$ is the expected return after taking it and then following $`\pi`$. In words: push up the log-probability of each action in proportion to how good it turned out. The gradient needs only samples from the policy and the ability to differentiate its log-probabilities, never a model of the environment.
### REINFORCE
**REINFORCE** ([Williams 1992](https://doi.org/10.1007/BF00992696)) is the Monte Carlo version: run an episode, and use the sampled return from each step as the estimate of $`Q_\pi`$:
$$
\nabla_\theta J \approx \sum_t \nabla_\theta \log \pi(a_t \mid s_t;\theta)\, G_t, \qquad G_t = \sum_{k \ge 0} \gamma^k r_{t+k+1}
$$
where $`G_t`$ is the return from step $`t`$ onwards (rewards before $`t`$ are dropped, since an action cannot affect the past). The estimate is unbiased but has very high variance: one episode's return carries the randomness of every later action and transition, and when all rewards are positive every sampled action is pushed up, the good ones merely more than the bad.
### Baselines and the advantage
Subtracting any baseline $`b(s)`$ that depends on the state but not the action leaves the gradient unbiased:
$$
\mathbb{E}_{a \sim \pi}\big[\nabla_\theta \log \pi(a \mid s;\theta)\, b(s)\big] = b(s) \sum_a \nabla_\theta \pi(a \mid s;\theta) = b(s)\, \nabla_\theta \sum_a \pi(a \mid s;\theta) = b(s)\, \nabla_\theta 1 = 0
$$
so replacing $`G_t`$ with $`G_t - b(s_t)`$ changes nothing in expectation, while it can cut the variance a great deal. The natural choice is $`b(s) = V_\pi(s)`$, which turns the weight into the **advantage**
$$
A_\pi(s,a) = Q_\pi(s,a) - V_\pi(s)
$$
where $`V_\pi(s)`$ is the expected return from $`s`$ under the policy: "how much better than average was this action". Good actions are now pushed up and worse-than-average ones pushed down. The variance-minimising constant baseline is in general a weighted mean of the returns rather than exactly $`V`$, but $`V`$ is close and is what practice uses.
Worked example (illustrative numbers): one state, three actions with rewards 1, 2 and 6, a softmax policy with all logits 0, so each action has probability 1/3 and $`V = (1 + 2 + 6)/3 = 3`$. For a softmax, $`\nabla_\theta \log \pi(a)`$ with respect to the logits is $`e_a - \pi`$, the one-hot vector of $`a`$ minus the probabilities. The exact gradient is $`\pi_k (R_k - V) = (-0.667,\ -0.333,\ 1)`$: raise action 3, lower actions 1 and 2.
- Sample action 1 (reward 1) without a baseline: the estimate is $`1 \times (2/3, -1/3, -1/3) = (0.667, -0.333, -0.333)`$, which **raises** the worst action. With baseline 3 it is $`(1-3) \times (2/3, -1/3, -1/3) = (-1.333, 0.667, 0.667)`$, which lowers it.
- Sample action 3 (reward 6): without a baseline $`(-2, -2, 4)`$, with it $`(-1, -1, 2)`$: the same direction, half the size.
- Averaged over the three actions both estimators give exactly $`(-0.667, -0.333, 1)`$, but the total variance (summed over the three components) falls from 7.56 to 1.56. Here the baseline 3 is also the variance-minimising constant, because every action's score vector has the same length.
GRPO's group-mean baseline is exactly this idea, with $`V`$ replaced by the mean reward of a group of responses sampled for the same prompt (<mention-page url="https://app.notion.com/p/3c65c17b0d0d818c9bcff7177325fe56"/>).
## Actor-critic
### Learn the baseline
REINFORCE needs whole episodes and a separate estimate of $`V`$. **Actor-critic** methods learn both at once: an **actor** $`\pi(a \mid s;\theta)`$ updated by the policy gradient, and a **critic** $`V(s;w)`$ with its own weights $`w`$, trained by TD learning to supply the advantage. The simplest advantage estimate is the TD error
$$
\delta_t = r_{t+1} + \gamma V(s_{t+1};w) - V(s_t;w)
$$
where $`r_{t+1}`$ is the reward after acting in $`s_t`$ and $`V(s_{t+1};w)`$ the critic's value of the next state (0 if it is terminal). Its expectation given $`s_t, a_t`$ is exactly $`A_\pi(s_t,a_t)`$ when the critic is exact. It has low variance (one real reward) but is biased when the critic is wrong. Using the full return minus $`V`$ instead is unbiased and high-variance: the Monte Carlo against TD dial again.
### Generalised advantage estimation (GAE)
**GAE** ([Schulman et al. 2015](https://arxiv.org/abs/1506.02438)) interpolates along that dial with an exponentially weighted sum of TD errors, analogous to TD($`\lambda`$):
$$
\hat{A}^{\text{GAE}(\gamma,\lambda)}_t = \sum_{l=0}^{\infty} (\gamma\lambda)^l\, \delta_{t+l}
$$
where $`\delta_{t+l}`$ is the TD error $`l`$ steps later and $`\lambda \in [0,1]`$ sets the trade: $`\lambda = 0`$ gives the one-step TD error (lowest variance, most bias), and $`\lambda = 1`$ gives the discounted return minus $`V(s_t)`$ (unbiased, highest variance). PPO's reference settings use $`\lambda = 0.95`$ and $`\gamma = 0.99`$.
Worked example with $`\gamma = 1`$: a three-step episode with rewards 0, 0, 1 and critic values $`V(s_0) = 0.5`$, $`V(s_1) = 0.6`$, $`V(s_2) = 0.8`$ (the terminal state is worth 0). The TD errors are $`\delta_0 = 0 + 0.6 - 0.5 = 0.1`$, $`\delta_1 = 0 + 0.8 - 0.6 = 0.2`$ and $`\delta_2 = 1 + 0 - 0.8 = 0.2`$. The advantage of the first action is 0.1 at $`\lambda = 0`$; $`0.1 + 0.95 \times 0.2 + 0.95^2 \times 0.2 = 0.4705`$ at $`\lambda = 0.95`$; and $`0.1 + 0.2 + 0.2 = 0.5`$ at $`\lambda = 1`$, which is the return 1 minus $`V(s_0) = 0.5`$.
### A3C and A2C
- **A3C** (asynchronous advantage actor-critic, [Mnih et al. 2016](https://arxiv.org/abs/1602.01783)): many actor-learners on CPU threads, each with its own copy of the environment, compute gradients and apply them to shared weights asynchronously. Parallel actors see different states at the same moment, which decorrelates the data the way a replay buffer does, while staying on-policy. It reached state-of-the-art Atari results on CPU alone.
- **A2C** (advantage actor-critic): the synchronous version. Wait for every actor to finish its segment of experience, then make one batched update averaged over all of them. OpenAI found it performs as well as A3C, with no evidence that the noise from asynchrony helps, and it uses a GPU better because GPUs like large batches ([OpenAI Baselines](https://openai.com/index/openai-baselines-acktr-a2c/)). Modern LLM RL loops have this shape: a batch of rollouts, then an update.
## TRPO to PPO: the clipped objective
### Why the step size is dangerous
The policy gradient is only valid near the policy that collected the data. In supervised learning a too-large step costs one bad update; in RL the next batch is then sampled from the broken policy, so the data itself degrades and training may never recover. The goal is the largest step that is still safe, and the ability to take several gradient steps on one expensive batch of rollouts.
Both methods below optimise a **surrogate objective** built from the **importance ratio**
$$
r_t(\theta) = \frac{\pi_\theta(a_t \mid s_t)}{\pi_{\theta_{\text{old}}}(a_t \mid s_t)}
$$
where $`\pi_{\theta_{\text{old}}}`$ is the policy that collected the batch and $`\pi_\theta`$ the policy being optimised. Maximising $`\mathbb{E}_t[r_t(\theta)\, \hat{A}_t]`$, with $`\hat{A}_t`$ the advantage estimate (GAE in practice), has the same gradient as the policy gradient at $`\theta = \theta_{\text{old}}`$, and the ratio corrects for the drift as $`\theta`$ moves away from it: the same importance-sampling correction as in off-policy learning, applied to a policy that is slightly stale.
### TRPO: a hard trust region
**TRPO** (trust region policy optimisation, [Schulman et al. 2015](https://arxiv.org/abs/1502.05477)) maximises that surrogate subject to a limit on how far the policy may move:
$$
\max_\theta\ \mathbb{E}_t\big[r_t(\theta)\, \hat{A}_t\big] \quad \text{subject to} \quad \mathbb{E}_t\big[D_{\mathrm{KL}}\big(\pi_{\theta_{\text{old}}}(\cdot \mid s_t)\,\|\,\pi_\theta(\cdot \mid s_t)\big)\big] \le \delta
$$
where $`D_{\mathrm{KL}}`$ is the Kullback-Leibler divergence between the old and new action distributions, averaged over visited states, and $`\delta`$ is the trust-region size. Solving it needs second-order machinery: the constraint's curvature is the Fisher information matrix, so TRPO takes a natural-gradient step found by conjugate gradient, then a line search to check the constraint. It works, but it is heavy, awkward to combine with shared policy and value networks, and hard to scale.
### PPO: the same effect from a clipped first-order objective
**PPO** (proximal policy optimisation, [Schulman et al. 2017](https://arxiv.org/abs/1707.06347)) replaces the constraint with a pessimistic objective that plain stochastic gradient ascent can optimise:
$$
L^{\text{CLIP}}(\theta) = \mathbb{E}_t\Big[\min\big(r_t(\theta)\,\hat{A}_t,\ \mathrm{clip}(r_t(\theta),\, 1-\epsilon,\, 1+\epsilon)\,\hat{A}_t\big)\Big]
$$
where $`\mathrm{clip}(x, 1-\epsilon, 1+\epsilon)`$ forces the ratio into that interval and $`\epsilon`$ is the clip range. Among the values the paper compared (0.1, 0.2 and 0.3 on continuous-control tasks) 0.2 did best; its Atari runs started at 0.1 and annealed it towards 0 over training.
How the min works, one case at a time:
- **Good action (**$`\hat{A} > 0`$**).** The surrogate wants $`r_t`$ up. Once $`r_t > 1 + \epsilon`$ the clipped term is the smaller one, and it is constant in $`\theta`$: the objective goes flat, the gradient is zero, and there is no incentive to push further.
- **Bad action (**$`\hat{A} < 0`$**).** The surrogate wants $`r_t`$ down. Once $`r_t < 1 - \epsilon`$ the objective goes flat in the same way.
- **A ratio that moved the wrong way** (down for a good action, up for a bad one) is never clipped: there the unclipped term is the smaller one, so the full gradient pulls it back. The clip only removes the incentive to exploit further; it never stops the correction of a mistake.
Worked example with $`\epsilon = 0.2`$:
<table header-row="true">
<tr>
<td>Case</td>
<td>$`r_t \hat{A}_t`$</td>
<td>$`\mathrm{clip}(r_t)\, \hat{A}_t`$</td>
<td>Objective (the min)</td>
<td>Gradient</td>
</tr>
<tr>
<td>$`\hat{A} = +2`$, $`r = 1.5`$</td>
<td>3.0</td>
<td>$`1.2 \times 2 = 2.4`$</td>
<td>2.4</td>
<td>zero: already raised past $`1+\epsilon`$</td>
</tr>
<tr>
<td>$`\hat{A} = +2`$, $`r = 0.7`$</td>
<td>1.4</td>
<td>$`0.8 \times 2 = 1.6`$</td>
<td>1.4</td>
<td>active: a good action became less likely, so push it back up</td>
</tr>
<tr>
<td>$`\hat{A} = -1`$, $`r = 0.7`$</td>
<td>-0.7</td>
<td>$`0.8 \times (-1) = -0.8`$</td>
<td>-0.8</td>
<td>zero: already lowered past $`1-\epsilon`$</td>
</tr>
<tr>
<td>$`\hat{A} = -1`$, $`r = 1.5`$</td>
<td>-1.5</td>
<td>$`1.2 \times (-1) = -1.2`$</td>
<td>-1.5</td>
<td>active: a bad action became more likely, so push it back down</td>
</tr>
</table>
The result is TRPO-like stability from a first-order objective, which makes several epochs of minibatch updates on each rollout batch safe (the paper used 10 epochs on continuous control and 3 on Atari). A full PPO loss also carries a value-function regression term for the critic and usually an entropy bonus; much of PPO's practical performance lives in implementation details such as advantage normalisation and learning-rate annealing. This objective, ratios and clip included, is the core of RLHF with PPO and of GRPO.
## Off-policy continuous control: DDPG, TD3, SAC
With continuous actions, DQN's $`\max_{a'} Q(s',a')`$ is itself an optimisation problem. These methods learn an actor that performs that max, and keep DQN's replay buffer and target networks so they can learn off-policy:
- **DDPG** (deep deterministic policy gradient, [Lillicrap et al. 2015](https://arxiv.org/abs/1509.02971)): a deterministic actor $`\mu(s;\theta)`$ trained to maximise the critic's $`Q(s, \mu(s))`$ by following $`\nabla_a Q`$, plus a Q critic trained on the target $`r + \gamma Q(s', \mu(s';\theta^-); w^-)`$. Sample-efficient, but brittle and sensitive to hyperparameters.
- **TD3** (twin delayed DDPG, [Fujimoto et al. 2018](https://arxiv.org/abs/1802.09477)): the overestimation bias of Double DQN's section persists in actor-critic methods, and TD3 fixes it with three changes: **twin critics**, taking the minimum of two Q estimates in the target (clipped double Q-learning); **delayed policy updates**, updating the actor less often than the critic; and **target policy smoothing**, adding small clipped noise to the target action so the critic cannot exploit a narrow peak.
- **SAC** (soft actor-critic, [Haarnoja et al. 2018](https://arxiv.org/abs/1801.01290)): a stochastic actor trained under **maximum-entropy RL**, maximising reward plus an entropy bonus:
$$
J(\pi) = \sum_t \mathbb{E}\big[r(s_t,a_t) + \alpha\, \mathcal{H}(\pi(\cdot \mid s_t))\big], \qquad \mathcal{H}(\pi(\cdot \mid s)) = -\sum_a \pi(a \mid s) \log \pi(a \mid s)
$$
where $`\mathcal{H}`$ is the entropy of the action distribution (an integral for continuous actions) and the temperature $`\alpha`$ sets how much randomness is worth relative to reward. A policy that splits evenly between two actions has entropy $`\ln 2 \approx 0.693`$, worth $`0.2 \times 0.693 \approx 0.139`$ reward per step at $`\alpha = 0.2`$; a deterministic policy earns nothing. The bonus keeps exploration alive and makes training robust across random seeds, which is why SAC is a common off-policy default for continuous control and robotics. The same idea reappears in LLM RL as the KL and entropy terms that stop a policy collapsing onto a single mode.
## The model-based line: AlphaGo to MuZero
These methods plan with **Monte Carlo tree search (MCTS)**: from the current state, repeatedly walk down a tree of possible futures, choosing moves that balance a high value estimate against a high prior probability and a low visit count, expand a new leaf, evaluate it with a network, and back the value up the path. After a fixed number of simulations, the **visit counts** at the root form an improved policy: search is a policy-improvement operator, as in policy iteration on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81baada7e1c05ce69d01"/>.
- **AlphaGo** ([Silver et al. 2016](https://www.nature.com/articles/nature16961)): a policy network first trained by supervised learning on human expert games, then improved by RL self-play, a value network trained to predict game outcomes, and MCTS that uses the known rules of Go as a perfect model and both networks to guide and cut the search.
- **AlphaZero** ([Silver et al. 2017](https://arxiv.org/abs/1712.01815)): drops human data entirely. One network $`f_\theta(s) = (\mathbf{p}, v)`$ with a policy head and a value head is trained on self-play games, where the MCTS visit distribution is the policy target and the game's final result the value target:
$$
\ell = (z - v)^2 - \boldsymbol{\pi}^\top \log \mathbf{p} + c\,\|\theta\|^2
$$
where $`z \in \{-1, 0, +1\}`$ is the game outcome from the player's point of view, $`v`$ the predicted value, $`\boldsymbol{\pi}`$ the MCTS visit distribution, $`\mathbf{p}`$ the network's move probabilities and $`c`$ the weight-decay coefficient. Example: the player went on to win ($`z = 1`$), the network predicted $`v = 0.6`$, search visited three moves in proportions (0.7, 0.2, 0.1) and the network gave them (0.5, 0.3, 0.2). The value term is $`(1 - 0.6)^2 = 0.16`$ and the policy term $`-(0.7 \ln 0.5 + 0.2 \ln 0.3 + 0.1 \ln 0.2) \approx 0.887`$, so the loss before weight decay is about 1.047; the gradient moves $`\mathbf{p}`$ towards what search found. This is self-play policy iteration: search improves the policy, the network distils the improvement, and a better network makes search stronger. From random play, the same algorithm reached superhuman play in chess, shogi and Go within 24 hours of training and defeated a world-champion program in each.
- **MuZero** ([Schrittwieser et al. 2019](https://arxiv.org/abs/1911.08265)): drops the known rules. It learns a model that exists only to support planning, with three functions: a **representation** function $`s^0 = h_\theta(o_1, \dots, o_t)`$ that encodes past observations into a hidden state; a **dynamics** function $`(r^k, s^k) = g_\theta(s^{k-1}, a^k)`$ that predicts the reward and the next hidden state for a candidate action; and a **prediction** function $`(\mathbf{p}^k, v^k) = f_\theta(s^k)`$ that gives a policy and a value. MCTS runs **inside the learned latent model**. The model is trained end to end by unrolling it for $`K`$ steps (5 in the paper) along a real trajectory and matching the predicted rewards, values and policies to the observed rewards, the search values and the MCTS visit distributions. The hidden state is never trained to reconstruct the observation: it only needs to predict what planning uses. The paper ran 800 simulations per search in board games and 50 in Atari. Without the rules, MuZero matched AlphaZero's superhuman performance in Go, chess and shogi and set a new state of the art on 57 Atari games, a domain where model-based planning had historically struggled.
This line matters for LLMs as the ancestry of "search plus a learned value" at test time: long chain-of-thought reasoning in o1 and DeepSeek-R1-style models can be read as sequential search in token space, and MCTS-guided decoding applies AlphaZero's recipe to generation directly.
## Map back to the taxonomy
The three axes of <mention-page url="https://app.notion.com/p/3c65c17b0d0d810b8c5ce46696baf31f"/>: what the agent stores (value, policy or both), whether it uses a model, and whether it learns from its own current policy's data.
<table header-row="true">
<tr>
<td>Method</td>
<td>Stores</td>
<td>Model</td>
<td>Data</td>
<td>Action space</td>
</tr>
<tr>
<td>DQN, Double, Dueling, Rainbow</td>
<td>Value (Q)</td>
<td>Model-free</td>
<td>Off-policy (replay buffer)</td>
<td>Discrete</td>
</tr>
<tr>
<td>REINFORCE</td>
<td>Policy</td>
<td>Model-free</td>
<td>On-policy</td>
<td>Any</td>
</tr>
<tr>
<td>A2C, A3C</td>
<td>Actor-critic</td>
<td>Model-free</td>
<td>On-policy</td>
<td>Any</td>
</tr>
<tr>
<td>TRPO, PPO</td>
<td>Actor-critic</td>
<td>Model-free</td>
<td>Approximately on-policy (ratios correct a slightly stale batch)</td>
<td>Any</td>
</tr>
<tr>
<td>DDPG, TD3, SAC</td>
<td>Actor-critic</td>
<td>Model-free</td>
<td>Off-policy (replay buffer)</td>
<td>Continuous</td>
</tr>
<tr>
<td>AlphaGo, AlphaZero</td>
<td>Actor-critic (policy and value heads)</td>
<td>Model-based, given model (the rules)</td>
<td>Self-play</td>
<td>Discrete</td>
</tr>
<tr>
<td>MuZero</td>
<td>Actor-critic plus a learned model</td>
<td>Model-based, learned latent model</td>
<td>Self-play and replay</td>
<td>Discrete</td>
</tr>
</table>
## Trade-offs and when to use which
- **Discrete actions, simulator cheap or data precious**: the DQN family. Replay makes it sample-efficient, and off-policy learning lets it reuse old data; the price is sensitivity to the deadly triad and no natural way to handle continuous actions.
- **Any action space, stability over sample efficiency**: PPO. It buys simplicity and robustness, and costs data: each batch is used for a few epochs and then thrown away, because it is on-policy.
- **Continuous control, samples expensive (robots)**: SAC, or TD3. Off-policy replay buys sample efficiency; the price is more moving parts (twin critics, target networks, a temperature).
- **A known model and a combinatorial search space (board games)**: AlphaZero-style search plus learned policy and value. With no model but a need to plan: MuZero, at a large compute cost per decision.
- **The bias-variance dial runs through all of it**: Monte Carlo returns (REINFORCE, $`\lambda = 1`$) are unbiased and noisy; TD targets and critics ($`\lambda = 0`$) are stable and biased; GAE and n-step returns choose a point between.
- **LLM post-training**: PPO with a value model, or GRPO, which deletes the critic and uses a group-mean baseline; the reasons and the corrections are on <mention-page url="https://app.notion.com/p/3c65c17b0d0d818c9bcff7177325fe56"/>.
## Common mistakes and misconceptions
- **"DQN was stabilised by replay and a target network from the start."** The 2013 version used replay; the target network arrived with the 2015 Nature version.
- **"Overestimation needs biased estimates."** Every individual estimate can be unbiased; the max of noisy estimates is still biased upwards.
- **"A baseline biases the gradient."** Any baseline that depends only on the state leaves it unbiased; a baseline that depends on the action would not.
- **"PPO's clip bounds the ratio."** It bounds only the incentive: nothing stops the ratio leaving $`[1-\epsilon, 1+\epsilon]`$ during several epochs, and the gradient that fixes a wrong-way move is never clipped. Monitoring the fraction of clipped tokens and the KL to the old policy is how practitioners see drift.
- **"PPO is on-policy, so it cannot reuse data."** It reuses each batch for several epochs; the ratio corrects for the drift, which is why it is only approximately on-policy.
- **"Off-policy means offline."** DQN and SAC interact with the environment online and learn off-policy from a replay buffer.
- **"MuZero learns a model of the environment."** It learns a model of what planning needs (rewards, values, policies); its hidden state is never trained to reproduce observations.
- **"Entropy bonuses are a hack."** In SAC the entropy is part of the objective being optimised, with a principled temperature.
## How it connects
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8195a6c6c11ad093c16e">Topic: rl</mention-page>: the map of the RL topic, from the vocabulary through the classical methods and this page to RL for LLMs.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d810b8c5ce46696baf31f"/>: the vocabulary this page assumes: MDPs, returns, V and Q, the Bellman equations, on-policy against off-policy and importance sampling.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81baada7e1c05ce69d01"/>: policy iteration, the evaluate-and-improve loop that AlphaZero runs with search as the improvement step.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81898a0cd4c05c744969"/>: tabular Q-learning, TD errors and TD($`\lambda`$), which DQN and GAE put onto networks.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d818c9bcff7177325fe56"/>: PPO for RLHF with its four models, and GRPO, which deletes the critic and uses a group-mean baseline.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8196a6f1f29a817aa974"/>: what the optimiser exploits when the reward is a proxy.
## Best resources
- OpenAI Spinning Up: [https://spinningup.openai.com](https://spinningup.openai.com) (docs, \~3h for the core pages): especially "Intro to Policy Optimization" and the algorithm docs (VPG, TRPO, PPO, DDPG, SAC) with reference implementations.
- Lilian Weng, "Policy Gradient Algorithms": [https://lilianweng.github.io/posts/2018-04-08-policy-gradient/](https://lilianweng.github.io/posts/2018-04-08-policy-gradient/) (\~45 min): the best single derivation chain from REINFORCE through TRPO/PPO to SAC.
- Berkeley CS285 (Sergey Levine), Deep RL course: [https://rail.eecs.berkeley.edu/deeprlcourse/](https://rail.eecs.berkeley.edu/deeprlcourse/) (course, \~25h): lecture-depth treatment of everything here.
- "The 37 Implementation Details of PPO": [https://iclr-blog-track.github.io/2022/03/25/ppo-implementation-details/](https://iclr-blog-track.github.io/2022/03/25/ppo-implementation-details/) (\~50 min): mandatory before implementing PPO or GRPO; most "algorithm" gains live in these details.
- David Silver's Lecture 6-7 (function approximation, policy gradients): [https://www.davidsilver.uk/teaching/](https://www.davidsilver.uk/teaching/) (3h): bridges the classical material to this page.
</content>
</page>