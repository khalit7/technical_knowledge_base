# Visual ideas for "Same agent, six ways"

Central question: what does a framework do for you on the same agent, and what does it cost you (code, hidden
prompt, failure modes)? Every visual is built from recorded runs on 2026-10-05/06.

## Built
| # | Idea | Why it earns its place | Data |
|---|---|---|---|
| S1 | Side-by-side code, any two of six, lines coloured by role (model setup, tool definitions, state, loop, stopping, framework-only), click a role to light it in both panels; lines-of-code tiles | Equivalent parts line up visually: the loop that is 13 lines in the plain version is one `run_sync` call elsewhere | `code/*.py`, role ranges in `gen_data.py` |
| S2 | Results table with one dot per run (greedy then three at temperature 0.7), fixed versus ended cleanly as separate columns, medians of calls, tokens, seconds | Separates "fixed the repo" from "the program finished"; shows spread instead of one lucky run | `data/runs.json` |
| S3 | Failure causes, one line per failing run, read from transcripts, split into model, framework contract, format | The fairness requirement: says where the 4B model, not the framework, failed | `causes.json` |
| S4 | **Before/after animation: the same intent as our request and as the framework's request**, built part by part (template, our system prompt, task, tool schemas, hidden output tool, framework prompt), one square per 10 tokens, to scale; framework selectable; raw JSON side by side | Prompt inflation seen, not described: smolagents' 2,231 against 397 | `data/first_tokens.json` from `tok.py` (model's own tokenizer; totals equal the server's counts) |
| S5 | Claude first-call bars: our prompt and tools, Claude Code prompt appended, built-in tools | Same lesson on the Claude side, where the request cannot be captured but usage can | Claude runs a6, a6b, a6c |
| S6 | Run replay: step through any recorded run call by call, context strip growing (grey already seen, blue new), counters, transcript, diff | Shows why the last calls cost most and how each failure unfolded | transcripts of 9 runs |
| S7 | Three predict-then-reveal questions (largest request; fixed but raised; files named R, E, A, D) | Belief elicitation on the three surprises of the experiment | runs |
| S8 | Did / hid / approval / retry cards per framework, read from installed source | Answers "how would I add a human step and a retry" concretely, version-pinned | site-packages of the pinned versions, docs links |

## Rejected
- Cost-per-run column in dollars: the subscription paid; Claude Code's `total_cost_usd` is an API-price
  equivalent nobody was billed, and the local model has no price. Tokens and seconds instead.
- Tokens per run compared across Claude and the local model on one axis: different tokenizers and prompts;
  kept in separate rows and bars.
- Trace waterfall (spans) per framework: belongs to the Production stack tab (observability); the replay already
  shows calls in order.
- Animated graph of LangGraph's nodes: the side-by-side code shows the three edges; a graph picture adds little
  for a two-node graph.
- Running each framework many more times for pass rates: a 4B model's pass rate is a property of the model; four
  runs per framework show the spread without pretending to measure frameworks statistically.

## What the methodology lacked here
No published figure to reproduce: the "defaults reproduce X" rule became "the page's token split reproduces the
server's own counts" (exact for all five) and "prose numbers are checked against the data by script".
