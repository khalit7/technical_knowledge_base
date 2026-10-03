# Visualisation ideas: Repo-To-Skill

The question the page keeps returning to: **what did the skills actually add, and at what cost?** The paper's headline is "+134.3% at fixed budget from a 5,000-skill library"; the release lets each part of that be measured (which skills, what budget, how much of the library an agent reads).

Scores follow the Methodology (0 to 2 each; reproduce and computable count double; build cost subtracted).

| Id | Idea | What it shows, what the reader does | Data | Placement | Score | Status |
|---|---|---|---|---|---|---|
| P-repo_to_skill.1 | **Replay the released session's skill reads, to scale** | The 16 library files DisCo read in the vLLM against SGLang session, one square per 512 bytes, step by step with the session clock; toggles for "every description up front" and "both graphs whole" on the same scale; counters for bytes, rough tokens, share of the 237 MB library | `examples/researcher` session export, release tree sizes | Own tab (live ingredient) | 13 | built |
| P-repo_to_skill.2 | Router walker | Area, family and repository selectors over the real taxonomy; the bytes each routing step adds and how much of the chosen graph stays unopened | router `references/index`, tree sizes | Run tab | 10 | built |
| P-repo_to_skill.3 | FrontierCS graph drawn and recounted | 9 nodes, 42 directed links counted from the released SKILL.md files (reproduces the paper independently); tap a node for its in and out links | `skills/task-oriented/FrontierCS` | Run tab | 10 | built |
| P-repo_to_skill.4 | Two forms of distillation, animated on the same four stages | Task-agnostic (the released huggingface_hub Creator run, with its real check counts) against task-oriented (the MLE-bench protocol), with a budget strip showing which GPU-hours the comparison counts | Eq. 8, App. A.1, A.2.1, the Creator example's reports | Reading, Method | 11 | built |
| P-repo_to_skill.5 | A real skill graph, every file to scale | vLLM and SGLang graphs, rows per skill, files coloured SKILL.md, references, scripts, the session's reads outlined | release tree, session | Reading, Idea | 9 | built |
| P-repo_to_skill.6 | Predict: where did the MLE-bench skills come from? | Reveal: a table of each benchmark's skill source and uncounted construction budget | §4.3, §5, App. A.2 | Reading, Result 1 | 10 | built |
| P-repo_to_skill.7 | Predict: tokens with skills on FrontierCS | Reveal: score against tokens (log) with the leaderboard rows | Table 3 | Reading, Result 3 | 9 | built |
| P-repo_to_skill.8 | Medal counts per run recovered from mean and SEM | Enumerates whole-number medal triples for each split and checks the tiers sum to the total run by run (unique fits: 20/25/25 and 53/55/56 of 75) | Table 1 | Tables tab and Result 1 | 9 | built; reusable for any table printing mean ± SEM over a few runs |
| P-repo_to_skill.9 | Library memberships per area, families as segments | 20 areas, 2,209 memberships, tap for families and scopes | router assignments | Reading, The library | 7 | built |
| P-repo_to_skill.10 | Table 2 dumbbells with three sorts | Per-paper before and after; regressions in red | Table 2 | Reading, Result 2 | 7 | built |
| P-repo_to_skill.11 | Simulated with-skill and without-skill MLE-bench run | Rejected: no trajectories are released for either arm; any trace would be invented | | | | rejected |
| P-repo_to_skill.12 | Library-wide quality audit (sample graphs, run their usability cases) | Rejected for this page: needs an agent and GPUs per graph; the page instead quotes the one released verification report and two index rows | | | | rejected |
| P-repo_to_skill.13 | FrontierCS per-task gain distribution | Rejected: the paper prints only stratum means, not per-task scores; drawing a distribution would mean inventing it | | | | rejected |

## Inspiration and what the Methodology lacked

- The DeepSeek MLA explainer's "one square per N numbers" waffle, reused as one square per 512 bytes so 791-byte and 155 KB items share a scale.
- What the Methodology lacked: a rule for **agent papers that ship session exports**. The export is the measurable trace; replaying its tool calls with the release's real file sizes turns "progressive disclosure keeps context small" into a number. Proposed rule: when a paper releases an exported session, replay it from the export, and compare strategies on the same reads rather than inventing the counterfactual run.
- A second rule worth adding: **check which artefact each result actually used.** Here the headline artefact (the 1,000-repository library) is used by none of the four benchmark results; a one-row-per-benchmark "skills used / built from / construction budget" table caught it.
