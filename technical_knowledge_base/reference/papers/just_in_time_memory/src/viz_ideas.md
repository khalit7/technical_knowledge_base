# Visualisation ideas: Just-in-Time Memory (arXiv 2609.27334)

Scores: teaches (0 to 3), data available (0 to 3), cost (3 = cheap). Built ones first.

| id | Idea | Score | Data | Placement | Status |
|---|---|---|---|---|---|
| P-just_in_time_memory.1 | Read time against write time, one past trajectory and two later tasks, step animation with a mode toggle; counters for what is kept, how many payloads are tailored, and the delay before the curation is graded | 3/2/2 | the paper's Figure 3 example (tasks and payload text); trajectory steps and the write-time artifact illustrative, following the paper's ReasoningBank-style prompt (Appendix A) | Reading, Idea | built |
| P-just_in_time_memory.2 | Replay the paper's test-time memory protocol (empty bank, batches of 10, BM25 top 3 over task descriptions) on the 140 real ALFWorld goals: a 14-by-10 grid of tasks, links to what each batch retrieves, a write-time view that marks when each storage decision is first used; inspect any task; stats and a first-use histogram over 50 orderings | 3/3/2 | ALFWorld release 0.2.2 (valid_seen, solvable games); success rate p a labelled coin | own tab | built; JS checked identical to Python |
| P-just_in_time_memory.3 | Predict question: how long until a stored trajectory is first used (reveal: histogram from the replay) | 3/3/3 | the replay | Reading, Method | built |
| P-just_in_time_memory.4 | Untrained read-time against the best untrained write-time memory with the same curator model, all 17 cells as dumbbells with a no-memory tick | 3/3/3 | Tables 1 and 2 | Reading, predict reveal | built |
| P-just_in_time_memory.5 | Decomposition of the headline gain: no memory, untrained read-time, RL curator without retrieval, RL curator with retrieval, SkillOS reference | 3/3/3 | Tables 1 and 9 | Reading, predict reveal | built |
| P-just_in_time_memory.6 | Results bars per executor and metric with standard-deviation whiskers, hollow bars for numbers copied from SkillOS's paper | 2/3/3 | Table 1, SkillOS Tables 1 and 2 | Reading, Results | built |
| P-just_in_time_memory.7 | Ablation dot plot: drop from the parent per executor | 2/3/3 | Table 9 | Reading, Ablations | built |
| P-just_in_time_memory.8 | Table 1 with per-cell provenance (S = matches SkillOS's published table to the decimal) and a values / difference toggle | 2/3/3 | tables.json | Tables tab | built |
| P-just_in_time_memory.9 | Validation curves decoded from the vector PDFs; score granularity reveals the validation-set size (140 for ALFWorld = the test set's size) | 2/3/2 | e-print figures | Tables tab | built |
| P-just_in_time_memory.10 | GRPO group-advantage toy (8 payload rewards, advantages with and without std normalisation) | 1/3/3 | illustrative | | rejected: standard GRPO, already on the DeepSeekMath page |
| P-just_in_time_memory.11 | Token-budget waterfall including the curator's own call | 2/0/3 | the paper does not report curator tokens | | rejected: would need invented numbers |

## Methodology notes

- Lesson worth adding to papers.md: **check whether a paper's baseline rows were copied from another paper.** Matching value and standard deviation to the decimal against the cited paper's tables (per cell, since rows can mix copied and new cells) found 36 of 60 baseline cells copied here, which the paper only implies.
- When an agent paper releases nothing, the memory or retrieval traffic of its protocol can often still be replayed exactly on the benchmark's public task list; it turns an argument ("delayed credit") into a measured number.
- Score granularity of decoded validation curves gives the validation-set size; compare it with the test set's.
