"""Writes ../coverage_deep_rl.json: every fact of the old Notion page "Deep RL: from DQN to PPO to MuZero" (live_deep_rl.md)
with its owner after the three-way split. Run from src/: python3 checks/mk_coverage.py"""
import json
H = 'carried here'
PG = 'owned by Policy gradients and actor-critic'
MB = 'owned by Model-based RL and planning'
F = []
def add(sec, fact, owner, where=''):
    F.append({'id': len(F) + 1, 'old_section': sec, 'fact': fact, 'owner': owner, 'where_here': where})
S = 'Header'
add(S, 'Embedded interactive HTML "Interactive: Deep RL: from DQN to PPO to MuZero" (saved as inputs/old_embed_deep_rl.html)', 'replaced', 'This page replaces the value-based part; its widgets are mapped in the Old embed rows at the end')
add(S, 'Reading time line: 25 min read, +32h 35m resources', 'dropped (superseded: each split page states its own reading time)', 'header')
S = 'What it is and why it matters'
add(S, 'Classical RL stores one number per state or state-action pair in a table; works for a gridworld, fails for Atari screens, robot joint readings, token prefixes', H, 'section 1 (Atari screen, Go positions); token prefixes: section 14 (language models)')
add(S, 'Too many states to visit or store; two nearly identical states share nothing in a table', H, 'section 1')
add(S, 'Deep RL replaces tables with networks that generalise: Q-network Q(s,a;theta), policy network pi(a|s;theta), value network V(s;theta)', H, 'one screen and section 1 (Q-network); policy and value networks also owned by Policy gradients and actor-critic')
add(S, 'RL breaks the assumptions that make supervised training stable; history of deep RL is a list of stabilisation tricks', H, 'one screen, section 1')
add(S, 'Three lines: value-based (DQN and refinements)', H, 'one screen')
add(S, 'Three lines: policy-gradient and actor-critic (REINFORCE, A2C, TRPO, PPO; DDPG, TD3, SAC)', PG, 'named and linked in one screen')
add(S, 'Three lines: model-based with search (AlphaGo, AlphaZero given model; MuZero learned)', MB, 'named and linked in one screen')
add(S, "PPO's clipped objective, the advantage and the baseline are the machinery of RLHF and GRPO (link RL for LLMs)", PG, 'section 14 links RL for LLMs')
add(S, 'The AlphaZero line is the ancestry of search plus a learned value at test time', MB)
S = 'Why tables stop working'
add(S, 'A table entry changes only when its own state is updated; a network shares weights so an update moves every similar state; generalisation is the point and the problem', H, 'section 1')
add(S, 'Correlated data: consecutive transitions nearly identical, like training a classifier on a thousand pictures of the same cat; SGD assumes i.i.d. samples', H, 'section 1')
add(S, 'Moving targets: TD target r + gamma max Q(s\',a\';theta) uses the weights being trained', H, 'section 1')
add(S, 'Data depends on the policy: training distribution shifts; bad update produces bad data', H, 'section 1 (with the Nature paper\'s left/right example)')
add(S, 'Deadly triad (Sutton and Barto): function approximation, bootstrapping, off-policy data can diverge; any two usually fine', H, 'section 2')
add(S, 'Each method below is a defence against one failure mode', H, 'section 1 end')
add(S, 'Tabular MC, TD, Q-learning are on Model-free prediction and control; Q-learning moves Q(s,a) toward r + gamma max Q(s\',a\'), learning greedy while behaving exploratorily', H, 'one screen and opening paragraph (linked)')
S = 'DQN'
add(S, 'DQN is Q-learning with a convolutional network reading raw pixels, one Q-value per action', H, 'section 4')
add(S, 'Mnih et al. 2013 (arXiv 1312.5602): seven Atari games from pixels with experience replay', H, 'section 4 table')
add(S, 'Mnih et al. 2015 Nature: added target network, 49 games, one architecture and one set of hyperparameters', H, 'section 4 table')
add(S, 'Input is the last 4 frames stacked: one frame shows where the ball is, not where it is going', H, 'section 4')
add(S, 'Loss L(theta) = E[(r + gamma max Q(s\',a\';theta-) - Q(s,a;theta))^2] with every symbol defined', H, 'section 4 formula box')
add(S, 'At a terminal s\' the target is r', H, 'section 4 formula box')
add(S, 'Nature paper clipped the TD error to [-1, 1], a Huber-style loss', H, 'section 4 Error clipping')
add(S, 'Experience replay: buffer of the most recent 1 million (Nature), random minibatches, breaks correlation, reuses transitions', H, 'section 4 Experience replay')
add(S, 'Replay is legitimate only because Q-learning is off-policy', H, 'section 4, and mistakes')
add(S, 'Target network: frozen copy theta-, overwritten every C updates (10,000 in Nature)', H, 'section 4 The target network')
add(S, "Paper's explanation: an update raising Q(s_t,a_t) often raises Q(s_t+1,a) and the target, leading to oscillation or divergence", H, 'section 4 (quoted) and the animation')
add(S, 'Worked example: r = 1, gamma 0.99, target net (2.0, 3.5, 3.0): target 4.465; online 4.0; TD error 0.465', H, 'section 4 Worked example (recomputed in checks)')
S = 'Double DQN'
add(S, 'Max over noisy estimates biased upwards because the same noise selects and evaluates', H, 'section 5')
add(S, 'Three actions, true value 0, standard normal noise: expected max about 0.85; ten: about 1.54', H, 'section 5 (and Model-free page tab)')
add(S, 'Through bootstrapping the bias is copied into the next target', H, 'section 5 (Model-free link), Figure 2 discussion')
add(S, 'van Hasselt, Guez and Silver 2015: DQN substantially overestimates on some Atari games', H, 'section 5 (corrected to "all 49 games, in varying amounts", their words)')
add(S, 'Double target y = r + gamma Q(s\', argmax Q(s\',a\';theta); theta-): online selects, target evaluates', H, 'section 5 formula')
add(S, 'Noise in one network unlikely to be the same in the other', H, 'section 5 (with the caveat that theta- is an old copy, decoupling partial)')
add(S, 'Worked example: online (2.5, 3.0, 3.8) selects third action, target values 3.0, target 3.97 instead of 4.465', H, 'section 5 worked example')
S = 'Dueling DQN'
add(S, 'Wang et al. 2015: head split into V(s) and A(s,a), Q = V + (A - mean A)', H, 'section 6')
add(S, 'Subtracting the mean makes the split identifiable', H, 'section 6 (and the max form, with its semantics)')
add(S, 'Learns whether the state is good separately from which action; helps where the action barely matters (driving game frames); every update improves V', H, 'section 6 (Enduro quote)')
add(S, 'Example V = 5, A = (1, -1, 3), mean 1, Q = (5, 3, 7)', H, 'section 6 example (plus max-form contrast)')
S = 'Rainbow'
add(S, 'Hessel et al. 2017 combined six extensions; state of the art in data efficiency and final score', H, 'section 11')
add(S, 'Double Q-learning, dueling (as above)', H, 'section 11 list')
add(S, 'Prioritised replay: sample in proportion to last TD error', H, 'section 7, section 11 (Rainbow prioritises by KL loss)')
add(S, 'Multi-step returns formula, faster propagation at the cost of off-policy bias', H, 'section 8')
add(S, 'Distributional C51: 51 fixed atoms, Rainbow support -10 to 10', H, 'section 9, section 11 table')
add(S, 'Noisy nets: learned weight noise replaces epsilon-greedy', H, 'section 10')
add(S, 'Ablation: prioritised replay and multi-step most crucial (large median drop); distributional next; noisy nets helpful in aggregate; no significant aggregate difference from dueling or double', H, 'section 11 and the Rainbow ablation tab (decoded Figure 4)')
add(S, 'Authors hypothesise double mattered little because the [-10, 10] support clips values and counteracts overestimation', H, 'section 11, mistakes')
S = 'Policy-gradient line'
for f in ['Value methods need a max over actions: awkward for continuous and huge action spaces; deterministic policies only (the 100,000-token example)',
          'Policy parameterised directly (softmax or Gaussian), gradient ascent on J(theta) = E[G(tau)], tau and G defined',
          'Log-derivative trick; dynamics drop out of the gradient',
          'Policy gradient theorem (Sutton et al. 1999) formula; score function; push up log-prob in proportion to how good; no model needed',
          'REINFORCE (Williams 1992): Monte Carlo version with G_t; earlier rewards dropped; unbiased, high variance; all-positive rewards push every action up',
          'State baseline leaves the gradient unbiased (derivation); b = V gives the advantage A = Q - V; variance-minimising constant baseline is a weighted mean of returns',
          'Worked softmax example: rewards 1, 2, 6, logits 0, V = 3, exact gradient (-0.667, -0.333, 1); per-action estimates with and without baseline; variance 7.56 to 1.56; baseline 3 variance-minimising here',
          "GRPO's group-mean baseline is this idea (link RL for LLMs)"]:
    add(S, f, PG, 'value-based limits on continuous actions also in section 14' if 'continuous' in f else '')
S = 'Actor-critic'
for f in ['Actor-critic: actor pi(a|s;theta) by policy gradient, critic V(s;w) by TD; TD error as advantage estimate; unbiased when the critic is exact; low variance, biased',
          'Full return minus V: unbiased, high variance (the MC against TD dial)',
          'GAE (Schulman et al. 2015) formula; lambda 0 and 1 endpoints; PPO reference settings lambda 0.95, gamma 0.99',
          'GAE worked example: rewards 0, 0, 1; V = 0.5, 0.6, 0.8; deltas 0.1, 0.2, 0.2; advantages 0.1, 0.4705, 0.5',
          'A3C (Mnih et al. 2016): asynchronous CPU actor-learners, parallel actors decorrelate like replay while on-policy; state of the art on CPU',
          'A2C: synchronous version; OpenAI found it as good as A3C with no evidence asynchrony helps; better GPU use; LLM RL loops have this shape']:
    add(S, f, PG, 'A3C and Ape-X style parallel actors: section 12 mentions distributed actors for value methods' if 'A3C (' in f else '')
S = 'TRPO to PPO'
for f in ['Why the step size is dangerous: next batch sampled from the broken policy', 'Importance ratio r_t(theta) and the surrogate objective; same gradient at theta_old',
          'TRPO (Schulman et al. 2015): KL-constrained surrogate; Fisher matrix, natural gradient by conjugate gradient, line search; heavy and hard to scale',
          'PPO (Schulman et al. 2017) clipped objective; epsilon compared 0.1, 0.2, 0.3 with 0.2 best; Atari from 0.1 annealed to 0',
          'How the min works: good action flat past 1+eps; bad action flat past 1-eps; wrong-way moves never clipped',
          'PPO worked table with eps 0.2 (four cases: 2.4 zero gradient, 1.4 active, -0.8 zero, -1.5 active)',
          'Several epochs per batch (10 continuous control, 3 Atari); value loss and entropy bonus; implementation details matter; core of RLHF with PPO and of GRPO']:
    add(S, f, PG)
S = 'Off-policy continuous control'
add(S, "With continuous actions DQN's max is an optimisation problem; these methods learn an actor and keep DQN's replay buffer and target networks", PG, 'section 14 states the continuous-action limit and links the sibling; section 5 note on TD3 twin critics')
for f in ['DDPG (Lillicrap et al. 2015): deterministic actor maximising Q(s, mu(s)) via grad_a Q; critic target r + gamma Q(s\', mu(s\';theta-); w-); sample-efficient but brittle',
          'TD3 (Fujimoto et al. 2018): overestimation persists in actor-critic; twin critics (clipped double Q), delayed policy updates, target policy smoothing',
          'SAC (Haarnoja et al. 2018): maximum-entropy objective with temperature alpha; entropy definition; ln 2 = 0.693, worth 0.139 at alpha 0.2; robust across seeds; common default; KL and entropy terms in LLM RL']:
    add(S, f, PG, 'TD3 named in section 5 note' if 'TD3' in f else '')
S = 'Model-based line'
for f in ['MCTS: walk down the tree balancing value, prior and visit count, expand, evaluate with a network, back up; root visit counts form an improved policy; search as policy improvement (link Dynamic programming)',
          'AlphaGo (Silver et al. 2016): SL policy on expert games, RL self-play, value network, MCTS with the rules as perfect model',
          'AlphaZero (Silver et al. 2017): no human data; f_theta(s) = (p, v); loss (z - v)^2 - pi^T log p + c||theta||^2 with symbols',
          'AlphaZero worked loss: z = 1, v = 0.6, pi (0.7, 0.2, 0.1), p (0.5, 0.3, 0.2): 0.16 + 0.887 = 1.047',
          'Self-play policy iteration; superhuman chess, shogi, Go within 24 hours; defeated a world-champion program in each',
          'MuZero (Schrittwieser et al. 2019): representation h, dynamics g, prediction f; MCTS in the learned latent model; unroll K = 5; matches rewards, values, policies; hidden state never reconstructs observations',
          'MuZero: 800 simulations per search in board games, 50 in Atari; matched AlphaZero without rules; state of the art on 57 Atari games',
          'Search plus learned value at test time: o1 and DeepSeek-R1-style chain of thought as search in token space; MCTS-guided decoding']:
    add(S, f, MB, 'section 14 mentions MuZero sharing R2D2\'s value rescaling; section 12 notes MuZero\'s Atari scores on the parent tab' if 'Atari' in f else '')
S = 'Map back to the taxonomy'
add(S, 'Three axes of RL foundations (now folded into Topic: rl): what the agent stores, whether it uses a model, whose data', H, 'one screen links the parent Taxonomy and Method atlas tabs')
add(S, 'Row: DQN, Double, Dueling, Rainbow: value (Q), model-free, off-policy (replay buffer), discrete', H, 'one screen, section 14, mistakes (off-policy not offline)')
for r in ['Row: REINFORCE: policy, model-free, on-policy, any', 'Row: A2C, A3C: actor-critic, model-free, on-policy, any', 'Row: TRPO, PPO: actor-critic, model-free, approximately on-policy, any', 'Row: DDPG, TD3, SAC: actor-critic, model-free, off-policy (replay), continuous']:
    add(S, r, PG)
for r in ['Row: AlphaGo, AlphaZero: actor-critic (policy and value heads), given model (rules), self-play, discrete', 'Row: MuZero: actor-critic plus learned model, learned latent model, self-play and replay, discrete']:
    add(S, r, MB)
S = 'Trade-offs and when to use which'
add(S, 'Discrete actions, simulator cheap or data precious: DQN family; replay sample-efficient; off-policy reuse; price: deadly triad, no continuous actions', H, 'section 14 first bullet')
add(S, 'Any action space, stability over sample efficiency: PPO; costs data', PG, 'section 14 points there')
add(S, 'Continuous control, samples expensive: SAC or TD3; more moving parts', PG, 'section 14 points there')
add(S, 'Known model and combinatorial search: AlphaZero; no model but planning: MuZero at large compute per decision', MB, 'section 14 points there')
add(S, 'Bias-variance dial: MC returns (REINFORCE, lambda 1) unbiased and noisy; TD and critics (lambda 0) stable and biased; GAE and n-step between', PG, 'n-step for value methods: section 8 (links Model-free for the dial)')
add(S, 'LLM post-training: PPO with a value model or GRPO (link RL for LLMs)', PG, 'section 14 last bullet links RL for LLMs')
S = 'Common mistakes'
add(S, '"DQN was stabilised by replay and a target network from the start": 2013 replay only, target network 2015', H, 'mistakes, section 4')
add(S, '"Overestimation needs biased estimates": unbiased estimates still give an upward-biased max', H, 'mistakes, section 5')
add(S, '"A baseline biases the gradient"', PG)
add(S, '"PPO\'s clip bounds the ratio": bounds only the incentive; monitor clipped fraction and KL', PG)
add(S, '"PPO is on-policy, so it cannot reuse data"', PG)
add(S, '"Off-policy means offline": DQN and SAC learn online off-policy from a replay buffer', H, 'mistakes (also yours to keep, Policy gradients may repeat for SAC)')
add(S, '"MuZero learns a model of the environment"', MB)
add(S, '"Entropy bonuses are a hack": in SAC the entropy is part of the objective', PG)
S = 'How it connects'
add(S, 'Link: Topic: rl, the map of the RL topic', H, 'header, one screen, Further reading')
add(S, 'Link: RL foundations (MDPs, returns, V and Q, Bellman, on- and off-policy, importance sampling); page folded into Topic: rl', H, 'Further reading links Topic: rl, which now holds it')
add(S, 'Link: Dynamic programming (policy iteration; AlphaZero runs it with search)', H, 'Further reading (value iteration as what FQI approximates); the AlphaZero connection is owned by Model-based RL and planning')
add(S, 'Link: Model-free methods (tabular Q-learning, TD errors, TD(lambda), which DQN and GAE put onto networks)', H, 'one screen, sections 5 and 8, Further reading; GAE part owned by Policy gradients')
add(S, 'Link: RL for LLMs (PPO for RLHF with four models; GRPO)', PG, 'also linked here in section 14 and Further reading')
add(S, 'Link: Reward hacking (what the optimiser exploits when the reward is a proxy)', PG)
S = 'Best resources'
add(S, 'OpenAI Spinning Up (~3h; VPG, TRPO, PPO, DDPG, SAC docs)', PG)
add(S, 'Lilian Weng, Policy Gradient Algorithms (~45 min)', PG)
add(S, 'Berkeley CS285 (~25h), lecture-depth treatment of everything', H, 'Further reading (value-function lectures; the rest serves the siblings)')
add(S, 'The 37 Implementation Details of PPO (~50 min)', PG)
add(S, "David Silver's Lectures 6-7 (3h): function approximation, policy gradients", H, 'Further reading carries Lecture 6; Lecture 7 is owned by Policy gradients and actor-critic')
S = 'Old embed (inputs/old_embed_deep_rl.html)'
add(S, 'Explore widget "overest": expected bias of the max (exact) against the double estimator, with sampling', H, 'section 5 links the Model-free page\'s exact version and adds van Hasselt Figure 2 rebuilt live')
add(S, 'Explore widgets "ppoclip", "baseline", "gae"', PG)
add(S, 'Stepper: one MuZero training unroll (encode, predict, imagine, search, train)', MB)
add(S, 'Searchable taxonomy table of 16 methods with year and key idea (value rows: DQN 2013/2015, Double 2015, Dueling 2015, Rainbow 2017)', H, 'value rows: one screen table; whole table superseded by the parent Method atlas tab; non-value rows owned by the two siblings')
add(S, 'Decision tree "Which method fits my problem?" (DQN family leaf; PPO, SAC, AlphaZero, MuZero leaves)', H, 'DQN leaf: section 14; other leaves owned by the siblings; the parent root has the full decision tree')
add(S, 'Takeaways, glossary, flashcards and quiz (value-based items: deadly triad, replay legitimacy, target network, overestimation, Double DQN target 3.97, dueling identifiability, Rainbow ablation, why DQN can replay and A2C cannot, 2013 to 2015 change)', H, 'every value-based item is answered in sections 1 to 11 and the mistakes; non-value items owned by the siblings')
json.dump({'source': 'live_deep_rl.md (fetched 2026-10-04, Notion 3c65c17b0d0d8180b808c8c0cf8ddbe6) and inputs/old_embed_deep_rl.html',
           'owners': {H: sum(1 for f in F if f['owner'] == H), PG: sum(1 for f in F if f['owner'] == PG), MB: sum(1 for f in F if f['owner'] == MB),
                      'other': sum(1 for f in F if f['owner'] not in (H, PG, MB))},
           'facts': F}, open('coverage_deep_rl.json', 'w'), indent=1, ensure_ascii=False)
print(json.load(open('coverage_deep_rl.json'))['owners'])
