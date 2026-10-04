Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d81898a0cd4c05c744969 as of 2026-10-03T23:46:02.501Z:
<page url="https://app.notion.com/p/3c65c17b0d0d81898a0cd4c05c744969">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d8195a6c6c11ad093c16e" title="Topic: rl"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Model-free prediction and control: Monte Carlo, TD, SARSA, Q-learning"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
<embed src="https://prod-files-secure.s3.us-west-2.amazonaws.com/13e79c56-ebab-4528-83aa-967a204b1f04/430fb7af-8b3f-4e0a-ad7c-ab74f7c21a31/model-free-methods-monte-carlo-td-sarsa-q-learning.html?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB4666IVRFXZO%2F20261003%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261003T234722Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEO7%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJIMEYCIQCG81h%2BGOBjiUHNc2Dj7bWBMeFCCsINuTbBtRBRSAXPngIhAIxFHWP2NJiska7rXjfSkFdwQ9Z9cAlgcEGfGnc7R%2BB5KogECLf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igz7H33EwGtvl269Etsq3APOXFuAJvIgS5cRUinMh7lNEpxQPbeWddVk%2BiJ2%2B00L%2BG3V5WdBP7oyEgwRaPp%2Bb3TPphjodW7A3wNGRd6vi6VLfCIm0CUdtc6nLtIdC4A2pGMuVjPn7Jw3ff4LAhCl1fcej5PfIAQVCbZbPJio6jqC8QdL2FNgVk2AVlkgh5EQNdU8xfmMwnhawkxhydZNNxXDGi8IPYbIb%2F0g0oI2MdgKO6blNFxhzkdctxlucRyZBO19V8zdMHSSZBxnPv9QTYMH9S1kzIINf8dTT%2BIU97%2FISspNrNTHUk%2FHIQKioTSuwT6T4ox0DeG%2F0kF%2BXiAV6wQgLnUJXMo8eiYPtBiI0pfrckmgrE4wS3Bo1Bhi6CrGxmV4KCaJya8zvfdc9fiwWrbb0keB1Z2uQ5ydwjNsp0pjPfkZ%2BDR3LH%2FgalYBU0bO6SZlNzVwHJD%2BuUw5%2FXe3hYk4tOqZM%2BeoOmknbqkCk5J0S55KEJEa%2BHNk09vZqfL5EUKfYPHL25%2FX0ien0Uqln8Hq0BfoKMCJKplbR2FlzgF34%2FvzuObhjksRYppS9%2FycsHAf9l5dPlffQ36WvLkcPQ5GVmb93C5XCqCWfM6Jyi5CzOFsFJWAWw79gIx8EVD8HTcUmOiA0AAzHCR00DCg8IXWBjqkASIVpvQeZ%2BXpvysYTmq7TVeif4KmkfhS0Fj0mQl%2FopzsJCFTHWkdVOy3D%2Fbf2Jci8FJCUKMmQDTvZJMg9k%2Fhj3mMrT9n3WuNyATvI4ywC4bLiZgcUTLuZlwz3%2FILLT1Q84o937TIordUWedHfdRwDwZh849dszLBMX6hrwU%2BmQt98ekB7jci%2BZc6xd4eE9uowy4kIanp5nssXdQXj2o2SJl670WJ&X-Amz-Signature=fd071ebe7e3f95c384e733ad3ec2ae64d2f820dd3118becc7e7cf2f749de080f&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.91235f7b-7103-4186-bd9c-a17b3d2fb35e.13e79c56-ebab-4528-83aa-967a204b1f04">Interactive: Model-free methods: Monte Carlo, TD, SARSA, Q-learning</embed>
⏱ 20 min read · +5h 40m resources
## What it is and why it matters
Model-free reinforcement learning learns values and policies **from experience alone**: the agent never sees the transition probabilities or the reward function, it only acts and observes what happens. Every method on this page answers one question: when the expectation over next states that dynamic programming computes from a model is unavailable, what do you replace it with?
- **Monte Carlo** (MC) replaces it with the **whole sampled return**: play an episode to the end and use what actually happened.
- **Temporal-difference** (TD) learning replaces it with **one sampled step plus the current estimate** of where that step landed: learn a guess from a guess, online, after every step.
- **SARSA** and **Q-learning** turn TD evaluation into control. SARSA learns the value of the exploratory policy it is actually running (on-policy); Q-learning learns the value of the greedy policy while behaving exploratorily (off-policy).
Two ideas carry the whole page. First, MC and TD are the two ends of one **bias-variance dial**, and n-step returns and TD(λ) are the settings in between. Second, **on-policy versus off-policy** decides what the learned values mean, which shows up vividly on the cliff-walking gridworld below: SARSA learns a safe detour, Q-learning learns the risky optimal edge.
It matters beyond tabular RL because every modern target is one of these. DQN regresses a network onto the Q-learning target, PPO's critic learns a TD target and its advantage estimator is a TD(λ) average, and GRPO's single end-of-sequence reward is a Monte Carlo return (see *Where this goes next*).
## Model-free vs model-based
The power of model-free RL: you do not need a model of the environment or any understanding of its dynamics. You sample from it (interact with it) and work out the optimal policy from experience. This also covers the case where a model exists but is too big to use except by sampling, such as the game of Go ([Silver, Lecture 5 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-5-model-free-control-.pdf)). The price: you only learn about states you actually visit, which creates the exploration problem below.
<mention-page url="https://app.notion.com/p/3c65c17b0d0d81baada7e1c05ce69d01"/> computes values from a known model with **full-width backups**: every state, every action, every successor weighted by its probability. Model-free methods use **sample backups**: one sampled transition (TD) or one sampled episode (MC) stands in for the expectation, so the cost of an update no longer depends on the number of states, and no model is needed.
## Definitions
The vocabulary is owned by <mention-page url="https://app.notion.com/p/3c65c17b0d0d810b8c5ce46696baf31f"/>; the parts this page uses:
- An **episode** is one run from a start state to a terminal state: $`S_0, A_0, R_1, S_1, A_1, R_2, \dots, S_T`$, where $`S_t`$ is the state at time $`t`$, $`A_t`$ the action taken there, $`R_{t+1}`$ the reward that follows it, and $`T`$ the time step at which the episode terminates.
- The **return** from time $`t`$ is $`G_t = R_{t+1} + \gamma R_{t+2} + \dots + \gamma^{T-t-1} R_T`$, the discounted sum of the rewards still to come, with discount factor $`\gamma \in [0,1]`$.
- The **state value** $`V_\pi(s) = \mathbb{E}_\pi[G_t \mid S_t = s]`$ is the expected return from $`s`$ following policy $`\pi`$; the **action value** $`Q_\pi(s,a)`$ is the expected return after taking $`a`$ in $`s`$ and following $`\pi`$ afterwards. $`V(s)`$ and $`Q(s,a)`$ without a subscript are the agent's current estimates, stored in a table with one entry per state or state-action pair.
- **Prediction** estimates $`V_\pi`$ or $`Q_\pi`$ for a fixed policy; **control** finds a good policy.
- An update moves an estimate towards a **target** by a **step size** $`\alpha \in (0,1]`$: new estimate = old estimate + $`\alpha`$ (target minus old estimate). The methods on this page differ only in the target.
- **Bootstrapping**: the target contains an existing estimate. **Sampling**: the target uses sampled transitions instead of an expectation computed from a model. DP bootstraps without sampling, MC samples without bootstrapping, TD does both ([Silver, Lecture 4 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-4-model-free-prediction-.pdf)).
- **On-policy** methods learn about the policy that generates the data; **off-policy** methods learn about a **target policy** $`\pi`$ from data generated by a different **behaviour policy** $`\mu`$.
## Monte Carlo policy evaluation
Core idea: follow the policy for complete episodes and average the returns that actually followed each state. The value is literally the mean return, so by the law of large numbers the estimate converges to $`V_\pi(s)`$ as the number of visits grows ([Silver, Lecture 4 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-4-model-free-prediction-.pdf)).
1. Run an episode with policy $`\pi`$ until it terminates.
2. Walk backwards through it computing each return, $`G_t = R_{t+1} + \gamma G_{t+1}`$ with $`G_T = 0`$.
3. For each visited state, move its estimate towards the return that followed it.
**First-visit** MC uses only the first visit to a state in each episode; **every-visit** MC uses every visit. Both converge. The running average can be kept incrementally, because a mean satisfies $`\mu_k = \mu_{k-1} + \tfrac{1}{k}(x_k - \mu_{k-1})`$, where $`\mu_k`$ is the mean of the first $`k`$ samples $`x_1, \dots, x_k`$. Replacing $`1/k`$ by a constant step size gives **constant-α MC**, which forgets old episodes and so tracks a changing (non-stationary) problem:
$$
V(S_t) \leftarrow V(S_t) + \alpha \big( G_t - V(S_t) \big)
$$
where:
- $`V(S_t)`$ is the current estimate for the state visited at time $`t`$;
- $`G_t`$ is the return actually observed from time $`t`$ to the end of the episode;
- $`\alpha`$ is the step size ($`1/N(S_t)`$, with $`N(S_t)`$ the visit count, gives the exact running mean);
- $`G_t - V(S_t)`$ is the error the update shrinks.
Properties:
- **Unbiased**: $`G_t`$ is a sample of exactly the quantity $`V_\pi(S_t)`$ is the expectation of.
- **High variance**: $`G_t`$ depends on every random action, transition and reward until the end of the episode.
- **Needs episodes that terminate**: the target is unknown until the episode ends, so MC only applies to episodic tasks and learns nothing mid-episode.
- It does not rely on the Markov property, so it copes better when the state does not capture everything that matters ([Silver, Lecture 4 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-4-model-free-prediction-.pdf)).
## Temporal-difference (TD) learning
Core idea: do not wait for the real return. After one step, you know one real reward and where you landed, and you already have an estimate of how good that place is. Use reward plus discounted estimate as the target. TD "updates a guess towards a guess".
$$
V(S_t) \leftarrow V(S_t) + \alpha \big( R_{t+1} + \gamma V(S_{t+1}) - V(S_t) \big)
$$
where:
- $`R_{t+1}`$ is the reward received on the step from $`S_t`$ to $`S_{t+1}`$;
- $`\gamma V(S_{t+1})`$ is the discounted current estimate of the next state (0 if $`S_{t+1}`$ is terminal);
- $`R_{t+1} + \gamma V(S_{t+1})`$ is the **TD target**;
- $`\delta_t = R_{t+1} + \gamma V(S_{t+1}) - V(S_t)`$ is the **TD error**, the surprise on this step;
- $`\alpha`$ is the step size.
This is TD(0), the one-step case. Compare it with the DP backup for policy evaluation, $`V(s) \leftarrow \mathbb{E}_\pi[R_{t+1} + \gamma V(S_{t+1}) \mid S_t = s]`$: TD is the same backup with the expectation replaced by one sample and a step of size $`\alpha`$ towards it.
Properties ([Silver, Lecture 4 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-4-model-free-prediction-.pdf)):
- **Online and incomplete episodes**: it learns after every step, so it works on continuing (non-terminating) tasks.
- **Biased**: the target leans on $`V(S_{t+1})`$, which may be wrong. The ideal target $`R_{t+1} + \gamma V_\pi(S_{t+1})`$ would be unbiased; the one actually used is not, and TD is more sensitive to the initial values than MC.
- **Low variance**: the target depends on one random action, transition and reward, not on a whole episode.
- **Usually more sample-efficient** than MC, because it exploits the Markov property. Tabular TD(0) converges to $`V_\pi`$, but, unlike MC, not always once the table is replaced by a function approximator.
### Worked example: MC and TD on one random-walk episode
The standard test problem is the five-state random walk ([Sutton and Barto, Example 6.2](http://incompleteideas.net/book/RLbook2020.pdf)). States A, B, C, D, E sit in a row. Every episode starts in C and moves left or right with probability 0.5 each; it ends when it steps off either end. Stepping off the right end earns a reward of 1; every other reward is 0, and there is no discounting ($`\gamma = 1`$). So the true value of a state is the probability of finishing on the right: $`V_\pi = (1/6, 2/6, 3/6, 4/6, 5/6)`$ for A to E. All estimates start at 0.5, and $`\alpha = 0.1`$.
Episode: C → D → E → off the right end, rewards 0, 0, 1.
**TD(0)** updates after every step:
- C → D: $`\delta = 0 + 0.5 - 0.5 = 0`$, so V(C) stays 0.5.
- D → E: $`\delta = 0 + 0.5 - 0.5 = 0`$, so V(D) stays 0.5.
- E → end: $`\delta = 1 + 0 - 0.5 = 0.5`$, so V(E) becomes 0.5 + 0.1 × 0.5 = 0.55.
**MC** waits for the end. Every visited state had return $`G = 1`$ (the final reward, undiscounted), so V(C), V(D) and V(E) each become 0.5 + 0.1 × (1 - 0.5) = 0.55.
MC moved three states, all by the full surprise; TD moved only the last one. TD's information travels backwards one state per episode: next time the walk passes D → E, D's target will be 0 + 0.55 and D will rise to 0.505. MC credits the whole path at once, but each credit carries the full randomness of where that particular walk happened to end. Measured as the root-mean-square error against the true values, averaged over the five states and over 100 runs, TD was consistently better than MC on this task across the step sizes Sutton and Barto compared ([Sutton and Barto, Example 6.2](http://incompleteideas.net/book/RLbook2020.pdf)).
### Batch MC vs batch TD: what each converges to
Given a fixed batch of experience replayed until convergence, the two methods converge to **different answers** ([Sutton and Barto, Example 6.4](http://incompleteideas.net/book/RLbook2020.pdf); [Silver, Lecture 4 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-4-model-free-prediction-.pdf)). Eight episodes, no discounting: one episode A, 0, B, 0 (start in A, reward 0 on the move to B, then reward 0 on terminating); six episodes B, 1; one episode B, 0.
- Both agree $`V(B) = 6/8 = 0.75`$.
- **Batch MC** gives $`V(A) = 0`$: A was seen once and its return was 0. This is the minimum squared error fit to the observed returns.
- **Batch TD** gives $`V(A) = 0.75`$: A always led to B, and B is worth 0.75. This is the value under the **maximum-likelihood Markov model** of the data (certainty equivalence), and if the process really is Markov it predicts future data better.
### TD(lambda) and the relation to MC
Between one step and the whole episode lie the **n-step returns**: take $`n`$ real rewards, then bootstrap.
$$
G_t^{(n)} = R_{t+1} + \gamma R_{t+2} + \dots + \gamma^{n-1} R_{t+n} + \gamma^{n} V(S_{t+n})
$$
where $`G_t^{(n)}`$ is the n-step return from time $`t`$ and $`V(S_{t+n})`$ is the estimate of the state reached after $`n`$ steps. If the episode ends before step $`t+n`$, the return is just the rewards up to the end. $`n = 1`$ is the TD(0) target; $`n = \infty`$ (in practice, the end of the episode) is the Monte Carlo return. **n-step TD** updates $`V(S_t)`$ towards $`G_t^{(n)}`$.
**TD(λ)** averages all n-step returns with geometrically decaying weights, the **λ-return**:
$$
G_t^{\lambda} = (1-\lambda) \sum_{n=1}^{\infty} \lambda^{n-1} G_t^{(n)}
$$
where $`\lambda \in [0,1]`$ sets how fast the weights decay and $`(1-\lambda)`$ makes them sum to 1. In an episode ending at time $`T`$, every n-step return with $`n \ge T-t`$ equals the full return $`G_t`$, so their weights collect into one lump: $`(1-\lambda)\lambda^{n-1}`$ for each $`n < T-t`$ and $`\lambda^{T-t-1}`$ on $`G_t`$ itself. The endpoints recover the two pure methods ([Silver, Lecture 4 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-4-model-free-prediction-.pdf)):
- $`\lambda = 0`$: all the weight on $`G_t^{(1)}`$, one-step TD.
- $`\lambda = 1`$: all the weight on $`G_t`$, Monte Carlo.
So MC and TD are two ends of a single bias-variance dial: more real rewards in the target means less bias and more variance.
**Worked λ-return**, on the random-walk episode above from C at the start (all values 0.5, rewards 0, 0, 1, $`T - t = 3`$): $`G^{(1)} = 0 + V(D) = 0.5`$, $`G^{(2)} = 0 + 0 + V(E) = 0.5`$, and $`G^{(3)} = G = 1`$. With $`\lambda = 0.5`$ the weights are 0.5, 0.25 and the remaining 0.25, so $`G^{\lambda} = 0.5 \times 0.5 + 0.25 \times 0.5 + 0.25 \times 1 = 0.625`$: between TD's target of 0.5 and MC's target of 1.
The λ-return is the **forward view**: like MC, it needs the rest of the episode. The **backward view** computes the same thing online with an **eligibility trace** per state, which records how recently and how often each state was visited:
$$
E_t(s) = \gamma \lambda E_{t-1}(s) + \mathbf{1}(S_t = s), \qquad V(s) \leftarrow V(s) + \alpha\, \delta_t\, E_t(s) \ \text{for every } s
$$
where $`E_t(s)`$ is the trace of state $`s`$ at time $`t`$ (starting at 0), $`\mathbf{1}(S_t = s)`$ is 1 if $`s`$ is the current state and 0 otherwise, and $`\delta_t`$ is the ordinary one-step TD error. Each TD error is broadcast back to recently visited states in proportion to their traces. With $`\lambda = 0`$ only the current state is updated (TD(0)); with $`\lambda = 1`$ and updates applied at the end of the episode, the total update equals the MC update exactly, because the discounted sum of TD errors telescopes into $`G_t - V(S_t)`$ ([Silver, Lecture 4 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-4-model-free-prediction-.pdf)).
### MC vs TD intuition
Silver's driving analogy: you are driving, a car swerves at you, you nearly crash but do not, and the episode ends fine. Monte Carlo only sees the final return, so the near-death moment leaves no trace: the episode ended well, so every state gets credited with a good outcome. TD updates online from the next state's value: the moment the crash looks imminent, the value estimate plunges, and the preceding states are immediately updated toward that plunge. TD propagates the "that was almost a disaster" signal; MC misses it.
<table header-row="true">
<tr>
<td></td>
<td>Monte Carlo</td>
<td>TD</td>
</tr>
<tr>
<td>Target</td>
<td>Actual return $`G_t`$</td>
<td>$`R_{t+1} + \gamma V(S_{t+1})`$ (bootstrapped)</td>
</tr>
<tr>
<td>Waits for episode end</td>
<td>Yes</td>
<td>No (online)</td>
</tr>
<tr>
<td>Bias / variance</td>
<td>Unbiased / high variance</td>
<td>Biased / low variance</td>
</tr>
<tr>
<td>Episodic MDPs required</td>
<td>Yes</td>
<td>No</td>
</tr>
<tr>
<td>Bootstraps</td>
<td>No</td>
<td>Yes</td>
</tr>
<tr>
<td>Sensitive to initial values</td>
<td>Little</td>
<td>More</td>
</tr>
<tr>
<td>Exploits the Markov property</td>
<td>No: better when the state is not fully Markov</td>
<td>Yes: usually more efficient when it is</td>
</tr>
<tr>
<td>Batch solution</td>
<td>Best least-squares fit to observed returns</td>
<td>Exact values of the maximum-likelihood Markov model</td>
</tr>
<tr>
<td>With function approximation</td>
<td>Converges</td>
<td>Not always</td>
</tr>
</table>
## Model-free control: making evaluation and improvement work from samples
Control follows the same two-phase loop as DP policy iteration, evaluate then improve, known as **generalised policy iteration**. Done with Monte Carlo evaluation, both phases break when you only sample:
- Evaluation is no longer guaranteed to cover every state: DP sweeps all states; sampling only touches the states your trajectories visit.
- Greedy improvement is no longer guaranteed to help, because the values it is greedy over may be wrong for unvisited actions: this is the exploration vs exploitation problem showing up in the algorithm itself.
Two standard fixes:
1. **Use Q(s,a), not V(s)**, for evaluation. Acting greedily on V needs a model to know where each action leads, $`\pi'(s) = \arg\max_a [R(s,a) + \gamma \sum_{s'} P(s' \mid s,a) V(s')]`$; acting greedily on Q is just $`\pi'(s) = \arg\max_a Q(s,a)`$ over actions you have estimates for.
2. **ε-greedy exploration**: with probability $`1 - \varepsilon`$ take the greedy action, otherwise an action chosen uniformly at random from all $`m`$ actions, so the greedy action has probability $`1 - \varepsilon + \varepsilon/m`$ and every other action $`\varepsilon/m`$ (the formula is on <mention-page url="https://app.notion.com/p/3c65c17b0d0d810b8c5ce46696baf31f"/>). Every action keeps a non-zero probability, and the ε-greedy policy with respect to $`Q_\pi`$ is guaranteed to be at least as good as the ε-greedy policy $`\pi`$ it came from, so improvement still works ([Silver, Lecture 5 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-5-model-free-control-.pdf)).
Exploration has to fade for the policy to become optimal. A schedule is **GLIE** (greedy in the limit with infinite exploration) when every state-action pair is visited infinitely often and the policy converges to the greedy policy; ε-greedy with $`\varepsilon_k = 1/k`$ on the $`k`$-th episode is GLIE.
**GLIE Monte Carlo control**: sample the $`k`$-th episode with the current ε-greedy policy; for each visited pair increment the count $`N(S_t, A_t)`$ and update $`Q(S_t, A_t) \leftarrow Q(S_t, A_t) + \tfrac{1}{N(S_t,A_t)}(G_t - Q(S_t, A_t))`$; then set $`\varepsilon \leftarrow 1/k`$ and make the policy ε-greedy on the new Q. It converges to the optimal action values, $`Q(s,a) \to Q_*(s,a)`$ ([Silver, Lecture 5 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-5-model-free-control-.pdf)).
## SARSA (on-policy TD control)
Replace MC by TD in the control loop: lower variance, online, works on incomplete episodes. Evaluate Q with a TD update after **every step**, and improve by acting ε-greedily on the latest Q. The update uses the quintuple $`(S, A, R, S', A')`$, hence the name:
$$
Q(S,A) \leftarrow Q(S,A) + \alpha \big( R + \gamma Q(S',A') - Q(S,A) \big)
$$
where:
- $`S, A`$ are the current state and the action taken in it;
- $`R`$ is the reward received and $`S'`$ the next state;
- $`A'`$ is the action the agent **actually takes next**, chosen ε-greedily from $`Q(S', \cdot)`$;
- $`Q(S',A')`$ is 0 if $`S'`$ is terminal;
- $`\alpha`$ is the step size and $`\gamma`$ the discount.
The loop, per episode:
1. Start in $`S`$ and choose $`A`$ ε-greedily from Q.
2. Take $`A`$; observe $`R`$ and $`S'`$.
3. Choose $`A'`$ ε-greedily from Q in $`S'`$.
4. Update $`Q(S,A)`$ with the rule above.
5. Set $`S \leftarrow S'`$, $`A \leftarrow A'`$ and repeat from step 2 until $`S`$ is terminal.
Because $`A'`$ comes from the same ε-greedy policy that is acting, SARSA learns the value of **the policy it is executing, exploration included**: on-policy, model-free, TD control. It converges to $`Q_*`$ if the policies are GLIE and the step sizes $`\alpha_t`$ satisfy the Robbins-Monro conditions $`\sum_t \alpha_t = \infty`$ and $`\sum_t \alpha_t^2 < \infty`$: big enough in total to overcome any initial values, shrinking fast enough for the noise to average out ([Silver, Lecture 5 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-5-model-free-control-.pdf)). With ε held fixed it instead settles on a policy that is good given that it keeps exploring, which is exactly what the cliff example below shows.
Two variants use the same machinery. **n-step SARSA** and **SARSA(λ)** move along the MC-TD dial exactly as TD(λ) does, with n-step Q-returns and one eligibility trace per state-action pair. **Expected SARSA** replaces the sampled $`Q(S',A')`$ with its expectation under the policy, $`\sum_{a'} \pi(a' \mid S') Q(S',a')`$, which removes the variance due to the random choice of $`A'`$ ([Sutton and Barto, Section 6.6](http://incompleteideas.net/book/RLbook2020.pdf)).
## Q-learning (off-policy TD control)
Same shape, but the bootstrap uses the **best** next action rather than the one actually taken:
$$
Q(S,A) \leftarrow Q(S,A) + \alpha \big( R + \gamma \max_{a'} Q(S',a') - Q(S,A) \big)
$$
where $`\max_{a'} Q(S',a')`$ is the largest current estimate over all actions in $`S'`$ (0 if $`S'`$ is terminal), and every other symbol is as for SARSA.
The agent still **behaves** ε-greedily (the behaviour policy $`\mu`$), but the target evaluates the **greedy** policy $`\pi(S') = \arg\max_{a'} Q(S',a')`$ (the target policy). Learning about $`\pi`$ from experience generated by $`\mu`$ is what makes it **off-policy**. No importance-sampling correction is needed, because the target does not use the action $`\mu`$ chose next; the policy only decides which pairs get updated ([Silver, Lecture 5 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-5-model-free-control-.pdf)). The same property is what lets DQN learn from a replay buffer of old experience.
Classification: off-policy, model-free, TD control. It is the sampled, model-free counterpart of value iteration (the max in the target is the Bellman optimality backup), and it is the direct ancestor of DQN (<mention-page url="https://app.notion.com/p/3c65c17b0d0d8180b808c8c0cf8ddbe6"/>). All it needs to converge to $`Q_*`$ is that every state-action pair keeps being updated, plus the usual step-size conditions ([Sutton and Barto, Section 6.5](http://incompleteideas.net/book/RLbook2020.pdf)); ε does not have to decay for the **values** to converge, although it does for the behaviour to become optimal.
**Maximisation bias.** Taking a max over noisy estimates is biased upwards: if several actions all have true value 0 but their estimates scatter above and below 0, the max of the estimates is positive. **Double Q-learning** keeps two tables, $`Q_1`$ and $`Q_2`$, and on each step updates one of them at random, using it to pick the action and the other to value it: $`Q_1(S,A) \leftarrow Q_1(S,A) + \alpha\big(R + \gamma Q_2(S', \arg\max_{a} Q_1(S',a)) - Q_1(S,A)\big)`$, which removes the bias at the cost of double the memory ([Sutton and Barto, Section 6.7](http://incompleteideas.net/book/RLbook2020.pdf)). Double DQN is the same idea with networks.
### Worked example: one transition, two targets
Illustrative numbers. The agent is in S next to a cliff, took A = right, and got $`R = -1`$, with $`\gamma = 1`$, $`\alpha = 0.5`$ and $`Q(S, \text{right}) = -5`$. In the next state S′, $`Q(S', \text{right}) = -4`$ is the best action and $`Q(S', \text{down}) = -100`$ steps into the cliff. The ε-greedy policy happened to pick the exploratory A′ = down.
- **SARSA** uses the action taken: target $`= -1 + (-100) = -101`$; new $`Q(S, \text{right}) = -5 + 0.5 \times (-101 - (-5)) = -53`$.
- **Q-learning** uses the best action: target $`= -1 + (-4) = -5`$; new $`Q(S, \text{right}) = -5 + 0.5 \times (-5 - (-5)) = -5`$, unchanged.
SARSA's value of "right, next to the cliff" absorbs the risk that its own exploration will stumble in; Q-learning's value ignores it, because it assumes greedy behaviour from S′ onwards.
### Cliff walking: SARSA against Q-learning
The standard demonstration is Sutton and Barto's cliff-walking gridworld ([Sutton and Barto, Example 6.6](http://incompleteideas.net/book/RLbook2020.pdf)): a 4 by 12 grid, with the start in the bottom-left corner and the goal in the bottom-right corner ([Gymnasium, Cliff Walking](https://gymnasium.farama.org/environments/toy_text/cliff_walking/)). The ten cells between them along the bottom row are the cliff. Actions are up, down, left and right; every step costs -1, stepping into the cliff costs -100 and sends the agent back to the start, and the task is undiscounted. Both methods act ε-greedily with $`\varepsilon = 0.1`$.
- The optimal path runs along the edge of the cliff: one step up, eleven right, one down, 13 steps and a return of -13. **Q-learning learns the values of this path**, because its target assumes greedy behaviour.
- But the agent is not greedy. On each of the ten cells along the edge, the random 10% of actions picks "down" a quarter of the time, a probability of 0.1/4 = 0.025 per step of falling in. The chance of one pass along the edge without a fall is $`0.975^{10} \approx 0.776`$, so about 22% of passes fall at least once, and Q-learning's **online** return is poor.
- **SARSA learns a longer path through the upper part of the grid** (along the top row it is 17 steps), because its values include its own exploratory stumbles, and it collects more reward per episode than Q-learning while ε stays at 0.1.
- If ε were gradually reduced, both would converge to the optimal edge path.
Which is "right" depends on the question. Q-learning answers "what is optimal if I stop exploring?"; SARSA answers "what is best given that I will keep exploring like this?". For a robot that must explore on real hardware, SARSA's answer is the safer one.
## DP and TD: the same backups, sampled
Each TD control method is a sampled version of a DP method on Q, with $`x \xleftarrow{\alpha} y`$ meaning $`x \leftarrow x + \alpha(y - x)`$ ([Silver, Lecture 5 slides](https://davidstarsilver.wordpress.com/wp-content/uploads/2025/04/lecture-5-model-free-control-.pdf)):
<table header-row="true">
<tr>
<td>Bellman equation</td>
<td>Full backup (DP, needs the model)</td>
<td>Sample backup (TD, model-free)</td>
</tr>
<tr>
<td>Expectation equation for V</td>
<td>Iterative policy evaluation: $`V(s) \leftarrow \mathbb{E}[R + \gamma V(S') \mid s]`$</td>
<td>TD learning: $`V(S) \xleftarrow{\alpha} R + \gamma V(S')`$</td>
</tr>
<tr>
<td>Expectation equation for Q</td>
<td>Q-policy iteration: $`Q(s,a) \leftarrow \mathbb{E}[R + \gamma Q(S',A') \mid s,a]`$</td>
<td>SARSA: $`Q(S,A) \xleftarrow{\alpha} R + \gamma Q(S',A')`$</td>
</tr>
<tr>
<td>Optimality equation for Q</td>
<td>Q-value iteration: $`Q(s,a) \leftarrow \mathbb{E}[R + \gamma \max_{a'} Q(S',a') \mid s,a]`$</td>
<td>Q-learning: $`Q(S,A) \xleftarrow{\alpha} R + \gamma \max_{a'} Q(S',a')`$</td>
</tr>
</table>
## Trade-offs and when to use which
- **MC or TD for prediction.** TD when the task is continuing, episodes are long, or the state is close to Markov: lower variance and learning mid-episode usually win. MC when episodes are short, the state is only partially observed (MC does not rely on the Markov property), or when you will use a function approximator and need the more robust convergence. An intermediate n or λ is often better than either end.
- **SARSA or Q-learning for control.** Q-learning when you want the optimal greedy policy and mistakes during learning are cheap (a simulator), or when learning from old or someone else's data. SARSA when the exploring agent's own performance during learning matters, because it optimises the policy it actually runs. Expected SARSA is a low-variance compromise and becomes Q-learning when its target policy is greedy.
- **The step size α.** Larger α learns faster and fluctuates more around the answer; a constant α never settles exactly but tracks a changing problem.
- **ε.** More exploration finds better actions and costs reward while learning; decay it (GLIE) when the final policy should be greedy.
- **Tables.** Every method here stores one number per state or state-action pair and learns nothing about a state it has not visited; that stops working as soon as the state space is large or continuous.
## Common mistakes and misconceptions
- **"TD is always better than MC."** It usually is on Markov tasks with a table, but it is biased, depends more on the initial values, and can diverge with function approximation where MC does not.
- **Thinking MC and TD converge to the same thing on finite data.** On a fixed batch MC fits the observed returns and TD solves the maximum-likelihood Markov model: $`V(A) = 0`$ against 0.75 in the AB example.
- **Acting greedily on V without a model.** The greedy step over V needs the transition model; model-free control learns Q so that the greedy step is a plain argmax.
- **Choosing SARSA's A′ twice.** SARSA's A′ must be the action actually executed next. If you compute A′ for the update and then pick a different action to execute, you have built something that is neither SARSA nor Q-learning.
- **"Q-learning is off-policy, so it needs importance sampling."** One-step Q-learning does not: its target never uses the behaviour policy's next action. Off-policy MC and off-policy n-step methods do need importance ratios, and those multiply along the trajectory and can blow up the variance.
- **"On-policy means online, off-policy means offline."** Q-learning is off-policy while learning online; the distinction is which policy the values describe.
- **Reading Q-learning's values as the return you will get.** They are the returns of the greedy policy; while ε-greedy exploration continues, the actual return is lower, as on the cliff.
- **Forgetting maximisation bias.** The max over noisy estimates overestimates; Double Q-learning fixes it.
- **Bootstrapping from a terminal state.** $`V(S')`$ and $`Q(S',\cdot)`$ are 0 at a terminal state; bootstrapping from a stale estimate there leaks value past the end of the episode.
## Where this goes next
Everything above stores Q as a table, which dies with large or continuous state spaces. Replacing the table with a neural network, plus the tricks needed to make that stable (a replay buffer, which Q-learning's off-policy target makes legitimate, and a frozen target network), is <mention-page url="https://app.notion.com/p/3c65c17b0d0d8180b808c8c0cf8ddbe6"/>. There, DQN regresses a network onto the Q-learning target, Double DQN applies the double-learning fix above, and actor-critic methods learn a critic with TD targets.
The MC-vs-TD dial also reappears in LLM RL (<mention-page url="https://app.notion.com/p/3c65c17b0d0d818c9bcff7177325fe56"/>). GRPO's single end-of-sequence reward, compared against the mean of a sampled group, is a Monte Carlo return: unbiased, no value model, high variance. PPO with a value model uses generalised advantage estimation (GAE), a λ-weighted average of the TD errors $`r + \gamma V(s') - V(s)`$ from its critic, so it sits partway along the TD(λ) dial, with its own λ choosing the bias-variance trade-off.
Up the tree, <mention-page url="https://app.notion.com/p/3c65c17b0d0d8195a6c6c11ad093c16e">Topic: rl</mention-page> places these methods on its three axes: all four are model-free and value-based; SARSA is on-policy and Q-learning off-policy.
## Best resources
- David Silver's UCL course, Lectures 4-5 ("Model-Free Prediction", "Model-Free Control"): [https://www.davidsilver.uk/teaching/](https://www.davidsilver.uk/teaching/) (3h): the driving/near-crash analogy for MC vs TD is from Lecture 4.
- Sutton & Barto, Chapters 5-7 (MC, TD, n-step): [http://incompleteideas.net/book/the-book-2nd.html](http://incompleteideas.net/book/the-book-2nd.html) (2h 15m): the random-walk experiments make the MC vs TD trade-off concrete.
- Lilian Weng, "A (Long) Peek into RL", sections on MC/TD/SARSA/Q-learning: [https://lilianweng.github.io/posts/2018-02-19-rl-overview/](https://lilianweng.github.io/posts/2018-02-19-rl-overview/) (\~15 min): compact equations for everything here.
- GridWorld TD demo (Karpathy): [https://cs.stanford.edu/people/karpathy/reinforcejs/gridworld_td.html](https://cs.stanford.edu/people/karpathy/reinforcejs/gridworld_td.html) (\~10 min): watch TD learn without a model.
</content>
</page>