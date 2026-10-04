# Notes: what was checked for the Method atlas and Taxonomy (read 2026-10-03)

## Child pages (read-only Notion fetch, 2026-09-30 versions)
- The old Deep RL page (3c65c17b0d0d8180b808c8c0cf8ddbe6) was split on 2026-10-04; its rows now link to the pages below.
- Value-based deep RL (3ee5c17b0d0d818689b2c0dbce434ece): DQN 2013 and 2015, Double, Dueling, PER, C51, QR-DQN, Rainbow.
- Policy gradients and actor-critic (3ee5c17b0d0d8101a262d3620e75747c): REINFORCE, actor-critic (1983), TRPO, GAE, A3C, A2C, PPO, DDPG, TD3, SAC.
- Model-based RL and planning (3ee5c17b0d0d8116be5fd39e10bd94c5): Dyna-Q, AlphaGo, AlphaGo Zero, AlphaZero, MuZero, Dreamer.
- Offline RL and imitation (3ee5c17b0d0d81d4995ec47e428de9b3): behaviour cloning, GAIL, CQL, IQL, Decision Transformer.
- Bandits and exploration (3ee5c17b0d0d81acba54d70ac51c601c): no atlas row yet.
- Model-free prediction and control (3c65c17b0d0d81898a0cd4c05c744969): MC, TD(0), TD(lambda), SARSA, Expected SARSA, Q-learning, Double Q-learning.
- RL for LLMs (3c65c17b0d0d818c9bcff7177325fe56): RLHF with PPO, GRPO, RLVR, Dr. GRPO, DAPO, GSPO, off-policy corrections, RLOO and SA-MRPO mentioned. GDPO rows link here too.
- Dynamic programming (3c65c17b0d0d81baada7e1c05ce69d01): value and policy iteration.
- DPO links to Alignment (3c65c17b0d0d81d5bed7e608d4061c7a), which owns the DPO family.

## Corrections the sources make to common claims (shown in the tab)
1. DQN's target network is from the 2015 Nature paper; the 2013 arXiv paper has replay but no target network (phrase absent from its text; Double DQN's paper: "as proposed by Mnih et al. (2015)").
2. The original deep RLHF (Christiano et al. 2017) trained policies with A2C (Atari) and TRPO (robotics), not PPO; PPO for language models starts with Ziegler et al. 2019.
3. RLVR was named in Tulu 3 (November 2024) and optimised there with PPO and a value model; it is a reward source, not an optimiser.
4. GRPO is from DeepSeekMath (2024-02-05), eleven months before DeepSeek-R1.
5. RLOO's estimator is Kool et al. 2019; Ahmadian et al. (2024-02-22) brought it to RLHF 17 days after DeepSeekMath.
6. A2C (synchronous) did better than A3C in OpenAI's runs; no evidence that asynchrony helps (OpenAI blog, 2017-08-18, Wayback capture).
7. Q-learning (1989) predates SARSA (1994), which was introduced as "Modified Connectionist Q-learning".
8. Value iteration (Bellman 1957) predates policy iteration (Howard 1960).
9. REINFORCE with a baseline, GRPO and RLOO are policy methods, not actor-critic (S&B 13.5).
10. PPO is on-policy only approximately (several epochs per batch).
11. DPO samples nothing during training (offline on preference pairs).
12. MuZero's model predicts reward, policy and value only.

## Judgement calls
- Year = arXiv v1 date where a paper has one (DQN 2013, AlphaZero 2017, MuZero 2019); the peer-reviewed version is named in the note. Never spliced: DQN 2013 and 2015 are separate rows.
- Monte Carlo control has no single founding paper; the row says so and dates it by the earliest use S&B name (Michie and Chambers 1968).
- Policy iteration cites Howard's 1960 book through S&B's historical remarks (no open copy).
- "Where it is used now" is sourced to library tables (Stable-Baselines3, CleanRL, verl, TRL, imitation, CORL) read on 2026-10-03, and to named deployments (OpenAI Five, VP9 rate control, DeepSeek-R1, Llama 3, Qwen3). Absence from library tables (SARSA, Rainbow) is labelled derived.
- The language-model chain counts "large networks in memory" from DeepSeekMath's description of PPO (value, reward and reference models besides the policy) and from Dr. GRPO's and DAPO's removal of the KL term; GSPO's count is left as "1, plus a reference if a KL term is used" because the paper omits the KL term "for brevity".
- The value chain shows each DQN extension as its own paper on top of DQN 2015 (they were separate), then Rainbow combining six; it does not pretend they accumulated in sequence.
- Taxonomy placements on the 14 extra axes are derived from each row's first paper; three are unconfirmed.

## Not sourced, so not shown
- Rainbow's least important components (only "the two most crucial" is quoted).
- Compute or GPU-hour costs per method; benchmark scores (owned by the Milestones tab).
