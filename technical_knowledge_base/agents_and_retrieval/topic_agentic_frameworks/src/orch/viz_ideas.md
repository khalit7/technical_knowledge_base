# Orchestration lab: visual ideas

Central question: who picks the next step, and what does each choice cost in time, tokens and correctness on the same input?

## Built
| Idea | Score notes | Placement |
|---|---|---|
| Pattern replay: graph of the pattern (model calls blue, code grey) lit by the recorded clock, Gantt lanes to scale in seconds, running counters (calls, tokens processed, tokens written, cost), caption per event; "compare with" runs a second pattern on the same clock (the before/after: workflow against agent on one input) | real recordings, shows parallel overlap and loop repeats that a table cannot; step animation | Replay |
| Call inspector: each call's instruction, system prompt, reply start, the final core.py and hidden-check verdicts | makes "what the model actually saw" concrete | Replay |
| Results bars with metric switch (wall, tokens processed, written, cost, hidden checks) and full table | the comparison in one view | Results |
| Predict then reveal: which pattern took longest | most readers guess the agent or orchestrator-workers; it was evaluator-optimizer at 263 s | Results |
| Durable execution replay: five nodes, process strip (killed, paused, done), checkpoint tree growing from the event log; toggle "without a checkpointer" (derived from the same durations, labelled) | before/after on the same run; shows lost in-flight call, node re-execution on resume, fork | Durable |
| Clickable checkpoint tree with state per checkpoint (next, keys, interrupt, diagnosis, patch, result) | shows what a checkpoint is, from SQLite | Durable |
| Single agent against lead plus two subagents: lanes per agent, tool calls, context size per agent on one scale, transcript with the current row highlighted | context isolation and duplicated reading become visible | One agent or several |
| Anthropic against Cognition "where each applies" table | turns two opinion pieces into a decision rule | One agent or several |

## Rejected
- Running each pattern several times for error bars: budget (about 25 runs); stated as one recording each instead.
- A token-cost calculator per pattern: duplicates the harness root's context lab and the Production stack tab.
- A Temporal demo: would need a Temporal server; described from docs instead.
- Animating the agent's context as a growing stack per turn: the harness root's Loop and Trace labs own that.

## What the methodology lacked
Nothing to "reproduce" from a source: the recordings are the primary data. The equivalent check is that the page's numbers recompute from the redacted result records (`check_numbers.py`) and that the cost equivalent reproduces from list prices (974 in, 1,093 out gives $0.006439 exactly).
