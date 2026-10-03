# Coverage: Topic: rl (root page) and its earlier embed

Sources checked: `src/live.md` (the Notion page as fetched on 2026-10-03, text as of 2026-09-30) and `src/inputs/old_embed_topic-rl.html` (the page's earlier interactive embed, built outside the repo; its rendered text and its JavaScript strings were read in full, including the locked Explore tab, the flashcards and the quiz). Section ids are in the Reading tab (`#t-read`) unless another tab is named. "Kept" means the fact is stated; "rebuilt" means a visual of the old embed was rebuilt as a live one.

## The Notion page (live.md)

| # | Fact or block in live.md | Where it is now |
|---|---|---|
| 1 | Embed "Interactive: Topic: rl" | Replaced by this page's `index.html` |
| 2 | Video "Topic: rl: one line from Bellman to verifiers" (7 min, 23 Sept 2026) and its note on what it does not cover | Not carried: Khalid will delete the video (his instruction) |
| 3 | "18 min read · +38h resources" | Superseded: Reading tab about 60 min (word count 13,500 at 230 wpm); resources and times in `#t-more` |
| 4 | RL defined: trial and error, agent, environment, scalar reward, maximise total reward; nobody says the correct action; outcome often many steps later | `rd-over` lead |
| 5 | Scored but not demonstrated: games, control, LLM post-training since InstructGPT 2022, reward model or verifier scores whole responses | `rd-over` lead |
| 6 | Three layers: classical core (MDP, Bellman; DP with a model; MC, TD, SARSA, Q-learning from samples), deep RL (DQN, PG, PPO, AlphaZero, MuZero), RL for LLMs (RLHF, GRPO, RLVR; trivial environment, expensive reward) | `rd-over` list |
| 7 | One idea: every method estimates the expected return the Bellman equation describes; methods differ in what stands in for the expectation | `rd-over` key box (the page's spine) |
| 8 | Taxonomy diagram: value-based (VI, SARSA, Q-learning, DQN), policy-based (REINFORCE, GRPO), actor-critic (A2C/A3C, TRPO, PPO, DDPG, SAC, AlphaZero, MuZero); model-free list; model-based (DP given, AlphaZero rules, MuZero learned); on-policy (SARSA, REINFORCE, A2C, PPO*, GRPO*), off-policy (Q-learning, DQN, DDPG, SAC); *nearly on-policy note | `rd-agent` three-axis list and table (every method placed); full treatment in `#t-tax`, every method in `#t-atlas` |
| 9 | Axes independent; definitions of V, Q, actor and critic; model given or learned; RLHF reward model not model-based; on/off-policy and replay; DP outside the on/off axis | `rd-agent` |
| 10 | Examples: DQN value-based, model-free, off-policy; PPO actor-critic, model-free, approx on-policy; GRPO policy-based, model-free, approx on-policy; AlphaZero model-based with self-play networks | `rd-agent` note under the table |
| 11 | Bellman expectation equation with symbol definitions (V_π, R_{t+1}, S_{t+1}, γ weights a reward k steps ahead by γ^k, E_π) | `rd-val` (derivation and expectation equations); `rd-ret` (γ^k) |
| 12 | Incremental update V ← V + α(target − V), α ∈ (0, 1], target a stand-in for the expectation | `rd-samp` formula box |
| 13 | Policy gradient ∇J = E[Σ ∇ log π · Â], definitions; "raising the log-probability ... is the whole of policy-gradient RL" | `rd-pg` |
| 14 | Table "what stands in for the expectation": DP, MC, TD(0)/SARSA/Q-learning, n-step/TD(λ)/GAE, DQN, REINFORCE, actor-critic/PPO, GRPO, RLVR, AlphaZero/MuZero, with needs and bias/variance | `rd-over` spine table, all ten rows verbatim in substance, each row linked to its section |
| 15 | n-step return and λ-return formulas; past the end = full return; λ = 0 TD, λ = 1 MC; finite-episode weights (1 − λ)λ^{n−1} and remaining λ^{T−t−1} | `rd-dial` formula box |
| 16 | "Why there is a dial" paragraph, including GRPO taking the MC end because a per-token critic is as large as the policy | `rd-dial` key box |
| 17 | Worked example: episode, γ 0.9, rewards 0, 0, 1, V 0.2/0.4/0.7, α 0.1; MC 0.81 and update 0.261; TD 0.36 and 0.216; two-step 0.567; λ 0.5 → 0.52425; DP 0.288 with p 0.8; REINFORCE 0.61; δ 0.16; GRPO 1,0,0,0 → mean 0.25, std 0.433, +1.732, −0.577 on every token; "targets from 0.36 to 0.81" | `rd-dial` list (verbatim numbers) and the live widget `#rd-one` (every target stepped, sliders); checked by `read/recompute.py` |
| 18 | MDP definition and Markov property; Bellman as fixed point; link to RL foundations | `rd-mdp`, `rd-loop`, `rd-val` (RL foundations is folded in) |
| 19 | DP: policy iteration, value iteration; needs full model and small state space; the ideal others approximate | `rd-plan` |
| 20 | MC unbiased, high variance, waits for termination; TD bias for variance, online, non-terminating; TD(λ) the dial; SARSA on-policy; Q-learning off-policy, legitimises replay | `rd-samp`, `rd-dial` |
| 21 | Deep RL as stabilisation tricks; DQN replay (correlation) and frozen target network | `rd-fa`, `rd-dqn` |
| 22 | Policy gradients, REINFORCE, baseline keeps gradient unbiased, V(s) baseline gives advantage, critic makes actor-critic, A3C asynchronous, A2C synchronous batched and structurally the LLM RL loop | `rd-pg` (plus the correction that a baseline alone is not actor-critic) |
| 23 | TRPO KL constraint, second-order; PPO clip, objective flat past the clip, several epochs of minibatch SGD safe; SAC entropy bonus, continuous control default | `rd-ppo`, `rd-cont` |
| 24 | AlphaZero MCTS as policy improvement, improved move distribution as target; MuZero learned latent dynamics, plans inside | `rd-mb` |
| 25 | Token generation MDP: deterministic transition, vocabulary-sized actions, single end reward; credit assignment is the hard part | `rd-llm` opening |
| 26 | RLHF (RM + PPO + per-token KL to frozen reference), GRPO (value model deleted, group mean baseline), RLVR (verifier replaces RM), R1, 2025-2026 GRPO corrections (Dr. GRPO, DAPO, GSPO, off-policy corrections) | `rd-llm` |
| 27 | Alignment pipeline (SFT, RM training, DPO family) on the Alignment page | `rd-llm` DPO paragraph; `#t-more` |
| 28 | "Two deletions" lineage | `rd-llm` RLVR paragraph |
| 29 | Mercor with SkyRL, 397B: token accounting, async RL, environment robustness, harness design matter as much as the algorithm; figures on RL for LLMs, recipe on the training topic | `rd-llm` (marked reported, linked to RL for LLMs); `#t-more` (training topic "the Mercor with SkyRL recipe in full") |
| 30 | Trade-offs: known small model DP; known huge model search; no model but planning pays MuZero; small discrete Q-learning vs SARSA; DQN family; PPO; SAC/TD3 (with DDPG and TD3 expansions); language models; the bias-variance dial | `rd-when` table and decision tree |
| 31 | Seven common mistakes (model-based = learned; RM makes RLHF model-based; on-policy = online; GRPO new; deep RL different theory; token generation hard environment; higher reward better model) | `rd-wrong` (all seven, among eighteen) |
| 32 | Deep dives in reading order with coverage and "why at this point" | `#t-more` "Pages under this one" (order stated); RL foundations noted as folded in |
| 33 | Related papers: InstructGPT (2022-03), DeepSeekMath (2024-02), DeepSeek-R1 (2025-01) | `#t-more` paper pages, plus DPO, Constitutional AI, Learn What's Left |
| 34 | Related topics: Alignment, Reward Hacking | `#t-more` |
| 35 | Best resources: Silver (~15h), Sutton and Barto (~14h), Spinning Up (~3h core), Lambert RLHF Book (~6h) | `#t-more` with the same times |

## The earlier embed (inputs/old_embed_topic-rl.html)

| # | Element | Where it is now |
|---|---|---|
| E1 | Read tab: the same text as live.md, with a three-layer SVG and a "targets" SVG showing how many real rewards each target uses | Text as above; the targets SVG is rebuilt live as `#rd-one` (real rewards in green, trusted estimates in blue, every target on one number line) |
| E2 | "Recompute the example" sliders (γ, λ, R₃, V(S₁), V(S₂)) with MC, TD, two-step, λ-return, δ, REINFORCE weight and a λ-return-against-λ chart | Rebuilt and extended in `#rd-one` (ten sliders, nine targets including DP and GRPO) |
| E3 | Predict box: "A critic that is badly wrong: should λ go up or down?" with its answer | `#rd-dlQ` (verbatim answer) |
| E4 | Explore tab "dial": illustrative three-step chain, rewards Bernoulli 0.5, γ 0.9, critic off by a set error, exact bias, variance and MSE over all 8 outcomes against λ | Rebuilt as `#rd-dl` (same model; checked by `read/recompute.py`) |
| E5 | Explore tab decision tree ("Do you have the environment's model?", "Can the answers be checked?", "Is a per-token critic affordable?", "Does the exploring agent's performance matter?") | Rebuilt and extended as `#rd-tree` (13 leaves) with the table under it |
| E6 | Explore tab: clickable map of deep dives with a reading tick per page; "follow one target from the Bellman equation to a verifier" | Map: `#t-more` children list; one target: the spine table and `#rd-one`. The reading tick (local storage) is dropped |
| E7 | Explore tab: "place a method on the three axes, then check" quiz (methods with per-axis answers, including that the page does not place AlphaZero and MuZero on the on/off axis) | Not rebuilt in Reading: the placements are in the `rd-agent` table (AlphaZero and MuZero now placed: own self-play data); the full classification is the Taxonomy and Method atlas tabs |
| E8 | Glossary strings (MDP, MRP, Bellman, return, γ, V and Q, target, step size, DP, policy and value iteration, MC, TD, TD error, n-step, λ-return, GAE, SARSA, Q-learning, on/off-policy, replay buffer, target network, policy gradient, baseline, advantage, actor-critic, A2C/A3C, TRPO, PPO, SAC, DDPG/TD3, search, RLHF, GRPO, RLVR, GLIE, DPO, reward hacking) | Every term defined where it is introduced (sections 2 to 18) |
| E9 | 13 flashcards and a 9-question quiz with explanations (e.g. "+0.75 would be the reward minus the mean without dividing by the standard deviation"; "TD(0) inherits the critic's error most"; "λ-return weights 0.5, 0.25, 0.25 = 0.18 + 0.14175 + 0.2025") | Every answer is stated in the text (the 0.18 + 0.14175 + 0.2025 split is in `rd-dial`; the +0.75 point is the Dr. GRPO mode of `#rd-gr`); the card and quiz widgets are not rebuilt |
| E10 | Key takeaways (six bullets) | `rd-over` (spine box and layers) and the section structure |
| E11 | Video note (23 September, predates through-line, trade-offs, mistakes, GRPO/SARSA/REINFORCE placement) | Not carried (video to be deleted) |
| E12 | "Go further" resource list with times | `#t-more` |

## Corrections and changes made against the old page

- Christiano et al. 2017 optimised with A2C and TRPO; PPO arrived with Ziegler et al. 2019 (now stated; the old page implied RLHF meant PPO from the start).
- A2C matched or beat A3C; a learned baseline alone does not make a method actor-critic (Sutton and Barto §13.5): REINFORCE with a baseline, RLOO and GRPO are policy-based. The old page's "actor-critic (A2C/A3C ...)" placement is kept; GRPO stays policy-based as it was.
- DQN's target network arrived in the 2015 Nature paper; the 2013 version used replay only (stated).
- RLVR: named by Tülu 3 (November 2024), optimised there with PPO and a value model (stated); the old page did not date it.
- R1-Zero's AIME 2024 pass@1 is 77.9% in the Nature/v2 paper and 71.0% in the January 2025 preprint; both stated, not mixed.
- "$294K for R1" is post-training (RL plus SFT data generation) on top of V3-Base's 2.788M GPU-hours (stated).
- InstructGPT truthfulness and toxicity figures, DeepSeekMath's missing PPO baseline and the k3 gradient direction: carried from the verified paper pages in correction boxes.
