#!/usr/bin/env python3
"""The Method atlas rows: every method on the same nine columns, every cell with a source.

Run: python3 src/atlas/rows.py  (writes data/atlas.json; then mk_atlas.py validates it and writes the JS block)

Cell fields: v value shown; f family (categorical columns) or list of tags (needs); k kind:
  pub  the source states it (q is a quote from the source, checked word by word by check_atlas_data.py),
  der  derived here from what the source describes (n says how),
  unc  could not be confirmed;
s source key (sources.py), l location in the source, q quote, n note.
'fixed' cells also carry 'from': the rows whose problem this method fixed (the lineage edges).
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from sources import SRC, PAGES, PAPER_PAGES, READ
from taxonomy import AXES, TAXCOLS, TAXNOTE, taxv

def C(v, s, l='', q='', k='pub', n='', f=None, frm=None):
    x = {'v': v, 's': s, 'k': k}
    if l: x['l'] = l
    if q: x['q'] = q
    if n: x['n'] = n
    if f is not None: x['f'] = f
    if frm is not None: x['from'] = frm
    return x

SB = 'sb'
ROWS = []
def R(id, name, short, lane, date, page, paper, store, model, data, target, needs, act, fixed, used, pp=None, alias=''):
    ROWS.append(dict(id=id, name=name, short=short, lane=lane, date=date, page=page, pp=pp, alias=alias,
                     cells=dict(store=store, model=model, data=data, target=target, needs=needs, act=act, paper=paper, fixed=fixed, used=used)))

# ---------------- classical (tables) ----------------
R('vi', 'Value iteration', 'Value it.', 'cls', '1957', 'dp',
  C('Bellman, A Markovian Decision Process (1957)', 'bellman57', 'title (Crossref)', n='Sutton and Barto: "The term dynamic programming is due to Bellman (1957a)". Value iteration is policy iteration with evaluation cut to one sweep (S&B 4.4).'),
  C('Value V(s)', SB, '4.4', k='der', f='value', n='Stores only a value per state; the policy is read off as the greedy action.'),
  C('Given (the full model p(s\',r|s,a))', SB, '4 intro', 'used to compute optimal policies given a perfect model of the environment', f='given'),
  C('No samples: sweeps of the model', SB, '4 intro', k='der', f='plan', n='Dynamic programming uses expectations computed from the model, not experience.'),
  C('max over a of the expected one-step return r + gamma V_k(s\') under the model (S&B Eq. 4.10)', SB, '4.4', 'This algorithm is called value iteration'),
  C('Model', SB, '4 intro', k='der', f=['model']),
  C('Discrete (finite MDP)', SB, '4 intro', k='der', f='disc', n='Sweeps every state and action, so both must be finite and small enough to enumerate.'),
  C('Starting point: solves a known finite MDP', SB, '4 notes', 'The term dynamic programming is due to Bellman (1957a)', frm=[]),
  C('Planning in small known MDPs; S&B report DP solving MDPs with millions of states', SB, '4.7', 'DP methods can be used with today\'s computers to solve MDPs with millions of states'))

R('pi', 'Policy iteration', 'Policy it.', 'cls', '1960', 'dp',
  C('Howard, Dynamic Programming and Markov Processes (MIT Press, 1960)', SB, '4 notes', 'policy iteration algorithm are due to Bellman (1957a) and Howard (1960)', n='A book with no open copy; cited through Sutton and Barto\'s historical remarks.'),
  C('Value V(s) and an explicit policy', SB, '4.3', k='der', f='value', n='Evaluates the current policy fully, then makes it greedy on the result.'),
  C('Given', SB, '4 intro', 'given a perfect model of the environment', f='given'),
  C('No samples: sweeps of the model', SB, '4.3', k='der', f='plan'),
  C('Expected return of the current policy, solved to convergence before each greedy improvement', SB, '4.3', k='der'),
  C('Model', SB, '4 intro', k='der', f=['model']),
  C('Discrete (finite MDP)', SB, '4.3', k='der', f='disc'),
  C('Value iteration only converges in the limit; policy iteration stops after a finite number of improvements', SB, '4.3, 4.4',
    'process must converge to an optimal policy and the optimal value function in a finite number of iterations', frm=['vi'],
    n='Value iteration (Bellman 1957) predates policy iteration (Howard 1960); textbooks present it the other way round, as truncated policy iteration.'),
  C('Planning in small known MDPs; AlphaZero-style search is described as policy iteration with search as the improvement step', SB, '4.7', 'Both policy iteration and value iteration are widely used'))

R('mc', 'Monte Carlo control', 'MC', 'cls', '1968', 'mf',
  C('No single founding paper; earliest use named by S&B: Michie and Chambers\'s BOXES (1968)', SB, '5 notes',
    'An early use of Monte Carlo methods to estimate action values in a reinforcement learning context was by Michie and Chambers (1968)',
    n='Monte Carlo ES appeared in the 1998 edition of S&B; first-visit against every-visit is from Singh and Sutton (1996).'),
  C('Value Q(s,a)', SB, '5.3', k='der', f='value'),
  C('Free', SB, '6.1', 'Both TD and Monte Carlo methods use experience to solve the prediction problem', f='free'),
  C('On-policy (epsilon-soft); off-policy with importance sampling', SB, '5.4, 5.5', k='der', f='on'),
  C('G_t: the whole sampled return to the end of the episode', SB, '6.1', 'Monte Carlo methods wait until the return following the visit is known, then use that return as a target'),
  C('Episodes that end', SB, '6.1', k='der', f=['episodes']),
  C('Discrete (tabular)', SB, '5', k='der', f='disc'),
  C('Needs no model: averages sampled returns instead of computing expectations', SB, '5 notes', 'Monte Carlo ES was introduced in the 1998 edition of this book', k='der', frm=['pi'],
    n='S&B call Monte Carlo ES the first explicit link between Monte Carlo estimation and policy-iteration control.'),
  C('Its estimator survives in critic-free LLM methods: GRPO compares each response\'s own sampled final reward with the group mean', 'dsmath', '4.1',
    'uses the average reward of multiple sampled outputs, produced in response to the same question, as the baseline', k='der'))

R('td0', 'TD(0)', 'TD(0)', 'cls', '1988-08', 'mf',
  C('Sutton, Learning to predict by the methods of temporal differences (1988)', 'sutton88', 'title (Crossref)', n='S&B: the TD(0) algorithm and the term temporal-difference learning are from Sutton (1988).'),
  C('Value V(s) (prediction only)', SB, '6.1', k='der', f='value', n='Evaluates a fixed policy; control versions are SARSA and Q-learning.'),
  C('Free', SB, '6.1', 'Both TD and Monte Carlo methods use experience', f='free'),
  C('On-policy (evaluates the policy that generates the data)', SB, '6.1', k='der', f='on'),
  C('r + gamma V(s\'): one real reward plus the current estimate of the next state', SB, '6.1', 'At time t + 1 they immediately form a target and make a useful update'),
  C('Experience only', SB, '6.1', k='der', f=[]),
  C('Discrete (tabular)', SB, '6.1', k='der', f='disc'),
  C('Learns after every step instead of waiting for the episode to end', SB, '6.1', 'TD methods need to wait only until the next time step', frm=['mc']),
  C('The critic\'s target in actor-critic methods (A2C, the value model of PPO)', SB, '13.5', 'the one-step return is often superior to the actual return in terms of its variance and computational congeniality', k='der'))

R('tdl', 'TD(lambda)', 'TD(λ)', 'cls', '1988-08', 'mf',
  C('Sutton, Learning to predict by the methods of temporal differences (1988)', 'sutton88', 'title (Crossref)', n='The lambda-return (forward view) is due to Watkins (1989), per S&B 12 notes.'),
  C('Value V(s)', SB, '12', k='der', f='value'),
  C('Free', SB, '12', k='der', f='free'),
  C('On-policy', SB, '12', k='der', f='on'),
  C('The lambda-return: a geometric mix of n-step returns; lambda = 0 is TD(0), lambda = 1 is Monte Carlo', SB, '12 notes', 'return and its error-reduction properties were introduced by Watkins (1989)', k='der'),
  C('Eligibility traces', SB, '12', k='der', f=['traces']),
  C('Discrete (tabular) or function approximation', SB, '12', k='der', f='disc'),
  C('Tunes between TD(0)\'s bias and Monte Carlo\'s variance with one parameter', SB, '12', k='der', frm=['td0', 'mc']),
  C('GAE is its policy-gradient form; TD-Gammon (1995) was trained with TD(lambda)', 'gae', 'abstract', 'an exponentially-weighted estimator of the advantage function that is analogous to TD(lambda)',
    n='TD-Gammon: Tesauro, Temporal difference learning and TD-Gammon, CACM 1995 (doi 10.1145/203330.203343).'))

R('qlearn', 'Q-learning', 'Q-learning', 'cls', '1989', 'mf',
  C('Watkins, Learning from Delayed Rewards (PhD thesis, 1989)', 'watkins89', 'thesis', n='S&B: introduced by Watkins (1989); the convergence proof was made rigorous by Watkins and Dayan (1992).'),
  C('Value Q(s,a)', SB, '6.5', 'the learned action-value function, Q, directly approximates', f='value'),
  C('Free', SB, '6.5', k='der', f='free'),
  C('Off-policy', SB, '6.5 title', 'Q-learning: Off-policy TD Control', f='off'),
  C('r + gamma max over a\' of Q(s\',a\'): the greedy policy\'s value, whatever the agent actually does next', SB, '6.5', 'directly approximates', k='der'),
  C('Experience only', SB, '6.5', k='der', f=[]),
  C('Discrete', SB, '6.5', k='der', f='disc', n='The max over actions needs a finite action set.'),
  C('Learns the optimal policy\'s values while exploring, with no importance sampling', SB, '6.5 notes', 'Q-learning was introduced by Watkins (1989), whose outline of a convergence proof was made rigorous by Watkins and Dayan (1992)', k='der', frm=['td0', 'mc']),
  C('The target DQN regresses a network onto', 'mnih13', 'abstract', 'trained with a variant of Q-learning, whose input is raw pixels'))

R('sarsa', 'SARSA', 'SARSA', 'cls', '1994', 'mf',
  C('Rummery and Niranjan, On-line Q-learning using connectionist systems (1994)', 'rummery94', 'report',
    n='They called it "Modified Connectionist Q-learning"; the name Sarsa is from Sutton (1996), per S&B 6.4 notes.'),
  C('Value Q(s,a)', SB, '6.4', k='der', f='value'),
  C('Free', SB, '6.4', k='der', f='free'),
  C('On-policy', SB, '6.4 title', 'Sarsa: On-policy TD Control', f='on'),
  C('r + gamma Q(s\',a\') with a\' the action the agent actually takes next', SB, '6.4', k='der'),
  C('Experience only', SB, '6.4', k='der', f=[]),
  C('Discrete', SB, '6.4', k='der', f='disc'),
  C('Learns the value of the policy it actually runs, exploration included (the safe path in cliff walking)', SB, '6.4 notes',
    'The Sarsa algorithm was introduced by Rummery and Niranjan (1994). They explored it in conjunction with artificial neural networks and called it “Modified Connectionist Q-learning”',
    k='der', frm=['qlearn'], n='Introduced five years after Q-learning, as a modification of it; not its precursor.'),
  C('A textbook method: no SARSA entry in the Stable-Baselines3 or CleanRL algorithm tables', 'sb3', 'README', k='der', n='Absence checked in both tables, read ' + READ + '.'))

R('dyna', 'Dyna-Q', 'Dyna-Q', 'cls', '1990', 'mb',
  C('Sutton, Integrated Architectures for Learning, Planning, and Reacting (ICML 1990)', 'sutton90', 'title (Crossref)', n='S&B: "The Dyna architecture is due to Sutton (1990)". S&B chapter 8.'),
  C('Value Q(s,a) plus a learned model', SB, '8.2', k='der', f='value'),
  C('Learned (from real transitions)', SB, '8.2', k='der', f='learned'),
  C('Off-policy (Q-learning updates on real and simulated transitions)', SB, '8.2', k='der', f='off'),
  C('The Q-learning target, applied to real steps and to steps replayed from the learned model', SB, '8.2', k='der'),
  C('Learned model', SB, '8.2', k='der', f=['lmodel']),
  C('Discrete (tabular)', SB, '8.2', k='der', f='disc'),
  C('Gets many updates out of each real step by planning in a learned model', SB, '8 notes', 'The Dyna architecture is due to Sutton (1990)', k='der', frm=['qlearn', 'vi']),
  C('The idea Dreamer scales up: learning behaviour inside a learned model', 'dreamer', 'abstract', 'solves long-horizon tasks from images purely by latent imagination', k='der'))

R('reinforce', 'REINFORCE', 'REINFORCE', 'cls', '1992-05', 'pg',
  C('Williams, Simple statistical gradient-following algorithms for connectionist reinforcement learning (1992)', 'williams92', 'title (Crossref)', n='S&B: "REINFORCE is due to Williams (1987, 1992)".'),
  C('Policy', SB, '13.3', k='der', f='policy', n='S&B 13.5: REINFORCE with a learned baseline is still not actor-critic, because the baseline does not judge the action.'),
  C('Free', SB, '13.3', k='der', f='free'),
  C('On-policy', SB, '13.3', k='der', f='on'),
  C('G_t times grad log pi(a_t|s_t), optionally minus a baseline b(s_t)', SB, '13.4 notes', 'The baseline was introduced in Williams', k='der'),
  C('Episodes that end', SB, '13.3', k='der', f=['episodes']),
  C('Discrete or continuous', SB, '13.7 notes', 'The first to show how continuous actions could be handled this way appears to have been Williams (1987, 1992)', f='both'),
  C('An unbiased gradient of expected return for any differentiable stochastic policy, with no value function needed', 'williams92', 'title', k='der', frm=[]),
  C('Back in LLM RL: Ahmadian et al. found plain REINFORCE beats PPO for RLHF', 'rloo24', '1', 'Vanilla Policy Gradient REINFORCE consistently outperforms PPO'))

R('ac83', 'Actor-critic (1983)', 'Actor-critic', 'cls', '1983-09', 'pg',
  C('Barto, Sutton and Anderson, Neuronlike adaptive elements that can solve difficult learning control problems (1983)', 'bsa83', 'title (Crossref)',
    n='S&B 13.5-6 notes: actor-critic methods were among the earliest studied (Witten 1977; Barto, Sutton and Anderson 1983).'),
  C('Actor-critic', SB, '13 intro', 'Methods that learn approximations to both policy and value functions are often called actor–critic methods', f='ac'),
  C('Free', SB, '13.5', k='der', f='free'),
  C('On-policy', SB, '13.5', k='der', f='on'),
  C('The critic\'s TD error r + gamma V(s\') - V(s) weights the actor\'s update', SB, '13.5', 'When the state-value function is used to assess actions in this way it is called a critic'),
  C('Critic', SB, '13.5', k='der', f=['critic']),
  C('Discrete or continuous', SB, '13.7', k='der', f='both'),
  C('First of its line: a learned critic judges each action at once, before the outcome is known', SB, '13.5', 'The estimated value of the second state, when discounted and added to the reward, constitutes the one-step return', k='der', frm=[]),
  C('The shape of A2C and PPO; S&B note the name A2C is used for it', SB, '13.5-6 notes', 'Actor–critic methods are sometimes referred to as advantage actor–critic (“A2C”) methods in the literature'))

# ---------------- value networks ----------------
R('dqn13', 'DQN (2013, arXiv)', 'DQN 2013', 'val', '2013-12-19', 'val',
  C('Mnih et al., Playing Atari with Deep Reinforcement Learning', 'mnih13', 'arXiv v1'),
  C('Value Q(s,a; theta)', 'mnih13', 'abstract', 'whose output is a value function estimating future rewards', f='value'),
  C('Free', 'mnih13', 'abstract', k='der', f='free'),
  C('Off-policy (replay buffer)', 'mnih13', '1', 'an experience replay mechanism [13] which randomly samples previous transitions', k='der', f='off'),
  C('r + gamma max Q(s\',a\'; theta) with the network\'s current weights: no target network in this paper', 'mnih13', '4', k='der',
    n='The phrase "target network" does not occur in the 2013 paper (searched ' + READ + '); it arrives in the 2015 Nature paper.'),
  C('Replay buffer', 'mnih13', '1', 'experience replay mechanism', f=['replay']),
  C('Discrete (Atari joystick actions)', 'mnih13', 'abstract', k='der', f='disc'),
  C('Replaces the Q-table with a convolutional network reading raw pixels; replay breaks the correlation of consecutive steps', 'mnih13', 'abstract',
    'The model is a convolutional neural network, trained with a variant of Q-learning', frm=['qlearn']),
  C('Superseded by the 2015 Nature version', 'mnih15', 'Methods', k='der'))

R('dqn15', 'DQN (2015, Nature)', 'DQN 2015', 'val', '2015-02-26', 'val',
  C('Mnih et al., Human-level control through deep reinforcement learning (Nature 518)', 'mnih15', 'doi'),
  C('Value Q(s,a; theta)', 'mnih15', 'Methods', k='der', f='value'),
  C('Free', 'mnih15', 'Methods', k='der', f='free'),
  C('Off-policy (replay buffer)', 'mnih15', 'Methods', k='der', f='off'),
  C('r + gamma max Q(s\',a\'; theta-), theta- a frozen copy refreshed every C updates', 'mnih15', 'Methods', 'every C updates we clone the network Q to obtain a target network'),
  C('Replay buffer, target network', 'ddqn', '2', 'Two important ingredients of the DQN algorithm as proposed by Mnih et al. (2015) are the use of a target', f=['replay', 'target']),
  C('Discrete', 'mnih15', 'Methods', k='der', f='disc'),
  C('A moving target: a separate target network stops the regression target shifting with every update', 'mnih15', 'Methods',
    'is to use a separate network for', frm=['dqn13']),
  C('Implemented in Stable-Baselines3 and CleanRL', 'cleanrl', 'README', 'Deep Q-Learning (DQN)', n='Stable-Baselines3 lists DQN for discrete actions only (read ' + READ + ').'))

R('ddqn', 'Double DQN', 'Double', 'val', '2015-09-22', 'val',
  C('van Hasselt, Guez and Silver, Deep Reinforcement Learning with Double Q-learning', 'ddqn', 'arXiv v1'),
  C('Value', 'ddqn', 'abstract', k='der', f='value'),
  C('Free', 'ddqn', 'abstract', k='der', f='free'),
  C('Off-policy (replay buffer)', 'ddqn', 'abstract', k='der', f='off'),
  C('r + gamma Q(s\', argmax_a Q(s\',a; theta); theta-): the online net picks the action, the target net values it', 'ddqn', 'abstract',
    'We propose a specific adaptation to the DQN algorithm', k='der'),
  C('Replay buffer, target network', 'ddqn', '2', k='der', f=['replay', 'target']),
  C('Discrete', 'ddqn', 'abstract', k='der', f='disc'),
  C('Overestimation: the max over noisy estimates is biased upwards', 'ddqn', 'abstract',
    'the recent DQN algorithm, which combines Q-learning with a deep neural network, suffers from substantial overestimations in some games', frm=['dqn15'],
    n='Double Q-learning itself is tabular (van Hasselt 2010); this paper carries it to DQN.'),
  C('One of Rainbow\'s six combined extensions', 'rainbow', 'abstract', 'This paper examines six extensions to the DQN algorithm', k='der'))

R('dueling', 'Dueling DQN', 'Dueling', 'val', '2015-11-20', 'val',
  C('Wang et al., Dueling Network Architectures for Deep Reinforcement Learning', 'dueling', 'arXiv v1'),
  C('Value, split into V(s) and advantage A(s,a) streams', 'dueling', 'abstract',
    'Our dueling network represents two separate estimators: one for the state value function and one for the state-dependent action advantage function', f='value'),
  C('Free', 'dueling', 'abstract', 'a new neural network architecture for model-free reinforcement learning', f='free'),
  C('Off-policy (replay buffer)', 'dueling', 'abstract', k='der', f='off'),
  C('DQN\'s target unchanged; only the network head changes: Q = V + (A - mean A)', 'dueling', 'abstract',
    'without imposing any change to the underlying reinforcement learning algorithm'),
  C('Replay buffer, target network', 'dueling', 'abstract', k='der', f=['replay', 'target']),
  C('Discrete', 'dueling', 'abstract', k='der', f='disc'),
  C('Learns how good a state is without learning every action; better evaluation when many actions are worth about the same', 'dueling', 'abstract',
    'better policy evaluation in the presence of many similar-valued actions', frm=['dqn15']),
  C('One of Rainbow\'s six combined extensions', 'rainbow', 'abstract', 'six extensions to the DQN algorithm', k='der'))

R('per', 'Prioritized replay', 'PER', 'val', '2015-11-18', 'val',
  C('Schaul et al., Prioritized Experience Replay', 'per', 'arXiv v1'),
  C('Value', 'per', 'abstract', k='der', f='value'),
  C('Free', 'per', 'abstract', k='der', f='free'),
  C('Off-policy (replay buffer)', 'per', 'abstract', 'Experience replay lets online reinforcement learning agents remember and reuse experiences from the past', f='off'),
  C('DQN\'s target; transitions with large TD error are replayed more often', 'per', 'abstract', 'so as to replay important transitions more frequently'),
  C('Prioritized replay buffer, target network', 'per', 'abstract', k='der', f=['replay', 'target']),
  C('Discrete', 'per', 'abstract', k='der', f='disc'),
  C('Uniform replay replays every transition as often as it happened, informative or not', 'per', 'abstract',
    'experience transitions were uniformly sampled from a replay memory', frm=['dqn15']),
  C('Rainbow\'s ablation found it one of the two most crucial of its six components', 'rainbow', '4',
    'Prioritized replay and multi-step learning were the two most crucial components of Rainbow'))

R('c51', 'C51 (distributional)', 'C51', 'val', '2017-07-21', 'val',
  C('Bellemare, Dabney and Munos, A Distributional Perspective on Reinforcement Learning', 'c51', 'arXiv v1'),
  C('Value distribution (51 fixed atoms)', 'c51', '5', 'the 51-atom version', f='value'),
  C('Free', 'c51', 'abstract', k='der', f='free'),
  C('Off-policy (replay buffer)', 'c51', 'abstract', k='der', f='off'),
  C('The distribution of r + gamma Z(s\',a*), projected back onto the fixed atoms', 'c51', 'abstract',
    'applies Bellman\'s equation to the learning of approximate value distributions'),
  C('Replay buffer, target network', 'c51', 'abstract', k='der', f=['replay', 'target']),
  C('Discrete', 'c51', 'abstract', k='der', f='disc'),
  C('Learns the whole return distribution, not only its mean', 'c51', 'abstract',
    'This is in contrast to the common approach to reinforcement learning which models the expectation of this return, or value', frm=['dqn15']),
  C('Implemented in CleanRL', 'cleanrl', 'README', 'Categorical DQN (C51)'))

R('qrdqn', 'QR-DQN', 'QR-DQN', 'val', '2017-10-27', 'val',
  C('Dabney et al., Distributional Reinforcement Learning with Quantile Regression', 'qrdqn', 'arXiv v1'),
  C('Value distribution (quantiles)', 'qrdqn', 'abstract', 'the distribution over returns is modeled explicitly instead of only estimating the mean', f='value'),
  C('Free', 'qrdqn', 'abstract', k='der', f='free'),
  C('Off-policy (replay buffer)', 'qrdqn', 'abstract', k='der', f='off'),
  C('Quantile regression of the return distribution\'s quantiles onto the distributional Bellman target', 'qrdqn', 'title', k='der'),
  C('Replay buffer, target network', 'qrdqn', 'abstract', k='der', f=['replay', 'target']),
  C('Discrete', 'qrdqn', 'abstract', k='der', f='disc'),
  C('Closes C51\'s gaps between theory and algorithm', 'qrdqn', 'abstract',
    'We give results that close a number of gaps between the theoretical and algorithmic results given by Bellemare, Dabney, and Munos (2017)', frm=['c51']),
  C('Implemented in SB3 Contrib', 'sb3', 'README', 'QR-DQN'))

R('rainbow', 'Rainbow', 'Rainbow', 'val', '2017-10-06', 'val',
  C('Hessel et al., Rainbow: Combining Improvements in Deep Reinforcement Learning', 'rainbow', 'arXiv v1'),
  C('Value distribution', 'rainbow', '3', k='der', f='value'),
  C('Free', 'rainbow', 'abstract', k='der', f='free'),
  C('Off-policy (prioritized replay)', 'rainbow', '3', k='der', f='off'),
  C('Multi-step, double, distributional target; noisy nets for exploration', 'rainbow', '3', 'Noisy Nets (Fortunato et al. 2017) propose a noisy', k='der'),
  C('Prioritized replay buffer, target network', 'rainbow', '3', k='der', f=['replay', 'target']),
  C('Discrete', 'rainbow', 'abstract', 'Atari 2600 benchmark', k='der', f='disc'),
  C('Six DQN fixes developed separately: which ones combine?', 'rainbow', 'abstract',
    'it is unclear which of these extensions are complementary and can be fruitfully combined', frm=['ddqn', 'dueling', 'per', 'c51'],
    n='The six: double Q-learning, prioritized replay, dueling, multi-step returns, distributional (C51), noisy nets.'),
  C('A reference agent rather than a library default: neither the Stable-Baselines3 nor the CleanRL table lists it', 'cleanrl', 'README', k='der', n='Absence checked, read ' + READ + '.'))

# ---------------- policy and actor-critic networks ----------------
R('trpo', 'TRPO', 'TRPO', 'pg', '2015-02-19', 'pg',
  C('Schulman et al., Trust Region Policy Optimization', 'trpo', 'arXiv v1'),
  C('Policy (an advantage estimate, with or without a learned baseline)', 'trpo', 'abstract', k='der', f='policy'),
  C('Free', 'trpo', 'abstract', k='der', f='free'),
  C('On-policy', 'trpo', 'abstract', k='der', f='on'),
  C('Importance-weighted advantage, maximised subject to a KL limit on the policy change (natural-gradient step)', 'trpo', 'abstract',
    'This algorithm is similar to natural policy gradient methods', k='der'),
  C('Episodes or rollouts; a second-order solver', 'trpo', 'abstract', k='der', f=['episodes']),
  C('Discrete or continuous', 'trpo', 'abstract', 'learning simulated robotic swimming, hopping, and walking gaits; and playing Atari games', k='der', f='both'),
  C('Policy-gradient steps can wreck the policy; a trust region gives monotonic improvement', 'trpo', 'abstract',
    'We describe an iterative procedure for optimizing policies, with guaranteed monotonic improvement', frm=['reinforce']),
  C('Implemented in SB3 Contrib; PPO took its place as the default', 'ppo', 'abstract',
    'have some of the benefits of trust region policy optimization (TRPO), but they are much simpler to implement', k='der'))

R('gae', 'GAE', 'GAE', 'pg', '2015-06-08', 'pg',
  C('Schulman et al., High-Dimensional Continuous Control Using Generalized Advantage Estimation', 'gae', 'arXiv v1'),
  C('Actor-critic (value function as baseline)', 'gae', 'abstract',
    'using value functions to substantially reduce the variance of policy gradient estimates at the cost of some bias', f='ac'),
  C('Free', 'gae', 'abstract', 'Our algorithm is fully model-free', f='free'),
  C('On-policy', 'gae', 'abstract', k='der', f='on'),
  C('A_t = sum of (gamma lambda)^l delta_{t+l}: TD errors mixed like TD(lambda)', 'gae', 'abstract',
    'an exponentially-weighted estimator of the advantage function that is analogous to TD(lambda)'),
  C('Critic', 'gae', 'abstract', k='der', f=['critic']),
  C('Continuous in the paper; any in use', 'gae', 'abstract', 'our neural network policies map directly from raw kinematics to joint torques', k='der', f='both'),
  C('Policy-gradient estimates need too many samples because they are so noisy', 'gae', 'abstract',
    'The two main challenges are the large number of samples typically required', frm=['trpo', 'tdl', 'ac83']),
  C('PPO\'s advantage estimator', 'ppo', '3', 'we can use a truncated version of generalized advantage estimation'))

R('a3c', 'A3C', 'A3C', 'pg', '2016-02-04', 'pg',
  C('Mnih et al., Asynchronous Methods for Deep Reinforcement Learning', 'a3c', 'arXiv v1'),
  C('Actor-critic', 'a3c', 'abstract', 'The best performing method, an asynchronous variant of actor-critic', f='ac'),
  C('Free', 'a3c', 'abstract', k='der', f='free'),
  C('On-policy', 'a3c', 'abstract', k='der', f='on'),
  C('n-step return minus the critic\'s V(s), computed in the forward view', 'a3c', '4', 'it operates in the forward view by explicitly computing n-step returns', k='der'),
  C('Critic, parallel actors', 'a3c', 'abstract', 'parallel actor-learners have a stabilizing effect on training', f=['critic', 'parallel']),
  C('Discrete or continuous', 'a3c', 'abstract', 'asynchronous actor-critic succeeds on a wide variety of continuous motor control problems', f='both'),
  C('On-policy methods with networks were unstable without replay; parallel actors decorrelate the data instead', 'a3c', 'abstract',
    'parallel actor-learners have a stabilizing effect on training allowing all four methods to successfully train neural network controllers', frm=['dqn15', 'ac83']),
  C('Replaced by its synchronous version, A2C', 'a2c', 'blog', 'we have not seen any evidence that the noise introduced by asynchrony provides any performance benefit'))

R('a2c', 'A2C', 'A2C', 'pg', '2017-08-18', 'pg',
  C('OpenAI Baselines: ACKTR and A2C (blog post, Wu et al.)', 'a2c', 'blog', n='No paper: the synchronous variant was named in an OpenAI blog post.'),
  C('Actor-critic', 'a2c', 'blog', 'This algorithm is naturally called A2C, short for advantage actor critic', f='ac'),
  C('Free', 'a2c', 'blog', k='der', f='free'),
  C('On-policy', 'a2c', 'blog', k='der', f='on'),
  C('As A3C: n-step return minus V(s), averaged over all actors before one update', 'a2c', 'blog',
    'waits for each actor to finish its segment of experience before performing an update, averaging over all of the actors', k='der'),
  C('Critic, parallel actors', 'a2c', 'blog', k='der', f=['critic', 'parallel']),
  C('Discrete or continuous', 'sb3', 'README', k='der', f='both', n='Stable-Baselines3\'s A2C supports Box and Discrete spaces.'),
  C('Asynchrony brought no benefit; a synchronous batch uses GPUs better', 'a2c', 'blog',
    'Our synchronous A2C implementation performs better than our asynchronous implementations', frm=['a3c']),
  C('Implemented in Stable-Baselines3', 'sb3', 'README', 'A2C'))

R('ppo', 'PPO', 'PPO', 'pg', '2017-07-20', 'pg',
  C('Schulman et al., Proximal Policy Optimization Algorithms', 'ppo', 'arXiv v1'),
  C('Actor-critic (learned V for the advantage)', 'ppo', '3', 'make use a learned state-value function V (s); for example, generalized advantage estimation', f='ac'),
  C('Free', 'ppo', 'abstract', k='der', f='free'),
  C('On-policy, approximately: each batch is reused for several epochs, corrected by a probability ratio', 'ppo', 'abstract',
    'we propose a novel objective function that enables multiple epochs of minibatch updates', k='der', f='on'),
  C('Clipped surrogate: min(ratio A, clip(ratio, 1-eps, 1+eps) A), A from truncated GAE', 'ppo', 'abstract',
    'optimizing a surrogate objective function using stochastic gradient ascent', k='der'),
  C('Critic', 'ppo', '3', k='der', f=['critic']),
  C('Discrete or continuous', 'ppo', 'abstract', 'simulated robotic locomotion and Atari game playing', f='both'),
  C('TRPO\'s second-order trust region is complex; a clipped first-order objective gets much of the benefit', 'ppo', 'abstract',
    'have some of the benefits of trust region policy optimization (TRPO), but they are much simpler to implement, more general, and have better sample complexity (empirically)', frm=['trpo', 'gae', 'a3c']),
  C('The default on-policy algorithm: Stable-Baselines3, CleanRL and verl all ship it; OpenAI Five was trained with it', 'dota', '3',
    'The policy is trained using Proximal Policy Optimization (PPO)', n='Library tables read ' + READ + '.'))

R('ddpg', 'DDPG', 'DDPG', 'pg', '2015-09-09', 'pg',
  C('Lillicrap et al., Continuous control with deep reinforcement learning', 'ddpg', 'arXiv v1'),
  C('Actor-critic (deterministic actor)', 'ddpg', 'abstract', 'We present an actor-critic, model-free algorithm based on the deterministic policy gradient', f='ac'),
  C('Free', 'ddpg', 'abstract', 'actor-critic, model-free', f='free'),
  C('Off-policy (replay buffer)', 'ddpg', 'abstract', 'We adapt the ideas underlying the success of Deep Q-Learning', k='der', f='off'),
  C('r + gamma Q(s\', mu(s\')) with target copies of actor and critic', 'ddpg', 'abstract', k='der'),
  C('Replay buffer, target networks, critic', 'ddpg', 'abstract', k='der', f=['replay', 'target', 'critic']),
  C('Continuous', 'ddpg', 'abstract', 'can operate over continuous action spaces', f='cont'),
  C('DQN needs a max over actions, impossible for continuous actions; a deterministic actor performs it', 'ddpg', 'abstract',
    'We adapt the ideas underlying the success of Deep Q-Learning to the continuous action domain', frm=['dqn15']),
  C('Implemented in Stable-Baselines3 and CleanRL; TD3 fixed its overestimation', 'cleanrl', 'README', 'Deep Deterministic Policy Gradient (DDPG)'))

R('td3', 'TD3', 'TD3', 'pg', '2018-02-26', 'pg',
  C('Fujimoto, van Hoof and Meger, Addressing Function Approximation Error in Actor-Critic Methods', 'td3', 'arXiv v1'),
  C('Actor-critic (twin critics)', 'td3', 'abstract', 'taking the minimum value between a pair of critics', f='ac'),
  C('Free', 'td3', 'abstract', k='der', f='free'),
  C('Off-policy (replay buffer)', 'td3', 'abstract', k='der', f='off'),
  C('r + gamma min(Q1, Q2)(s\', mu\'(s\') + clipped noise); actor updated less often', 'td3', 'abstract',
    'taking the minimum value between a pair of critics to limit overestimation'),
  C('Replay buffer, target networks, two critics', 'td3', 'abstract', k='der', f=['replay', 'target', 'critic']),
  C('Continuous', 'td3', 'abstract', 'the suite of OpenAI gym tasks', k='der', f='cont'),
  C('DDPG overestimates values, as DQN did', 'td3', 'abstract', 'We show that this problem persists in an actor-critic setting', frm=['ddpg', 'ddqn']),
  C('Implemented in Stable-Baselines3 and CleanRL', 'cleanrl', 'README', 'Twin Delayed Deep Deterministic Policy Gradient (TD3)'))

R('sac', 'SAC', 'SAC', 'pg', '2018-01-04', 'pg',
  C('Haarnoja et al., Soft Actor-Critic: Off-Policy Maximum Entropy Deep RL with a Stochastic Actor', 'sac', 'arXiv v1'),
  C('Actor-critic (stochastic actor)', 'sac', 'abstract', 'an off-policy actor-critic deep RL algorithm based on the maximum entropy reinforcement learning framework', f='ac'),
  C('Free', 'sac', 'abstract', k='der', f='free'),
  C('Off-policy (replay buffer)', 'sac', 'abstract', 'an off-policy actor-critic deep RL algorithm', f='off'),
  C('Soft target: r + gamma (Q(s\',a\') - alpha log pi(a\'|s\')), reward plus an entropy bonus', 'sac', 'abstract',
    'the actor aims to maximize expected reward while also maximizing entropy', k='der'),
  C('Replay buffer, target networks, critics', 'sac', 'abstract', k='der', f=['replay', 'target', 'critic']),
  C('Continuous', 'sac', 'abstract', 'a range of continuous control benchmark tasks', f='cont'),
  C('Prior model-free methods: high sample complexity and brittle convergence', 'sac', 'abstract',
    'these methods typically suffer from two major challenges: very high sample complexity and brittle convergence properties', frm=['ddpg']),
  C('Real robots (quadruped, dexterous hand); in Stable-Baselines3 and CleanRL', 'sacapps', 'abstract',
    'real-world challenging tasks such as locomotion for a quadrupedal robot and robotic manipulation with a dexterous hand'))

# ---------------- search and world models ----------------
R('alphago', 'AlphaGo', 'AlphaGo', 'mb', '2016-01-28', 'mb',
  C('Silver et al., Mastering the game of Go with deep neural networks and tree search (Nature 529)', 'alphago', 'doi'),
  C('Actor-critic (policy and value networks) plus tree search', 'alphago', 'abstract',
    'uses value networks to evaluate board positions and policy networks to select moves', f='ac'),
  C('Given (the rules of Go, used by the search)', 'alphago', 'abstract', k='der', f='given'),
  C('Self-play, after supervised learning on human games', 'alphago', 'abstract',
    'supervised learning from human expert games, and reinforcement learning from games of self-play', f='self'),
  C('Value net to the game outcome; Monte Carlo tree search combines both networks', 'alphago', 'abstract',
    'a new search algorithm that combines Monte Carlo simulation with value and policy networks', k='der'),
  C('Model (rules), tree search, human games', 'alphago', 'abstract', k='der', f=['model', 'search', 'demos']),
  C('Discrete (board moves)', 'alphago', 'abstract', k='der', f='disc'),
  C('Search alone (Monte Carlo rollouts) played Go at amateur level; learned networks guide and cut the search', 'alphago', 'abstract',
    'Without any lookahead search, the neural networks play Go at the level of state-of-the-art Monte Carlo tree search programs', frm=['reinforce', 'td0']),
  C('Superseded by AlphaGo Zero, which beat it 100 to 0', 'agz', 'abstract', 'winning 100', k='der'))

R('agz', 'AlphaGo Zero', 'AG Zero', 'mb', '2017-10', 'mb',
  C('Silver et al., Mastering the game of Go without human knowledge (Nature 550)', 'agz', 'doi'),
  C('Actor-critic (one network, policy and value outputs)', 'agz', 'abstract',
    'a neural network is trained to predict AlphaGo’s own move selections and also the winner of AlphaGo’s games', f='ac'),
  C('Given (the rules)', 'agz', 'abstract', 'without human data, guidance or domain knowledge beyond game rules', f='given'),
  C('Self-play only', 'agz', 'abstract', 'based solely on reinforcement learning', f='self'),
  C('Policy head to the search\'s move choices, value head to the winner', 'agz', 'abstract', 'trained to predict AlphaGo’s own move selections and also the winner'),
  C('Model (rules), tree search', 'agz', 'abstract', k='der', f=['model', 'search']),
  C('Discrete', 'agz', 'abstract', k='der', f='disc'),
  C('Drops the human games: search becomes its own teacher', 'agz', 'abstract', 'AlphaGo becomes its own teacher', frm=['alphago']),
  C('Generalised to chess and shogi as AlphaZero', 'az17', 'abstract', 'we generalise this approach into a single AlphaZero algorithm', k='der'))

R('az', 'AlphaZero', 'AlphaZero', 'mb', '2017-12-05', 'mb',
  C('Silver et al., Mastering Chess and Shogi by Self-Play with a General RL Algorithm', 'az17', 'arXiv v1', n='Peer-reviewed version: Science 362, 2018 (doi 10.1126/science.aar6404).'),
  C('Actor-critic (policy and value heads)', 'az17', 'abstract', k='der', f='ac'),
  C('Given (the rules)', 'az17', 'abstract', 'given no domain knowledge except the game rules', f='given'),
  C('Self-play with the latest network', 'az17', 'Methods', 'Self-play games are generated by using the latest parameters for this neural network', f='self'),
  C('Search visit counts as the policy target, game result as the value target', 'az17', 'Methods', 'with respect to the visit counts at the root state', k='der'),
  C('Model (rules), tree search', 'az17', 'abstract', k='der', f=['model', 'search']),
  C('Discrete', 'az17', 'abstract', k='der', f='disc'),
  C('One algorithm and one set of hyperparameters for chess, shogi and Go, with no Go-specific tuning', 'az17', 'abstract',
    'we generalise this approach into a single AlphaZero algorithm that can achieve, tabula rasa, superhuman performance in many challenging domains', frm=['agz']),
  C('MuZero matched it without being given the rules', 'muzero', 'abstract', 'matched the superhuman performance of the AlphaZero algorithm that was supplied with the game rules', k='der'))

R('muzero', 'MuZero', 'MuZero', 'mb', '2019-11-19', 'mb',
  C('Schrittwieser et al., Mastering Atari, Go, Chess and Shogi by Planning with a Learned Model', 'muzero', 'arXiv v1', n='Nature 588, 2020 (doi 10.1038/s41586-020-03051-4).'),
  C('Actor-critic plus a learned model', 'muzero', 'abstract', 'the reward, the action-selection policy, and the value function', f='ac'),
  C('Learned (predicts only reward, policy and value)', 'muzero', 'abstract',
    'MuZero learns a model that, when applied iteratively, predicts the quantities most directly relevant to planning', f='learned'),
  C('Off-policy (replay buffer of past games)', 'muzero', 'Figure 1', 'At the end of the episode the trajectory data is stored into a replay buffer', k='der', f='off'),
  C('Unrolled model matched to observed rewards, search values and search visit counts', 'muzero', 'abstract', k='der'),
  C('Learned model, tree search, replay buffer', 'muzero', 'abstract', k='der', f=['lmodel', 'search', 'replay']),
  C('Discrete', 'muzero', 'abstract', '57 different Atari games', k='der', f='disc'),
  C('AlphaZero needs the rules; MuZero plans without knowing the dynamics', 'muzero', 'abstract',
    'without any knowledge of their underlying dynamics', frm=['az', 'dyna']),
  C('Rate control in YouTube\'s VP9 encoder (libvpx)', 'muzerovp9', 'abstract',
    'the MuZero-based rate control achieves an average 6.28% reduction in size of the compressed videos'))

R('dreamer', 'Dreamer', 'Dreamer', 'mb', '2019-12-03', 'mb',
  C('Hafner et al., Dream to Control: Learning Behaviors by Latent Imagination', 'dreamer', 'arXiv v1'),
  C('Actor-critic in imagination, plus a learned world model', 'dreamer', 'abstract',
    'propagating analytic gradients of learned state values back through trajectories imagined in the compact state space of a learned world model', f='ac'),
  C('Learned (latent world model)', 'dreamer', 'abstract', 'a learned world model', f='learned'),
  C('Off-policy (dataset of past experience)', 'dreamer', '3', 'Learning the latent dynamics model from the dataset of past experience', k='der', f='off'),
  C('Lambda-returns of learned values along imagined trajectories', 'dreamer', 'abstract', 'analytic gradients of learned state values', k='der'),
  C('Learned model, replay', 'dreamer', 'abstract', k='der', f=['lmodel', 'replay']),
  C('Continuous in the paper (visual control)', 'dreamer', 'abstract', 'On 20 challenging visual control tasks', k='der', f='cont'),
  C('Deriving behaviour from a learned world model from pixels, efficiently', 'dreamer', 'abstract',
    'there are many potential ways for deriving behaviors from them', frm=['dyna']),
  C('DreamerV3 (Nature 2025): one configuration across 150+ tasks; first to collect Minecraft diamonds from scratch', 'dreamerv3', 'abstract',
    'Dreamer is the first algorithm to collect diamonds in Minecraft from scratch without human data or curricula'))

# ---------------- imitation and offline ----------------
R('bc', 'Behaviour cloning', 'BC', 'off', '1988', 'off',
  C('Pomerleau, ALVINN: An Autonomous Land Vehicle in a Neural Network (NeurIPS 1988)', 'alvinn88', 'title'),
  C('Policy', 'alvinn88', 'title', k='der', f='policy'),
  C('Free', 'alvinn88', 'title', k='der', f='free'),
  C('Offline (demonstrations)', 'corl', 'README', k='der', f='offline'),
  C('None: the expert\'s action at each state is the label (supervised learning, no reward)', 'alvinn88', 'title', k='der'),
  C('Demonstrations', 'imitation', 'README', k='der', f=['demos']),
  C('Discrete or continuous', 'imitation', 'README', k='der', f='both'),
  C('Starting point of imitation: copy an expert instead of specifying a reward', 'alvinn88', 'title', k='der', frm=[]),
  C('The baseline of imitation and offline RL libraries (imitation, CORL)', 'imitation', 'README', 'Behavioral Cloning'))

R('gail', 'GAIL', 'GAIL', 'off', '2016-06-10', 'off',
  C('Ho and Ermon, Generative Adversarial Imitation Learning', 'gail', 'arXiv v1'),
  C('Policy, plus a discriminator that acts as the reward', 'gail', 'abstract', 'draws an analogy between imitation learning and generative adversarial networks', k='der', f='policy'),
  C('Free', 'gail', 'abstract', 'a model-free imitation learning algorithm', f='free'),
  C('On-policy (TRPO steps) plus fixed demonstrations', 'gail', 'Algorithm 1', 'region policy optimization (TRPO) [26] step to produce', k='der', f='on'),
  C('A discriminator\'s judgement of expert-likeness, maximised with TRPO', 'gail', 'Algorithm 1', k='der'),
  C('Demonstrations, environment access', 'gail', 'abstract', k='der', f=['demos']),
  C('Continuous in the paper', 'gail', 'abstract', 'imitating complex behaviors in large, high-dimensional environments', k='der', f='both'),
  C('Inverse RL followed by RL is indirect and slow', 'gail', 'abstract', 'This approach is indirect and can be slow', frm=['bc', 'trpo']),
  C('Implemented in the imitation library', 'imitation', 'README', 'Generative Adversarial Imitation Learning'))

R('cql', 'CQL', 'CQL', 'off', '2020-06-08', 'off',
  C('Kumar et al., Conservative Q-Learning for Offline Reinforcement Learning', 'cql', 'arXiv v1'),
  C('Value (Q), also used inside actor-critic methods', 'cql', 'abstract',
    'straightforward to implement on top of existing deep Q-learning and actor-critic implementations', f='value'),
  C('Free', 'cql', 'abstract', k='der', f='free'),
  C('Offline', 'cql', 'abstract', 'learn effective policies from previously-collected, static datasets without further interaction', f='offline'),
  C('Bellman error plus a regulariser that pushes Q down on actions outside the dataset', 'cql', 'abstract',
    'CQL augments the standard Bellman error objective with a simple Q-value regularizer'),
  C('Static dataset', 'cql', 'abstract', k='der', f=['dataset']),
  C('Discrete or continuous', 'cql', 'abstract', 'On both discrete and continuous control domains', f='both'),
  C('Off-policy methods overestimate actions the data never tried', 'cql', 'abstract',
    'standard off-policy RL methods can fail due to overestimation of values induced by the distributional shift between the dataset and the learned policy', frm=['dqn15', 'sac']),
  C('Implemented in CORL (offline and offline-to-online)', 'corl', 'README', 'Conservative Q-Learning for Offline Reinforcement Learning'))

R('iql', 'IQL', 'IQL', 'off', '2021-10-12', 'off',
  C('Kostrikov, Nair and Levine, Offline Reinforcement Learning with Implicit Q-Learning', 'iql', 'arXiv v1'),
  C('Actor-critic (Q, V, and a policy extracted afterwards)', 'iql', 'abstract', 'we extract the policy via advantage-weighted behavioral cloning', k='der', f='ac'),
  C('Free', 'iql', 'abstract', k='der', f='free'),
  C('Offline', 'iql', 'abstract', 'never needs to evaluate actions outside of the dataset', f='offline'),
  C('An upper expectile of Q over dataset actions stands in for the max', 'iql', 'abstract',
    'taking a state conditional upper expectile of this random variable to estimate the value of the best actions in that state'),
  C('Static dataset', 'iql', 'abstract', k='der', f=['dataset']),
  C('Continuous in the paper (D4RL)', 'iql', 'abstract', 'IQL demonstrates the state-of-the-art performance on D4RL', k='der', f='both'),
  C('Constraining or penalising unseen actions; IQL never queries them', 'iql', 'abstract',
    'need to either constrain these actions to be in-distribution, or else regularize their values', frm=['cql']),
  C('Implemented in CORL; fine-tunes online after offline training', 'iql', 'abstract',
    'IQL achieves strong performance fine-tuning using online interaction after offline initialization'))

R('dt', 'Decision Transformer', 'DT', 'off', '2021-06-02', 'off',
  C('Chen et al., Decision Transformer: Reinforcement Learning via Sequence Modeling', 'dt', 'arXiv v1'),
  C('Policy (a return-conditioned sequence model)', 'dt', 'abstract', 'Decision Transformer simply outputs the optimal actions by leveraging a causally masked Transformer', f='policy'),
  C('Free', 'dt', 'abstract', 'model-free offline RL baselines', k='der', f='free'),
  C('Offline', 'dt', 'abstract', 'matches or exceeds the performance of state-of-the-art model-free offline RL baselines', k='der', f='offline'),
  C('None: actions are predicted given a desired return-to-go', 'dt', 'abstract',
    'Unlike prior approaches to RL that fit value functions or compute policy gradients'),
  C('Static dataset', 'dt', 'abstract', k='der', f=['dataset']),
  C('Discrete and continuous (Atari, Gym)', 'dt', 'abstract', 'Atari, OpenAI Gym, and Key-to-Door tasks', k='der', f='both'),
  C('Replaces value fitting and policy gradients with conditional sequence modelling', 'dt', 'abstract',
    'casts the problem of RL as conditional sequence modeling', frm=['bc', 'cql']),
  C('Implemented in CORL', 'corl', 'README', 'Decision Transformer'))

# ---------------- language models ----------------
R('prefrl', 'RL from human preferences', 'Pref. RL', 'llm', '2017-06-12', 'llm',
  C('Christiano et al., Deep reinforcement learning from human preferences', 'christiano17', 'arXiv v1'),
  C('Actor-critic (A2C) or policy (TRPO), plus a reward model', 'christiano17', '2.2',
    'we use advantage actor-critic (A2C; Mnih et al., 2016) to play Atari games, and trust region policy optimization', f='ac'),
  C('Free', 'christiano17', 'abstract', k='der', f='free'),
  C('On-policy', 'christiano17', '2.2', k='der', f='on'),
  C('A reward model fitted to human comparisons of trajectory segments, optimised with A2C or TRPO', 'christiano17', 'abstract',
    'goals defined in terms of (non-expert) human preferences between pairs of trajectory segments'),
  C('Reward model, preference data, critic', 'christiano17', 'abstract', k='der', f=['rm', 'prefs', 'critic']),
  C('Discrete and continuous (Atari, simulated robots)', 'christiano17', 'abstract', 'including Atari games and simulated robot locomotion', f='both'),
  C('No reward function available: learn it from human comparisons', 'christiano17', 'abstract',
    'can effectively solve complex RL tasks without access to the reward function', frm=['a3c', 'trpo']),
  C('Carried to language models by Ziegler et al. (2019)', 'ziegler19', 'abstract',
    'Reward learning enables the application of reinforcement learning (RL) to tasks where reward is defined by human judgment', k='der'))

R('rlhf', 'RLHF with PPO', 'RLHF-PPO', 'llm', '2019-09-18', 'llm',
  C('Ziegler et al., Fine-Tuning Language Models from Human Preferences', 'ziegler19', 'arXiv v1',
    n='The best-known version is InstructGPT (Ouyang et al., 2022, arXiv 2203.02155); see its paper page.'),
  C('Actor-critic (policy and value model), plus a frozen reward model', 'ziegler19', '2', 'Train π via Proximal Policy Optimization', k='der', f='ac'),
  C('Free', 'ziegler19', 'abstract', k='der', f='free'),
  C('On-policy (approximately, as PPO)', 'ziegler19', '2', k='der', f='on'),
  C('Reward-model score minus beta times the KL to the starting model; per-token advantages from the value model', 'instructgpt', '3.5',
    'mixing PPO updates with updates that increase the log likelihood of the pretraining distribution', k='der',
    n='The quote is InstructGPT\'s PPO-ptx variant, which adds a pretraining term to the KL-penalised reward.'),
  C('Reward model, preference data, critic, reference model', 'instructgpt', 'Figure 2',
    'reinforcement learning via proximal policy optimization (PPO) on this reward model', k='der', f=['rm', 'prefs', 'critic', 'ref']),
  C('Tokens (discrete, vocabulary-sized)', 'ziegler19', 'abstract', k='der', f='tok'),
  C('Language: applies preference-reward learning to pretrained language models', 'ziegler19', 'abstract',
    'we build on advances in generative pretraining of language models to apply reward learning to four natural language tasks', frm=['prefrl', 'ppo']),
  C('InstructGPT and ChatGPT; still shipped in verl', 'chatgpt', 'blog', 'Using these reward models, we can fine-tune the model using Proximal Policy Optimization'),
  pp='instructgpt')

R('dpo', 'DPO (the RL-free alternative)', 'DPO', 'llm', '2023-05-29', 'align',
  C('Rafailov et al., Direct Preference Optimization: Your Language Model is Secretly a Reward Model', 'dpo', 'arXiv v1'),
  C('Policy (the reward is implicit in it)', 'dpo', 'abstract',
    'a new parameterization of the reward model in RLHF that enables extraction of the corresponding optimal policy in closed form', f='policy'),
  C('Free', 'dpo', 'abstract', k='der', f='free'),
  C('Offline (fixed preference pairs, no sampling)', 'dpo', 'abstract', 'eliminating the need for sampling from the LM during fine-tuning', k='der', f='offline'),
  C('No expectation estimated: a logistic loss on the chosen-minus-rejected log-ratio against a frozen reference', 'dpo', 'abstract',
    'allowing us to solve the standard RLHF problem with only a simple classification loss'),
  C('Preference data, reference model', 'dpo', 'abstract', k='der', f=['prefs', 'ref']),
  C('Tokens', 'dpo', 'abstract', k='der', f='tok'),
  C('RLHF\'s reward model plus PPO loop is complex and unstable', 'dpo', 'abstract', 'RLHF is a complex and often unstable procedure', frm=['rlhf']),
  C('Llama 3\'s post-training (chosen over more complex RL algorithms); Tulu 3; TRL', 'llama3', '1',
    'direct preference optimization (DPO; Rafailov et al. (2023)) as opposed to more complex reinforcement learning algorithms'),
  pp='dpo')

R('rloo', 'RLOO', 'RLOO', 'llm', '2019', 'llm',
  C('Kool, van Hoof and Welling, Buy 4 REINFORCE Samples, Get a Baseline for Free! (2019)', 'kool19', 'OpenReview',
    n='Brought to RLHF by Ahmadian et al., Back to Basics (arXiv 2402.14740, February 2024).'),
  C('Policy (no critic)', 'rloo24', '2.3', k='der', f='policy'),
  C('Free', 'rloo24', '2.3', k='der', f='free'),
  C('On-policy', 'rloo24', 'abstract', 'benefiting from online RL optimization at low cost', k='der', f='on'),
  C('Each sample\'s reward minus the mean reward of the other k - 1 samples for the same prompt', 'rloo24', '2.3',
    'The rewards for each sample can serve all other samples as a baseline'),
  C('Several samples per prompt, reward model or verifier', 'rloo24', '2.3', k='der', f=['groups', 'rm']),
  C('Tokens (in its RLHF use)', 'rloo24', 'abstract', k='der', f='tok'),
  C('REINFORCE\'s single-sample estimate is noisy; the other samples give a free baseline', 'kool19', 'abstract',
    'we freely obtain a REINFORCE baseline to reduce variance', frm=['reinforce'],
    n='Ahmadian et al.: "many components of PPO are unnecessary in an RLHF context".'),
  C('TRL\'s RLOO Trainer; listed in verl', 'trl_rloo', 'docs', 'TRL supports the RLOO Trainer'))

R('grpo', 'GRPO', 'GRPO', 'llm', '2024-02-05', 'llm',
  C('Shao et al., DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models', 'dsmath', 'arXiv v1'),
  C('Policy (no critic)', 'dsmath', '1', 'GRPO foregoes the critic model, instead estimating the baseline from group scores', f='policy'),
  C('Free', 'dsmath', '4.1', k='der', f='free'),
  C('On-policy (approximately, as PPO)', 'dsmath', '4.1', k='der', f='on'),
  C('(r_i - mean(r)) / std(r) over G responses to the same prompt, given to every token of response i', 'dsmath', '4.1',
    'uses the average reward of multiple sampled outputs, produced in response to the same question, as the baseline', k='der'),
  C('Groups of samples, reward model or verifier, reference model', 'dsmath', '4.1', k='der', f=['groups', 'rm', 'ref']),
  C('Tokens', 'dsmath', '4.1', k='der', f='tok'),
  C('PPO\'s value model costs memory and is hard to train on one end-of-sequence reward', 'dsmath', 'abstract',
    'a variant of Proximal Policy Optimization (PPO), that enhances mathematical reasoning abilities while concurrently optimizing the memory usage of PPO', frm=['rlhf', 'ppo']),
  C('DeepSeek-R1\'s RL algorithm; in TRL and verl', 'r1', '2.2.1',
    'we adopt Group Relative Policy Optimization (GRPO) (Shao et al., 2024), which foregoes the critic model that is typically the same size as the policy model'),
  pp='dsmath')

R('rlvr', 'RLVR', 'RLVR', 'llm', '2024-11-22', 'llm',
  C('Lambert et al., Tulu 3: Pushing Frontiers in Open Language Model Post-Training', 'tulu3', 'arXiv v1',
    n='RLVR names a reward source (a verifier), not an optimiser; Tulu 3 optimised it with PPO, DeepSeek-R1 with GRPO.'),
  C('Actor-critic in Tulu 3 (PPO with a value model)', 'tulu3', '6', 'Initialize the Value model from a General RM', f='ac'),
  C('Free', 'tulu3', '6', k='der', f='free'),
  C('On-policy', 'tulu3', '6', k='der', f='on'),
  C('A verifier\'s reward (alpha if verifiably correct, else 0), optimised with PPO', 'tulu3', 'Figure 18',
    'verifiably correct, we provide reward of α, otherwise 0. We then train against this reward using PPO'),
  C('Verifier, critic (in Tulu 3)', 'tulu3', '6', k='der', f=['verifier', 'critic']),
  C('Tokens', 'tulu3', '6', k='der', f='tok'),
  C('A learned reward model can be flattered; a program that checks the answer cannot', 'tulu3', 'abstract',
    'a novel method we call Reinforcement Learning with Verifiable Rewards (RLVR)', k='der', frm=['rlhf']),
  C('DeepSeek-R1-Zero\'s rule-based rewards; verl supports function-based (verifiable) rewards', 'r1', '2.2.2',
    'we adopt a rule-based reward system that mainly consists of two types of rewards'))

R('drgrpo', 'Dr. GRPO', 'Dr. GRPO', 'llm', '2025-03-26', 'llm',
  C('Liu et al., Understanding R1-Zero-Like Training: A Critical Perspective', 'drgrpo', 'arXiv v1'),
  C('Policy (no critic)', 'drgrpo', '3.2', k='der', f='policy'),
  C('Free', 'drgrpo', '3.2', k='der', f='free'),
  C('On-policy', 'drgrpo', '3.2', k='der', f='on'),
  C('r_i - mean(r): no division by the group std, and no division by each response\'s own length', 'drgrpo', '3.2',
    'we propose to simply remove the |o1 | and std'),
  C('Groups of samples, verifier', 'drgrpo', 'abstract', k='der', f=['groups', 'verifier']),
  C('Tokens', 'drgrpo', 'abstract', k='der', f='tok'),
  C('GRPO\'s normalisations bias it towards longer wrong answers', 'drgrpo', 'abstract',
    'we identify an optimization bias in Group Relative Policy Optimization (GRPO), which artificially increases response length (especially for incorrect outputs) during training', frm=['grpo']),
  C('A recipe in verl', 'verl', 'README', 'DrGRPO'))

R('dapo', 'DAPO', 'DAPO', 'llm', '2025-03-18', 'llm',
  C('Yu et al., DAPO: An Open-Source LLM Reinforcement Learning System at Scale', 'dapo', 'arXiv v1'),
  C('Policy (no critic)', 'dapo', 'abstract', k='der', f='policy'),
  C('Free', 'dapo', 'abstract', k='der', f='free'),
  C('On-policy', 'dapo', 'abstract', k='der', f='on'),
  C('GRPO\'s group advantage with the clip widened upward (0.2 below, 0.28 above), a token-level loss, and all-same-reward groups dropped', 'dapo', '3',
    'to 0.2 and εhigh to 0.28'),
  C('Groups of samples, verifier', 'dapo', 'abstract', k='der', f=['groups', 'verifier']),
  C('Tokens', 'dapo', 'abstract', k='der', f='tok'),
  C('Entropy collapse and wasted zero-signal groups in long chain-of-thought RL; undisclosed recipes', 'dapo', '1',
    'Clip-Higher, which promotes the diversity of the system and avoids entropy collapse', frm=['grpo']),
  C('Recipe and reproduction code in verl', 'verl', 'README', 'DAPO training is fully powered by verl'))

R('gspo', 'GSPO', 'GSPO', 'llm', '2025-07-24', 'llm',
  C('Zheng et al., Group Sequence Policy Optimization', 'gspo', 'arXiv v1'),
  C('Policy (no critic)', 'gspo', 'abstract', k='der', f='policy'),
  C('Free', 'gspo', 'abstract', k='der', f='free'),
  C('On-policy', 'gspo', 'abstract', k='der', f='on'),
  C('Group advantage with one length-normalised importance ratio per response, clipped per sequence', 'gspo', 'abstract',
    'GSPO defines the importance ratio based on sequence likelihood and performs sequence-level clipping, rewarding, and optimization'),
  C('Groups of samples, reward model or verifier', 'gspo', 'abstract', k='der', f=['groups', 'verifier']),
  C('Tokens', 'gspo', 'abstract', k='der', f='tok'),
  C('Token-level ratios are noisy for a sequence-level reward and destabilise mixture-of-experts RL', 'gspo', 'abstract',
    'Unlike previous algorithms that adopt token-level importance ratios', frm=['grpo']),
  C('Qwen3\'s RL; a verl recipe', 'gspo', 'abstract', 'These merits of GSPO have contributed to the remarkable improvements in the latest Qwen3 models'))

R('gdpo', 'GDPO', 'GDPO', 'llm', '2026-01-08', 'llm',
  C('Liu et al., GDPO: Group reward-Decoupled Normalization Policy Optimization for Multi-reward RL', 'gdpo', 'arXiv v1'),
  C('Policy (no critic)', 'gdpo', 'abstract', k='der', f='policy'),
  C('Free', 'gdpo', 'abstract', k='der', f='free'),
  C('On-policy', 'gdpo', 'abstract', k='der', f='on'),
  C('Each reward normalised within the group on its own, then combined', 'gdpo', 'abstract',
    'decoupling the normalization of individual rewards, more faithfully preserving their relative differences'),
  C('Groups of samples, several rewards', 'gdpo', 'abstract', k='der', f=['groups', 'verifier']),
  C('Tokens', 'gdpo', 'abstract', k='der', f='tok'),
  C('GRPO on a summed multi-reward gives different reward combinations the same advantage', 'gdpo', 'abstract',
    'causes them to collapse into identical advantage values', frm=['grpo']),
  C('The baseline SA-MRPO was measured against', 'samrpo', 'abstract', 'improves the harder correctness objective over GDPO in 12 of 15 benchmark comparisons', k='der'))

R('samrpo', 'SA-MRPO', 'SA-MRPO', 'llm', '2026-08-17', 'llm',
  C('Wang et al., Learn What\'s Left, Not What\'s Mastered: Saturation Aware Advantage Reweighting for Multi-Reward Policy Optimization', 'samrpo', 'arXiv v1'),
  C('Policy (no critic)', 'samrpo', 'abstract', k='der', f='policy'),
  C('Free', 'samrpo', 'abstract', k='der', f='free'),
  C('On-policy', 'samrpo', 'abstract', k='der', f='on'),
  C('Each objective standardised on its own, then discounted by a batch estimate of how saturated it is', 'samrpo', 'abstract',
    'standardizes each reward objective independently and adaptively discounts its contribution according to a batch-level estimate of objective saturation'),
  C('Groups of samples, several rewards', 'samrpo', 'abstract', k='der', f=['groups', 'verifier']),
  C('Tokens', 'samrpo', 'abstract', k='der', f='tok'),
  C('Fixed reward weights keep spending gradient on objectives already solved', 'samrpo', 'abstract',
    'all objectives are optimized with fixed relative weights regardless of their current level of saturation', frm=['gdpo']),
  C('Too new for adoption to be known; the paper releases no code', 'samrpo_page', 'README', 'the paper releases no code',
    n='The knowledge base page\'s toy finds a fixed smaller weight does as well or better in its graded setting.'),
  pp='samrpo')
# ---------------------------------------------------------------------------------------------

COLUMNS = [
 dict(id='store', name='What it stores', short='Stores', grp='Taxonomy', sort='cat', desc='The first axis: a value function, a policy, or both (actor-critic).'),
 dict(id='model', name='Model', short='Model', grp='Taxonomy', sort='cat', desc='The second axis: no model (model-free), a model that is given, or one that is learned.'),
 dict(id='data', name='Whose data', short='Data', grp='Taxonomy', sort='cat', desc='The third axis: data from the current policy (on-policy), from any policy (off-policy), only a fixed dataset (offline), self-play, or no samples at all (planning).'),
 dict(id='target', name='What stands in for the expectation', short='Target', grp='Estimator', sort='txt', desc='The target or advantage the method computes in place of the expected return it cannot compute.'),
 dict(id='needs', name='What it needs', short='Needs', grp='Estimator', sort='cat', desc='Ingredients beyond the policy itself: a model, whole episodes, a replay buffer, a critic, groups of samples, a verifier, and so on.'),
 dict(id='act', name='Action space', short='Actions', grp='Estimator', sort='cat', desc='Discrete actions, continuous actions, both, or language-model tokens.'),
 dict(id='paper', name='First paper', short='First paper', grp='History', sort='date', desc='The paper that introduced it, with a verified link. Sorts by date.'),
 dict(id='fixed', name='Problem it fixed', short='Fixed', grp='History', sort='txt', desc='What went wrong in its predecessor, in the source\'s words where possible. These are the lineage graph\'s edges.'),
 dict(id='used', name='Where it is used now', short='Used now', grp='History', sort='txt', desc='Libraries and systems that use it, as of the date read.'),
]
FAMS = {
 'store': [['value', 'Value'], ['policy', 'Policy'], ['ac', 'Actor-critic']],
 'model': [['free', 'Model-free'], ['given', 'Model given'], ['learned', 'Model learned']],
 'data': [['plan', 'Planning (no samples)'], ['on', 'On-policy'], ['off', 'Off-policy'], ['self', 'Self-play'], ['offline', 'Offline']],
 'act': [['disc', 'Discrete'], ['cont', 'Continuous'], ['both', 'Both'], ['tok', 'Tokens']],
 'needs': [['model', 'Model'], ['lmodel', 'Learned model'], ['episodes', 'Whole episodes'], ['replay', 'Replay buffer'], ['target', 'Target network'],
           ['critic', 'Critic'], ['parallel', 'Parallel actors'], ['search', 'Tree search'], ['traces', 'Eligibility traces'], ['demos', 'Demonstrations'],
           ['dataset', 'Static dataset'], ['prefs', 'Preference data'], ['rm', 'Reward model'], ['ref', 'Reference model'], ['groups', 'Groups of samples'],
           ['verifier', 'Verifier or rule reward']],
}
LANES = [['cls', 'Classical (tables)'], ['val', 'Value networks'], ['pg', 'Policy and actor-critic networks'], ['mb', 'Search and world models'],
         ['off', 'Imitation and offline'], ['llm', 'Language models']]

# corrections to common claims; each names the rows and the cell whose source settles it
CORR = [
 dict(claim='DQN was stabilised by a replay buffer and a target network.', truth='The 2013 DQN had replay only; the target network arrived with the 2015 Nature paper.', rows=['dqn13', 'dqn15'], cell=['dqn15', 'fixed']),
 dict(claim='RLHF was invented with PPO.', truth='Christiano et al. (2017) trained the policies with A2C on Atari and TRPO on robots; PPO entered with Ziegler et al. (2019) for language models.', rows=['prefrl', 'rlhf'], cell=['prefrl', 'store']),
 dict(claim='RLVR is GRPO with a checker; DeepSeek-R1 introduced it.', truth='Tulu 3 named RLVR in November 2024 and optimised it with PPO and a value model. RLVR is a reward source, not an optimiser.', rows=['rlvr', 'grpo'], cell=['rlvr', 'target']),
 dict(claim='GRPO comes from DeepSeek-R1.', truth='It was introduced in DeepSeekMath, February 2024, eleven months before R1.', rows=['grpo'], cell=['grpo', 'paper']),
 dict(claim='RLOO is a newer alternative to GRPO.', truth='The leave-one-out baseline is from Kool et al. (2019); Ahmadian et al. brought it to RLHF 17 days after DeepSeekMath appeared.', rows=['rloo', 'grpo'], cell=['rloo', 'fixed']),
 dict(claim='A3C works because its actors are asynchronous.', truth='OpenAI found a synchronous version (A2C) performs better, with no evidence that asynchrony helps.', rows=['a3c', 'a2c'], cell=['a2c', 'fixed']),
 dict(claim='SARSA came first and Q-learning improved on it.', truth='Q-learning is from 1989; SARSA (1994) was introduced as "Modified Connectionist Q-learning".', rows=['qlearn', 'sarsa'], cell=['sarsa', 'fixed']),
 dict(claim='Value iteration was derived as a shortcut for policy iteration.', truth='Bellman\'s value iteration (1957) predates Howard\'s policy iteration (1960); the textbook order is pedagogical.', rows=['vi', 'pi'], cell=['pi', 'fixed']),
 dict(claim='REINFORCE with a learned baseline, and GRPO, are actor-critic methods.', truth='Sutton and Barto: a baseline estimated before the action cannot assess it; only a critic that bootstraps from the next state does. GRPO and RLOO are REINFORCE-family policy methods.', rows=['reinforce', 'grpo', 'rloo'], cell=['reinforce', 'store']),
 dict(claim='PPO is on-policy, so it cannot reuse data.', truth='It reuses each batch for several epochs; the probability ratio corrects for the drift, so it is on-policy only approximately.', rows=['ppo'], cell=['ppo', 'data']),
 dict(claim='DPO is a cheaper RL algorithm.', truth='DPO samples nothing during training; it is a classification loss on fixed preference pairs that solves the same KL-regularised objective in closed form.', rows=['dpo'], cell=['dpo', 'data']),
 dict(claim='MuZero learns a model of the environment.', truth='It learns only what planning needs: reward, policy and value. It is never trained to predict observations.', rows=['muzero'], cell=['muzero', 'model']),
]

# the two before/after chains for the "each fix lights up" animation
CHAINS = {
 'value': dict(name='Q-learning to Rainbow', steps=['qlearn', 'dqn13', 'dqn15', 'ddqn', 'per', 'dueling', 'c51', 'rainbow']),
 'llm': dict(name='PPO to GSPO', steps=['ppo', 'rlhf', 'grpo', 'rlvr', 'drgrpo', 'dapo', 'gspo']),
}

def main():
    d = dict(read_date=READ, sources=SRC, pages=PAGES, paper_pages=PAPER_PAGES, columns=COLUMNS, fams=FAMS, lanes=LANES,
             rows=ROWS, corrections=CORR, chains=CHAINS)
    tv = taxv()
    for r in ROWS:
        if r['id'] not in tv: sys.exit('no taxonomy values for ' + r['id'])
        tx = {}
        for a in TAXCOLS:
            n = TAXNOTE.get((r['id'], a))
            src = r['cells']['paper']['s']
            tx[a] = dict(f=tv[r['id']][a], s=n[1] if n else src, k=n[2] if n else 'der', **({'n': n[0]} if n else {}))
        r['tax'] = tx
    extra = set(tv) - set(r['id'] for r in ROWS)
    if extra: sys.exit('taxonomy values for unknown rows ' + str(extra))
    d['axes'] = AXES
    out = os.path.join(HERE, '..', 'data', 'atlas.json')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(d, open(out, 'w'), indent=1, ensure_ascii=False)
    print(len(ROWS), 'rows written to', os.path.normpath(out))

if __name__ == '__main__':
    main()
