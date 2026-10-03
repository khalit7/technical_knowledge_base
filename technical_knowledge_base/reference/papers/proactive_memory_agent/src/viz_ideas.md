# Visualisation ideas: Proactive Memory Agent

Central question: does the memory agent help because it chooses *when* to speak, and at what cost?

| id | Idea | Placement | Score | Status |
|---|---|---|---|---|
| P-proactive_memory_agent.1 | **Replay the released traces**: five Terminal-Bench tasks, baseline and memory run on one prompt-token scale, a square per memory step coloured by reminder kind, bank edits and reminder text per turn, running counters for actor tokens, estimated memory-agent tokens, reminders and cost | Own tab (live ingredient) | 13 | built |
| P-proactive_memory_agent.2 | **One memory step, six ways** (before/after animation): the real `gcov` step through the full design and each Table 2 ablation, next-call tokens to scale, Table 2 score at the end | Reading, Idea | 12 | built |
| P-proactive_memory_agent.3 | Predict: Sonnet + Opus memory against Opus alone (reveal: ties/edges on TB, loses by 12 tasks on τ²) | Reading, Results | 11 | built |
| P-proactive_memory_agent.4 | Predict: always inject against selective, in tasks (171 against 170 and 172 for two runs of the same config) | Reading, Ablations | 12 | built |
| P-proactive_memory_agent.5 | Predict: how often the "selective" agent speaks (52 of 80), strip per task coloured by recall / diagnose / check | Reading, In the traces | 11 | built |
| P-proactive_memory_agent.6 | Tables rebuilt with each % turned into whole tasks; noise table with unpaired SE and the largest discordant count that keeps a paired gain significant; 15 claim checks | Tables tab | 10 | built |
| P-proactive_memory_agent.7 | Token-cost model with a trigger-interval slider | rejected: the paper never runs an interval above 1, so any accuracy at other intervals would be invented |
| P-proactive_memory_agent.8 | Re-running the agent on a task | rejected: needs API calls and containers; not possible in a sandboxed page |

Reusable lesson: for an agent paper whose ablation compares "selective" with "always", count how often the released agent actually speaks; and turn one-run percentages back into task counts, then compare the gap with any duplicated configuration in the paper's own tables.
