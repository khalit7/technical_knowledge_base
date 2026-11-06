# Visualisation ideas: Harnesses for training and evaluation

Scored 1 to 5 on: teaches the mechanism (T), uses real data (D), not already on a neighbour page (N), cost to build (C, 5 = cheap).

## Built
| Idea | T | D | N | C | Where | Data |
|---|---|---|---|---|---|---|
| One real rollout through the environment, before/after: the workspace's own tests decide vs hidden checks in a fresh container | 5 | 5 | 5 | 3 | Reading s2 | a Haiku bash-harness T01 rollout that passed visible tests and failed `h_apos_quotes` |
| Success and input tokens by harness, per model (small multiples, never across models) | 5 | 5 | 4 | 4 | Reading s1 | `HT.table` from all rollouts |
| Held-out checks failed by rollouts that passed every visible test | 4 | 5 | 5 | 5 | Reading s3 | `HT.runs[].ho` |
| Real groups, real advantages: rewards, mean, advantage, tokens; before/after pass/fail vs partial reward; GRPO / Dr. GRPO / RLOO | 5 | 5 | 4 | 3 | Reading s4 | `HT.groups`; token counts from the loss mask (local) or Claude output tokens |
| Loss mask on a real rollout rendered through Qwen3's own template, before/after (loss on everything vs sampled only), with the server-count check | 5 | 5 | 4 | 3 | Reading s5 | `src/mask.py` output in `inputs/mask.json` |
| Self-improving papers table (compact) and full comparison | 4 | 4 | 4 | 4 | Reading s7, Self-improvement tab | `inputs/papers.json` from the paper pages |
| Harness search animation, before/after (keep the best score vs held-out guard) | 5 | 3 | 4 | 3 | Reading s7 | simulation, labelled; start rate = the local model's overall rate |
| Search simulator with sliders | 4 | 3 | 4 | 4 | Self-improvement tab | same simulator |
| Scaffold experiment grid with a trajectory viewer, paired-difference table with bootstrap intervals, cost table | 5 | 5 | 5 | 3 | Scaffold experiment tab | all rollouts |
| Environment lab: bugs, tasks with computed fail-to-pass lists, checks, verifier on real final code (three rewards) | 5 | 5 | 5 | 4 | Environment lab tab | gym source, `res` bit strings |
| Rollout to dataset: redaction counts, one rollout in three formats, SFT filter funnel, every group's advantages | 4 | 5 | 5 | 4 | Rollout to dataset tab | recordings, `inputs/redaction.json` |
| RL frameworks table | 3 | 4 | 4 | 5 | Reading s8 | `inputs/frameworks.json` |

## Added 2026-10-24
| Idea | Where | Data |
|---|---|---|
| Hero: one episode (task, policy, harness, sandbox, verifier, reward) as a static annotated diagram, with four use cards | Reading top | none (structure) |
| The same six parts as a fleet with published sizes | Reading s8 | DSec, DeepSWE; 512 = 64 x 8 derived |
| Format viewer, SFT funnel, groups table, simulator sliders, paper tables | moved from the Rollout to dataset and Self-improvement tabs into Reading s4, s6, s7 | unchanged |

## Added 2026-11-06 (split layout, 3D stages on renderer v2)
| Idea | Where | Data |
|---|---|---|
| Fig. 1, 3D: one recorded episode in six steps (reset, calls 1 to 5, calls 6 to 8, stop, verifier with its 20 checks as tiles, four uses of the trajectory), flows on every path data takes | Reading top (replaces the static hero and the section 2 environment stepper) | `HT.traj` and `HT.runs` of sdk-haiku_bash_T01_r1 |
| Fig. 2, 3D: every rollout as one block on a plate per model and harness; Haiku's input tokens as glass columns | Reading s1 (replaces the HTML bars) | `HT.runs`, `HT.table`, `HT.f` |
| Fig. 3, 3D: the 70 groups as a bar field (pass/fail, then partial), then one group up close: rewards, mean as a glass plane, signed advantages on a plinth, tokens streaming into the policy | Reading s4 (replaces the 2D group stepper; the group chooser and the reward and normaliser chips drive it) | `HT.groups`, `HT.mask`, `HT.runs` |
| Fig. 4, 3D: 120 rollouts per model through filters A, B, distinct fixes and the cap of 3, kept trajectories streaming into a dataset stack | Reading s6 (replaces the HTML funnel) | `HT.runs` |
| Fig. 5: the search chart as four explained stretches (start, round 1, rounds 2 to 10, the guard), one axis for both rules | Reading s7 | the page's simulator (300 seeded searches) |

Kept 2D on purpose: the search curves (lines over rounds read best flat), the fleet diagram (flat structure with published numbers), the token view and the format viewer (text), the held-out checks and every table, the Scaffold experiment bars and grid, the Environment lab. Rejected for 3D: the self-improving search as bars of candidates per round (one simulated search would hide the averaged result the section is about).

## Rejected
- Rebuilding a GRPO group widget from scratch with made-up rewards: RL for LLMs owns it (live group widget); ours uses real agent groups only.
- An SFT vs RL animation on illustrative rollouts: the parent's atlas already has one ("Harnesses for training").
- A published-environments table (SWE-Gym, SWE-smith, R2E-Gym...): the atlas owns it; linked.
- Terminal-Bench / HarnessTax charts: atlas and Agentic benchmarks own them; one sentence and a link.
- Comparing Qwen3-4B with Haiku on one chart: different models on different machines; kept as separate panels.
- A token-level log-probability mismatch view: needs engine and trainer log-probs; RL for LLMs' Rollout mismatch tab has it.

## What the methodology lacked
The method assumes published data to reproduce. Here the evidence had to be generated: an environment, a verifier and rollouts. The useful rule turned out to be "compute what the published method assumes" (fail-to-pass by running, token counts checked against the server) rather than "reproduce a figure".
