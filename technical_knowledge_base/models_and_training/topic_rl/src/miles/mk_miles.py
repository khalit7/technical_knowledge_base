"""Build the data for the Milestones and benchmarks tab (t-miles).

Every number below is printed in the source named beside it; the verbatim sentence or table row it comes from
is in notes.md. Derived numbers come from recompute.py (inputs/recompute.json) and are labelled derived.
Writes ../data/miles.json and ../parts/34_js_miles_a.js (window.MS = the same object).
Run: python3 recompute.py && python3 mk_miles.py
"""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
RC = json.load(open(os.path.join(here, 'inputs', 'recompute.json')))
AS_OF = '2026-10-03'

VAL = '3ee5c17b0d0d818689b2c0dbce434ece'    # Value-based deep RL child page
PGC = '3ee5c17b0d0d8101a262d3620e75747c'    # Policy gradients and actor-critic child page
MB = '3ee5c17b0d0d8116be5fd39e10bd94c5'     # Model-based RL and planning child page
LLM = '3c65c17b0d0d818c9bcff7177325fe56'    # RL for LLMs child page
P_IGPT = '3c65c17b0d0d8180b958d8299996a063'  # InstructGPT paper page
P_R1 = '3c65c17b0d0d813faca4f7a51eaa0c65'    # DeepSeek-R1 paper page

def S(name, url): return {'n': name, 'u': url}

# ---------------- milestones ----------------
# d: date (YYYY, YYYY-MM or YYYY-MM-DD); dom: games | control | robotics | language
# what: what was achieved; how: method (child = page that owns the method); cost: compute or samples as disclosed
# res: [label, value] pairs, all printed in the source; fix: a correction to a common claim
M = [
 dict(id='tdg', d='1992', dom='games', t='TD-Gammon', org='IBM (Tesauro)',
  what='A backgammon program that taught itself by playing against itself reached near-parity with a former world champion.',
  how='TD(lambda) on a neural network that scores positions, trained only from self-play; versions 2.0 and 2.1 add a 2-ply search.', child=VAL,
  cost='Self-play games per version: 300,000 (1.0), 800,000 (2.0), 1,500,000 (2.1).',
  res=[['TD-Gammon 1.0 (late 1991)', '-13 points in 51 games (-0.25 per game) against Robertie, Davis, Magriel'],
       ['TD-Gammon 2.0 (1992 World Cup of Backgammon)', '-7 points in 38 games (-0.18 per game)'],
       ['TD-Gammon 2.1', '-1 point in 40 games (-0.02 per game) against Bill Robertie']],
  src=[S('Tesauro, Temporal Difference Learning and TD-Gammon, Communications of the ACM 38(3), March 1995', 'https://www.bkgm.com/articles/tesauro/tdl.html')],
  note='Training games and results per version are from the article\'s Table 1, which is an image; transcribed exactly.',
  fix='Not superhuman: version 2.1 still lost its 40-game test session, by 1 point.'),
 dict(id='dqn13', d='2013-12', dom='games', t='DQN on seven Atari games', org='DeepMind',
  what='One network, one set of hyperparameters, learning seven Atari games from pixels.',
  how='Q-learning with a convolutional network, experience replay and frame stacking.', child=VAL,
  cost='10 million frames per game.',
  res=[['Previous RL methods beaten', '6 of 7 games'], ['Expert human beaten', '3 of 7 games']],
  src=[S('Mnih et al., Playing Atari with Deep Reinforcement Learning (arXiv 1312.5602)', 'https://arxiv.org/abs/1312.5602')]),
 dict(id='dqn15', d='2015-02-26', dom='games', t='DQN in Nature: 49 Atari games', org='DeepMind',
  what='The same agent, unchanged, played 49 Atari games at a level the paper calls comparable to a professional human games tester.',
  how='DQN: Q-learning with experience replay and a periodically updated target network.', child=VAL,
  cost='50 million frames per game, "around 38 days of game experience".',
  res=[['Games at 75% of the human score or more', '29 of 49'], ['Games beating the best earlier RL method', '43 of 49']],
  src=[S('Mnih et al., Human-level control through deep reinforcement learning, Nature 518 (2015)', 'https://www.nature.com/articles/nature14236')],
  fix='"Human-level on Atari" means 75% of a tester\'s score on 29 of 49 games. The paper prints no median; the medians quoted for DQN later (93.5%, 79%, 68.5%, 47.5%) are four different evaluations, see the benchmark below.'),
 dict(id='ag', d='2016-01-27', dom='games', t='AlphaGo beats Fan Hui 5-0', org='DeepMind',
  what='First program to beat a human professional at full-size Go without handicap (match played 5 to 9 October 2015, published January 2016).',
  how='Policy network trained on human games, improved by self-play policy gradient; a value network; Monte Carlo tree search combining them.', child=MB,
  cost='Supervised policy: 30 million KGS positions. RL policy: 50 GPUs for one day. Value network: 50 GPUs for one week. Distributed match version: 1,202 CPUs and 176 GPUs.',
  res=[['Against other Go programs', '494 of 495 games (99.8%)'], ['Against Fan Hui (European champion, 2 dan)', '5 games to 0']],
  src=[S('Silver et al., Mastering the game of Go with deep neural networks and tree search, Nature 529 (2016)', 'https://www.nature.com/articles/nature16961')],
  fix='AlphaGo started from human games: the RL stage refined a policy first trained by imitation on 30 million expert positions.'),
 dict(id='agl', d='2016-03', dom='games', t='AlphaGo beats Lee Sedol 4-1', org='DeepMind',
  what='AlphaGo Lee beat Lee Sedol, winner of 18 international titles, in Seoul.',
  how='Same approach as AlphaGo Fan, larger and trained longer.', child=MB,
  cost='Played distributed over 48 TPUs (AlphaGo Zero paper).',
  res=[['Match result', '4 games to 1']],
  src=[S('Nature news, The Go Files: AI computer wraps up 4-1 victory against human champion (15 March 2016)', 'https://www.nature.com/articles/nature.2016.19575'),
       S('Silver et al., Mastering the game of Go without human knowledge (AlphaGo Zero), Nature 550 (2017), author copy', 'https://discovery.ucl.ac.uk/id/eprint/10045895/1/agz_unformatted_nature.pdf')]),
 dict(id='christiano', d='2017-06', dom='control', t='Deep RL from human preferences', org='OpenAI and DeepMind',
  what='Agents learned Atari games and simulated robot tasks from a human comparing pairs of short clips, with no reward function; the root of RLHF.',
  how='Fit a reward model to pairwise human preferences, then run RL against it.', child=LLM,
  cost='Feedback on less than 1% of the agent\'s interactions; a Hopper backflip from 900 queries in under an hour of human time; Atari with 5,500 queries.',
  res=[['Human time for novel behaviours', 'about an hour']],
  src=[S('Christiano et al., Deep reinforcement learning from human preferences (arXiv 1706.03741)', 'https://arxiv.org/abs/1706.03741')]),
 dict(id='agz', d='2017-10-19', dom='games', t='AlphaGo Zero', org='DeepMind',
  what='Go learned with no human games: beat the version that beat Lee Sedol 100-0 after 3 days, and AlphaGo Master 89-11 after 40 days.',
  how='One network for policy and value, trained only on self-play games, each move chosen by tree search (search as policy improvement).', child=MB,
  cost='3-day run: 4.9 million self-play games, 1,600 simulations per move. 40-day run: 29 million games. Self-play training hardware not stated; matches were played on one machine with 4 TPUs.',
  res=[['Against AlphaGo Lee (after 72 hours)', '100 games to 0'], ['Against AlphaGo Master (40-day version)', '89 games to 11'],
       ['Elo', '5,185 (Master 4,858; Lee 3,739; Fan 3,144)']],
  src=[S('Silver et al., Mastering the game of Go without human knowledge, Nature 550 (2017), author copy', 'https://discovery.ucl.ac.uk/id/eprint/10045895/1/agz_unformatted_nature.pdf')],
  fix='"4 TPUs" is the machine it played on, not what trained it. The paper does not give the self-play hardware; the AlphaZero preprint adds that AlphaGo Zero "used GPUs to train the neural networks".'),
 dict(id='az', d='2017-12-05', dom='games', t='AlphaZero: chess, shogi and Go', org='DeepMind',
  what='One algorithm, no domain knowledge beyond the rules, beat the strongest programs in chess (Stockfish), shogi (Elmo) and the 3-day AlphaGo Zero.',
  how='The AlphaGo Zero recipe with game-specific details removed; one instance trained per game.', child=MB,
  cost='700,000 steps of 4,096 positions; 5,000 first-generation TPUs for self-play and 64 second-generation TPUs for training.',
  res=[['Chess v Stockfish (100 games)', '28 wins, 72 draws, 0 losses'], ['Shogi v Elmo (100 games)', '90 wins, 2 draws, 8 losses'],
       ['Go v AlphaGo Zero 3-day (100 games)', '60 wins, 40 losses'], ['Time to pass Stockfish', '4 hours (300k steps)']],
  src=[S('Silver et al., Mastering Chess and Shogi by Self-Play with a General Reinforcement Learning Algorithm (arXiv 1712.01815)', 'https://arxiv.org/abs/1712.01815')],
  fix='"Beat Stockfish after 4 hours" is 4 hours on 5,000 TPUs generating games, and the preprint\'s match gave Stockfish a 1 GB hash at one minute per move.'),
 dict(id='qtopt', d='2018-06', dom='robotics', t='QT-Opt: grasping from real experience', org='Google Brain and X',
  what='Closed-loop, vision-based grasping on real robots that generalises to objects never seen in training.',
  how='Off-policy Q-learning with a cross-entropy-method optimiser over continuous actions, trained on real grasp attempts.', child=VAL,
  cost='Over 580,000 real grasp attempts from 7 robots, about 800 robot hours over four months.',
  res=[['Grasp success on unseen objects', '96%']],
  src=[S('Kalashnikov et al., QT-Opt (arXiv 1806.10293)', 'https://arxiv.org/abs/1806.10293')]),
 dict(id='dactyl', d='2018-08', dom='robotics', t='Dactyl: in-hand manipulation, sim to real', org='OpenAI',
  what='A five-fingered robot hand reoriented a block to target poses, trained entirely in simulation.',
  how='PPO with an LSTM policy in heavily randomised simulation (domain randomisation), transferred to the real hand.', child=PGC,
  cost='About 100 years of simulated experience in about 50 hours, on 6,144 CPU cores and 8 GPUs.',
  res=[['Median consecutive rotations, block, simulation', '50 (the cap)'], ['Median consecutive rotations, block, real robot', '13']],
  src=[S('OpenAI et al., Learning Dexterous In-Hand Manipulation (arXiv 1808.00177)', 'https://arxiv.org/abs/1808.00177')],
  fix='The reality gap did not close: the same policy managed a median of 13 rotations on the real hand against 50 in simulation.'),
 dict(id='anymal', d='2019-01', dom='robotics', t='ANYmal: legged locomotion, sim to real', org='ETH Zurich and Intel',
  what='A quadruped ran faster than any earlier controller had made it run and learned to get up after falling.',
  how='Policy trained in simulation with a learned actuator network that models the real motors, then deployed directly.', child=PGC,
  cost='Each training run on one PC (one CPU, one GPU), none longer than eleven hours.',
  res=[['Speed against the previous ANYmal record', '25% faster']],
  src=[S('Hwangbo et al., Learning agile and dynamic motor skills for legged robots, Science Robotics (arXiv 1901.08652)', 'https://arxiv.org/abs/1901.08652')]),
 dict(id='five', d='2019-04-13', dom='games', t='OpenAI Five beats the Dota 2 world champions', org='OpenAI',
  what='Beat Team OG, the reigning world champions, in a best-of-three match, then played the public.',
  how='PPO at very large scale with self-play, an LSTM policy, and "surgery" to keep one run going while the game and model changed.', child=PGC,
  cost='770 +/- 50 PFlop/s-days to the champion match (820 by the end); one run from 30 June 2018 to 22 April 2019; a clean rerun took 150 +/- 5.',
  res=[['World champions (OG)', 'won the best of three'], ['Public Arena, 18 to 21 April 2019', 'won 99.4% of 7,257 games']],
  src=[S('Berner et al., Dota 2 with Large Scale Deep Reinforcement Learning (arXiv 1912.06680)', 'https://arxiv.org/abs/1912.06680')],
  fix='The game was restricted: 17 of 117 heroes and no items that control several units. The 99.4% counts games, and the paper notes humans often abandoned losing games.'),
 dict(id='rubik', d='2019-10', dom='robotics', t='A robot hand solves a Rubik\'s cube', org='OpenAI',
  what='The Dactyl hand physically turned a Rubik\'s cube through a full solution, trained only in simulation.',
  how='PPO plus automatic domain randomisation (ADR), which widens the randomised simulation as the policy improves.', child=PGC,
  cost='Roughly 13 thousand years of cumulative simulated experience.',
  res=[['Success, scrambles needing 15 face rotations', '60%'], ['Success, the hardest scrambles (26 rotations)', '20%']],
  src=[S('OpenAI et al., Solving Rubik\'s Cube with a Robot Hand (arXiv 1910.07113)', 'https://arxiv.org/abs/1910.07113')],
  fix='RL learned the hand control, not the solving: the move sequence comes from the Kociemba solver, and the hardest scrambles succeeded 20% of the time.'),
 dict(id='astar', d='2019-10-30', dom='games', t='AlphaStar: Grandmaster in StarCraft II', org='DeepMind',
  what='Rated Grandmaster for all three races on the public Battle.net ladder, above 99.8% of ranked players.',
  how='Supervised start from human replays, then multi-agent RL in a league of main agents and exploiters.', child=PGC,
  cost='Each agent trained on 32 third-generation TPUs for 44 days; almost 900 distinct players created in the league.',
  res=[['MMR, AlphaStar Final', 'Protoss 6,275; Terran 6,048; Zerg 5,835'], ['Ranked players below it', 'above 99.8%']],
  src=[S('Vinyals et al., Grandmaster level in StarCraft II using multi-agent reinforcement learning, Nature 575 (2019), author copy', 'https://storage.googleapis.com/deepmind-media/research/alphastar/AlphaStar_unformatted.pdf')],
  fix='Played under imposed limits (camera view, network delay, an APM cap below human peaks) and started from imitation of human replays.'),
 dict(id='muzero', d='2019-11', dom='games', t='MuZero: planning with a learned model', org='DeepMind',
  what='Matched AlphaZero in Go, chess and shogi without being told the rules, and set a new Atari-57 state of the art.',
  how='Learns a model that predicts only reward, value and policy, and plans with tree search inside it.', child=MB,
  cost='Per board game: 16 TPUs training, 1,000 TPUs self-play. Per Atari game: 8 TPUs training, 32 self-play; 20 billion frames.',
  res=[['Atari-57 median, 30 no-op starts', '2,041.1%'], ['Atari-57 mean', '4,999.2%'], ['Games beating R2D2', '42 of 57']],
  src=[S('Schrittwieser et al., Mastering Atari, Go, Chess and Shogi by Planning with a Learned Model (arXiv 1911.08265; Nature 588, 2020)', 'https://arxiv.org/abs/1911.08265')]),
 dict(id='a57', d='2020-03', dom='games', t='Agent57: above human on all 57 Atari games', org='DeepMind',
  what='First agent above the human benchmark on every one of the 57 games, including Montezuma\'s Revenge, Pitfall! and Skiing.',
  how='R2D2 plus NGU\'s intrinsic novelty reward, a family of exploration and discount settings, and a bandit that picks among them.', child=VAL,
  cost='51 games passed within the first 5 billion frames; Skiing only after 78 billion.',
  res=[['Games above human', '57 of 57'], ['Capped mean', '100%'], ['Median, 30 no-op starts', '1,933.49%'], ['Mean', '4,766.25%']],
  src=[S('Badia et al., Agent57: Outperforming the Atari Human Benchmark (arXiv 2003.13350)', 'https://arxiv.org/abs/2003.13350')],
  fix='Agent57\'s median is lower than MuZero\'s. Its claim is the tail, not the median. Its own table also misprints two MuZero scores (see the benchmark).'),
 dict(id='stiennon', d='2020-09', dom='language', t='Learning to summarize from human feedback', org='OpenAI',
  what='Summaries tuned with RL against a learned reward model beat human reference summaries and much larger supervised models.',
  how='Reward model on human comparisons, then PPO with a KL penalty to the supervised policy: the RLHF recipe on language.', child=LLM,
  cost='Over 64k summary comparisons released; models up to 6.7B parameters.',
  res=[['Preferred to reference summaries, 1.3B RLHF', '61%'], ['Same, supervised model 10x its size', '43%']],
  src=[S('Stiennon et al., Learning to summarize from human feedback (arXiv 2009.01325)', 'https://arxiv.org/abs/2009.01325')]),
 dict(id='ez', d='2021-11', dom='games', t='EfficientZero: Atari 100k above human', org='Tsinghua and others',
  what='First agent above the human median and mean on the 26-game Atari 100k benchmark (about two hours of play per game).',
  how='MuZero with a self-supervised consistency loss, value-prefix prediction and off-policy correction.', child=MB,
  cost='100k agent steps per game (400k frames).',
  res=[['Median, Table 1', '1.090 (human = 1)'], ['Mean, Table 1', '1.943']],
  src=[S('Ye et al., Mastering Atari Games with Limited Data (arXiv 2111.00210)', 'https://arxiv.org/abs/2111.00210')],
  fix='The paper prints two medians: 1.090 in Table 1 and the abstract (109.0%), 1.160 in Section 5.2. BBF\'s rerun table gives 1.116.'),
 dict(id='sophy', d='2022-02-09', dom='games', t='GT Sophy beats top Gran Turismo drivers', org='Sony AI',
  what='Won a head-to-head competition against four of the world\'s best Gran Turismo drivers.',
  how='Model-free deep RL with mixed-scenario training and a reward that encodes racing etiquette.', child=PGC,
  cost='Not stated in the abstract (article behind a paywall; not checked).',
  res=[['Head-to-head event', 'won against four top drivers']],
  src=[S('Wurman et al., Outracing champion Gran Turismo drivers with deep reinforcement learning, Nature 602 (2022)', 'https://www.nature.com/articles/s41586-021-04357-7')]),
 dict(id='tokamak', d='2022-02-16', dom='control', t='Magnetic control of a tokamak plasma', org='DeepMind and EPFL',
  what='One learned controller commanded all of TCV\'s control coils to produce and hold many plasma shapes, including two separate "droplets" at once.',
  how='Policy trained in a simulator of the tokamak with an actor-critic method, then run on the real machine.', child=PGC,
  cost='5,000 actors in parallel, generally 1 to 3 days of training per target.',
  res=[['Configurations produced on TCV', 'elongated, conventional, negative triangularity, snowflake, droplets']],
  src=[S('Degrave et al., Magnetic control of tokamak plasmas through deep reinforcement learning, Nature 602 (2022)', 'https://www.nature.com/articles/s41586-021-04301-9')]),
 dict(id='igpt', d='2022-03', dom='language', t='InstructGPT', org='OpenAI',
  what='GPT-3 fine-tuned with RLHF to follow instructions: a 1.3B InstructGPT was preferred to the 175B GPT-3.',
  how='Supervised fine-tuning on demonstrations, a reward model from rankings, then PPO with a KL penalty and pretraining mix (PPO-ptx).', child=LLM, page=P_IGPT,
  cost='175B PPO-ptx: 60 petaflop/s-days (GPT-3 pretraining: 3,640). PPO: 256k episodes on about 31k prompts; about 40 contractors.',
  res=[['175B InstructGPT preferred to 175B GPT-3', '85 +/- 3%'], ['Preferred to few-shot GPT-3', '71 +/- 4%']],
  src=[S('Ouyang et al., Training language models to follow instructions with human feedback (arXiv 2203.02155)', 'https://arxiv.org/abs/2203.02155')],
  fix='The labels came from about 40 contractors; the paper says it aligns to them and the researchers, "rather than any broader notion of human values".'),
 dict(id='swift', d='2023-08-30', dom='robotics', t='Swift beats champion drone racers', org='University of Zurich and Intel',
  what='An autonomous racing drone beat three human champions in real head-to-head races and set the fastest recorded race time.',
  how='On-policy model-free RL in simulation, with residual models of perception and dynamics fitted from real flight data.', child=PGC,
  cost='Not stated in a form comparable to the others.',
  res=[['Races won', '15 of 25 (5 of 9, 4 of 7, 6 of 9)'], ['Fastest race time', 'half a second ahead of the best human']],
  src=[S('Kaufmann et al., Champion-level drone racing using deep reinforcement learning, Nature 620 (2023)', 'https://www.nature.com/articles/s41586-023-06419-4')],
  fix='Not unbeaten: Swift lost 10 of its 25 races, 40% of them by colliding with the opponent.'),
 dict(id='alphaproof', d='2024-07-25', dom='language', t='AlphaProof: IMO silver standard', org='Google DeepMind',
  what='With AlphaGeometry 2, solved four of the six 2024 International Mathematical Olympiad problems, 28 of 42 points, one short of gold.',
  how='AlphaZero-style RL that proves statements in the formal language Lean.', child=LLM,
  cost='Not disclosed. Some problems took up to three days; contestants get two sessions of 4.5 hours.',
  res=[['Score', '28 of 42 (gold threshold 29)'], ['Problems by AlphaProof', '2 algebra, 1 number theory']],
  src=[S('Google DeepMind blog, AI achieves silver-medal standard solving International Mathematical Olympiad problems (25 July 2024; archived copy)', 'http://web.archive.org/web/20240726000000/https://deepmind.google/discover/blog/ai-solves-imo-problems-at-silver-medal-level/')],
  fix='Not under contest conditions: the problems were translated into Lean by hand, and solving took up to three days.'),
 dict(id='o1', d='2024-09-12', dom='language', t='OpenAI o1', org='OpenAI',
  what='A model trained with large-scale RL to reason in a long chain of thought before answering.',
  how='Large-scale RL on the chain of thought; OpenAI reports gains with both train-time RL compute and test-time thinking.', child=LLM,
  cost='Not disclosed.',
  res=[['AIME 2024, one sample', '74% (GPT-4o 12%)'], ['Consensus of 64 samples', '83%'], ['Re-ranking 1,000 samples', '93%']],
  src=[S('OpenAI, Learning to Reason with LLMs (12 September 2024; archived copy)', 'http://web.archive.org/web/20240913000000/https://openai.com/index/learning-to-reason-with-llms/')],
  fix='74%, 83% and 93% are three different amounts of test-time sampling, not three models.'),
 dict(id='tulu3', d='2024-11', dom='language', t='Tulu 3 names RLVR', org='Ai2',
  what='An open post-training recipe that introduced the name Reinforcement Learning with Verifiable Rewards (RLVR): reward 1 only when a checker accepts the answer.',
  how='SFT, then DPO, then RLVR with PPO; the paper reports RLVR improving GSM8K, MATH and IFEval.', child=LLM,
  cost='Fully open recipe, data and code.',
  res=[['Training stages', 'SFT, DPO, RLVR']],
  src=[S('Lambert et al., Tulu 3: Pushing Frontiers in Open Language Model Post-Training (arXiv 2411.15124)', 'https://arxiv.org/abs/2411.15124')]),
 dict(id='r1', d='2025-01', dom='language', t='DeepSeek-R1 and R1-Zero', org='DeepSeek',
  what='R1-Zero learned long reasoning from rule-based rewards alone, starting from a base model with no SFT; R1 added a cold start and more stages.',
  how='GRPO (PPO without a critic: advantages from a group of sampled answers) with accuracy and format rewards.', child=LLM, page=P_R1,
  cost='147K H800 GPU-hours in total ($294K at $2 per GPU-hour): R1-Zero 101K, SFT data 5K, R1 41K, on 64 x 8 H800s; R1-Zero ran 10,400 steps.',
  res=[['R1-Zero, AIME 2024 pass@1', '15.6% to 77.9% (Nature, 2025); 71.0% in the January preprint'], ['R1-Zero with majority vote', '86.7%'],
       ['R1, AIME 2024 pass@1', '79.8%']],
  src=[S('DeepSeek-AI, DeepSeek-R1 (arXiv 2501.12948)', 'https://arxiv.org/abs/2501.12948'),
       S('Guo et al., DeepSeek-R1 incentivizes reasoning in LLMs through reinforcement learning, Nature 645 (17 September 2025)', 'https://www.nature.com/articles/s41586-025-09422-z')],
  fix='$294K is the RL and SFT-data cost on top of DeepSeek-V3-Base, not the cost of the model; it was published in September 2025, eight months after the January reaction.'),
 dict(id='dapo', d='2025-03', dom='language', t='DAPO: open large-scale RLVR', org='ByteDance Seed and Tsinghua',
  what='An open RL system that took Qwen2.5-32B base to 50 on AIME 2024, above DeepSeek-R1-Zero-Qwen-32B, with half the training steps.',
  how='GRPO-style RL with decoupled clipping, dynamic sampling, token-level loss and overlong-reward shaping.', child=LLM,
  cost='Code and data released; about half the steps of the R1-Zero-Qwen-32B run.',
  res=[['AIME 2024 (avg@32)', '50 points (R1-Zero-Qwen-32B: 47)']],
  src=[S('Yu et al., DAPO: An Open-Source LLM Reinforcement Learning System at Scale (arXiv 2503.14476)', 'https://arxiv.org/abs/2503.14476')]),
 dict(id='yue', d='2025-04', dom='language', t='Does RLVR add new reasoning?', org='Tsinghua',
  what='Across model families and benchmarks, RLVR models win at pass@1 but their base models solve more problems when many samples are allowed.',
  how='Measure pass@k up to large k for base and RLVR-trained models.', child=LLM,
  cost='Evaluation study.',
  res=[['Small k (e.g. k = 1)', 'RLVR model ahead'], ['Large k', 'base model ahead']],
  src=[S('Yue et al., Does Reinforcement Learning Really Incentivize Reasoning Capacity in LLMs Beyond the Base Model? (arXiv 2504.13837)', 'https://arxiv.org/abs/2504.13837')],
  fix='RLVR mostly sharpens what the base model can already sample: better pass@1, not a larger set of solvable problems.'),
 dict(id='spur', d='2025-06', dom='language', t='Spurious rewards', org='University of Washington and Ai2',
  what='On Qwen2.5-Math models, RLVR with random rewards gained almost as much as with correct ones; the effect depends on the base model.',
  how='GRPO with rewards that carry little or no signal: random, format-only, even incorrect labels.', child=LLM,
  cost='Evaluation study.',
  res=[['MATH-500 gain, Qwen2.5-Math-7B, random rewards', '+21.4 points'], ['Same, ground-truth rewards', '+29.1 points']],
  src=[S('Shao et al., Spurious Rewards: Rethinking Training Signals in RLVR (arXiv 2506.10947)', 'https://arxiv.org/abs/2506.10947')],
  fix='A gain from RLVR on one model family is not evidence that the reward taught anything; check it on other bases.'),
]

# ---------------- Atari-57 tables, as printed ----------------
# proto: noop57 | hs57 | noop49 | hs49 ; v: [median, mean] (None when the table prints none)
# fr: training frames as the source states them (emulator frames); snap: how the score was taken
T = {
 'duel': dict(n='Dueling networks, Table 1', u='https://arxiv.org/abs/1511.06581', d='2015-11', snap='best agent, 200M frames',
   note='Wang et al. re-evaluated all agents themselves. "Single" is Double DQN; "Clip" adds gradient clipping.'),
 'ddqn1': dict(n='Double DQN, Table 1', u='https://arxiv.org/abs/1509.06461', d='2015-09', snap='5 minutes of play per episode',
   note='49 games, episodes capped at 5 minutes; DQN values from Mnih et al. (2015).'),
 'ddqn2': dict(n='Double DQN, Table 2', u='https://arxiv.org/abs/1509.06461', d='2015-09', snap='30 minutes from 100 human starts',
   note='49 games with human starts.'),
 'per': dict(n='Prioritized replay, Table 1', u='https://arxiv.org/abs/1511.05952', d='2015-11', snap='best agent, human starts',
   note='Human starts only; DQN rows on 49 games, Double DQN rows on 57.'),
 'a3c': dict(n='A3C, Table 1', u='https://arxiv.org/abs/1602.01783', d='2016-02', snap='human starts',
   note='Labelled "57 Atari games"; its DQN row equals Double DQN Table 2\'s 49-game value.'),
 'noisy': dict(n='NoisyNet, Table 1', u='https://arxiv.org/abs/1706.10295', d='2017-06', snap='random no-op starts',
   note='Each baseline re-run by the authors beside its NoisyNet version.'),
 'c51': dict(n='C51, Figure 6 (a table)', u='https://arxiv.org/abs/1707.06887', d='2017-07', snap='no-op starts, 200M frames',
   note='Baselines are the Dueling paper\'s no-op values, rounded.'),
 'rainbow': dict(n='Rainbow, Table 2', u='https://arxiv.org/abs/1710.02298', d='2017-10', snap='best agent snapshot, 200M frames',
   note='Medians only. Rows marked (*) in the paper come from their publications; DQN from the Dueling paper; the rest are Rainbow\'s own implementations.'),
 'apex': dict(n='Ape-X, Table 1', u='https://arxiv.org/abs/1803.00933', d='2018-03', snap='as reported by each publication',
   note='Medians only, both protocols side by side; Gorila was evaluated on 49 games only.'),
 'muzero': dict(n='MuZero, Table 1', u='https://arxiv.org/abs/1911.08265', d='2019-11', snap='mean over 1,000 episodes, no-op starts',
   note='Large-data agents (top) and 200M-frame agents (bottom).'),
 'a57': dict(n='Agent57, Table 1', u='https://arxiv.org/abs/2003.13350', d='2020-03', snap='maximum over training of a windowed mean, 3 seeds (6 for Agent57)',
   note='All agents except MuZero re-run by the Agent57 authors; MuZero "numbers presented in Schrittwieser et al.".'),
}
A = []  # rows
def r(tab, agent, proto, med, mean=None, fr=None, flag=None, fam=None):
    A.append(dict(tab=tab, a=agent, p=proto, med=med, mean=mean, fr=fr, flag=flag, fam=fam or agent))
# Dueling Table 1
for nm, fam, a, b, c, d_ in [('Nature DQN', 'DQN', 79.1, 227.9, 68.5, 219.6), ('Double DQN ("Single")', 'Double DQN', 117.8, 307.3, 110.9, 332.9),
                             ('Double DQN + clipping', 'Double DQN', 132.6, 341.2, 114.1, 302.8), ('Dueling DDQN ("Duel Clip")', 'Dueling', 151.5, 373.1, 117.1, 343.8),
                             ('Prioritized DDQN ("Prior. Single")', 'Prioritized', 123.7, 434.6, 112.9, 386.7), ('Prioritized Dueling ("Prior. Duel Clip")', 'Prioritized Dueling', 172.1, 591.9, 115.3, 567.0)]:
    r('duel', nm, 'noop57', a, b, '200M', fam=fam); r('duel', nm, 'hs57', c, d_, '200M', fam=fam)
r('ddqn1', 'DQN (Mnih et al. 2015)', 'noop49', 93.5, 241.1, '200M', fam='DQN'); r('ddqn1', 'Double DQN', 'noop49', 114.7, 330.3, '200M', fam='Double DQN')
r('ddqn2', 'DQN (Mnih et al. 2015)', 'hs49', 47.5, 122.0, '200M', fam='DQN'); r('ddqn2', 'Double DQN', 'hs49', 88.4, 273.1, '200M', fam='Double DQN')
r('ddqn2', 'Double DQN (tuned)', 'hs49', 116.7, 475.2, '200M', fam='Double DQN')
r('per', 'DQN baseline', 'hs49', 48, 122, '200M', fam='DQN'); r('per', 'DQN + rank-based prioritization', 'hs49', 106, 355, '200M', fam='Prioritized')
r('per', 'Double DQN (tuned) baseline', 'hs57', 111, 418, '200M', fam='Double DQN'); r('per', 'DDQN + rank-based', 'hs57', 113, 454, '200M', fam='Prioritized')
r('per', 'DDQN + proportional', 'hs57', 128, 551, '200M', fam='Prioritized')
for nm, fam, md, mn, fl in [('DQN', 'DQN', 47.5, 121.9, 'Equals Double DQN Table 2, which is 49 games, though this table says 57.'), ('Gorila', 'Gorila', 71.3, 215.2, None),
                           ('D-DQN', 'Double DQN', 110.9, 332.9, None), ('Dueling D-DQN', 'Dueling', 117.1, 343.8, None),
                           ('Prioritized DQN', 'Prioritized', 127.6, 463.6, 'Prioritized replay\'s own table prints 128% and 551%.'),
                           ('A3C, FF, 1 day on CPU', 'A3C', 68.2, 344.1, None), ('A3C, FF, 4 days on CPU', 'A3C', 116.6, 496.8, None), ('A3C, LSTM, 4 days on CPU', 'A3C', 112.6, 623.0, None)]:
    r('a3c', nm, 'hs57', md, mn, None, flag=fl, fam=fam)
for nm, fam, a, b in [('DQN (re-run)', 'DQN', 83, 319), ('NoisyNet-DQN', 'NoisyNet', 123, 379), ('Dueling (re-run)', 'Dueling', 132, 524),
                      ('NoisyNet-Dueling', 'NoisyNet', 172, 633), ('A3C (re-run)', 'A3C', 80, 293), ('NoisyNet-A3C', 'NoisyNet', 94, 347)]:
    r('noisy', nm, 'noop57', a, b, None, fam=fam)
for nm, fam, a, b in [('DQN', 'DQN', 79, 228), ('DDQN', 'Double DQN', 118, 307), ('Dueling', 'Dueling', 151, 373), ('Prioritized', 'Prioritized', 124, 434),
                      ('Prioritized Dueling', 'Prioritized Dueling', 172, 592), ('C51', 'C51', 178, 701)]:
    r('c51', nm, 'noop57', a, b, '200M', fam=fam)
for nm, fam, a, b, fl in [('DQN', 'DQN', 79, 68, None), ('DDQN (*)', 'Double DQN', 117, 110, None),
                          ('Prioritized DDQN (*)', 'Prioritized', 140, 128, 'No-op 140% is not in Prioritized replay\'s or the Dueling paper\'s summary tables (Dueling prints 123.7%).'),
                          ('Dueling DDQN (*)', 'Dueling', 151, 117, None), ('A3C (*)', 'A3C', None, 116, None), ('Noisy DQN', 'NoisyNet', 118, 102, None),
                          ('Distributional DQN', 'C51', 164, 125, 'Rainbow\'s own implementation; C51\'s paper prints 178% (no-ops).'), ('Rainbow', 'Rainbow', 223, 153, None)]:
    if a is not None: r('rainbow', nm, 'noop57', a, None, '200M', flag=fl, fam=fam)
    r('rainbow', nm, 'hs57', b, None, '200M', flag=fl if nm != 'Distributional DQN' else 'Rainbow\'s own implementation; C51\'s paper prints no human-starts score.', fam=fam)
for nm, fam, a, b, fr, fl in [('Ape-X DQN', 'Ape-X', 434, 358, '22,800M', None), ('Rainbow', 'Rainbow', 223, 153, '200M', None), ('Distributional (C51)', 'C51', 178, 125, '200M', 'Human starts 125% is Rainbow\'s re-implementation, not C51\'s paper.'),
                              ('A3C', 'A3C', None, 117, None, None), ('Prioritized Dueling', 'Prioritized Dueling', 172, 115, '200M', None), ('DQN', 'DQN', 79, 68, '200M', None)]:
    if a is not None: r('apex', nm, 'noop57', a, None, fr, flag=fl if nm != 'Distributional (C51)' else None, fam=fam)
    r('apex', nm, 'hs57', b, None, fr, flag=fl, fam=fam)
for nm, fam, a, b, fr, fl in [('Ape-X', 'Ape-X', 434.1, 1695.6, '22.8B', None), ('R2D2', 'R2D2', 1920.6, 4024.9, '37.5B', None), ('MuZero', 'MuZero', 2041.1, 4999.2, '20.0B', None),
                              ('IMPALA', 'IMPALA', 191.8, 957.6, '200M', None), ('Rainbow', 'Rainbow', 231.1, None, '200M', 'Rainbow\'s own paper prints 223%.'),
                              ('LASER', 'LASER', 431, None, '200M', None), ('MuZero Reanalyze', 'MuZero', 731.1, 2168.9, '200M', None)]:
    r('muzero', nm, 'noop57', a, b, fr, flag=fl, fam=fam)
mz_fix = 'Two MuZero scores in Agent57\'s per-game table have an extra digit (Asteroids, Beam Rider). With MuZero\'s own scores the same arithmetic gives %.2f%% and %.2f%% (derived).' % (RC['muzero_own_with_a57_baselines']['median'], RC['muzero_own_with_a57_baselines']['mean'])
for nm, fam, a, b, fl in [('Agent57', 'Agent57', 1933.49, 4766.25, None), ('R2D2 (bandit)', 'R2D2', 2357.92, 5461.66, None), ('NGU', 'NGU', 1359.78, 3421.80, None),
                          ('R2D2 (Retrace)', 'R2D2', 1457.63, 3518.36, None), ('R2D2 (re-run)', 'R2D2', 1935.86, 4622.09, 'MuZero\'s and NGU\'s papers quote R2D2\'s own 1,920.6%.'),
                          ('MuZero', 'MuZero', 2381.51, 5661.84, mz_fix)]:
    r('a57', nm, 'noop57', a, b, None, flag=fl, fam=fam)

# "first printed for each agent": the climb used by the animation (57 games, no-op starts, each value from its own source)
CLIMB = [
 dict(a='DQN', tab='duel', med=79.1, fr=2e8, frl='200M', d='2015', fix='The baseline: Q-learning on a convolutional network with replay and a target network.', ah=None),
 dict(a='Double DQN', tab='duel', med=117.8, fr=2e8, frl='200M', d='2015', fix='Double Q-learning: pick the next action with the online network, score it with the target network, curbing overestimation.', ah=None),
 dict(a='Dueling DDQN', tab='duel', med=151.5, fr=2e8, frl='200M', d='2015', fix='Dueling heads: separate state value and per-action advantage streams (plus gradient clipping).', ah=None),
 dict(a='Prioritized Dueling', tab='duel', med=172.1, fr=2e8, frl='200M', d='2015', fix='Prioritized replay: replay surprising transitions (large TD error) more often.', ah=None),
 dict(a='C51', tab='c51', med=178, fr=2e8, frl='200M', d='2017', fix='Distributional RL: learn the whole return distribution over 51 atoms, not just its mean.', ah=40),
 dict(a='Rainbow', tab='rainbow', med=223, fr=2e8, frl='200M', d='2017', fix='Six fixes combined: double, prioritized, dueling, multi-step, distributional, noisy nets.', ah=None),
 dict(a='Ape-X', tab='apex', med=434, fr=2.28e10, frl='22.8B', d='2018', fix='Distributed replay: hundreds of actors feed one learner. 114 times the frames of Rainbow.', ah=RC['apex_a57']['above_human']),
 dict(a='R2D2', tab='muzero', med=1920.6, fr=3.75e10, frl='37.5B', d='2018', fix='Recurrent replay: an LSTM agent trained from stored sequences with burn-in.', ah=RC['r2d2_a57']['above_human']),
 dict(a='MuZero', tab='muzero', med=2041.1, fr=2.0e10, frl='20.0B', d='2019', fix='Plan with tree search inside a learned model of reward, value and policy.', ah=RC['muzero_s1']['above_human']),
 dict(a='Agent57', tab='a57', med=1933.49, fr=None, frl='Skiing passed at 78B', d='2020', fix='Intrinsic novelty reward plus a bandit over exploration and discount settings: the median falls, every game passes human.', ah=57),
]

# ---------------- Atari 100k ----------------
K = {
 'spr': dict(n='SPR, Table 1', u='https://arxiv.org/abs/2007.05929', d='2020-07', seeds='10 seeds for SPR, 20 for CURL, 5 for others',
   rows=[('SimPLe', 0.144, 0.443, None), ('DER', 0.161, 0.285, None), ('OTRainbow', 0.204, 0.264, None), ('CURL', 0.175, 0.381, None),
         ('DrQ', 0.268, 0.357, None), ('SPR (no aug.)', 0.307, 0.463, None), ('SPR', 0.415, 0.704, None)]),
 'ez': dict(n='EfficientZero, Table 1', u='https://arxiv.org/abs/2111.00210', d='2021-11', seeds='3 runs, 32 evaluation seeds',
   rows=[('SimPLe', 0.144, 0.443, None), ('OTRainbow', 0.204, 0.264, None), ('CURL', 0.175, 0.381, None), ('DrQ', 0.268, 0.357, None),
         ('SPR', 0.415, 0.704, None), ('MuZero', 0.227, 0.562, None), ('EfficientZero', 1.090, 1.943, None)]),
 'bbf': dict(n='BBF, Table A.1', u='https://arxiv.org/abs/2305.19452', d='2023-05', seeds='50 seeds for BBF, 30 SR-SPR, 5 IRIS, 3 EfficientZero, 100 others',
   rows=[('DER', 0.189, 0.350, 0.183), ('DrQ(eps)', 0.313, 0.465, 0.280), ('SPR', 0.396, 0.616, 0.337), ('IRIS', 0.289, 1.046, 0.501),
         ('SR-SPR', 0.685, 1.272, 0.631), ('EfficientZero', 1.116, 1.945, 1.020), ('BBF', 0.917, 2.247, 1.045)]),
}

# ---------------- same agent, different printed numbers ----------------
REC = [
 dict(a='DQN', rows=[['93.5%', '49 games, no-op starts, 5-minute episodes', 'Double DQN Table 1'], ['79.1%', '57 games, no-op starts', 'Dueling Table 1 (79% in Rainbow, C51, Ape-X)'],
                     ['83%', '57 games, no-op starts, re-run', 'NoisyNet Table 1'], ['68.5%', '57 games, human starts', 'Dueling Table 1'],
                     ['47.5%', '49 games, human starts', 'Double DQN Table 2 (reprinted as "57 games" in A3C Table 1)'], ['48%', '49 games, human starts', 'Prioritized replay Table 1']],
      say='Six medians for one agent. None is wrong; they are different evaluations. DQN\'s own Nature paper prints no median.'),
 dict(a='MuZero', rows=[['2,041.1%', '57 games, no-op starts', 'MuZero Table 1 (reproduced from its Table S1: %.1f%%)' % RC['muzero_s1']['median']],
                        ['2,381.51%', '57 games, no-op starts', 'Agent57 Table 1, which says it reports MuZero\'s numbers'],
                        ['%.2f%%' % RC['muzero_own_with_a57_baselines']['median'], 'the Agent57 arithmetic on MuZero\'s own scores', 'derived (recompute.py)']],
      say='The gap is two transcription errors in Agent57\'s per-game table: Asteroids 6,785,558.64 for 678,558.64 and Beam Rider 4,549,993.53 for 454,993.53. Agent57\'s text calls MuZero\'s Beam Rider score "27469%%"; MuZero\'s own score gives %.1f%%. With the correct scores MuZero still has the higher median than Agent57 (2,041 against 1,933) but not the highest in that table: R2D2 (bandit) has 2,357.92%%.' % RC['beam_rider_hns']['from_muzero_paper']),
 dict(a='Rainbow', rows=[['223%', '57 games, no-op starts', 'Rainbow Table 2 and Ape-X Table 1'], ['231.1%', '57 games, no-op starts', 'MuZero Table 1']],
      say='MuZero\'s table cites Rainbow but prints a different median; the source of 231.1% is not given.'),
 dict(a='Prioritized replay', rows=[['128%', 'human starts, 57 games (proportional)', 'Prioritized replay Table 1'], ['127.6%', 'human starts', 'A3C Table 1'],
                                    ['112.9%', 'human starts, 57 games', 'Dueling Table 1, re-run'], ['123.7%', 'no-op starts', 'Dueling Table 1, re-run'], ['140%', 'no-op starts', 'Rainbow Table 2, marked as from the publication']],
      say='The no-op 140% that Rainbow attributes to the publication does not appear in either summary table checked.'),
 dict(a='C51 (distributional)', rows=[['178%', 'no-op starts', 'C51 paper'], ['164%', 'no-op starts', 'Rainbow Table 2, Rainbow\'s own implementation']],
      say='Rainbow\'s ablation baselines are its own re-implementations, so they sit below the original papers.'),
 dict(a='Agent57', rows=[['1,933.49%', 'no-op starts, Agent57\'s baselines', 'Agent57 Table 1 (reproduced exactly from its App. H.4)'],
                         ['%.2f%%' % RC['agent57_with_s1_baselines']['median'], 'same scores, MuZero Table S1\'s random and human values', 'derived (recompute.py)']],
      say='The median game is Double Dunk, whose human-minus-random gap is about 2.2 points. Agent57 rounds it to -16.4 and -18.6, MuZero prints -16.40 and -18.55, and that alone moves the median by 42 points.'),
 dict(a='EfficientZero (Atari 100k)', rows=[['1.090', 'median, 26 games', 'EfficientZero Table 1 and abstract (109.0%)'], ['1.160', 'median', 'EfficientZero Section 5.2 text'], ['1.116', 'median, 3 seeds', 'BBF Table A.1']],
      say='Three medians for one agent, two of them in its own paper.'),
 dict(a='R2D2', rows=[['1,920.6%', 'no-op starts, 37.5B frames', 'as quoted in MuZero Table 1 and NGU'], ['1,935.86%', 'no-op starts, re-run', 'Agent57 Table 1'],
                      ['%.1f%%' % RC['r2d2_a57']['median'], 'from the per-game scores in MuZero Table S1', 'derived (recompute.py)']],
      say='R2D2\'s own paper (OpenReview) could not be fetched; 1,920.6% is quoted identically by two later papers.'),
]

PROTO = {'noop57': '57 games, no-op starts', 'hs57': '57 games, human starts', 'noop49': '49 games, no-op starts (5-minute episodes)', 'hs49': '49 games, human starts'}
CHILDREN = {VAL: 'Value-based deep RL', PGC: 'Policy gradients and actor-critic', MB: 'Model-based RL and planning', LLM: 'RL for LLMs'}
out = dict(asof=AS_OF, children=CHILDREN, llm=LLM, M=M, T=T, A=A, CLIMB=CLIMB, K=K, REC=REC, PROTO=PROTO,
           RC={k: v for k, v in RC.items() if k != 'pergame'}, PG=RC['pergame'])
s = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
assert '—' not in s and '{{' not in s
os.makedirs(os.path.join(here, '..', 'data'), exist_ok=True)
json.dump(out, open(os.path.join(here, '..', 'data', 'miles.json'), 'w'), ensure_ascii=False, indent=1)
open(os.path.join(here, '..', 'parts', '34_js_miles_a.js'), 'w').write('// Milestones and benchmarks data, generated by src/miles/mk_miles.py from data/miles.json. Do not edit.\nwindow.MS=' + s + ';\n')
print('milestones', len(M), 'atari rows', len(A), 'bytes', len(s))
