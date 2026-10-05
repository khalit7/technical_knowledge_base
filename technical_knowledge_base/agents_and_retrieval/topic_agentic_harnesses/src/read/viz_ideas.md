# Reading tab: visual ideas, built and rejected

Central question: what happens between pressing Enter and the tests passing, and which part of the harness decides each step.

## Built
1. **Same task, same model: one call against the loop** (section 1). Before/after on the same input from two real recordings: Loop lab step 0 (`s0_haiku`) and Claude Code (`std_haiku_1`), both Haiku 4.5. Steps through every model call with the tool call, a clipped result, a window bar (cache read, cache write, fresh input; scale shown against the 200,000-token window) and running counters (calls, input this call, cost at list prices, test status as the model last saw it). Teaches the loop, error recovery, context growth and the fixed prefix in one replay. Score: reproduces recorded figures by construction from the recording, computable, corrects "the model is the agent".
2. **The same eleven actions, without and with a permission gate** (section 5). Verdicts are the Loop lab step 3 gate's real `check()` output (`gate_cases.json`); the "no gate" consequences are illustrative and labelled. Before/after on the same input.
3. **Harness map** (section 0): clickable parts of the harness around the model, each linking to its section. Orientation only.
4. **Lethal trifecta checker** (section 5): three toggles, says whether the trifecta is complete and which leg to cut.
5. **Measured comparisons table** (section 7): rows computed from the data file (step 0 vs loop, three Haiku runs, three Sonnet runs, Loop lab harness vs Claude Code on Sonnet).

## Rejected
- A caching before/after and a compaction before/after: the Trace and context lab already has both (Context labs 2 and 4); linked instead.
- A startup-context bar chart by tool set: the Trace lab's Context lab 1 owns it; the numbers are quoted once in section 2.
- An animated tool-call protocol (request, tool_use, tool_result): the Loop lab's API section owns it.
- A product comparison grid: the Harness atlas owns it.
- A scaffold-sensitivity chart from published numbers: the Agentic benchmarks page owns the evidence; section 7 quotes two numbers and links.
- New recordings: not needed. The budget override allowed 5 claude invocations; this tab used 0, building only from the Loop and Trace labs' redacted recordings.

## What the methodology lacked
A rule for a root that shares a page with lab tabs built in parallel: the Reading tab should replay one recording at intuition level and leave every second view of the same mechanism to the lab that owns it.
