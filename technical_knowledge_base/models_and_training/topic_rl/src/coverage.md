# Coverage: Topic: rl (root page) and its earlier embed

Sources: `src/live.md` (the Notion page, text as of 2026-09-30) and `src/inputs/old_embed_topic-rl.html` (the earlier interactive embed; rendered text and JavaScript strings read in full).

Since Khalid's instruction of 2026-10-04 the Reading tab is a short intuitive overview. Every fact is either still in the root (section id in `#t-read`, or a root tab), or **moved to a child page**, in which case the full text and widget are archived for that child's builder in `src/for_children/reading_full/` (the long Reading tab, ids as listed) with its checks in `src/for_children/reading_full_checks/`. "Archive" below means that folder.

## The Notion page (live.md)

| # | Fact or block | Where it is now |
|---|---|---|
| 1 | Embed | Replaced by `index.html` |
| 2 | Video and its note | Not carried: Khalid will delete the video |
| 3 | "18 min read · +38h resources" | Superseded: Reading tab about 16 min (3,600 words at 230 wpm); resources in `#t-more` |
| 4 | RL definition; scored not demonstrated; InstructGPT 2022 | `rd-over` |
| 5 | Three layers | `rd-over` |
| 6 | The one idea (through-line) | `rd-over` key box, `rd-idea` |
| 7 | Taxonomy diagram and the three axes, with every method placed | Three axes stated in `rd-fam` intro; placements in `#t-atlas`; all axes in `#t-tax`; the long placement table is in the archive (`rd-agent`) for the children |
| 8 | DQN, PPO, GRPO, AlphaZero axis examples | `#t-atlas` (every method placed); archive `rd-agent` |
| 9 | Bellman expectation equation with symbols | `rd-idea` (equation and 𝔼 gloss); γ gloss in `rd-loop` |
| 10 | Incremental update V ← V + α(target − V) | `rd-idea` |
| 11 | Policy gradient formula with Â; "the whole of policy-gradient RL" | Intuition in `rd-f-pg` ("make the actions that turned out well more likely, in proportion"); formula moved to child Policy gradients and actor-critic (archive `rd-pg`) |
| 12 | Table of what stands in for the expectation (10 rows) | `rd-idea` spine table, all ten rows (needs column folded into the text) |
| 13 | n-step and λ-return formulas, finite-episode weights | Intuition in the spine table and the widget (λ step shows the weights); formulas moved to child Model-free prediction and control (archive `rd-dial`) |
| 14 | "Why there is a dial" | `rd-idea` |
| 15 | Worked example (0.81, 0.261, 0.36, 0.216, 0.567, 0.52425, 0.288, 0.61, 0.16, GRPO +1.732 and −0.577, "0.36 to 0.81") | `#rd-one` widget and its caption (every number; 0.261 and 0.216 updates are computed by the engine and checked, shown in the archive version only) |
| 16 | MDP and Markov property; Bellman as fixed point | `rd-loop`, `rd-idea` |
| 17 | DP: policy and value iteration; needs model and small space; the ideal | `rd-f-plan` |
| 18 | MC, TD, TD(λ), SARSA on-policy, Q-learning off-policy and replay | `rd-f-samp` |
| 19 | Deep RL as stabilisation; DQN replay and target network | `rd-f-dqn` |
| 20 | Policy gradients, REINFORCE, baseline, advantage, actor-critic, A3C/A2C (A2C as the shape of LLM RL loops) | `rd-f-pg` (A2C/A3C named); "A2C is the LLM loop's shape" moved to child Policy gradients and actor-critic (archive `rd-pg`) |
| 21 | TRPO KL constraint; PPO clip and several epochs; SAC entropy | `rd-f-pg` |
| 22 | AlphaZero MCTS as policy improvement; MuZero latent model | `rd-f-mb` |
| 23 | Token-generation MDP; credit assignment | `rd-llm` |
| 24 | RLHF, GRPO, RLVR, R1, 2025 to 2026 GRPO corrections | `rd-llm` (corrections named in the Go deeper note; detail on RL for LLMs) |
| 25 | Alignment pipeline, DPO | `rd-llm`, `#t-more` |
| 26 | Two deletions | `rd-llm` |
| 27 | Mercor with SkyRL 397B: token accounting, async, environment robustness, harness | Moved to child RL for LLMs (it carries the figures) and `#t-more` (training topic: "the Mercor with SkyRL recipe in full"); archive `rd-llm` |
| 28 | Trade-offs: which family when (all cases) | `rd-when` tree and table |
| 29 | Seven common mistakes | `rd-wrong` (all seven, among ten) |
| 30 | Deep dives in order with coverage | `#t-more` children (approved eight-page structure) |
| 31 | Related papers and topics | `#t-more` |
| 32 | Best resources with times | `#t-more` |

## The earlier embed

| # | Element | Where it is now |
|---|---|---|
| E1 | Read tab text and the "targets" SVG | Text as above; the SVG is the live `#rd-one` |
| E2 | "Recompute the example" sliders | `#rd-one` (γ, λ, R₃, V(S₁), V(S₂)) |
| E3 | Predict box (λ up when the critic is wrong) | The principle is in `rd-idea` ("short targets win when the estimate is good, long ones when it is poor"); the box and answer are archived (`rd-dlQ`) for child Model-free prediction and control |
| E4 | Explore "dial" (exact bias, variance, MSE against λ) | Moved to child Model-free prediction and control (archive `rd-dl`, checks in `reading_full_checks`) |
| E5 | Decision tree | `#rd-tree` (13 leaves) |
| E6 | Deep-dive map with reading ticks; "follow one target" | `#t-more` children; spine table and `#rd-one`; ticks dropped |
| E7 | Place-a-method-on-the-axes quiz | `#t-tax` and `#t-atlas` |
| E8 | Glossary | Terms defined where introduced in `#t-read`; full definitions in `#t-tax` and the children |
| E9 | Flashcards and quiz | Not rebuilt; every answer is in `#t-read` or `#t-atlas` |
| E10 | Key takeaways | `rd-over`, `rd-idea` |
| E11 | Video note | Not carried |
| E12 | Go-further list | `#t-more` |

## Corrections kept visible in the root

A baseline alone is not actor-critic (Sutton and Barto §13.5; `rd-wrong`); DQN's target network arrived in 2015, the 2013 version had replay only (`rd-f-dqn`); RLVR named by Tülu 3 (`rd-llm`); R1-Zero AIME 71.0% in the preprint, 77.9% in the Nature version, both stated (`rd-llm`, consistent with `#t-miles`). Further corrections (Christiano's A2C and TRPO, InstructGPT truthfulness and toxicity, DeepSeekMath's missing PPO baseline, k3's gradient, R1's $294K as post-training, Silver's Q*(Pub) 8.4 against 9.4) moved with their sections to the archive for the children.
