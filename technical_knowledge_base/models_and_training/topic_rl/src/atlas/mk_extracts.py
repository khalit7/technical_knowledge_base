#!/usr/bin/env python3
"""Copy the short passages the atlas quotes from full texts into inputs/extracts.json,
so every quote can be checked offline without shipping whole papers.
Full texts were downloaded to the session scratch directory (arXiv PDFs through pdftotext -layout,
the Sutton and Barto PDF, library READMEs, the archived OpenAI A2C post); set SCRATCH to that folder.
usage: SCRATCH=/path python3 src/atlas/mk_extracts.py"""
import json, os, re, sys, html
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '../../../../..'))
S = os.environ.get('SCRATCH')
if not S: sys.exit('set SCRATCH')
P = lambda *a: os.path.join(S, *a)
# (source key, file, anchor text, lines after the anchor line, lines before)
BLOCKS = [
 ('sb', 'sb.txt', 'The term “dynamic programming” is due to Bellman (1957a)', 3, 0),
 ('sb', 'sb.txt', 'policy iteration algorithm are due to Bellman (1957a) and Howard (1960)', 2, 1),
 ('sb', 'sb.txt', 'millions of states. Both policy iteration and value iteration', 1, 1),
 ('sb', 'sb.txt', 'case is when policy evaluation is stopped after just one sweep', 2, 0),
 ('sb', 'sb.txt', 'An early use of Monte Carlo methods to', 6, 1),
 ('sb', 'sb.txt', 'Monte Carlo ES was introduced in the 1998 edition', 2, 0),
 ('sb', 'sb.txt', 'Roughly speaking, Monte Carlo', 3, 3),
 ('sb', 'sb.txt', 'immediately form a target and make a useful update', 2, 2),
 ('sb', 'sb.txt', 'Most of the specific material from these sections is from Sutton (1988)', 2, 0),
 ('sb', 'sb.txt', 'The Sarsa algorithm was introduced by Rummery and Niranjan (1994)', 3, 0),
 ('sb', 'sb.txt', 'Q-learning was introduced by Watkins (1989), whose outline', 2, 0),
 ('sb', 'sb.txt', 'In this case, the learned action-value function, Q, directly approximates', 3, 0),
 ('sb', 'sb.txt', 'The Dyna architecture is due to Sutton (1990)', 1, 1),
 ('sb', 'sb.txt', 'The -return and its error-reduction properties were introduced by Watkins (1989)', 1, 0),
 ('sb', 'sb.txt', 'REINFORCE is due to Williams (1987, 1992)', 0, 0),
 ('sb', 'sb.txt', 'The baseline was introduced in Williams', 0, 0),
 ('sb', 'sb.txt', 'Actor–critic methods were among the earliest to be investigated', 4, 0),
 ('sb', 'sb.txt', 'In REINFORCE with baseline, the learned state-value function estimates', 13, 0),
 ('sb', 'sb.txt', 'approximate value function. Methods that learn approximations to both policy and value', 2, 0),
 ('sb', 'sb.txt', 'Two of the most important dimensions along which the methods vary are shown in', 13, 0),
 ('sb', 'sb.txt', 'A third dimension that we have emphasized in this book is the binary distinction', 3, 0),
 ('sb', 'sb.txt', 'value function for the policy for a di', 2, 0),
 ('sb', 'sb.txt', 'Definition of return Is the task episodic or continuing', 8, 0),
 ('sb', 'sb.txt', 'Real vs. simulated Should one update based on real experience', 1, 0),
 ('sb', 'sb.txt', 'Dynamic programming methods are shown in the extreme upper-right corner', 2, 0),
 ('sb', 'sb.txt', 'posterior sampling or Thompson sampling, often performs similarly', 1, 2),
 ('sb', 'sb.txt', 'naturally into identifiable episodes, but goes on continually without limit', 2, 1),
 ('sb', 'sb.txt', 'As usual, we start by focusing on the policy evaluation or prediction problem', 2, 0),
 ('sb', 'sb.txt', 'occurring. Some models produce a description of all possibilities and their probabilities', 2, 3),
 ('sb', 'sb.txt', 'makes it applicable to partially observable problems, in which the full state is not available', 1, 1),
 ('sb', 'sb.txt', 'divergence arises whenever we combine all of the following three elements', 9, 1),
 ('sb', 'sb.txt', 'is that the approximate policy can approach a deterministic policy, whereas with', 2, 1),
 ('sb', 'sb.txt', 'Even when there is a simple and easily identifiable goal, the problem of sparse reward', 2, 0),
 ('sb', 'sb.txt', 'as an internal or “intrinsic” reward, implementing a computational form of curiosity', 0, 0),
 ('sb', 'sb.txt', 'of multi-agent extensions to the approach that we introduce in this book', 0, 0),
 ('sb', 'sb.txt', 'estimates. We call methods using this near-greedy action selection rule', 0, 0),
 ('sb', 'sb.txt', 'this technique for encouraging exploration optimistic initial values', 0, 0),
 ('sb', 'sb.txt', 'The idea of this upper confidence bound (UCB) action selection is that the square-root', 0, 0),
 ('sb', 'sb.txt', 'on, until the value function converges. We call this batch updating because updates are', 0, 0),
 ('sb', 'sb.txt', 'algorithms are called expected updates because they are based on an expectation over all', 0, 0),
 ('sb', 'sb.txt', 'difficult for an agent to receive any non-zero reward signal at all', 1, 0),
 ('dapo', 'pdf/2503.14476.txt', 'the KL term from our proposed algorithm', 0, 1),
 ('gspo', 'pdf/2507.18071.txt', 'the KL regularization term hereinafter for brevity', 0, 0),
 ('dsmath', 'pdf/2402.03300.txt', 'Figure 4 | Demonstration of PPO and our GRPO. GRPO foregoes the value model, instead', 0, 0),
 ('dsmath', 'pdf/2402.03300.txt', 'the standard approach is to add a per-token KL penalty from a reference model in the reward at', 1, 1),
 ('dsmath', 'pdf/2402.03300.txt', 'For each question, we sample 64 outputs', 0, 0),
 ('mnih13', 'pdf/1312.5602.txt', 'preprocessing to the last 4 frames of a history and stacks them to', 0, 0),
 ('mnih13', 'pdf/1312.5602.txt', 'annealed linearly from 1 to 0.1 over the first million', 0, 0),
 ('ppo', 'pdf/1707.06347.txt', 'an entropy bonus to ensure', 0, 0),
 ('ddpg', 'pdf/1509.02971.txt', 'an Ornstein-Uhlenbeck proc', 0, 0),
 ('az17', 'pdf/1712.01815.txt', 'Dirichlet noise Dir(α) was added to the prior probabilities in the', 0, 0),
 ('dsmath', 'pdf/2402.03300.txt', 'where 𝑟𝜑 is the reward model, 𝜋𝑟𝑒 𝑓 is the reference model', 0, 0),
 ('mnih13', 'pdf/1312.5602.txt', 'an experience replay mechanism [13]', 1, 1),
 ('ddqn', 'pdf/1509.06461.txt', 'Rm . Two important ingredients of the DQN algorithm as', 3, 0),
 ('mnih15', 'pdf/dqn.txt', 'stability of our method with neural networks is to use a separate network', 3, 1),
 ('christiano17', 'pdf/1706.03741.txt', 'In this paper, we use advantage actor-critic (A2C', 1, 0),
 ('ziegler19', 'pdf/1909.08593.txt', '3. Train π via Proximal Policy Optimization', 0, 0),
 ('rainbow', 'pdf/1710.02298.txt', 'Prioritized replay and multi-step learning were the two', 1, 0),
 ('ppo', 'pdf/1707.06347.txt', 'this choice, we can use a truncated version of generalized advantage estimation', 0, 0),
 ('az17', 'pdf/1712.01815.txt', 'Self-play games are generated by using the latest parameters for this neural network', 1, 0),
 ('dota', 'pdf/1912.06680.txt', 'The policy is trained using Proximal Policy Optimization (PPO)', 0, 0),
 ('tulu3', 'pdf/2411.15124.txt', 'verifiably correct, we provide reward of', 0, 0),
 ('tulu3', 'pdf/2411.15124.txt', 'Initialize the Value model from a General RM', 0, 0),
 ('drgrpo', 'pdf/2503.20783.txt', 'To avoid the aforementioned optimization bias in GRPO, we propose to simply remove', 1, 0),
 ('drgrpo', 'pdf/2503.20783.txt', 'This allows us to remove the KL term', 0, 0),
 ('dapo', 'pdf/2503.14476.txt', '1. Clip-Higher, which promotes', 3, 0),
 ('rloo24', 'pdf/2402.14740.txt', 'REINFORCE estimator (Williams, 1992) and its multi-sample extension REINFORCE Leave-', 3, 0),
 ('rloo24', 'pdf/2402.14740.txt', 'improved upon if we have access to multiple online samples', 3, 0),
 ('dsmath', 'pdf/2402.03300.txt', 'Optimization (GRPO), which obviates the need for additional value function approximation', 2, 0),
 ('gspo', 'pdf/2507.18071.txt', 'and define the importance ratio si (θ ) based on sequence likelihood', 0, 0),
 ('sb', 'sb.txt', 'used to compute optimal policies given a perfect model of the environment as a Markov', 1, 1),
 ('sb', 'sb.txt', 'process must converge to an optimal policy and the optimal value function in a finite', 1, 1),
 ('sb', 'sb.txt', 'iteration formally requires an infinite number of iterations to converge exactly', 0, 0),
 ('sb', 'sb.txt', '6.4     Sarsa: On-policy TD Control', 0, 0),
 ('sb', 'sb.txt', '6.5     Q-learning: O', 0, 0),
 ('sb', 'sb.txt', '13.7    The first to show how continuous actions could be handled', 1, 0),
 ('dsmath', 'pdf/2402.03300.txt', 'GRPO foregoes the critic model, instead estimating the baseline from group scores, significantly', 1, 0),
 ('ppo', 'pdf/1707.06347.txt', 'Most techniques for computing variance-reduced advantage-function estimators make use a', 1, 0),
 ('c51', 'pdf/1707.06887.txt', 'the 51-atom version and DQN is particularly striking', 0, 0),
 ('az17', 'pdf/1712.01815.txt', 'moves, either proportionally or greedily with respect to the visit counts at the root state', 0, 0),
 ('muzero', 'pdf/1911.08265.txt', 'At the end of the episode the trajectory data is stored into a replay buffer', 0, 0),
 ('gail', 'pdf/1606.03476.txt', 'region policy optimization (TRPO) [26] step to produce', 0, 0),
 ('a3c', 'pdf/1602.01783.txt', 'it operates in the forward view by explicitly computing n-', 1, 0),
 ('dapo', 'pdf/2503.14476.txt', 'to 0.2 and εhigh to 0.28', 0, 0),
 ('dapo', 'pdf/2503.14476.txt', '2. Dynamic Sampling, which improves', 0, 0),
 ('rainbow', 'pdf/1710.02298.txt', 'Noisy Nets (Fortunato et al. 2017) propose a noisy', 0, 0),
 ('dreamer', 'pdf/1912.01603.txt', 'Learning the latent dynamics model from the dataset of past experience', 0, 0),
 ('sb3', 'sb3.md', '| A2C ', 16, 0),
 ('sb3', 'sb3.md', 'Implemented in [SB3 Contrib]', 0, 0),
 ('cleanrl', 'cleanrl.md', '| ✅ [Proximal Policy Optimization (PPO)]', 0, 0),
 ('cleanrl', 'cleanrl.md', '| ✅ [Deep Q-Learning (DQN)]', 0, 0),
 ('cleanrl', 'cleanrl.md', '| ✅ [Categorical DQN (C51)]', 0, 0),
 ('cleanrl', 'cleanrl.md', '| ✅ [Soft Actor-Critic (SAC)]', 0, 0),
 ('cleanrl', 'cleanrl.md', '| ✅ [Deep Deterministic Policy Gradient (DDPG)]', 0, 0),
 ('cleanrl', 'cleanrl.md', '| ✅ [Twin Delayed Deep Deterministic Policy Gradient (TD3)]', 0, 0),
 ('verl', 'verl.md', '- Reinforcement learning with [PPO]', 1, 0),
 ('verl', 'verl.md', 'is the open-sourced SOTA RL algorithm that achieves 50 points', 0, 0),
 ('verl', 'verl.md', 'is released: faster diffusion RL, rebuilt Qwen3-Omni multimodal training', 0, 0),
 ('trl', 'trl.md', 'implements the [Group Relative Policy Optimization (GRPO) algorithm]', 0, 0),
 ('trl', 'trl.md', 'implements the popular [Direct Preference Optimization (DPO) algorithm]', 0, 0),
 ('trl_rloo', 'rloo_trainer.md', 'TRL supports the RLOO Trainer', 0, 0),
 ('imitation', 'imitation.md', '| Behavioral Cloning', 0, 0),
 ('imitation', 'imitation.md', '| [Generative Adversarial Imitation Learning]', 0, 0),
 ('corl', 'corl.md', 'Conservative Q-Learning for Offline Reinforcement Learning <br>(CQL)', 0, 0),
 ('corl', 'corl.md', 'Offline Reinforcement Learning with Implicit Q-Learning <br>(IQL)', 0, 0),
 ('corl', 'corl.md', 'Behavioral Cloning <br>(BC)', 0, 0),
 ('corl', 'corl.md', 'Decision Transformer: Reinforcement Learning via Sequence Modeling <br>(DT)', 0, 0),
]
out = {}
for key, f, anchor, after, before in BLOCKS:
    lines = open(P(f), encoding='utf-8', errors='replace').read().split('\n')
    hit = [i for i, l in enumerate(lines) if anchor in l]
    if not hit:
        sys.exit('anchor not found: %s in %s' % (anchor, f))
    i = hit[0]
    txt = ' '.join(re.sub(r'\s+', ' ', l).strip() for l in lines[max(0, i - before): i + after + 1])
    out.setdefault(key, []).append(txt.replace('\u21b5', 'ff').replace('\u2014', ' -- '))
# the archived OpenAI A2C post (2017-08-18)
s = open(P('a2c.html'), encoding='utf-8', errors='replace').read()
s = re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S)
t = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s)))
i = t.find('A2C and A3C The Asynchronous')
out['a2c'] = [t[i:i + 1900]]
# the Kool et al. 2019 abstract, read from the Wayback capture of its OpenReview page
k = open(P('kool.txt'), encoding='utf-8').read() if os.path.exists(P('kool.txt')) else ''
if k:
    out['kool19'] = [k]
# Nature abstracts (meta description of the article pages), AlphaGo 2016 and AlphaGo Zero 2017
for key, f in (('alphago', 'nature16961.html'), ('agz', 'nature24270.html')):
    s = open(P(f), encoding='utf-8', errors='replace').read()
    m = re.search(r'<meta name="description" content="([^"]*)"', s)
    out[key] = [html.unescape(m.group(1))]
# Notion child pages fetched 2026-10-03 (read-only): which methods each covers
# the knowledge base allows no em-dash anywhere: source em-dashes are stored as ' -- ' (quotes are matched on words, so nothing changes)
out = {k: [x.replace('\u2014', ' -- ') for x in v] for k, v in out.items()}
json.dump(out, open(os.path.join(HERE, 'inputs', 'extracts.json'), 'w'), indent=1, ensure_ascii=False)
print({k: len(v) for k, v in out.items()}, os.path.getsize(os.path.join(HERE, 'inputs', 'extracts.json')), 'bytes')
