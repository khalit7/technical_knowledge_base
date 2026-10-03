Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d810b8c5ce46696baf31f as of 2026-09-30T15:08:01.003Z:
<page url="https://app.notion.com/p/3c65c17b0d0d810b8c5ce46696baf31f">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d8195a6c6c11ad093c16e" title="Topic: rl"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"RL foundations"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
<embed src="https://prod-files-secure.s3.us-west-2.amazonaws.com/13e79c56-ebab-4528-83aa-967a204b1f04/aeb7e76a-d70b-4ecb-be14-4639b8e7b364/rl-foundations.html?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466ZVPMQJH7%2F20261003%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261003T222214Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEO7%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJGMEQCIHl%2FXXxEV5RV16TFM8EMJfvYPzf2Xyg0TUQP3yebFuLsAiAaBnjmtkAPVOfqmBbV7sAfEDxUrNLYTc7ooReX%2BI8pcSqIBAi3%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDYzNzQyMzE4MzgwNSIMeh5LYRh0CoCHxMDPKtwDSMBKz57I1XZSzClII5RQdg9kZZKKk4uWJTToX9zLd8gCvuS172cCfQ8%2FX31hELgDUiuJ0mUpfJG%2FGeKg2BbWq2n0sIOT%2FHKRiZWKmeQfxc%2BlVnFX9YXAJXhG2Xnciu6ixTBccmldBRX4E1vtwe68Hw09Ygbyr1d4G5Nnf0PfkassjEvzdqJs88AxqG5DcCGuNgwURkk5uN5VbedcGWZMDcUh8W7skRKT5yhSvX7TMZoeEcqrjn2jzKFhjDVIQZDoKGGCsCEkJyTRhkMAzcdGDCAx1G31hqx1jxSmUQFjeVVsJlOYUH7Z%2BRPhflCl5ZgyOfmrTy70xMS%2FOT58LYeveLDX1blyeDF%2FqHoFjHtq8fQHYiOCXgWixkzwW201UsSJILchT%2Bbh4mzpnR0Ec6Ys1yZuO2ibeuhQs9vVB%2BZJ%2F7v%2Bpj6nC0hie%2BmSgrTtIfHplCTkD8tcWxAtkZWbrMoKbAupCjgl3gW0KKUQ4mtzU1Qv6sfPVtFn6dnxEdXSGwxl9jfe4hmI8UWFjR4mUYW%2BObsho55cU3CAdseWhw3ZJCYBRTHZl15rZMGa%2BdHwsaawsni%2FQ6SLcjQ2l%2FhrohS72H28ls6hadtRsV%2F9COPNgptQPdIMwpJ5BNvZmPcwz%2B6F1gY6pgFgmwcjVy4wfGDY41NROuQjCM4D6h3pnihRGU5%2BSy1vkqNmbnbBB%2BIqbLs1Rp1TPPln2LVEuuV8IAsO2Uep%2F2qcf7ZMXj%2BOVoJRUzeO7np0c6AisysXHnsFDI%2FWWuO5iN6wEyNPY%2FHJ%2Bdo6fMTmPN8tl7UPM45RDAdbxQurRTzQP2gwgOrJ%2F99i1ZIhfVtOzXw6dQ%2BKQ4veLvdH0jDa9ck5VfjZXFei&X-Amz-Signature=b513c11d8a85ea313648fd17e0ba1421c18baec35286264f0af9a46395ebdd76&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.3f32b6a6-2e8e-47e6-be3d-07905abb3187.13e79c56-ebab-4528-83aa-967a204b1f04">Interactive: RL foundations</embed>
⏱ 23 min read · +5h 50m resources
## What it is and why it matters
Reinforcement learning (RL) is learning to act by trial and error. An **agent** interacts with an **environment**: it takes an action, the environment responds with a new observation and a scalar **reward**, and the agent's goal is to choose actions that maximise the total reward it collects over time. Nobody tells it the correct action. It only learns how good the outcome was, often much later.
Three things set RL apart from supervised learning. The feedback is a score, not a label: it says how good an action was, not which action was right. The feedback can be delayed, so the agent has to work out which earlier action earned a later reward (the **credit assignment** problem). And the agent's own actions decide what data it sees next, so the data are neither fixed nor independent.
This page is the vocabulary and the mathematical skeleton that every other RL page reuses: the agent-environment loop, reward, state and observability, the Markov decision process (MDP), return and discounting, value functions and the Bellman equations, and the distinctions used to classify every algorithm (value-based or policy-based, model-free or model-based, exploration or exploitation, prediction or control, bootstrapping or sampling, on-policy or off-policy). The connection to LLM work is direct: RL from human feedback (RLHF) and RL from verifiable rewards (RLVR) treat token generation as an MDP, so every term here reappears in LLM post-training.
## The agent-environment loop
At each time step $`t`$ ([Silver, Lecture 1](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/intro_rl.pdf)):
1. the agent receives an observation $`O_t`$ and a scalar reward $`R_t`$;
2. it chooses and executes an action $`A_t`$;
3. the environment receives $`A_t`$ and emits the next observation $`O_{t+1}`$ and reward $`R_{t+1}`$, and $`t`$ increments.
So the reward that follows action $`A_t`$ is $`R_{t+1}`$. This indexing, used by Silver and by Sutton and Barto, is why the return below starts at $`R_{t+1}`$. Some texts write $`r_t`$ for the reward of the action taken at $`t`$; only the subscript shifts.
Examples from Silver's first lecture: flying stunt manoeuvres in a helicopter (positive reward for following the desired trajectory, negative for crashing), playing backgammon (positive or negative reward for winning or losing a game), and playing Atari games (reward for increasing the score).
Two problems share this vocabulary. In **learning**, the environment is initially unknown and the agent improves its policy by interacting with it. In **planning**, a model of the environment is known, and the agent improves its policy by computing with the model, without interacting (for example, tree search over a game whose rules are known).
## Reward and the reward hypothesis
- A **reward** $`R_t`$ is a scalar feedback signal for how well the agent is doing at step $`t`$. The agent's job is to maximise **cumulative** reward, not immediate reward, so it can be better to sacrifice reward now to gain more later: refuelling a helicopter costs time now but may prevent a crash hours later, and a financial investment may take months to mature.
- RL rests on the **reward hypothesis**: all goals can be described as the maximisation of expected cumulative scalar reward. This is an assumption, not a theorem, and it breaks in instructive ways for LLMs. Goals such as "helpful" or "honest" have no mathematical definition, so training maximises a **proxy**: a learned reward model, a test suite, an LLM judge. Optimise a proxy hard enough and the policy finds shortcuts that raise the proxy without meeting the intent, such as longer answers because the reward model correlates length with quality, agreeing with the user's wrong claims, or special-casing the tests in coding tasks. That failure, reward hacking, is the subject of <mention-page url="https://app.notion.com/p/3c65c17b0d0d8196a6f1f29a817aa974"/>.
## History and state
- The **history** is everything the agent has observed up to time $`t`$:
$$
H_t = O_1, R_1, A_1, O_2, R_2, A_2, \dots, A_{t-1}, O_t, R_t
$$
It ends with the latest observation and reward and does not yet contain $`A_t`$, because the agent chooses $`A_t`$ from it. What happens next depends on the history: the agent selects actions, and the environment selects observations and rewards. The history grows without bound, which is why agents summarise it.
- A **state** is the information used to determine what happens next. Formally it is any function of the history, $`S_t = f(H_t)`$. Two kinds matter:
	1. The **environment state** $`S^e_t`$ is the environment's private representation: whatever data it uses to pick the next observation and reward. It is usually not visible to the agent, and even when it is, it may contain irrelevant information. It is useful for reasoning about the environment, not an input the agent can use.
	2. The **agent state** $`S^a_t = f(H_t)`$ is the agent's own summary of the history: whatever information it uses to pick the next action. This is the state RL algorithms work with.
- **Markov property**: a state is Markov if the next state depends only on the current one, not on the rest of the history:
$$
\mathbb{P}[S_{t+1} \mid S_t] = \mathbb{P}[S_{t+1} \mid S_1, \dots, S_t]
$$
where $`\mathbb{P}[\,\cdot \mid \cdot\,]`$ is a conditional probability and $`S_1, \dots, S_t`$ are all the states so far. "The future is independent of the past given the present": once a Markov state is known the history can be thrown away, because the state is a sufficient statistic of the future. The environment state is Markov, and so, trivially, is the full history $`H_t`$. The design problem is a compact agent state that is still Markov, or close to it. A single Atari frame is not Markov, because it shows where the ball is but not where it is going; stacking the last few frames, as DQN (deep Q-network) does, recovers the velocity.
## Observability
- **Fully observable**: the agent directly observes the environment state, $`O_t = S^a_t = S^e_t`$. Agent state, environment state and Markov state coincide, and the problem is formally a Markov decision process (MDP, defined below). Most of RL theory lives here.
- **Partially observable**: the agent observes the environment only indirectly. A robot with camera vision is not told its absolute location; a trading agent sees only current prices; a poker agent sees only the public cards. Agent state and environment state now differ, and the problem is formally a **partially observable MDP (POMDP)**. The agent must construct its own state, for example:
	- the complete history, $`S^a_t = H_t`$;
	- a **belief** over environment states, the vector of probabilities $`S^a_t = (\mathbb{P}[S^e_t = s^1], \dots, \mathbb{P}[S^e_t = s^n])`$ over the $`n`$ possible environment states;
	- a learned recurrent summary, an RNN (recurrent neural network) state:
$$
S^a_t = \sigma(W_s S^a_{t-1} + W_o O_t)
$$
where $`\sigma`$ is an elementwise nonlinearity such as the logistic sigmoid or tanh, $`W_s`$ is a learned matrix applied to the previous agent state $`S^a_{t-1}`$, and $`W_o`$ a learned matrix applied to the new observation $`O_t`$.
- LLM connection: a decoder conditioning on its full token prefix is the $`S^a_t = H_t`$ choice. In plain text generation nothing is hidden, since the state is the prompt plus the tokens so far and appending a token is deterministic, so generation is a fully observable MDP.
## Markov process to MRP to MDP
The formal object is built in three steps, each adding one ingredient. The running example is David Silver's student chain: the states Class 1, Class 2, Class 3, Pass, Pub, Facebook and Sleep, where Sleep is terminal ([Silver, Lecture 2](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-2-mdp.pdf)).
1. **Markov process (Markov chain)** $`\langle \mathcal{S}, P \rangle`$: a memoryless random sequence of states $`S_1, S_2, \dots`$ with the Markov property, where $`\mathcal{S}`$ is a finite set of states and $`P`$ is the state transition matrix
$$
P_{ss'} = \mathbb{P}[S_{t+1} = s' \mid S_t = s]
$$
with one row per current state $`s`$ and one column per successor $`s'`$; each row sums to 1. In the student chain, Class 1 goes to Class 2 or Facebook with probability 0.5 each; Class 2 goes to Class 3 with 0.8 or Sleep with 0.2; Class 3 goes to Pass with 0.6 or Pub with 0.4; Pass goes to Sleep with 1.0; Pub goes to Class 1, Class 2 or Class 3 with 0.2, 0.4 and 0.4; Facebook stays on Facebook with 0.9 and returns to Class 1 with 0.1.
1. **Markov reward process (MRP)** $`\langle \mathcal{S}, P, R, \gamma \rangle`$: a Markov chain with rewards. $`R_s = \mathbb{E}[R_{t+1} \mid S_t = s]`$ is the expected reward for leaving state $`s`$, and $`\gamma \in [0,1]`$ is the discount factor. In the student MRP each class gives -2, Facebook -1, Pub +1, Pass +10 and Sleep 0. An MRP defines the return and the value function below.
2. **Markov decision process (MDP)** $`\langle \mathcal{S}, \mathcal{A}, P, R, \gamma \rangle`$: an MRP with decisions. $`\mathcal{A}`$ is a finite set of actions, and transitions and rewards now depend on the action:
$$
P^a_{ss'} = \mathbb{P}[S_{t+1} = s' \mid S_t = s, A_t = a], \qquad R^a_s = \mathbb{E}[R_{t+1} \mid S_t = s, A_t = a]
$$
You no longer drift between states at random: your action moves you, possibly stochastically. The only new ingredient is agency. In the student MDP, from Class 1 you choose Study (-2, to Class 2) or Facebook (-1, to Facebook); from Facebook, Facebook again (-1) or Quit (0, back to Class 1); from Class 2, Study (-2, to Class 3) or Sleep (0, the end); from Class 3, Study (+10, pass, the end) or Pub (+1, after which chance sends you to Class 1, Class 2 or Class 3 with 0.2, 0.4 and 0.4).
A **policy** is a distribution over actions given states, $`\pi(a \mid s) = \mathbb{P}[A_t = a \mid S_t = s]`$. Fixing a policy turns an MDP back into an MRP, with
$$
P^\pi_{ss'} = \sum_a \pi(a \mid s)\, P^a_{ss'}, \qquad R^\pi_s = \sum_a \pi(a \mid s)\, R^a_s
$$
Averaging over the policy's choices removes the agency, which is why evaluating a fixed policy is an MRP problem.
## Return and discounting
The **return** is the total discounted reward from step $`t`$ onwards:
$$
G_t = R_{t+1} + \gamma R_{t+2} + \gamma^2 R_{t+3} + \dots = \sum_{k=0}^{\infty} \gamma^k R_{t+k+1}
$$
where $`R_{t+k+1}`$ is the reward $`k+1`$ steps ahead and $`\gamma \in [0,1]`$ is the discount factor: a reward received $`k+1`$ steps from now counts $`\gamma^k`$ times as much as the same reward now. $`\gamma`$ near 0 gives myopic evaluation, near 1 far-sighted evaluation. The weights $`1, \gamma, \gamma^2, \dots`$ sum to $`1/(1-\gamma)`$, so $`\gamma`$ = 0.9 behaves roughly like a horizon of 10 steps and $`\gamma`$ = 0.99 like 100. In an episodic task the sum stops at the terminal step.
**Why discount (**$`\gamma < 1`$**)?**
1. Cycles: it avoids infinite returns in cyclic or never-ending processes (the student chain can loop on Facebook indefinitely).
2. Uncertainty: the future is less certain than the present, and the model of it may be imperfect, so weight it less.
3. Convenience: with $`\gamma < 1`$ the Bellman operators below are contractions, so iterating them converges to a unique solution from any start.
4. Preference: human and animal behaviour prefers reward sooner, and immediate money can earn interest.
Undiscounted returns ($`\gamma = 1`$) are fine when every sequence is guaranteed to terminate. LLM RL typically uses $`\gamma = 1`$, because every response ends and the reward arrives at the end.
**Worked example: one sampled return.** Start in Class 1 with $`\gamma = 1/2`$ and sample the episode Class 1, Class 2, Class 3, Pass, Sleep. The rewards for leaving each state are -2, -2, -2 and +10, so
$$
G_1 = -2 + \tfrac{1}{2}(-2) + \tfrac{1}{4}(-2) + \tfrac{1}{8}(10) = -2 - 1 - 0.5 + 1.25 = -2.25
$$
Another episode from the same start, Class 1, Facebook, Facebook, Class 1, Class 2, Sleep, gives $`-2 - \tfrac{1}{2} - \tfrac{1}{4} - \tfrac{2}{8} - \tfrac{2}{16} = -3.125`$. The return is a random variable; the value function is its average.
## Value functions: V and Q
The value function is the **expected** return, which removes the randomness of individual episodes. In an MRP, $`V(s) = \mathbb{E}[G_t \mid S_t = s]`$. In an MDP the return depends on how you act, so values are defined for a policy $`\pi`$:
$$
V_\pi(s) = \mathbb{E}_\pi[G_t \mid S_t = s], \qquad Q_\pi(s,a) = \mathbb{E}_\pi[G_t \mid S_t = s, A_t = a]
$$
where:
- $`V_\pi(s)`$, the **state value**, is the expected return from state $`s`$ when following $`\pi`$;
- $`Q_\pi(s,a)`$, the **action value**, is the expected return from taking action $`a`$ in $`s`$ and following $`\pi`$ afterwards;
- $`\mathbb{E}_\pi`$ is an expectation over the randomness of both the policy and the environment.
The two are one step apart:
$$
V_\pi(s) = \sum_a \pi(a \mid s)\, Q_\pi(s,a), \qquad Q_\pi(s,a) = R^a_s + \gamma \sum_{s'} P^a_{ss'}\, V_\pi(s')
$$
The first averages the action values under the policy. The second is a one-step lookahead, and it needs the model: $`P^a_{ss'}`$ and $`R^a_s`$.
That asymmetry is why **Q is what you want for model-free control**. Acting greedily on Q is $`\arg\max_a Q(s,a)`$, a lookup over actions. Acting greedily on V needs the lookahead, and so needs the transition dynamics.
The **optimal** value functions are the best achievable over all policies, $`V_*(s) = \max_\pi V_\pi(s)`$ and $`Q_*(s,a) = \max_\pi Q_\pi(s,a)`$. An MDP is solved once $`Q_*`$ is known, because the policy that picks $`\arg\max_a Q_*(s,a)`$ in every state is optimal. For any MDP there is an optimal policy at least as good as every other policy in every state, and there is always a deterministic one.
## Bellman equations
The Bellman equation breaks a long-horizon problem into one-step pieces: the value of a state is the immediate reward plus the discounted value of the successor state. It follows from the return's own recursion, $`G_t = R_{t+1} + \gamma G_{t+1}`$:
$$
V(s) = \mathbb{E}[G_t \mid S_t = s] = \mathbb{E}[R_{t+1} + \gamma G_{t+1} \mid S_t = s] = \mathbb{E}[R_{t+1} + \gamma V(S_{t+1}) \mid S_t = s]
$$
The last step replaces the random tail $`G_{t+1}`$ by its expectation $`V(S_{t+1})`$, which the Markov property allows. For an MRP with known $`P`$ and $`R`$ this reads
$$
V(s) = R_s + \gamma \sum_{s'} P_{ss'}\, V(s')
$$
where $`R_s`$ is the expected reward for leaving $`s`$, $`P_{ss'}`$ the probability of moving from $`s`$ to $`s'`$, and $`V(s')`$ the value of each successor.
**Bellman expectation equations** (for a fixed policy $`\pi`$):
$$
V_\pi(s) = \sum_a \pi(a \mid s) \Big[ R^a_s + \gamma \sum_{s'} P^a_{ss'}\, V_\pi(s') \Big]
$$
$$
Q_\pi(s,a) = R^a_s + \gamma \sum_{s'} P^a_{ss'} \sum_{a'} \pi(a' \mid s')\, Q_\pi(s',a')
$$
where $`a'`$ is the action taken in the successor $`s'`$ and every other symbol is as above. These are **linear** in the values. In matrix form $`V_\pi = R^\pi + \gamma P^\pi V_\pi`$, with the direct solution
$$
V_\pi = (I - \gamma P^\pi)^{-1} R^\pi
$$
where $`V_\pi`$ and $`R^\pi`$ are column vectors with one entry per state, $`P^\pi`$ is the state-to-state transition matrix under $`\pi`$, and $`I`$ is the identity matrix. Inversion costs $`O(n^3)`$ for $`n`$ states, so the direct solution is only for small problems; large ones use iterative methods (dynamic programming, Monte Carlo, temporal-difference learning).
**Bellman optimality equations** (for the optimal values):
$$
V_*(s) = \max_a \Big[ R^a_s + \gamma \sum_{s'} P^a_{ss'}\, V_*(s') \Big]
$$
$$
Q_*(s,a) = R^a_s + \gamma \sum_{s'} P^a_{ss'} \max_{a'} Q_*(s',a')
$$
The max replaces the average under a policy. It makes the equations **nonlinear**, so in general there is no closed form. They are solved iteratively: by value iteration and policy iteration when the model is known (<mention-page url="https://app.notion.com/p/3c65c17b0d0d81baada7e1c05ce69d01"/>, which sweeps every state with these equations as update rules), and by Q-learning, and SARSA with exploration decaying to greedy, from samples when it is not (<mention-page url="https://app.notion.com/p/3c65c17b0d0d81898a0cd4c05c744969"/>).
Everything downstream, from value iteration to DQN's TD target to the value model in PPO-based RLHF, is a way of approximately solving one of these equations.
## Worked example: values in the student MRP
Solving $`V = (I - \gamma P)^{-1} R`$ for the student MRP, with Sleep terminal at value 0, gives to one decimal:
<table header-row="true">
<tr>
<td>State</td>
<td>γ = 0</td>
<td>γ = 0.9</td>
<td>γ = 1</td>
</tr>
<tr>
<td>Class 1</td>
<td>-2.0</td>
<td>-5.0</td>
<td>-12.5</td>
</tr>
<tr>
<td>Class 2</td>
<td>-2.0</td>
<td>0.9</td>
<td>1.5</td>
</tr>
<tr>
<td>Class 3</td>
<td>-2.0</td>
<td>4.1</td>
<td>4.3</td>
</tr>
<tr>
<td>Pass</td>
<td>10.0</td>
<td>10.0</td>
<td>10.0</td>
</tr>
<tr>
<td>Pub</td>
<td>1.0</td>
<td>1.9</td>
<td>0.8</td>
</tr>
<tr>
<td>Facebook</td>
<td>-1.0</td>
<td>-7.6</td>
<td>-22.5</td>
</tr>
</table>
With $`\gamma = 0`$ every value is just the immediate reward. With $`\gamma = 1`$ Facebook is the worst state: it loops back to itself with probability 0.9, so the agent stays for 10 steps on average at -1 each, then lands in Class 1, itself worth -12.5, for -22.5 in total. (Silver's slide rounds these two to -13 and -23.)
Check the Bellman equation at Class 3 with $`\gamma = 1`$:
$$
V(\text{Class 3}) = -2 + 1 \times (0.6 \times 10 + 0.4 \times 0.8) = -2 + 6 + 0.32 = 4.32
$$
which matches the solved 4.3. Every state satisfies its own one-step equation, and that is what makes the whole vector the value function.
## Worked example: V, Q and the optimal policy in the student MDP
Take $`\gamma = 1`$.
- **Uniform random policy** (each of the two actions with probability 0.5). Solving the Bellman expectation equation gives $`V_\pi`$ = -1.3 (Class 1), 2.7 (Class 2), 7.4 (Class 3) and -2.3 (Facebook). Check at Class 3: $`0.5 \times (1 + 0.2 \times (-1.3) + 0.4 \times 2.7 + 0.4 \times 7.4) + 0.5 \times 10 = 7.4`$, half the time the Pub and half the time Study.
- **Optimal values**: $`V_*`$ = 6 (Class 1), 8 (Class 2), 10 (Class 3) and 6 (Facebook). The action values show why:
	- Class 1: Study $`-2 + 8 = 6`$ against Facebook $`-1 + 6 = 5`$;
	- Class 2: Study $`-2 + 10 = 8`$ against Sleep $`0`$;
	- Class 3: Study $`10`$ against Pub $`1 + 0.2 \times 6 + 0.4 \times 8 + 0.4 \times 10 = 9.4`$;
	- Facebook: Quit $`0 + 6 = 6`$ against Facebook $`-1 + 6 = 5`$.
- **One step of improvement.** The uniform policy's own action values are $`Q_\pi`$(Class 1, Study) = 0.69 against Facebook -3.31; Class 2, Study 5.38 against Sleep 0; Class 3, Study 10 against Pub 4.77; Facebook, Quit -1.31 against Facebook -3.31. Acting greedily on them already gives the optimal policy below, in a single improvement step: prediction serving control.
- The optimal policy is the arg max in each state: Study, Study, Study, and Quit Facebook. Reading it off $`Q_*`$ needed no knowledge of where the Pub leads; reading it off $`V_*`$ would have needed the 0.2, 0.4 and 0.4. Silver's slide prints $`Q_*`$ for the Pub as 8.4; the arithmetic above gives 9.4, and either way Study, at 10, wins.
## What an RL agent may contain
An agent may include any subset of three components ([Silver, Lecture 1](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/intro_rl.pdf)):
- **Policy** $`\pi`$: the behaviour function, a map from state to action. Deterministic, $`a = \pi(s)`$, or stochastic, $`\pi(a \mid s) = \mathbb{P}[A_t = a \mid S_t = s]`$. An LLM is a stochastic policy over tokens.
- **Value function**: a prediction of expected future reward, $`V_\pi`$ or $`Q_\pi`$ above, used to judge how good states or state-action pairs are and so to choose between actions.
- **Model**: the agent's own representation of the environment, predicting what it does next. A **transition model** predicts the next state, $`\hat{P}^a_{ss'} \approx \mathbb{P}[S_{t+1} = s' \mid S_t = s, A_t = a]`$; a **reward model** predicts the next immediate reward, $`\hat{R}^a_s \approx \mathbb{E}[R_{t+1} \mid S_t = s, A_t = a]`$. The hats mark estimates, and the model may be imperfect. In LLM work "reward model" usually means something else: a network trained on human preferences that scores whole responses. It plays the environment's reward role; the agent does not plan with it.
## Taxonomy of RL agents
By what is stored:
1. **Value-based**: store a value function only; the policy is implicit (act greedily with respect to the values). Examples: Q-learning, DQN.
2. **Policy-based**: store the policy directly, with no explicit value function. Example: REINFORCE, which raises the log-probability of each action in proportion to the return that followed it.
3. **Actor-critic**: store both a policy (the actor) and a value function (the critic), which judges the actor's actions and lowers the variance of its updates. Examples: A2C (advantage actor-critic) and PPO (proximal policy optimisation).
By use of a model:
1. **Model-free**: do not model the environment; go directly from experience to a policy or value function. Examples: Monte Carlo, TD learning, SARSA, Q-learning, DQN, PPO, GRPO.
2. **Model-based**: have or build a model of the environment, then plan or simulate with it to predict how the environment responds to actions. Examples: dynamic programming (the model is given), AlphaZero (search over a game's known rules) and MuZero (a learned model, planned inside).
These axes are independent of each other and of the on-policy or off-policy axis below. Where common algorithms sit, as mapped on <mention-page url="https://app.notion.com/p/3c65c17b0d0d8195a6c6c11ad093c16e">Topic: rl</mention-page>:
<table header-row="true">
<tr>
<td>Algorithm</td>
<td>Stores</td>
<td>Model</td>
<td>Learns from</td>
</tr>
<tr>
<td>Value iteration</td>
<td>Value</td>
<td>Model-based (model given)</td>
<td>No experience: it plans</td>
</tr>
<tr>
<td>SARSA</td>
<td>Value (Q)</td>
<td>Model-free</td>
<td>On-policy</td>
</tr>
<tr>
<td>Q-learning</td>
<td>Value (Q)</td>
<td>Model-free</td>
<td>Off-policy</td>
</tr>
<tr>
<td>DQN</td>
<td>Value (Q network)</td>
<td>Model-free</td>
<td>Off-policy</td>
</tr>
<tr>
<td>REINFORCE</td>
<td>Policy</td>
<td>Model-free</td>
<td>On-policy</td>
</tr>
<tr>
<td>A2C</td>
<td>Policy and value</td>
<td>Model-free</td>
<td>On-policy</td>
</tr>
<tr>
<td>PPO</td>
<td>Policy and value</td>
<td>Model-free</td>
<td>Approximately on-policy</td>
</tr>
<tr>
<td>GRPO (group relative policy optimisation)</td>
<td>Policy; a sampled group's mean reward replaces the value</td>
<td>Model-free</td>
<td>Approximately on-policy</td>
</tr>
</table>
## Exploration vs exploitation
- **Exploitation**: use current knowledge to take the action believed best, maximising reward now.
- **Exploration**: deliberately try actions that look worse, to gather information that may pay off later. Silver's everyday examples: go to your favourite restaurant or try a new one; drill for oil at the best known site or at a new location; play the move you believe is best or an experimental one.
- Every RL agent must balance the two. Pure exploitation gets stuck on the first decent behaviour it finds, because it never collects the evidence that something else is better; pure exploration never cashes in what it has learned. The cleanest setting for the trade-off is the **multi-armed bandit**, an MDP with a single state: choose one of several levers, each paying a reward from its own unknown distribution.
- **ε-greedy** (epsilon-greedy) exploration: with probability $`1 - \varepsilon`$ take the greedy action, otherwise an action chosen uniformly at random. With $`m`$ actions:
$$
\pi(a \mid s) = \begin{cases} 1 - \varepsilon + \varepsilon/m & \text{if } a = \arg\max_{a'} Q(s,a') \\ \varepsilon/m & \text{otherwise} \end{cases}
$$
where $`\varepsilon \in [0,1]`$ is the exploration rate, $`m`$ the number of actions and $`Q(s,a')`$ the current action-value estimate. The greedy action also gets its share of the random picks, hence the $`\varepsilon/m`$ added to it. With $`\varepsilon`$ = 0.1 and $`m`$ = 4, the greedy action is taken with probability 0.9 + 0.025 = 0.925 and each other action with 0.025 ([Silver, Lecture 5](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-5-model-free-control-.pdf)). Decaying $`\varepsilon`$ so that the policy becomes greedy in the limit while every action is still tried infinitely often is called GLIE (greedy in the limit with infinite exploration), covered on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81898a0cd4c05c744969"/>.
- Other standard mechanisms: **optimistic initialisation** (start every value estimate high, so a greedy agent is disappointed by whatever it tries and moves on to the untried actions), **entropy bonuses** in deep RL (add the policy's entropy to the objective so it does not collapse onto one action too early), and **temperature and sampling diversity** in LLM rollouts (sampling several different responses per prompt at a temperature around 1 gives GRPO a spread of rewards to learn from).
## Prediction vs control
- **Prediction**: evaluate the future. Given a fixed policy $`\pi`$, how much reward will it collect? Compute $`V_\pi`$ or $`Q_\pi`$.
- **Control**: optimise the future. Find an optimal policy $`\pi_*`$, equivalently $`V_*`$ or $`Q_*`$.
- You usually solve prediction to solve control: evaluate the current policy, improve it by acting greedily with respect to its values, and repeat. With a known model, prediction is **policy evaluation** (apply the Bellman expectation equation as an update to every state until the values stop changing) and control is **policy iteration** (alternate evaluation and greedy improvement) or **value iteration** (apply the Bellman optimality equation as the update directly); these are on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81baada7e1c05ce69d01"/>. Without a model the same loop runs on sampled experience: Monte Carlo and TD learning for prediction, SARSA and Q-learning for control, on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81898a0cd4c05c744969"/>.
## Bootstrapping vs sampling
Two independent axes describe how a value update is built (Silver's "unified view", [Lecture 4](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-4-model-free-prediction-.pdf)):
- **Bootstrapping**: the update target involves an existing estimate. Solve one step, then trust your own current answer for the rest. The update's depth is one step. Dynamic programming and TD bootstrap; Monte Carlo does not.
- **Sampling**: the update uses a sample instead of the full expectation over all successors. The update's width is one trajectory. Monte Carlo and TD sample; dynamic programming does not.
The three targets for estimating $`V_\pi(S_t)`$, side by side:
$$
\text{DP: } \mathbb{E}_\pi\big[R_{t+1} + \gamma V(S_{t+1})\big] \qquad \text{TD: } R_{t+1} + \gamma V(S_{t+1}) \qquad \text{MC: } G_t
$$
where $`V`$ is the current estimate. The DP target averages over every action and successor, which needs the model. The TD target uses the one successor that actually happened. The Monte Carlo target waits for the end of the episode and uses the actual return. The sampling methods then move the estimate part of the way towards the target, $`V(S_t) \leftarrow V(S_t) + \alpha\,(\text{target} - V(S_t))`$, with step size $`\alpha`$.
<table header-row="true">
<tr>
<td></td>
<td>Full width (expectation over successors)</td>
<td>Sampled (one trajectory)</td>
</tr>
<tr>
<td>Bootstraps (depth one step)</td>
<td>Dynamic programming</td>
<td>TD learning</td>
</tr>
<tr>
<td>No bootstrap (depth to the end)</td>
<td>Exhaustive search</td>
<td>Monte Carlo</td>
</tr>
</table>
Bootstrapping buys lower variance and updates before the episode ends, and costs bias, because the target leans on an estimate that may be wrong. Sampling buys independence from the model and costs variance. In the student MRP with $`\gamma = 1/2`$, the Monte Carlo target for Class 1 is a whole sampled return such as -2.25 or -3.125, while the TD target after the step from Class 1 to Class 2 is $`-2 + \tfrac{1}{2} V(\text{Class 2})`$: one real reward plus the current estimate.
## On-policy vs off-policy
- **On-policy** ("learn on the job"): learn about policy $`\pi`$ from experience sampled from $`\pi`$ itself.
- **Off-policy** ("look over someone's shoulder"): learn about a **target policy** $`\pi`$ from experience sampled from a different **behaviour policy** $`\mu`$. Useful for learning from human demonstrations or other agents, reusing data from old policies (replay buffers), learning a greedy target policy while behaving exploratorily, and learning about several policies from one stream of behaviour ([Silver, Lecture 5](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-5-model-free-control-.pdf)).
- The general correction is **importance sampling**: weight each sample by how much more or less likely the target policy was to take the action than the behaviour policy was:
$$
\rho_t = \frac{\pi(A_t \mid S_t)}{\mu(A_t \mid S_t)}
$$
where $`\pi`$ is the target policy, $`\mu`$ the behaviour policy that generated the data and $`\rho_t`$ the importance ratio. It works because $`\mathbb{E}_{X \sim \mu}\big[\tfrac{\pi(X)}{\mu(X)} f(X)\big] = \mathbb{E}_{X \sim \pi}[f(X)]`$ for any function $`f`$. Example: the behaviour policy took an action with probability 0.25 that the target policy would take with probability 0.5, so the sample counts double ($`\rho = 2`$); an action the target policy never takes gets weight 0. Ratios multiply along a trajectory, so off-policy Monte Carlo can have very high variance. One-step Q-learning needs no ratio at all, because its target takes the max over next actions instead of using the action $`\mu`$ chose.
- LLM connection: in PPO and GRPO the rollouts come from a slightly stale copy of the policy, and the inference engine computes slightly different probabilities from the training stack, so LLM RL is mildly off-policy. The per-token ratio of current to rollout-time probability is exactly this correction, clipped for stability; the details are on <mention-page url="https://app.notion.com/p/3c65c17b0d0d818c9bcff7177325fe56"/>.
## Trade-offs and when to use which
- **Value-based, policy-based or actor-critic.** Value-based methods are sample-efficient with discrete actions and can learn off-policy from a replay buffer, but acting needs a max over actions, which is awkward for continuous or huge action spaces. Policy-based methods handle any action space and naturally stochastic policies, but their gradient estimates have high variance. Actor-critic buys lower variance with a learned critic and costs a second model to train: in PPO-based RLHF the value model is as large as the policy, which is exactly what GRPO deletes.
- **Model-free or model-based.** Model-free methods need no model but learn only about the states they visit, and usually need many samples. Model-based methods can plan and reuse the model, but errors in a learned model compound over a plan. A known, small model means plan exactly (dynamic programming); a known but huge one (a board game) means search (AlphaZero); an unknown one means learn from samples or learn a model (MuZero).
- **Monte Carlo or TD.** Monte Carlo is unbiased but high-variance and needs episodes that end; TD is biased but lower-variance, updates online and works on continuing tasks.
- **On-policy or off-policy.** On-policy methods are simpler and more stable but discard data once the policy changes; off-policy methods reuse data, at the price of corrections and instability.
- **The discount.** A larger $`\gamma`$ looks further ahead (the effective horizon is about $`1/(1-\gamma)`$), but returns have more variance and iterative solvers converge more slowly.
## Common mistakes and misconceptions
- **Reward is not value.** The reward is the one-step signal; the return is the discounted sum of rewards along one trajectory; the value is the expected return. A state with a negative reward can have a high value (Class 2 in the student MRP at $`\gamma = 1`$: reward -2, value 1.5).
- **The observation is not the state.** A single Atari frame, or the last message in a chat, can leave out what the future depends on. Markov is a property of the representation you choose.
- **The history does not contain the action being chosen.** $`H_t`$ ends at $`O_t, R_t`$, and the reward for $`A_t`$ is $`R_{t+1}`$.
- **Greedy on V needs a model; greedy on Q does not.** A model-free agent that stores only V cannot pick actions from it.
- **The optimality equation is not linear.** Matrix inversion solves the expectation equation for a fixed policy, not the optimality equation, whose max needs iteration.
- $`\gamma = 1`$** is not always wrong.** It is standard when every episode terminates, as in LLM RL.
- **On-policy does not mean online, and off-policy does not mean offline.** PPO reuses one batch for several epochs of updates and is still approximately on-policy; Q-learning is off-policy while interacting online.
- **An LLM "reward model" does not make a method model-based.** Model-based means the agent predicts transitions and plans with them; a reward model trained on preferences stands in for the reward signal.
- **The reward hypothesis is an assumption.** When the scalar reward is a proxy, maximising it can defeat the intent (reward hacking).
## How it connects
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8195a6c6c11ad093c16e">Topic: rl</mention-page>: the map of the whole RL topic, from this page's vocabulary through the classical methods to RL for LLMs, with the three classification axes drawn as one taxonomy.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81baada7e1c05ce69d01"/>: solving the Bellman equations exactly when the model is known, by policy evaluation, policy iteration and value iteration, with worked sweeps and convergence rates.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81898a0cd4c05c744969"/>: the same evaluate-and-improve loop from samples instead of the model: Monte Carlo, TD, TD(λ), SARSA and Q-learning, and the bias-variance trade between them.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8180b808c8c0cf8ddbe6"/>: replacing the tables with neural networks: DQN, policy gradients and REINFORCE, actor-critic, PPO's clipped objective, and AlphaZero and MuZero.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d818c9bcff7177325fe56"/>: token generation as an MDP (the state is the prefix, the action a token, the reward one scalar at the end), RLHF with PPO, GRPO, RLVR and the off-policy corrections.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8196a6f1f29a817aa974"/>: what goes wrong when the reward is a proxy, the practical limit of the reward hypothesis.
## Best resources
- David Silver's UCL course, Lectures 1-2 (Intro, MDPs): [https://www.davidsilver.uk/teaching/](https://www.davidsilver.uk/teaching/) (3h): the source most of this page's framing comes from; slides plus YouTube videos.
- Sutton & Barto, *Reinforcement Learning: An Introduction*, Chapters 1-3: [http://incompleteideas.net/book/the-book-2nd.html](http://incompleteideas.net/book/the-book-2nd.html) (2h): free PDF, the canonical treatment of MDPs and Bellman equations.
- Lilian Weng, "A (Long) Peek into Reinforcement Learning": [https://lilianweng.github.io/posts/2018-02-19-rl-overview/](https://lilianweng.github.io/posts/2018-02-19-rl-overview/) (\~35 min): the best single-page compression of everything below.
- Spinning Up, "Key Concepts in RL": [https://spinningup.openai.com/en/latest/spinningup/rl_intro.html](https://spinningup.openai.com/en/latest/spinningup/rl_intro.html) (\~15 min): crisp notation reference.
</content>
</page>