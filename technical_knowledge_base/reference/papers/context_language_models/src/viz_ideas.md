# Visual ideas for Context Language Models (ids P-context_language_models.k)

Scored with .claude/skills/explainer-page/visuals/choosing.md (0 to 2 each; reproduce and public inputs count double; minus build cost).

| id | Idea | Score | Verdict |
|---|---|---|---|
| P-context_language_models.1 | **Replay a trajectory**: one episode under Base, Summary and CLM (before/after on the same input), each call's prompt drawn to scale and coloured by cache state (cached prefix, re-prefilled, new, relocated by SCR, generated), with prompt size and running FLOPs per call for all three policies | 13 | Built (Replay tab). Inputs labelled illustrative; pricing is the paper's Eq. 9, checked against recompute.py |
| P-context_language_models.2 | **One turn's bill**: Eq. 9 calculator, Figure 16 presets with residuals, split by operation | 14 | Built (Replay tab); reproduces Figure 16 independently |
| P-context_language_models.3 | Eq. 6 live: eight rollouts, click to flip success, outcome and efficiency advantages per rollout | 10 | Built (Reading, §4.2) |
| P-context_language_models.4 | Figure 5 and Figure 19 rebuilt from vector paths, with Pareto frontier and a 27B/9B switch | 12 | Built (Reading, Results); the 9B switch carries a finding the text omits |
| P-context_language_models.5 | Predict reveals: Figure 16 bars, Figure 14 token shares, Table 2 with standard errors | 9 | Built (three predict widgets) |
| P-context_language_models.6 | Figure 2 heat map (method by context pressure, per task) | 8 | Built (Tables tab) |
| P-context_language_models.7 | Animated diff of a real context file before and after a CLM edit (Figure 3's code run on a sample transcript) | 7 | Rejected: no released trajectories to replay; an invented transcript would add little beyond the replay's to-scale strips |
| P-context_language_models.8 | SCR span relocation animation ([A B C] to [A B' C], keys re-rotated) | 6 | Rejected: the replay's SCR toggle shows the same accounting on a whole episode; Figure 4 is already a clear static picture |
| P-context_language_models.9 | Figure 29 RL curves decoded | 5 | Rejected for now: the curves' end points are Table 2; decoding the whole training curve adds little to the verdict |
| P-context_language_models.10 | Figure 30 context-length awareness scatter | 3 | Rejected: a PNG only (no vector data), and the claim is qualitative |
