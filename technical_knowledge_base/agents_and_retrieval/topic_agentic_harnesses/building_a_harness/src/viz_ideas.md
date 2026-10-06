# Visualisation ideas: Building a harness

What the text needs: (1) what a tool call physically is, below the API; (2) why the turn must end at the action, before/after on the same input; (3) when a batch of calls is safe to run concurrently; (4) what streaming and an interrupt look like in time; (5) whether error wording matters; (6) how edit formats compare on the same edits, and how much the applier matters; (7) when a loop should stop, with real runs.

## Built (score out of 10: teaches / real data / not done elsewhere)
1. **One tool call end to end, in tokens** (Reading 1, animation, 9/10/9). Seven stages on real tokens of a recorded turn (request JSON, rendered system turn with tools, prompt, generated call, end-of-turn token, parsed tool_calls, results as a user turn). Toggle "boundary ignored" replays a recorded continuation past `<|im_end|>`: a before/after on the same input. Inspiration: the DeepSeek MLA explainer's step controller (this knowledge base) (RD.anim).
2. **Token view tab** (8/10/9). All 1,531 tokens of the fifth request, coloured by kind, with the four earlier request ends marked and a stacked bar per call; click a token for its id. Shows the re-tokenisation quirk (three newlines merged) found while building it.
3. **Boundary bars** (Reading 2, 9/10/8): share of samples that invented an observation, text protocol with and without a stop sequence and the native template continued past the end-of-turn token.
4. **Parallel-call bars** (Reading 3, 6/10/8): replies with one, two, three calls per model, from 22 parent recordings and 16 local runs.
5. **Streamed run on a time axis** (Reading 4, 8/10/10): message bars, tool-argument streaming segments, result dots; shows Claude Code executing the first Edit before the second finished streaming.
6. **Interrupt transcript table** (Reading 4, 7/10/10): what the CLI wrote after `client.interrupt()`.
7. **Error-wording bars** (Reading 5, 7/9/10): recovered of 13 failures with terse, native and instructive messages, plus one case shown three ways.
8. **Edit bench matrix with before/after retry toggle and cell replay** (tab, 9/10/9): 13 edits x 5 formats per model, colour by correct / applied-but-wrong / refused, dashed where the retry repaired it; click for reply and every applier's verdict. Summary bars per model; appliers table (git apply vs --recount vs Aider).
9. **Stop lab** (tab, 9/10/10): same-seed pair animation (careful vs verify), replay of turn caps, budgets and a repeat detector over the 16 runs, run table with turn-by-turn detail, Claude Code limit cards.

## Rejected
- A sequence diagram of the agent loop: the parent root has the loop diagram and the Loop lab animation.
- Re-drawing the Anthropic and OpenAI request shapes: the parent's Loop lab already shows one recorded turn in both.
- A latency chart of the local model: wall times were dominated by other agents' load on the shared server; tokens are shown instead.
- A cost-per-format chart in dollars: the local model has no price and the Claude costs are API-price equivalents; output tokens per reply are shown instead.
- An interactive applier (type a diff, watch it apply): would need git and Aider in the browser; the bench's recorded verdicts carry the same lesson.

## What the methodology lacked
- A rule for shared infrastructure: when the measuring machine is loaded by other jobs, report tokens, not seconds, and state any loss of determinism.
