"""The Taxonomy tab (t-tax): every axis RL methods are classified on, sharing the atlas rows.

AXES: one entry per axis. 'col' names an atlas column when the axis is one of the grid's own columns
(store, model, data, act); otherwise the per-row values come from TAXV below.
Prose uses two marks the page expands: {s:key|loc} a source link (sources.py), {m:id} a method chip.
Every per-row value is derived here (kind der) from the row's own first paper unless a cell says otherwise;
the 'why' notes say how.
"""

AXES = [
 dict(id='model', col='model', name='Model-based or model-free', vals=[['free', 'Model-free'], ['given', 'Model given'], ['learned', 'Model learned']],
  defn='A model is anything the agent can use to predict how the environment will respond: given a state and an action, the next state and reward {s:sb|8.1}. Model-free methods learn values or policies straight from experience; model-based methods also use a model, either given to them (the rules of Go) or learned from data.',
  q=['sb', 'Given a state and an action, a model produces a prediction of the resultant next state and next reward'],
  sides=[['Model-free', 'Q-learning, DQN, PPO, SAC, GRPO: no model of transitions anywhere.', ['qlearn', 'dqn15', 'ppo', 'sac', 'grpo']],
         ['Model given', 'Dynamic programming and the AlphaGo line use a perfect model (the MDP, the rules).', ['vi', 'pi', 'alphago', 'az']],
         ['Model learned', 'Dyna, MuZero and Dreamer fit a model from data and plan or imagine in it.', ['dyna', 'muzero', 'dreamer']]],
  mis='"RLHF is model-based because it learns a reward model." A reward model scores finished responses; it predicts no next state, and nothing plans with it. The transition (append the chosen token) is known exactly, so there is nothing to model, and RLHF with PPO is model-free.',
  blur='A model can be used two ways: to plan (DP, tree search) or to generate extra training data (Dyna, Dreamer). MuZero\'s model predicts only reward, policy and value, never observations, so whether it is "a model of the environment" depends on the definition.'),
 dict(id='plan', name='Planning or none', vals=[['yes', 'Plans with a model'], ['no', 'No planning']],
  defn='Planning is any computation that takes a model and produces or improves a policy; learning uses real experience {s:sb|8.1}. S&B list "real vs. simulated" experience as its own dimension {s:sb|8.13}.',
  q=['sb', 'Real vs. simulated Should one update based on real experience or simulated'],
  sides=[['Plans', 'Sweeps of the model (DP), tree search at decision time (AlphaZero, MuZero), imagined rollouts (Dyna, Dreamer).', ['vi', 'az', 'muzero', 'dyna', 'dreamer']],
         ['No planning', 'Everything model-free.', ['dqn15', 'ppo', 'grpo']]],
  mis='"Model-based means planning at decision time." Dyna and Dreamer plan only during training; at run time they act from a learned policy or value with no search.',
  blur='Long chains of thought in reasoning models are sometimes read as search in token space, but the training method (GRPO, PPO) is model-free and nothing plans with a model.'),
 dict(id='store', col='store', name='Value-based, policy-based or actor-critic', vals=[['value', 'Value'], ['policy', 'Policy'], ['ac', 'Actor-critic']],
  defn='What the agent learns and keeps: a value function it acts greedily on, a policy it samples from directly, or both. Methods that learn approximations to both policy and value functions are called actor-critic {s:sb|13}.',
  q=['sb', 'Methods that learn approximations to both policy and value functions are often called actor–critic methods'],
  sides=[['Value-based', 'Act by arg max over learned action values.', ['qlearn', 'dqn15', 'rainbow', 'cql']],
         ['Policy-based', 'A parameterised policy with no learned critic; any baseline is a simple statistic.', ['reinforce', 'trpo', 'rloo', 'grpo', 'dpo']],
         ['Actor-critic', 'A policy plus a learned value that judges each action.', ['ac83', 'a2c', 'ppo', 'sac', 'az']]],
  mis='"REINFORCE with a learned baseline is actor-critic." Sutton and Barto: a baseline estimated before the action cannot assess that action; only a critic that bootstraps from the next state can. GRPO and RLOO, with group-mean baselines, are policy methods.',
  q2=['sb', 'is made prior to the transition’s action and thus cannot be used to assess that action'],
  blur='PPO with GAE at lambda = 1 uses its value model only as a baseline, which makes it REINFORCE-like by that definition; at lambda below 1 the critic bootstraps and it is actor-critic.'),
 dict(id='data', col='data', name='On-policy, off-policy or offline', vals=[['plan', 'Planning'], ['on', 'On-policy'], ['off', 'Off-policy'], ['self', 'Self-play'], ['offline', 'Offline']],
  defn='On-policy methods learn the value of the policy they are following; off-policy methods learn about a different policy, usually the greedy one, from data the behaviour policy generated {s:sb|8.13}. Offline methods learn from a fixed dataset with no further interaction {s:cql|abstract}.',
  q=['sb', 'In the former case, the agent learns the value function for the policy it is currently following'],
  sides=[['On-policy', 'SARSA, REINFORCE, A2C, PPO, GRPO.', ['sarsa', 'reinforce', 'a2c', 'ppo', 'grpo']],
         ['Off-policy', 'Q-learning and everything with a replay buffer.', ['qlearn', 'dqn15', 'sac', 'td3']],
         ['Self-play', 'The AlphaGo line: games against itself with the latest network.', ['alphago', 'az']],
         ['Offline', 'A fixed dataset, no interaction: BC, CQL, IQL, Decision Transformer, DPO.', ['bc', 'cql', 'iql', 'dt', 'dpo']]],
  mis='"Off-policy means offline." DQN and SAC interact with the environment the whole time; they are off-policy because they learn from a replay buffer of older behaviour.',
  blur='PPO, GRPO and every LLM RL system reuse a batch for several updates and sample from an inference engine whose probabilities differ slightly from the trainer\'s, so "on-policy" there means approximately on-policy, corrected by importance ratios.'),
 dict(id='online', name='Online or batch', vals=[['online', 'Online (learns while interacting)'], ['batch', 'Batch (fixed data)'], ['none', 'No data (planning)']],
  defn='Whether updates happen as experience arrives or on a fixed batch processed repeatedly. Sutton and Barto\'s batch updating replays a finite set of experience until the values converge {s:sb|6.3}. This is a different axis from on-policy against off-policy: Q-learning is online and off-policy.',
  q=['sb', 'We call this batch updating because updates are'],
  sides=[['Online', 'Learns as it acts; may still replay recent data (DQN).', ['qlearn', 'dqn15', 'ppo', 'grpo']],
         ['Batch', 'A fixed dataset processed repeatedly.', ['bc', 'cql', 'iql', 'dt', 'dpo']]],
  mis='"Online and on-policy are the same thing." Q-learning learns online about the greedy policy, not the one it runs.',
  blur='Iterated DPO and offline-to-online fine-tuning (IQL) collect new batches between phases, so they move between the two.'),
 dict(id='pc', name='Prediction or control', vals=[['pred', 'Prediction'], ['ctrl', 'Control']],
  defn='Prediction estimates the value function of a given policy; control finds an optimal policy {s:sb|6}. Most control methods are generalised policy iteration: they differ mainly in how they do prediction.',
  q=['sb', 'the policy evaluation or prediction problem, the problem of estimating the value function'],
  sides=[['Prediction', 'TD(0), TD(lambda), and GAE as an advantage estimator.', ['td0', 'tdl', 'gae']],
         ['Control', 'Everything that changes the policy.', ['qlearn', 'ppo', 'grpo']]],
  mis='"TD learning is a control algorithm." TD(0) only evaluates a fixed policy; SARSA and Q-learning are its control forms.',
  blur='Inside actor-critic methods the critic does prediction while the actor does control, so one method contains both.'),
 dict(id='depth', name='Depth of the update: Monte Carlo or bootstrapping', vals=[['one', 'One step (bootstraps)'], ['multi', 'Several steps (n-step, lambda)'], ['full', 'Full return (Monte Carlo)'], ['none', 'No return estimated']],
  defn='How far the target looks ahead before it bootstraps from an estimate: one step (TD), n steps or a lambda-mix, or all the way to the end (Monte Carlo). The vertical axis of Sutton and Barto\'s unified view {s:sb|8.13}.',
  q=['sb', 'The vertical dimension of Figure 8.11 corresponds to the depth of updates, that is, to the degree of bootstrapping'],
  sides=[['Bootstraps', 'One-step targets: TD(0), Q-learning, DQN, SAC.', ['td0', 'qlearn', 'dqn15', 'sac']],
         ['In between', 'n-step returns and lambda-returns: TD(lambda), GAE, A2C, PPO, Rainbow.', ['tdl', 'gae', 'a2c', 'ppo', 'rainbow']],
         ['Monte Carlo', 'The whole return: MC control, REINFORCE, GRPO, RLOO.', ['mc', 'reinforce', 'grpo', 'rloo']]],
  mis='"Bootstrapping means resampling." In RL it means building a target from the agent\'s own current estimates.',
  blur='With one reward at the end of a response and gamma = 1, a one-step and a full return differ only in where the value model enters, which is why GRPO can drop the critic and lose little.'),
 dict(id='width', name='Width of the update: sample or expected', vals=[['sample', 'Sample update'], ['exp', 'Expected update'], ['none', 'No update of values']],
  defn='Whether a target uses one sampled successor or the expectation over all successors, which needs a distribution model. The horizontal axis of the unified view {s:sb|8.13}.',
  q=['sb', 'The horizontal dimension is whether they are sample updates (based on a sample trajectory) or expected updates (based on a distribution of possible trajectories)'],
  sides=[['Expected', 'Dynamic programming, from the model.', ['vi', 'pi']],
         ['Sample', 'Everything that learns from experience.', ['td0', 'mc', 'qlearn', 'ppo']]],
  mis='"Expected SARSA needs a model." It takes the expectation over its own policy\'s next action, which it knows, not over next states.',
  blur='Expected SARSA, and DQN\'s max over actions, are expected over actions but sampled over next states: partly wide.'),
 dict(id='approx', name='Tabular or function approximation', vals=[['tab', 'Tabular'], ['fa', 'Function approximation']],
  defn='One stored number per state or state-action pair, or a parameterised function (linear, neural network) that generalises across states. Combining function approximation with bootstrapping and off-policy training is the deadly triad, which can diverge {s:sb|11.3}.',
  q=['sb', 'the danger of instability and divergence arises whenever we combine all of the following three elements'],
  sides=[['Tabular', 'Part I of Sutton and Barto.', ['vi', 'mc', 'qlearn', 'sarsa']],
         ['Function approximation', 'Every deep method.', ['dqn15', 'ppo', 'grpo']]],
  mis='"DQN\'s tricks are about speed." Replay and the target network are there because DQN sits inside the deadly triad.',
  blur='Tile coding and state aggregation are function approximators that behave much like tables.'),
 dict(id='act', col='act', name='Discrete or continuous actions', vals=[['disc', 'Discrete'], ['cont', 'Continuous'], ['both', 'Both'], ['tok', 'Tokens']],
  defn='A max over actions is easy when they can be listed and impossible when they cannot, so value methods need discrete actions, and continuous control needs a policy or an actor that performs the max {s:ddpg|abstract}.',
  q=['ddpg', 'We adapt the ideas underlying the success of Deep Q-Learning to the continuous action domain'],
  sides=[['Discrete', 'The DQN family, board games.', ['dqn15', 'rainbow', 'az']],
         ['Continuous', 'DDPG, TD3, SAC.', ['ddpg', 'td3', 'sac']],
         ['Tokens', 'Language models: discrete, but about 10^5 actions per step.', ['rlhf', 'grpo']]],
  mis='"Tokens are a small discrete action space." A vocabulary of a hundred thousand actions per step is why LLM RL uses policy methods, not Q-learning.',
  blur='Discretising a continuous action works for low dimensions and fails as dimensions grow.'),
 dict(id='pol', name='Deterministic or stochastic policy', vals=[['det', 'Deterministic (greedy)'], ['stoch', 'Stochastic'], ['varies', 'Either'], ['na', 'No policy (prediction)']],
  defn='A greedy policy picks one action; a stochastic one samples from a distribution. A parameterised soft-max policy can approach a deterministic one, while epsilon-greedy over values always keeps epsilon of random action {s:sb|13.1}.',
  q=['sb', 'the approximate policy can approach a deterministic policy, whereas with'],
  sides=[['Deterministic', 'Greedy on Q (DQN), deterministic actors (DDPG, TD3).', ['dqn15', 'ddpg', 'td3']],
         ['Stochastic', 'Policy-gradient methods, SAC, every LLM policy.', ['reinforce', 'ppo', 'sac', 'grpo']]],
  mis='"A greedy learner never explores." It explores through its behaviour policy (epsilon-greedy, noise); the learned target policy is the greedy one.',
  blur='An LLM sampled at temperature 0 is deterministic; at training time it is sampled stochastically.'),
 dict(id='task', name='Episodic or continuing', vals=[['episodic', 'Episodic'], ['both', 'Either'], ['continuing', 'Continuing']],
  defn='Episodic tasks end (a game, one response); continuing tasks go on without limit, which needs discounting or average reward {s:sb|3.3-3.4}. Monte Carlo methods need episodes to end.',
  q=['sb', 'We call these continuing tasks'],
  sides=[['Episodic', 'Games, Atari, one LLM response.', ['mc', 'reinforce', 'az', 'grpo']],
         ['Continuing or either', 'TD methods work on both.', ['td0', 'qlearn', 'ppo']]],
  mis='"Discounting is only about impatience." In continuing tasks it is what keeps the return finite.',
  blur='Long agentic LLM tasks are episodic but so long that credit assignment behaves as in continuing tasks.'),
 dict(id='obs', name='Fully or partially observable', vals=[['full', 'Fully observable'], ['partial', 'Partially observable'], ['varies', 'Depends on the task']],
  defn='Whether the agent sees the whole state or only observations of it. Function approximation also makes RL applicable to partially observable problems {s:sb|9}; S&B chapter 17.3 treats observations and state.',
  q=['sb', 'makes it applicable to partially observable problems, in which the full state is not available'],
  sides=[['Fully observable', 'Board games; an LLM\'s prefix is its whole state.', ['az', 'grpo']],
         ['Partially observable', 'Atari from frames: DQN stacks the last 4 to recover motion; Dreamer learns a latent state.', ['dqn13', 'dreamer']]],
  mis='"LLM RL is partially observable because the model cannot see the reward." The state (prompt plus tokens so far) is fully known; the difficulty is the delayed reward.',
  q2=['mnih13', 'the last 4 frames of a history and stacks them'],
  blur='Frame stacking turns a partially observable problem into an approximately Markov one.'),
 dict(id='agents', name='Single-agent or multi-agent', vals=[['single', 'Single agent'], ['self', 'Self-play (two-player)'], ['multi', 'Multi-agent']],
  defn='One agent in a stationary environment, or several agents whose learning changes each other\'s environment: cooperative, competitive, or the same agent playing itself. Sutton and Barto point to surveys of multi-agent extensions and leave the subject out {s:sb|1 notes}.',
  q=['sb', 'of multi-agent extensions to the approach that we introduce in this book'],
  sides=[['Single agent', 'Almost every row of the atlas.', ['dqn15', 'ppo', 'grpo']],
         ['Self-play', 'AlphaGo Zero and AlphaZero learn only from games against themselves.', ['agz', 'az']]],
  mis='"Self-play is multi-agent RL." It is a two-player game with one learner whose opponent is itself; the opponent changes as it learns, which is what makes it hard.',
  blur='OpenAI Five trained five cooperating heroes against copies of itself with PPO: cooperative and competitive at once {s:dota|abstract}.'),
 dict(id='reward', name='Where the reward comes from', vals=[['env', 'Environment'], ['learned', 'Learned reward model'], ['pref', 'Preferences directly'], ['verifier', 'Verifier or rule'], ['none', 'No reward (imitation)'], ['varies', 'Depends on the run']],
  defn='The reward can come from the environment, from a model trained on human comparisons {s:christiano17|abstract}, from preference pairs used directly (DPO), from a program that checks the answer {s:tulu3|abstract}, or from inside the agent (intrinsic rewards such as curiosity {s:sb|17.4}).',
  q=['sb', 'as an internal or “intrinsic” reward, implementing a computational form of curiosity'],
  sides=[['Environment', 'Games and control.', ['dqn15', 'sac', 'az']],
         ['Learned reward model', 'RLHF, the original GRPO.', ['prefrl', 'rlhf', 'grpo']],
         ['Verifier', 'RLVR, DAPO, Dr. GRPO.', ['rlvr', 'dapo', 'drgrpo']],
         ['Preferences directly', 'DPO never builds an explicit reward.', ['dpo']]],
  mis='"A verifier cannot be gamed." An answer extractor that accepts malformed output, or a weak test suite, is a reward to hack.',
  blur='GAIL\'s discriminator is a learned reward fitted to demonstrations, between imitation and RL.'),
 dict(id='density', name='Dense or sparse reward', vals=[['sparse', 'Sparse'], ['varies', 'Depends on the task'], ['none', 'No reward']],
  defn='How often a non-zero reward arrives. Sparse rewards make it hard to reach the goal even once {s:sb|17.4}; one score at the end of a response is the extreme case.',
  q=['sb', 'the problem of sparse reward often arises'],
  sides=[['Sparse', 'Win or lose at the end; one score per LLM response.', ['az', 'rlhf', 'grpo']],
         ['Varies', 'Control and Atari tasks differ.', ['dqn15', 'sac']]],
  mis='"A sparse reward is a clean signal, so it is easy to learn from." The agent may never reach a rewarding state at all; shaping, starting from an easier problem and making it harder, is the classic remedy {s:sb|14.3}.',
  q2=['sb', 'difficult for an agent to receive any non-zero reward signal at all, either due to sparseness'],
  blur='The per-token KL penalty in RLHF makes the shaped reward dense even though the task reward is sparse.'),
 dict(id='explore', name='How it explores', vals=[['none', 'Not needed (planning or fixed data)'], ['egreedy', 'Epsilon-greedy'], ['noise', 'Action noise'], ['paramnoise', 'Parameter noise'], ['entropy', 'Entropy bonus'], ['sample', 'Sampling its stochastic policy'], ['search', 'Search with noise']],
  defn='Sutton and Barto list epsilon-greedy, optimistic initial values, soft-max and upper confidence bounds {s:sb|2, 8.13}; posterior (Thompson) sampling often does about as well {s:sb|2.10}; intrinsic rewards add curiosity {s:sb|17.4}.',
  q=['sb', 'We have considered only the simplest ways to do this'],
  sides=[['Epsilon-greedy', 'Tabular control and the DQN family.', ['qlearn', 'dqn15']],
         ['Noise', 'DDPG adds Ornstein-Uhlenbeck noise; TD3 Gaussian noise; Rainbow learns noise in its weights.', ['ddpg', 'td3', 'rainbow']],
         ['Entropy', 'A3C and PPO add an entropy bonus; SAC maximises entropy as part of its objective.', ['a3c', 'ppo', 'sac']],
         ['Sampling', 'LLM methods sample responses at temperature; DAPO widens the upper clip to keep entropy up.', ['grpo', 'dapo']]],
  mis='"Exploration is only for the start of training." Entropy collapse late in LLM RL is an exploration failure.',
  q2=['ppo', 'an entropy bonus to ensure'],
  blur='Self-play with search explores through the opponent and through noise added at the root (AlphaZero adds Dirichlet noise).'),
 dict(id='tchoice', name='Which next action the target uses', vals=[['max', 'The best (max)'], ['next', 'The one actually taken'], ['exp', 'The policy\'s expectation'], ['actor', 'The actor\'s action'], ['na', 'Not a value target']],
  defn='The three tabular TD controls differ only here: SARSA uses the action actually taken next, Q-learning the best action, Expected SARSA the expectation under the policy {s:sb|6.4-6.6}.',
  q=['sb', 'The Sarsa algorithm was introduced by Rummery and Niranjan (1994)'],
  sides=[['Max', 'Q-learning and the DQN family.', ['qlearn', 'dqn15', 'ddqn']],
         ['Taken', 'SARSA and TD(0).', ['sarsa', 'td0']],
         ['Actor', 'DDPG, TD3, SAC evaluate the actor\'s action.', ['ddpg', 'td3', 'sac']]],
  mis='"Q-learning needs importance sampling because it is off-policy." Its target does not use the behaviour policy\'s next action, so none is needed.',
  blur='Expected SARSA with a greedy target policy is Q-learning.'),
]

# per-row values: pc depth width approx plan pol task obs agents reward density explore online tchoice
TAXV = """
vi      ctrl one   exp    tab yes det    both     full    single env      varies none       none   max
pi      ctrl one   exp    tab yes det    both     full    single env      varies none       none   exp
mc      ctrl full  sample tab no  det    episodic full    single env      varies egreedy    online na
td0     pred one   sample tab no  na     both     full    single env      varies none       online next
tdl     pred multi sample tab no  na     both     full    single env      varies none       online next
qlearn  ctrl one   sample tab no  det    both     full    single env      varies egreedy    online max
sarsa   ctrl one   sample tab no  det    both     full    single env      varies egreedy    online next
dyna    ctrl one   sample tab yes det    both     full    single env      varies egreedy    online max
reinforce ctrl full sample fa no  stoch  episodic full    single env      varies sample     online na
ac83    ctrl one   sample tab no  stoch  both     full    single env      varies sample     online next
dqn13   ctrl one   sample fa  no  det    episodic partial single env      varies egreedy    online max
dqn15   ctrl one   sample fa  no  det    episodic partial single env      varies egreedy    online max
ddqn    ctrl one   sample fa  no  det    episodic partial single env      varies egreedy    online max
dueling ctrl one   sample fa  no  det    episodic partial single env      varies egreedy    online max
per     ctrl one   sample fa  no  det    episodic partial single env      varies egreedy    online max
c51     ctrl one   sample fa  no  det    episodic partial single env      varies egreedy    online max
qrdqn   ctrl one   sample fa  no  det    episodic partial single env      varies egreedy    online max
rainbow ctrl multi sample fa  no  det    episodic partial single env      varies paramnoise online max
trpo    ctrl full  sample fa  no  stoch  episodic varies  single env      varies sample     online na
gae     pred multi sample fa  no  stoch  both     varies  single env      varies sample     online na
a3c     ctrl multi sample fa  no  stoch  both     varies  single env      varies entropy    online na
a2c     ctrl multi sample fa  no  stoch  both     varies  single env      varies entropy    online na
ppo     ctrl multi sample fa  no  stoch  both     varies  single env      varies entropy    online na
ddpg    ctrl one   sample fa  no  det    episodic full    single env      varies noise      online actor
td3     ctrl one   sample fa  no  det    episodic full    single env      varies noise      online actor
sac     ctrl one   sample fa  no  stoch  episodic full    single env      varies entropy    online actor
alphago ctrl full  sample fa  yes stoch  episodic full    self   env      sparse search     online na
agz     ctrl full  sample fa  yes stoch  episodic full    self   env      sparse search     online na
az      ctrl full  sample fa  yes stoch  episodic full    self   env      sparse search     online na
muzero  ctrl multi sample fa  yes stoch  episodic varies  self   env      varies search     online na
dreamer ctrl multi sample fa  yes stoch  episodic partial single env      varies sample     online na
bc      ctrl none  none   fa  no  varies episodic full    single none     none   none       batch  na
gail    ctrl full  sample fa  no  stoch  episodic full    single learned  varies sample     online na
cql     ctrl one   sample fa  no  varies episodic full    single env      varies none       batch  max
iql     ctrl one   sample fa  no  stoch  episodic full    single env      varies none       batch  max
dt      ctrl none  none   fa  no  det    episodic varies  single env      varies none       batch  na
prefrl  ctrl multi sample fa  no  stoch  episodic varies  single learned  varies sample     online na
rlhf    ctrl multi sample fa  no  stoch  episodic full    single learned  sparse sample     online na
dpo     ctrl none  none   fa  no  stoch  episodic full    single pref     sparse none       batch  na
rloo    ctrl full  sample fa  no  stoch  episodic full    single learned  sparse sample     online na
grpo    ctrl full  sample fa  no  stoch  episodic full    single learned  sparse sample     online na
rlvr    ctrl multi sample fa  no  stoch  episodic full    single verifier sparse sample     online na
drgrpo  ctrl full  sample fa  no  stoch  episodic full    single verifier sparse sample     online na
dapo    ctrl full  sample fa  no  stoch  episodic full    single verifier sparse sample     online na
gspo    ctrl full  sample fa  no  stoch  episodic full    single varies   sparse sample     online na
gdpo    ctrl full  sample fa  no  stoch  episodic full    single verifier sparse sample     online na
samrpo  ctrl full  sample fa  no  stoch  episodic full    single verifier sparse sample     online na
"""
TAXCOLS = ['pc', 'depth', 'width', 'approx', 'plan', 'pol', 'task', 'obs', 'agents', 'reward', 'density', 'explore', 'online', 'tchoice']

# notes on per-row values that are not obvious from the row's own paper (row id, axis) -> (note, source key, kind)
TAXNOTE = {
 ('muzero', 'depth'): ('Bootstrapped n-step value targets in Atari, final outcome in board games; the n is not checked here.', 'muzero', 'unc'),
 ('muzero', 'obs'): ('Board games are fully observable; Atari is learned from frames.', 'muzero', 'der'),
 ('muzero', 'agents'): ('Self-play in board games; single-agent in Atari.', 'muzero', 'der'),
 ('dreamer', 'explore'): ('Exploration detail not checked here.', 'dreamer', 'unc'),
 ('gspo', 'reward'): ('The abstract does not say which rewards GSPO\'s runs used.', 'gspo', 'unc'),
 ('grpo', 'reward'): ('DeepSeekMath\'s GRPO objective uses a learned reward model r_phi.', 'dsmath', 'der'),
 ('dqn13', 'obs'): ('Single frames hide motion; DQN stacks the last 4 frames.', 'mnih13', 'der'),
 ('dqn13', 'explore'): ('Epsilon annealed linearly from 1 to 0.1 over the first million frames.', 'mnih13', 'der'),
 ('ddpg', 'explore'): ('Ornstein-Uhlenbeck noise added to the deterministic action.', 'ddpg', 'der'),
 ('az', 'explore'): ('Dirichlet noise added to the root prior.', 'az17', 'der'),
 ('ppo', 'explore'): ('An entropy bonus in the loss.', 'ppo', 'der'),
 ('iql', 'tchoice'): ('An upper expectile over dataset actions stands in for the max.', 'iql', 'der'),
 ('bc', 'pol'): ('Either, depending on the policy class.', 'alvinn88', 'der'),
 ('cql', 'pol'): ('Greedy in the Q-learning variant, stochastic in the SAC-based one.', 'cql', 'der'),
 ('rlvr', 'depth'): ('Tulu 3 uses PPO with a value model, so GAE-style targets.', 'tulu3', 'der'),
 ('trpo', 'depth'): ('Returns from rollouts, not bootstrapped.', 'trpo', 'der'),
 ('gail', 'depth'): ('Optimised with TRPO on sampled rollouts.', 'gail', 'der'),
}

def taxv():
    out = {}
    for line in TAXV.strip().split('\n'):
        p = line.split()
        out[p[0]] = dict(zip(TAXCOLS, p[1:]))
        assert len(p) == len(TAXCOLS) + 1, line
    return out
