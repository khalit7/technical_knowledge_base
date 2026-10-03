# Visualisation ideas: Demystifying Agent Skills (arXiv 2608.14036)

The question the paper keeps returning to: **when the same experience is packaged as a skill instead of as raw workflow traces, what changes, and how far does the evidence support it?** The page's existing visuals: none (text only). Its links: the Anthropic engineering post and anthropics/skills.

Kind of paper: empirical study of an agent method (papers.md's "agent, harness or method-on-top-of-a-model" row). Live ingredient: a **trace replay** of the paper's one printed paired example (Appendix A.3), made exact by the public SkillsBench task it comes from (service latencies, shipped route, verifier, reference solution), plus a checkout scheduler the reader drives. No toy model: nothing in the paper is a mechanism to train; the claims are about measured agent behaviour, so the page measures the paper's own numbers instead.

Scores: R = reproduces a stated figure (×2), C = computable from public data (×2), S = shows what a sentence cannot, M = corrects a misconception, Q = measures the central question, A = animation of before/after; minus build cost.

| Id | Idea | Placement | Score | Status | Data |
|---|---|---|---|---|---|
| P-demystifying_agent_skills.1 | **One task, three arms, animated**: the A.3 trio stepped through task, what each arm was given, what the agent did, the checkout route it shipped drawn to scale on a 0 to 1000 ms axis with the verifier's 400 to 800 ms window, then the verifier; counters for checkout time (model and measured), the two checkout tests, tests passed | Reading, Idea | R2 C2 S2 M1 Q2 A2 −1 = 14 | built | A.3 verbatim; latencies from server.ts; finds the Workflow arm's "patch" is the shipped route unchanged |
| P-demystifying_agent_skills.2 | **Schedule the checkout yourself**: when config and profile start, presets for each arm's schedule, critical path to scale, both verifier tests; 700 ms floor | Replay tab (live ingredient) | R2 C2 S2 Q1 −1 = 11 | built | server.ts, test_outputs.py, solve.sh |
| P-demystifying_agent_skills.3 | Excerpts side by side, verbatim, with an arm picker for phones | Replay tab | S1 Q1 = 4 | built | Appendix A.3 via mk_example.py |
| P-demystifying_agent_skills.4 | Skill-creator prompt B.1 with the B.2 no-hint lines highlighted | Reading, Idea | S2 Q1 = 5 | built | Appendix B.1, B.2 |
| P-demystifying_agent_skills.5 | **Predict: which paired difference is above zero** (Skill vs Raw, Skill vs WM, WM vs Raw), reveal Table 10's three intervals | Reading, Result 1 | R2 M2 Q2 = 10 | built | Table 10 |
| P-demystifying_agent_skills.6 | **Skill minus Workflow in all 36 Table 1 cells**, six small panels with binomial intervals at recovered trial counts, coloured by sign | Reading, Result 1 | R2 C2 S2 M2 Q2 −1 = 13 | built | Table 1; denominators derived (Codex TB-Pro 165, not the caption's 130) |
| P-demystifying_agent_skills.7 | **Predict: who uses more input tokens**, reveal Table 13 bars (skill +93.8K over WM) | Reading, Result 1 | R2 M2 Q1 = 8 | built | Table 13 |
| P-demystifying_agent_skills.8 | Failure modes by category, three arms per mode, counts of 528 | Reading, Result 2 | R2 C2 Q2 = 10 | built | Table 11, Figure 2 decoded |
| P-demystifying_agent_skills.9 | Outcome labels: normal vs no-hint vs Raw by mixture, per setup | Reading, Result 3 | R2 C2 M2 Q1 = 11 | built | Table 16; shows Gemini 5s0f and TB-Pro exceptions |
| P-demystifying_agent_skills.10 | Transfer bars from Figure 4's printed labels with derived n = 50 error bars | Reading, Result 3 | R2 S1 = 5 | built | Figure 4 decoded; label parity |
| P-demystifying_agent_skills.11 | **Predict: success as the pool grows**, reveal the Figure 3 averages (three precisions, success) | Reading, Result 4 | R2 M2 Q2 = 10 | built | Table 4 |
| P-demystifying_agent_skills.12 | **Design-effect slider**: the +6.06 interval if a task's six triples are correlated (ρ); zero crossed from ρ ≈ 0.06 | Reading, How much to believe | C2 S2 M2 Q2 = 12 | built | Table 10 width, 88 tasks × 6 (derived) |
| P-demystifying_agent_skills.13 | Table 1 / 16 explorer: rates or Skill − Workflow per setup, no-hint toggle, transcribed table with deltas | Tables tab | R2 C2 Q2 = 10 | built | Tables 1, 16 |
| P-demystifying_agent_skills.14 | **Figure 2 decoded** to integer counts from the vector PDF (2.7 pt per trajectory), stacked per arm and mixture; exposes the reused raw trajectory (52 of 88 every mixture) and judge relabelling (at least 8 of 88) | Tables tab | R2 C2 M2 Q2 = 12 | built | decode_figs.py |
| P-demystifying_agent_skills.15 | **Retrieval explorer** with an "opens every skill" overlay (recall ÷ k): Gemini's actual-use precision sits on it | Tables tab | R2 C2 S2 M2 Q1 = 13 | built | Tables 14, 15; one gold skill per task derived from top-3 P = R/3 |
| P-demystifying_agent_skills.16 | Every number checked (about 35 rows) | Tables tab | R2 = 4 | built | recompute.py |
| P-demystifying_agent_skills.17 | Then and now | none | | rejected: a 2026 result paper; "What it takes to use this" covers adoption |
| P-demystifying_agent_skills.18 | Per-task paired deltas or a task-clustered bootstrap | none | | rejected: no per-task data released; replaced by the design-effect sensitivity, labelled derived |
| P-demystifying_agent_skills.19 | A live LLM agent or a simulated agent choosing skills from a pool | none | | rejected: no network in the page, and a simulated agent would invent the behaviour the paper measures |
| P-demystifying_agent_skills.20 | Mechanism-label pie (65.7 / 4.5 / ...) | none | | rejected: only two of five shares are published; the rest would be invented |

What the methodology lacked for this page: a rule for **reading a study's sampling design out of its own numbers** (denominators from printed rates, triple counts against task counts, identical counts across mixtures revealing a reused trajectory). Here that is what turned "a CI over 528 triples" into "88 Codex tasks, one trial per arm, six correlated triples each". Also: when a paper prints one worked example from a public benchmark, fetch the benchmark task; it made the replay exact and found that the "workflow patch" was the unchanged shipped code.
