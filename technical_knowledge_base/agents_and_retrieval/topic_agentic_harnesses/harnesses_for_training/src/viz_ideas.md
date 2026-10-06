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

## Rejected
- Rebuilding a GRPO group widget from scratch with made-up rewards: RL for LLMs owns it (live group widget); ours uses real agent groups only.
- An SFT vs RL animation on illustrative rollouts: the parent's atlas already has one ("Harnesses for training").
- A published-environments table (SWE-Gym, SWE-smith, R2E-Gym...): the atlas owns it; linked.
- Terminal-Bench / HarnessTax charts: atlas and Agentic benchmarks own them; one sentence and a link.
- Comparing Qwen3-4B with Haiku on one chart: different models on different machines; kept as separate panels.
- A token-level log-probability mismatch view: needs engine and trainer log-probs; RL for LLMs' Rollout mismatch tab has it.

## What the methodology lacked
The method assumes published data to reproduce. Here the evidence had to be generated: an environment, a verifier and rollouts. The useful rule turned out to be "compute what the published method assumes" (fail-to-pass by running, token counts checked against the server) rather than "reproduce a figure".
