"""Writes coverage_deep_rl_share.json: every fact of the old page "Deep RL: from DQN to PPO to MuZero" (live_deep_rl.md)
that this page carries (the policy-gradient and actor-critic share), with where the HTML carries it.
Sections are the Reading tab's section ids (#rd-...) or tab ids (#t-...). Run: python3 mk_coverage.py"""
import json
F = []
def f(src, fact, where, note=''):
    F.append(dict(old_section=src, fact=fact, here=where, **({'note': note} if note else {})))
S = 'What it is and why it matters'
f(S, 'Policy-gradient and actor-critic line: optimise the policy directly with a learned critic to reduce variance; REINFORCE, A2C, TRPO, PPO; DDPG, TD3, SAC for continuous actions', '#rd-one (table)')
f(S, 'PPO clipped objective, advantage and baseline are the machinery of RLHF and GRPO (link RL for LLMs)', '#rd-one co.key, #rd-ppo, #rd-next')
f(S, 'Policy network pi(a|s; theta) notation', '#rd-why, #rd-thm')
S = 'Policy-gradient line / Optimise the policy directly'
f(S, 'argmax over actions awkward for continuous (torques) and huge (100,000 tokens) action spaces; only deterministic policies', '#rd-why')
f(S, 'Parameterise pi directly as softmax or Gaussian; gradient ascent on J(theta) = E[G(tau)]', '#rd-why, #rd-thm')
f(S, 'tau = (s0, a0, r1, s1, ...) trajectory; G(tau) its discounted return', '#rd-thm')
S = 'The policy gradient theorem'
f(S, 'theta changes which trajectories are sampled; dynamics unknown, so the expectation cannot be differentiated directly', '#rd-thm')
f(S, 'Log-derivative trick: grad E[f] = E[f grad log p] because grad p = p grad log p', '#rd-thm step 1')
f(S, 'Trajectory log-probability = policy terms + dynamics terms independent of theta, so dynamics drop out', '#rd-thm step 2')
f(S, 'Theorem: grad J = E[sum_t grad log pi(a_t|s_t) Q_pi(s_t,a_t)] (Sutton et al. 1999, link)', '#rd-thm formula')
f(S, 'Score function = direction making a_t more likely; Q_pi = expected return after taking it', '#rd-thm dl')
f(S, 'In words: push up log-probability in proportion to how good; needs only samples and differentiable log-probabilities, never a model', '#rd-thm, mistakes')
S = 'REINFORCE'
f(S, 'REINFORCE (Williams 1992, link) is the Monte Carlo version using the sampled return', '#rd-rf')
f(S, 'G_t = sum_k gamma^k r_{t+k+1}; rewards before t dropped since an action cannot affect the past', '#rd-thm step 3 (causality), #rd-rf box')
f(S, 'Unbiased but very high variance; when all rewards are positive every sampled action is pushed up, good ones more', '#rd-rf')
S = 'Baselines and the advantage'
f(S, 'Any baseline b(s) independent of the action leaves the gradient unbiased; the proof sum grad pi = grad 1 = 0', '#rd-base formula')
f(S, 'b(s) = V_pi(s) turns the weight into the advantage A = Q - V, how much better than average', '#rd-base')
f(S, 'Variance-minimising constant baseline is a weighted mean of returns, not exactly V; V is close and what practice uses', '#rd-base (b* formula, Greensmith et al. 2004, rd-bx widget)')
f(S, 'Worked example: rewards 1, 2, 6, uniform softmax, V = 3; score e_a - pi; exact gradient (-0.667, -0.333, 1)', '#rd-base')
f(S, 'Sample action 1 no baseline (0.667, -0.333, -0.333) raises worst action; with baseline (-1.333, 0.667, 0.667)', '#rd-base')
f(S, 'Sample action 3: (-2, -2, 4) without, (-1, -1, 2) with', '#rd-base')
f(S, 'Both average to (-0.667, -0.333, 1); total variance 7.56 to 1.56; baseline 3 is also variance-minimising here because all score vectors have the same length', '#rd-base, rd-bx output, rd-pgc caption')
f(S, "GRPO's group-mean baseline is this idea with V replaced by the mean reward of a group of responses (link RL for LLMs)", '#rd-base co box', 'refined: GRPO also divides by the group std; it is REINFORCE-family, not actor-critic')
S = 'Actor-critic / Learn the baseline'
f(S, 'REINFORCE needs whole episodes and a separate V estimate; actor-critic learns actor and critic V(s;w) at once, critic by TD', '#rd-ac')
f(S, 'TD error delta_t = r + gamma V(s_{t+1}) - V(s_t), 0 if terminal; expectation equals A_pi when critic exact', '#rd-ac formula')
f(S, 'Low variance, biased when critic wrong; return minus V unbiased and high variance: the MC vs TD dial', '#rd-ac')
S = 'Generalised advantage estimation (GAE)'
f(S, 'GAE (Schulman et al. 2015, link) exponentially weighted sum of TD errors, analogous to TD(lambda)', '#rd-gae')
f(S, 'lambda = 0 gives one-step TD error (lowest variance, most bias); lambda = 1 gives return minus V (unbiased, highest variance)', '#rd-gae dl')
f(S, 'PPO reference settings lambda = 0.95, gamma = 0.99', '#rd-gae, #rd-ppo table')
f(S, 'Worked example gamma = 1: rewards 0, 0, 1; V 0.5, 0.6, 0.8; deltas 0.1, 0.2, 0.2; A0 = 0.1, 0.4705, 0.5', '#rd-gae, rd-ga animation, quiz')
S = 'A3C and A2C'
f(S, 'A3C (Mnih et al. 2016, link): many CPU actor-learners, own environment copies, asynchronous gradients to shared weights', '#rd-a2c')
f(S, 'Parallel actors decorrelate data like replay while staying on-policy; state-of-the-art Atari on CPU alone', '#rd-a2c', 'made precise: half the training time on a single multi-core CPU, 16 threads')
f(S, 'A2C synchronous: wait for all actors, one batched update; OpenAI found it as good as A3C, no evidence asynchrony helps, better GPU use (OpenAI Baselines link)', '#rd-a2c', 'quoted: performs better; cost-effective on single-GPU machines')
f(S, 'Modern LLM RL loops have this shape: a batch of rollouts then an update', '#rd-a2c')
S = 'TRPO to PPO / Why the step size is dangerous'
f(S, 'Gradient valid only near the data-collecting policy; a bad step corrupts the next batch; goal is the largest safe step and several gradient steps per batch', '#rd-trpo')
f(S, 'Surrogate built from importance ratio r_t = pi_theta / pi_old; same gradient as PG at theta_old; ratio corrects drift (importance sampling for a stale policy)', '#rd-trpo')
S = 'TRPO'
f(S, 'TRPO (Schulman et al. 2015, link) maximises the surrogate subject to mean KL(old||new) <= delta', '#rd-trpo formula')
f(S, 'Fisher information matrix as curvature; natural-gradient step by conjugate gradient, then line search', '#rd-trpo')
f(S, 'Works but heavy, awkward with shared policy and value networks, hard to scale', '#rd-trpo (PPO paper quote on dropout and parameter sharing)')
S = 'PPO'
f(S, 'PPO (Schulman et al. 2017, link) replaces the constraint with a pessimistic clipped objective optimisable by SGD; L^CLIP formula', '#rd-ppo')
f(S, 'clip range epsilon; 0.1, 0.2, 0.3 compared on continuous control, 0.2 best; Atari started at 0.1 and annealed to 0', '#rd-ppo dl, Table 1, settings table')
f(S, 'Good action: flat once r > 1 + eps; bad action: flat once r < 1 - eps; wrong-way ratio never clipped', '#rd-ppo list, rd-cl widget')
f(S, 'Worked table eps 0.2: (A +2, r 1.5) 2.4 zero; (A +2, r 0.7) 1.4 active; (A -1, r 0.7) -0.8 zero; (A -1, r 1.5) -1.5 active', '#rd-ppo table')
f(S, 'TRPO-like stability first-order; several epochs (10 continuous control, 3 Atari)', '#rd-ppo')
f(S, 'Full loss has value regression term and usually entropy bonus', '#rd-ppo full loss (c1, c2)')
f(S, 'Much of practical performance is implementation details such as advantage normalisation and learning-rate annealing', '#rd-impl')
f(S, 'This objective is the core of RLHF with PPO and of GRPO', '#rd-ppo, #rd-next')
S = 'Off-policy continuous control'
f(S, 'With continuous actions max_a Q is an optimisation; these methods learn an actor that performs it and keep replay and target networks', '#rd-dpg')
f(S, 'DDPG (Lillicrap et al. 2015, link): deterministic actor maximises Q(s, mu(s)) via grad_a Q; critic target r + gamma Q(s\', mu(s\'; theta-); w-); sample-efficient but brittle', '#rd-dpg')
f(S, 'TD3 (Fujimoto et al. 2018, link): overestimation persists in actor-critic; twin critics (clipped double Q), delayed policy updates, target policy smoothing', '#rd-td3')
f(S, 'SAC (Haarnoja et al. 2018, link): stochastic actor, maximum-entropy objective J = sum E[r + alpha H]; H definition; integral for continuous', '#rd-sac')
f(S, 'Even split between two actions has entropy ln 2 = 0.693, worth 0.139 per step at alpha 0.2; deterministic policy earns nothing', '#rd-sac dl')
f(S, 'Entropy bonus keeps exploration alive, robust across seeds; common off-policy default for continuous control and robotics', '#rd-sac')
f(S, 'Same idea reappears in LLM RL as KL and entropy terms that stop collapse onto a single mode', '#rd-sac co box', 'refined: a KL to a reference is not an entropy bonus')
S = 'Map back to the taxonomy'
f(S, 'REINFORCE: policy, model-free, on-policy, any action space', '#rd-one table')
f(S, 'A2C, A3C: actor-critic, model-free, on-policy, any', '#rd-one table')
f(S, 'TRPO, PPO: actor-critic, model-free, approximately on-policy (ratios), any', '#rd-one table, #rd-ppo co box')
f(S, 'DDPG, TD3, SAC: actor-critic, model-free, off-policy replay, continuous', '#rd-one table')
S = 'Trade-offs and when to use which'
f(S, 'Any action space, stability over sample efficiency: PPO; costs data, batch used a few epochs then discarded', '#rd-when, #rd-cc')
f(S, 'Continuous control, samples expensive: SAC or TD3; more moving parts', '#rd-when')
f(S, 'Bias-variance dial: MC returns (REINFORCE, lambda 1) unbiased noisy; TD/critics (lambda 0) stable biased; GAE and n-step between', '#rd-when')
f(S, 'LLM post-training: PPO with value model or GRPO (link)', '#rd-when')
S = 'Common mistakes and misconceptions'
f(S, '"A baseline biases the gradient": state-only baselines do not; action-dependent would', '#rd-wrong')
f(S, '"PPO\'s clip bounds the ratio": bounds only the incentive; monitor clip fraction and KL', '#rd-wrong, rd-pp caption, #rd-impl')
f(S, '"PPO is on-policy so cannot reuse data": reuses each batch for several epochs', '#rd-wrong')
f(S, '"Off-policy means offline": DQN and SAC interact online and learn from replay', '#rd-wrong', 'shared with Value-based deep RL')
f(S, '"Entropy bonuses are a hack": in SAC entropy is part of the objective with a principled temperature', '#rd-wrong')
S = 'How it connects'
f(S, 'Links: Topic: rl, Dynamic programming, Model-free prediction and control (TD errors, TD(lambda) that GAE puts on networks), RL for LLMs (PPO for RLHF, GRPO), Reward hacking', '#t-more')
f(S, 'RL foundations page link', '#t-more (Topic: rl)', 'RL foundations was folded into Topic: rl')
S = 'Best resources'
f(S, 'OpenAI Spinning Up (~3h core pages; Intro to Policy Optimization and VPG/TRPO/PPO/DDPG/SAC docs)', '#t-more')
f(S, 'Lilian Weng, Policy Gradient Algorithms (~45 min)', '#t-more')
f(S, 'Berkeley CS285 (~25h)', '#t-more')
f(S, 'The 37 Implementation Details of PPO (~50 min), mandatory before implementing PPO or GRPO', '#t-more, #rd-impl')
f(S, "David Silver's lectures 6-7 (3h)", '#t-more (Lecture 7, policy gradients)', 'lecture 6 (function approximation) belongs to Value-based deep RL')
S = 'Old interactive embed'
f(S, 'Baseline explorer: move b, mean unchanged, variance changes; uneven policy moves the variance-minimising b away from V', '#rd-bx (rebuilt)')
f(S, 'GAE explorer: three-step episode, slide lambda and gamma', '#rd-ga (rebuilt as a backward-recursion animation)')
f(S, 'PPO clip explorer: objective against ratio, flip advantage, gradient status', '#rd-cl (both signs side by side)')
f(S, 'Quiz items on baseline, action-dependent baseline, GAE at lambda 1, PPO zero gradient, replay for DQN vs A2C, TD3 changes, SAC temperature', '#rd-quiz')
NOT_MINE = ['What it is (tables vs networks)', 'Why tables stop working (correlated data, moving targets, deadly triad)', 'DQN, Double DQN, Dueling DQN, Rainbow', 'AlphaGo, AlphaZero, MuZero', 'Taxonomy rows for DQN family and AlphaGo/MuZero', 'Trade-offs for DQN and AlphaZero/MuZero', 'Mistakes about DQN target network, overestimation, MuZero']
json.dump(dict(source='live_deep_rl.md (old page 3c65c17b0d0d8180b808c8c0cf8ddbe6, fetched 2026-10-04; identical to value_based_deep_rl/src/live_deep_rl.md)',
               owner='Policy gradients and actor-critic (3ee5c17b0d0d8101a262d3620e75747c)', carried=F, count=len(F),
               owned_elsewhere=dict(value_based_deep_rl=NOT_MINE[:3] + NOT_MINE[4:5] + ['Trade-offs for DQN', 'Mistakes about DQN and overestimation'], model_based_rl_and_planning=['AlphaGo, AlphaZero, MuZero and their taxonomy rows, trade-offs and the MuZero mistake'])),
          open('coverage_deep_rl_share.json', 'w'), indent=1, ensure_ascii=False)
print(len(F), 'facts carried')
